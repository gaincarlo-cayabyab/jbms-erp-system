'use client'

import { useState, useId } from 'react'
import { CashAccount, CashCategory, CashFlowType, CashPaymentMethod } from '@/types/cash'
import { recordCashTransaction } from '@/app/actions/cash'
import { soundEffects } from '@/lib/sound-effects'
import { toast } from 'sonner'
import { X, ArrowDownLeft, ArrowUpRight, Loader2, DollarSign, Tag, FileText, User, CreditCard } from 'lucide-react'

interface Props {
  isOpen: boolean
  flowType: CashFlowType
  accounts: CashAccount[]
  categories: CashCategory[]
  activeBranchId: string
  onClose: () => void
  onSuccess: () => void
}

export default function RecordTransactionModal({
  isOpen,
  flowType,
  accounts,
  categories,
  activeBranchId,
  onClose,
  onSuccess,
}: Props) {
  const isInflow = flowType === 'inflow'
  const [submitting, setSubmitting] = useState(false)
  const formId = useId()

  // Filter accounts for active branch or fallback to all
  const filteredAccounts = accounts.filter(
    (a) => activeBranchId === 'all' || a.branch_id === activeBranchId
  )

  const [accountId, setAccountId] = useState(filteredAccounts[0]?.id || accounts[0]?.id || '')
  const filteredCategories = categories.filter((c) => c.flow_type === flowType)
  const [categoryId, setCategoryId] = useState(filteredCategories[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<CashPaymentMethod>('cash')
  const [payeeOrPayer, setPayeeOrPayer] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const selectedAccount = accounts.find((a) => a.id === accountId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numericAmount = parseFloat(amount)
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0.')
      soundEffects.error()
      return
    }

    if (!accountId) {
      toast.error('Please select a cash account.')
      soundEffects.error()
      return
    }

    if (!categoryId) {
      toast.error('Please select a category.')
      soundEffects.error()
      return
    }

    if (!isInflow && selectedAccount && Number(selectedAccount.current_balance) < numericAmount) {
      toast.error(`Insufficient balance in ${selectedAccount.account_name}. Available: ₱${Number(selectedAccount.current_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`)
      soundEffects.error()
      return
    }

    setSubmitting(true)
    try {
      soundEffects.keyClick()
      await recordCashTransaction({
        branchId: selectedAccount?.branch_id || activeBranchId,
        cashAccountId: accountId,
        categoryId,
        flowType,
        amount: numericAmount,
        paymentMethod,
        referenceNo: referenceNo.trim() || undefined,
        sourceModule: 'manual',
        payeeOrPayer: payeeOrPayer.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      soundEffects.success()
      toast.success(
        isInflow
          ? `Cash Inflow of ₱${numericAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} recorded successfully.`
          : `Cash Outflow of ₱${numericAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} recorded successfully.`
      )
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed.'
      soundEffects.error()
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                isInflow ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
              }`}
            >
              {isInflow ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isInflow ? 'Record Cash Inflow (CRV)' : 'Record Cash Outflow (CDV)'}
              </h2>
              <p className="text-xs text-slate-500">
                {isInflow
                  ? 'Generate a Cash Receipt Voucher for received funds'
                  : 'Generate a Cash Disbursement Voucher for paid funds'}
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
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Target Account */}
          <div>
            <label htmlFor={`${formId}-account`} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {isInflow ? 'Deposit Into Account' : 'Disburse From Account'} *
            </label>
            <select
              id={`${formId}-account`}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              required
            >
              {filteredAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_name} ({acc.branch_id === 'dagupan_main' ? 'Dagupan' : 'Manila'}) — Available: ₱{Number(acc.current_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${formId}-amount`} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Amount (PHP) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₱</span>
                <input
                  id={`${formId}-amount`}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3.5 py-2.5 text-base font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor={`${formId}-category`} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                id={`${formId}-category`}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                required
              >
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Method & Payee/Payer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${formId}-payment-method`} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Payment Method *
              </label>
              <select
                id={`${formId}-payment-method`}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as CashPaymentMethod)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="cash">Physical Cash</option>
                <option value="ewallet">E-Wallet (GCash / Maya)</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Bank Cheque</option>
              </select>
            </div>

            <div>
              <label htmlFor={`${formId}-payee`} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {isInflow ? 'Received From (Payer)' : 'Disbursed To (Payee)'}
              </label>
              <input
                id={`${formId}-payee`}
                type="text"
                value={payeeOrPayer}
                onChange={(e) => setPayeeOrPayer(e.target.value)}
                placeholder={isInflow ? 'e.g. Walk-in Customer / Client' : 'e.g. Meralco / Supplier'}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Reference # */}
          <div>
            <label htmlFor={`${formId}-reference`} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reference / Official Receipt / Check #
            </label>
            <input
              id={`${formId}-reference`}
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. OR-2026-9012, CHK-88124, GC-109283"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor={`${formId}-notes`} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Notes / Purpose
            </label>
            <textarea
              id={`${formId}-notes`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Operational details, voucher approval comments..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>

          {/* Action Buttons */}
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
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 ${
                isInflow
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              }`}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isInflow ? 'Post Cash Receipt (CRV)' : 'Post Cash Voucher (CDV)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
