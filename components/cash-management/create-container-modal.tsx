'use client'

import { useState } from 'react'
import {
  X,
  Landmark,
  Building2,
  Receipt,
  Smartphone,
  Coins,
  Wallet,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { createCashContainer } from '@/app/actions/cash'
import { CashAccount, CashAccountType } from '@/types/cash'
import { toast } from 'sonner'
import { soundEffects } from '@/lib/sound-effects'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newAccount: CashAccount) => void
  defaultBranch?: string
}

export default function CreateContainerModal({
  isOpen,
  onClose,
  onSuccess,
  defaultBranch = 'dagupan_main',
}: Props) {
  const [accountName, setAccountName] = useState('')
  const [branchId, setBranchId] = useState(defaultBranch === 'all' ? 'dagupan_main' : defaultBranch)
  const [accountType, setAccountType] = useState<CashAccountType>('cash_drawer')
  const [accountNumber, setAccountNumber] = useState('')
  const [initialBalance, setInitialBalance] = useState('0')
  const [cashCeiling, setCashCeiling] = useState('15000')
  const [defaultFloat, setDefaultFloat] = useState('5000')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!accountName.trim()) {
      setErrorMessage('Container name is required.')
      return
    }

    setIsSubmitting(true)
    try {
      const created = await createCashContainer({
        branchId,
        accountName,
        accountType,
        accountNumber: accountNumber || undefined,
        initialBalance: parseFloat(initialBalance) || 0,
        cashCeiling: parseFloat(cashCeiling) || 15000,
        defaultFloat: parseFloat(defaultFloat) || 5000,
      })

      soundEffects.success()
      toast.success(`Cash container "${accountName}" registered successfully!`)
      onSuccess(created as CashAccount)
      onClose()
    } catch (err: unknown) {
      soundEffects.error()
      const msg = err instanceof Error ? err.message : 'Failed to create cash container.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900">Create Liquid Cash Container</h2>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                Blueprint 5.3
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Deploy a new Vault, POS Cash Drawer, Manager Safe, or Commercial Bank Account.
            </p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Branch & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Branch Location <span className="text-red-500">*</span>
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 py-2 px-3 text-xs text-zinc-900 bg-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="dagupan_main">JAPA Dagupan (Main Branch)</option>
                <option value="manila_branch">JAPA Manila Operations Hub</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Container Type <span className="text-red-500">*</span>
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as CashAccountType)}
                className="w-full rounded-lg border border-zinc-300 py-2 px-3 text-xs text-zinc-900 bg-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="cash_drawer">Level 1: POS Cash Drawer Till</option>
                <option value="manager_safe">Level 2: Manager Safe Box / Petty Box</option>
                <option value="vault">Level 3: JAPA Main Store Vault</option>
                <option value="in_transit">Level 4: Bank In-Transit Holding</option>
                <option value="bank_checking">Commercial Bank (Checking)</option>
                <option value="bank_savings">Commercial Bank (Savings)</option>
                <option value="petty_cash">Branch Petty Cash Fund</option>
                <option value="ewallet">Digital E-Wallet (GCash / Maya)</option>
              </select>
            </div>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Container Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. POS Cash Drawer 02 — Dagupan"
              className="w-full rounded-lg border border-zinc-300 py-2 px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Account / Register Number (Optional)
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 0012-3456-7890 or Till #2"
              className="w-full rounded-lg border border-zinc-300 py-2 px-3 text-sm text-zinc-900 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Initial Balance */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Initial Opening Balance (₱)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-zinc-400">₱</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 py-2 pl-8 pr-3 text-sm text-zinc-900 font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Drawer Rules (Blueprint 3.2 & 5.3) */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-700" />
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Drawer Rules & Thresholds (Blueprint 3.2)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  Cash Ceiling (T_max Alert) ₱
                </label>
                <input
                  type="number"
                  min="1000"
                  step="100"
                  value={cashCeiling}
                  onChange={(e) => setCashCeiling(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-bold text-zinc-900 focus:border-indigo-500 focus:outline-none"
                />
                <p className="text-[10px] text-zinc-500 mt-0.5">Triggers Safe Drop prompt when reached.</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  Default Shift Float ₱
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={defaultFloat}
                  onChange={(e) => setDefaultFloat(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-bold text-zinc-900 focus:border-indigo-500 focus:outline-none"
                />
                <p className="text-[10px] text-zinc-500 mt-0.5">Standard opening drawer amount.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
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
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Container'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
