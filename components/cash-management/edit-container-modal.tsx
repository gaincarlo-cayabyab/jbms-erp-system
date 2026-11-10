'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, Loader2, Pencil, Info } from 'lucide-react'
import { updateCashContainer } from '@/app/actions/cash'
import { CashAccount } from '@/types/cash'
import { toast } from 'sonner'
import { soundEffects } from '@/lib/sound-effects'

interface Props {
  isOpen: boolean
  account: CashAccount | null
  onClose: () => void
  onSuccess: (updated: CashAccount) => void
}

export default function EditContainerModal({ isOpen, account, onClose, onSuccess }: Props) {
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [currentBalance, setCurrentBalance] = useState('0')
  const [cashCeiling, setCashCeiling] = useState('15000')
  const [defaultFloat, setDefaultFloat] = useState('5000')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (account) {
      setAccountName(account.account_name || '')
      setAccountNumber(account.account_number || '')
      setCurrentBalance(String(Number(account.current_balance) || 0))
      setCashCeiling(String(account.cash_ceiling || 15000))
      setDefaultFloat(String(account.default_float || 5000))
    }
  }, [account])

  if (!isOpen || !account) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    if (!accountName.trim()) {
      setErrorMessage('Container name is required.')
      return
    }

    setIsSubmitting(true)
    try {
      const updated = await updateCashContainer(account.id, {
        accountName,
        accountNumber: accountNumber || undefined,
        currentBalance: parseFloat(currentBalance) || 0,
        cashCeiling: parseFloat(cashCeiling) || 15000,
        defaultFloat: parseFloat(defaultFloat) || 5000,
      })
      soundEffects.success()
      toast.success(`"${accountName}" updated successfully!`)
      onSuccess(updated as CashAccount)
      onClose()
    } catch (err: unknown) {
      soundEffects.error()
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update container.')
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
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Edit Cash Container</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Update details, balance, or limits</p>
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
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Read-only type & branch info */}
          <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <p className="text-xs text-zinc-600">
              <span className="font-semibold">Type:</span>{' '}
              {account.account_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              {' · '}
              <span className="font-semibold">Branch:</span>{' '}
              {account.branch_id === 'dagupan_main' ? 'Dagupan Main' : 'Manila Branch'}
            </p>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">Container Name *</label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-2xs"
              placeholder="e.g., POS Cash Drawer 01 — Dagupan"
            />
          </div>

          {/* Real Starting / Current Balance */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">Current Balance (₱)</label>
            <input
              type="number"
              step="0.01"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value)}
              min="0"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-2xs"
              placeholder="0.00"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Enter your real actual money balance for this container.
            </p>
          </div>

          {/* Account Number / Reference */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">Account / Reference No. (optional)</label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-2xs"
              placeholder="e.g., 0012-3456-7890 or GCash number"
            />
          </div>

          {/* Cash Ceiling & Default Float */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">Cash Ceiling (₱)</label>
              <input
                type="number"
                value={cashCeiling}
                onChange={(e) => setCashCeiling(e.target.value)}
                min="0"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-2xs"
                placeholder="15000"
              />
              <p className="text-[10px] text-zinc-400 mt-1">Max cash before Safe Drop alert</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">Default Float (₱)</label>
              <input
                type="number"
                value={defaultFloat}
                onChange={(e) => setDefaultFloat(e.target.value)}
                min="0"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-2xs"
                placeholder="5000"
              />
              <p className="text-[10px] text-zinc-400 mt-1">Opening till float per shift</p>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
