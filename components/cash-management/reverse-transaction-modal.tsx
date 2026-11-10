'use client'

import { useState } from 'react'
import {
  X,
  AlertTriangle,
  RotateCcw,
  Loader2,
  ShieldAlert,
} from 'lucide-react'
import { reverseCashTransaction } from '@/app/actions/cash'
import { CashTransaction } from '@/types/cash'
import { toast } from 'sonner'
import { soundEffects } from '@/lib/sound-effects'

interface Props {
  transaction: CashTransaction | null
  onClose: () => void
  onSuccess: () => void
}

export default function ReverseTransactionModal({
  transaction,
  onClose,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!transaction) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!reason.trim()) {
      setErrorMessage('Please state the mandatory reason for this reversal.')
      return
    }

    setIsSubmitting(true)
    try {
      await reverseCashTransaction({
        transactionId: transaction.id,
        reason: reason.trim(),
      })

      soundEffects.success()
      toast.success(`Transaction ${transaction.transaction_no} reversed with audit log.`)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      soundEffects.error()
      const msg = err instanceof Error ? err.message : 'Failed to reverse transaction.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-rose-50/50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Audit Reversal & Void</h2>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">{transaction.transaction_no}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target transaction preview */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Account:</span>
              <span className="font-semibold text-zinc-800">{transaction.cash_accounts?.account_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Original Amount:</span>
              <span className="font-bold text-zinc-900">
                ₱{transaction.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} ({transaction.flow_type.toUpperCase()})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Recorded:</span>
              <span className="text-zinc-600">{new Date(transaction.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-semibold">Immutable Audit Compliance (Blueprint 6.2)</p>
            <p className="mt-0.5 text-[11px] text-amber-700">
              Financial regulations prevent hard deletion. Submitting this form marks the entry as <span className="font-bold">REVERSED</span> and posts an automated balancing contra-entry.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Mandatory Reason for Reversal <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Incorrect cash account selected, duplicate entry, customer checkout cancelled"
              className="w-full rounded-lg border border-zinc-300 py-2 px-3 text-xs text-zinc-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reversing...
                </>
              ) : (
                'Confirm Reversal'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
