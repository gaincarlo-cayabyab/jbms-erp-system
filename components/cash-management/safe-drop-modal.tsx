'use client'

import { useState } from 'react'
import {
  X,
  ShieldCheck,
  Receipt,
  AlertTriangle,
  Loader2,
  Lock,
} from 'lucide-react'
import { requestSafeDrop } from '@/app/actions/cash'
import { CashAccount } from '@/types/cash'
import { toast } from 'sonner'
import { soundEffects } from '@/lib/sound-effects'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  accounts: CashAccount[]
  defaultDrawerId?: string
}

export default function SafeDropModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  defaultDrawerId,
}: Props) {
  const drawers = accounts.filter((a) => a.account_type === 'cash_drawer')
  const [selectedDrawerId, setSelectedDrawerId] = useState(defaultDrawerId || (drawers[0]?.id ?? ''))
  const [amount, setAmount] = useState('10000')
  const [notes, setNotes] = useState('Routine mid-shift safe drop to Manager Safe Box')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const selectedDrawer = accounts.find((a) => a.id === selectedDrawerId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const numAmt = parseFloat(amount) || 0
    if (numAmt <= 0) {
      setErrorMessage('Amount must be greater than ₱0.')
      return
    }

    if (selectedDrawer && numAmt > selectedDrawer.current_balance) {
      setErrorMessage(`Safe drop amount exceeds current drawer balance (₱${selectedDrawer.current_balance.toLocaleString()}).`)
      return
    }

    setIsSubmitting(true)
    try {
      await requestSafeDrop({
        branchId: selectedDrawer?.branch_id || 'dagupan_main',
        posDrawerId: selectedDrawerId,
        amount: numAmt,
        notes: notes.trim(),
      })

      soundEffects.success()
      toast.success(`Safe drop of ₱${numAmt.toLocaleString()} requested! Manager must confirm in dashboard.`)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      soundEffects.error()
      const msg = err instanceof Error ? err.message : 'Failed to request safe drop.'
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
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-amber-50/50">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Initiate Safe Drop</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Transfer excess cash to Manager Safe Box</p>
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
          {/* Source Drawer */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Select POS Cash Drawer <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedDrawerId}
              onChange={(e) => setSelectedDrawerId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 py-2 px-3 text-xs text-zinc-900 bg-white focus:border-amber-500 focus:outline-none"
            >
              {drawers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.account_name} — Available: ₱{Number(d.current_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Safe Drop Amount (₱) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-zinc-400">₱</span>
              <input
                type="number"
                min="100"
                step="50"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 py-2 pl-8 pr-3 text-lg font-bold text-zinc-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
            {selectedDrawer && (
              <p className="text-[11px] text-zinc-500 mt-1">
                Remaining after drop: ₱{Math.max(0, (selectedDrawer.current_balance || 0) - (parseFloat(amount) || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Dual Key Notice */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <div className="flex items-center gap-1.5 font-semibold text-amber-900">
              <ShieldCheck className="h-4 w-4 text-amber-700" />
              <span>Dual-Key Custody Protocol (Blueprint 6.1)</span>
            </div>
            <p className="mt-0.5 text-[11px] text-amber-700">
              This request holds funds in pending transit until the Store Manager confirms physical acceptance in the Manager Safe Box.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Notes / Cashier Reference
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 py-2 px-3 text-xs text-zinc-900 focus:border-amber-500 focus:outline-none"
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
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                'Submit Safe Drop'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
