'use client'

import { useState, useId } from 'react'
import { CashAccount } from '@/types/cash'
import { executeCashTransfer } from '@/app/actions/cash'
import { soundEffects } from '@/lib/sound-effects'
import { toast } from 'sonner'
import { X, ArrowRightLeft, Loader2, ArrowRight } from 'lucide-react'

interface Props {
  isOpen: boolean
  accounts: CashAccount[]
  onClose: () => void
  onSuccess: () => void
}

export default function AccountTransferModal({
  isOpen,
  accounts,
  onClose,
  onSuccess,
}: Props) {
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '')
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const formId = useId()

  if (!isOpen) return null

  const fromAccount = accounts.find((a) => a.id === fromAccountId)
  const toAccount = accounts.find((a) => a.id === toAccountId)

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    const numericAmount = parseFloat(amount)

    if (!fromAccountId || !toAccountId) {
      toast.error('Please select both source and destination accounts.')
      soundEffects.error()
      return
    }

    if (fromAccountId === toAccountId) {
      toast.error('Source and destination accounts must be different.')
      soundEffects.error()
      return
    }

    if (!numericAmount || numericAmount <= 0) {
      toast.error('Please enter an amount greater than 0.')
      soundEffects.error()
      return
    }

    if (fromAccount && Number(fromAccount.current_balance) < numericAmount) {
      toast.error(
        `Insufficient balance in ${fromAccount.account_name}. Available: ₱${Number(
          fromAccount.current_balance
        ).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
      )
      soundEffects.error()
      return
    }

    setSubmitting(true)
    try {
      soundEffects.keyClick()
      await executeCashTransfer({
        fromAccountId,
        toAccountId,
        amount: numericAmount,
        notes: notes.trim() || undefined,
      })

      soundEffects.success()
      toast.success(
        `Successfully transferred ₱${numericAmount.toLocaleString('en-PH', {
          minimumFractionDigits: 2,
        })} from ${fromAccount?.account_name} to ${toAccount?.account_name}.`
      )
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transfer failed.'
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Inter-Account Cash Transfer</h2>
              <p className="text-xs text-slate-500">
                Move liquid funds between vaults, cash drawers, bank accounts, or branches
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
        <form onSubmit={handleTransfer} className="mt-4 space-y-4">
          {/* Transfer Route Visual Card */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">From Account</span>
              <p className="text-xs font-semibold text-slate-800 truncate">
                {fromAccount ? fromAccount.account_name : 'Select source'}
              </p>
              {fromAccount && (
                <p className="text-[11px] text-emerald-600 font-medium">
                  Available: ₱{Number(fromAccount.current_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">To Account</span>
              <p className="text-xs font-semibold text-slate-800 truncate">
                {toAccount ? toAccount.account_name : 'Select destination'}
              </p>
              {toAccount && (
                <p className="text-[11px] text-slate-500">
                  Current: ₱{Number(toAccount.current_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>

          {/* Select Source Account */}
          <div>
            <label htmlFor={`${formId}-from-account`} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Source Account (Outflow) *
            </label>
            <select
              id={`${formId}-from-account`}
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              required
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_name} ({acc.branch_id === 'dagupan_main' ? 'Dagupan' : 'Manila'}) — ₱{Number(acc.current_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>

          {/* Select Target Account */}
          <div>
            <label htmlFor={`${formId}-to-account`} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Destination Account (Inflow) *
            </label>
            <select
              id={`${formId}-to-account`}
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              required
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} disabled={acc.id === fromAccountId}>
                  {acc.account_name} ({acc.branch_id === 'dagupan_main' ? 'Dagupan' : 'Manila'}) — ₱{Number(acc.current_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor={`${formId}-transfer-amount`} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Transfer Amount (PHP) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₱</span>
              <input
                id={`${formId}-transfer-amount`}
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

          {/* Notes */}
          <div>
            <label htmlFor={`${formId}-transfer-notes`} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Transfer Reason / Reference Memo
            </label>
            <textarea
              id={`${formId}-transfer-notes`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. End of day cash drop to Main Vault, Petty Cash top-up..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 resize-none"
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
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Execute Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
