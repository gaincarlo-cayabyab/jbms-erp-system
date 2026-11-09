'use client'

import { useState, useEffect, useId } from 'react'
import { CashAccount } from '@/types/cash'
import { closeRegisterShift } from '@/app/actions/cash'
import { soundEffects } from '@/lib/sound-effects'
import { toast } from 'sonner'
import { X, Scale, Loader2, AlertCircle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  isOpen: boolean
  accounts: CashAccount[]
  activeBranchId: string
  onClose: () => void
  onSuccess: () => void
}

export default function ShiftReconciliationModal({
  isOpen,
  accounts,
  activeBranchId,
  onClose,
  onSuccess,
}: Props) {
  // Filter for cash drawer accounts first, or all accounts
  const drawerAccounts = accounts.filter(
    (a) =>
      a.account_type === 'cash_drawer' &&
      (activeBranchId === 'all' || a.branch_id === activeBranchId)
  )
  const selectableAccounts = drawerAccounts.length > 0 ? drawerAccounts : accounts

  const [accountId, setAccountId] = useState(selectableAccounts[0]?.id || '')
  const [openingBalance, setOpeningBalance] = useState('5000')
  const [totalInflows, setTotalInflows] = useState('0')
  const [totalOutflows, setTotalOutflows] = useState('0')
  const [actualAmount, setActualAmount] = useState('')
  const [varianceReason, setVarianceReason] = useState('')
  const [shiftOpenedAt, setShiftOpenedAt] = useState(() => {
    const d = new Date()
    d.setHours(8, 0, 0, 0)
    return d.toISOString().slice(0, 16)
  })
  const [submitting, setSubmitting] = useState(false)
  const formId = useId()

  const selectedAccount = accounts.find((a) => a.id === accountId)

  // Update opening balance to account's balance when selection changes
  useEffect(() => {
    if (selectedAccount) {
      setOpeningBalance(String(selectedAccount.current_balance || '5000'))
    }
  }, [selectedAccount])

  if (!isOpen) return null

  const numOpening = parseFloat(openingBalance) || 0
  const numInflows = parseFloat(totalInflows) || 0
  const numOutflows = parseFloat(totalOutflows) || 0
  const expectedAmount = numOpening + numInflows - numOutflows
  const numActual = actualAmount !== '' ? parseFloat(actualAmount) || 0 : expectedAmount
  const variance = numActual - expectedAmount

  const isBalanced = Math.abs(variance) < 0.01
  const isOverage = variance > 0.01
  const isShortage = variance < -0.01

  async function handleCloseShift(e: React.FormEvent) {
    e.preventDefault()

    if (!accountId) {
      toast.error('Please select a cash register drawer.')
      soundEffects.error()
      return
    }

    if (actualAmount === '' || isNaN(parseFloat(actualAmount))) {
      toast.error('Please input the actual physical cash counted in the drawer.')
      soundEffects.error()
      return
    }

    if (!isBalanced && !varianceReason.trim()) {
      toast.error('Please provide an explanation note for the drawer cash variance.')
      soundEffects.error()
      return
    }

    setSubmitting(true)
    try {
      soundEffects.keyClick()
      await closeRegisterShift({
        branchId: selectedAccount?.branch_id || activeBranchId,
        cashAccountId: accountId,
        shiftOpenedAt: new Date(shiftOpenedAt).toISOString(),
        openingBalance: numOpening,
        totalInflows: numInflows,
        totalOutflows: numOutflows,
        actualAmount: numActual,
        varianceReason: varianceReason.trim() || undefined,
      })

      soundEffects.success()
      toast.success(
        isBalanced
          ? 'Register shift balanced perfectly! Reconciliation record saved.'
          : `Register shift closed with ${isOverage ? '₱' + variance.toFixed(2) + ' overage' : '₱' + Math.abs(variance).toFixed(2) + ' shortage'}.`
      )
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reconciliation failed.'
      soundEffects.error()
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">End of Shift Balancing & Reconciliation</h2>
              <p className="text-xs text-slate-500">
                Audit cash register actual count against system expected balance
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEffects.backspace()
              onClose()
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCloseShift} className="mt-4 space-y-4">
          {/* Select Register Drawer */}
          <div>
            <label htmlFor={`${formId}-register`} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Cash Register Drawer *
            </label>
            <select
              id={`${formId}-register`}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              required
            >
              {selectableAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_name} ({acc.branch_id === 'dagupan_main' ? 'Dagupan' : 'Manila'})
                </option>
              ))}
            </select>
          </div>

          {/* Shift Open Time */}
          <div>
            <label htmlFor={`${formId}-shift-opened`} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Shift Opened At *
            </label>
            <input
              id={`${formId}-shift-opened`}
              type="datetime-local"
              value={shiftOpenedAt}
              onChange={(e) => setShiftOpenedAt(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          {/* Balance Matrix: Opening, Inflows, Outflows */}
          <div className="grid grid-cols-3 gap-2.5 rounded-xl bg-slate-50 p-3 border border-slate-200/80">
            <div>
              <label htmlFor={`${formId}-opening-float`} className="block text-[11px] font-semibold text-slate-500 uppercase">
                Opening Float
              </label>
              <div className="relative mt-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₱</span>
                <input
                  id={`${formId}-opening-float`}
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-5 pr-2 py-1.5 text-xs font-semibold text-slate-900"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor={`${formId}-shift-inflow`} className="block text-[11px] font-semibold text-emerald-600 uppercase">
                + Shift Inflows
              </label>
              <div className="relative mt-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500">₱</span>
                <input
                  id={`${formId}-shift-inflow`}
                  type="number"
                  step="0.01"
                  value={totalInflows}
                  onChange={(e) => setTotalInflows(e.target.value)}
                  className="w-full rounded-lg border border-emerald-200 bg-white pl-5 pr-2 py-1.5 text-xs font-semibold text-emerald-700"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor={`${formId}-shift-outflow`} className="block text-[11px] font-semibold text-rose-600 uppercase">
                - Shift Outflows
              </label>
              <div className="relative mt-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-500">₱</span>
                <input
                  id={`${formId}-shift-outflow`}
                  type="number"
                  step="0.01"
                  value={totalOutflows}
                  onChange={(e) => setTotalOutflows(e.target.value)}
                  className="w-full rounded-lg border border-rose-200 bg-white pl-5 pr-2 py-1.5 text-xs font-semibold text-rose-700"
                  required
                />
              </div>
            </div>
          </div>

          {/* System Expected Balance Card */}
          <div className="rounded-xl bg-indigo-50/70 border border-indigo-100 p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                System Expected Balance
              </span>
              <p className="text-xs text-indigo-600/80">Opening + Inflows - Outflows</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold text-indigo-900">
                ₱{expectedAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Actual Physical Cash Counted */}
          <div>
            <label htmlFor={`${formId}-actual-cash`} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Actual Physical Cash Counted (Drawer Total) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">₱</span>
              <input
                id={`${formId}-actual-cash`}
                type="number"
                step="0.01"
                min="0"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                placeholder={expectedAmount.toFixed(2)}
                className="w-full rounded-xl border-2 border-indigo-500 bg-white pl-8 pr-3.5 py-3 text-lg font-black text-slate-900 focus:outline-hidden focus:ring-3 focus:ring-indigo-500/20"
                required
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Count all physical banknotes and coins currently in the cash drawer.
            </p>
          </div>

          {/* Variance Indicator Badge */}
          {actualAmount !== '' && (
            <div
              className={`rounded-xl p-3 border flex items-center justify-between ${
                isBalanced
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : isOverage
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {isBalanced && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                {isOverage && <TrendingUp className="h-5 w-5 text-blue-600" />}
                {isShortage && <TrendingDown className="h-5 w-5 text-rose-600" />}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isBalanced ? 'Drawer Balanced' : isOverage ? 'Cash Overage' : 'Cash Shortage'}
                  </span>
                  <p className="text-[11px] opacity-80">
                    {isBalanced
                      ? 'Physical count matches system expected amount.'
                      : isOverage
                      ? 'Actual count exceeds system expected amount.'
                      : 'Actual count is less than system expected amount.'}
                  </p>
                </div>
              </div>
              <div className="text-right font-black text-base">
                {variance >= 0 ? '+' : ''}₱{variance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}

          {/* Variance Reason */}
          <div>
            <label htmlFor={`${formId}-variance-reason`} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Variance Explanation / Closing Notes {!isBalanced && actualAmount !== '' && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              id={`${formId}-variance-reason`}
              value={varianceReason}
              onChange={(e) => setVarianceReason(e.target.value)}
              rows={2}
              placeholder={
                !isBalanced && actualAmount !== ''
                  ? 'Required: Explain why actual cash differs from system expected (e.g., untracked change, tip jar mix, cashier counting discrepancy)...'
                  : 'Optional shift closing remarks...'
              }
              className={`w-full rounded-xl border bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 resize-none ${
                !isBalanced && actualAmount !== '' && !varianceReason.trim()
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
              }`}
              required={!isBalanced && actualAmount !== ''}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                soundEffects.backspace()
                onClose()
              }}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-600/20 hover:bg-amber-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Finalize Shift Reconciliation
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
