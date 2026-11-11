'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { recordCashTransaction } from '@/app/actions/cash'
import { soundEffects } from '@/lib/sound-effects'
import { toast } from 'sonner'
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Truck,
  Package,
  ShoppingBag,
  Coins,
  Car,
  Coffee,
  CheckCircle2,
  Loader2,
  Banknote,
  AlertTriangle,
  Sparkles,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawerCashInOutModalProps {
  isOpen: boolean
  drawerId?: string
  drawerName?: string
  currentBalance?: number
  branchId?: string
  initialMode?: 'outflow' | 'inflow'
  onClose: () => void
  onSuccess: () => void
}

const OUTFLOW_CATEGORIES: { name: string; icon: React.ComponentType<{ className?: string }>; sublabel: string }[] = [
  { name: 'Courier & Shipping Dispatch',      icon: Truck,       sublabel: 'Lalamove, Grab, J&T' },
  { name: 'Parcel COD Supplier Delivery',     icon: Package,     sublabel: 'Inks, Vinyl, Shirts COD' },
  { name: 'Store & Office Supplies',          icon: ShoppingBag, sublabel: 'Tape, Boxes, Cleaning' },
  { name: 'Transportation & Store Errands',   icon: Car,         sublabel: 'Tricycle / Fare / Gas' },
  { name: 'Staff Meal & Emergency Allowance', icon: Coffee,      sublabel: 'Food & Snacks' },
  { name: 'Other Store Expenses',             icon: Sparkles,    sublabel: 'Other drawer expense' },
]

const INFLOW_CATEGORIES: { name: string; icon: React.ComponentType<{ className?: string }>; sublabel: string }[] = [
  { name: 'Register Change Float Addition',   icon: Coins,          sublabel: 'Add small bills & coins' },
  { name: 'Cash Injection from Manager',      icon: ArrowDownLeft,  sublabel: 'Operating funds from manager' },
  { name: 'Customer COD Remittance',          icon: Truck,          sublabel: 'Courier remit payment' },
  { name: 'Miscellaneous Inflow',             icon: Banknote,       sublabel: 'Other cash into till' },
]

const AMOUNT_PRESETS = [50, 100, 150, 200, 300, 500, 1000]

export default function DrawerCashInOutModal({
  isOpen,
  drawerId,
  drawerName = 'POS Cash Drawer 01',
  currentBalance = 0,
  branchId = 'dagupan_main',
  initialMode = 'outflow',
  onClose,
  onSuccess,
}: DrawerCashInOutModalProps) {
  const [mode, setMode] = useState<'outflow' | 'inflow'>(initialMode)
  const [categories, setCategories] = useState<{ id: string; category_name: string; flow_type: string }[]>([])
  const [selectedCategoryName, setSelectedCategoryName] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [targetDrawerId, setTargetDrawerId] = useState(drawerId || '')
  const [liveDrawerBalance, setLiveDrawerBalance] = useState(currentBalance)

  // Fetch drawer and categories on open
  useEffect(() => {
    if (!isOpen) return
    setMode(initialMode)
    setAmountInput('')
    setNotes('')
    setSubmitting(false)

    async function loadMeta() {
      const supabase = createClient()
      const cleanBranch = branchId.toLowerCase().includes('manila') ? 'manila_branch' : 'dagupan_main'

      // 1. Fetch Drawer account if not passed
      if (!drawerId) {
        const { data: drawer } = await supabase
          .from('cash_accounts')
          .select('id, account_name, current_balance')
          .eq('branch_id', cleanBranch)
          .eq('account_type', 'cash_drawer')
          .limit(1)
          .maybeSingle()

        if (drawer) {
          setTargetDrawerId(drawer.id)
          setLiveDrawerBalance(Number(drawer.current_balance) || 0)
        }
      } else {
        setTargetDrawerId(drawerId)
        setLiveDrawerBalance(currentBalance)
      }

      // 2. Fetch cash_categories
      const { data: cats } = await supabase
        .from('cash_categories')
        .select('id, category_name, flow_type')

      if (cats && cats.length > 0) {
        setCategories(cats)
      }
    }

    loadMeta()
  }, [isOpen, drawerId, currentBalance, branchId, initialMode])

  // Active presets based on current mode
  const activePresets = mode === 'outflow' ? OUTFLOW_CATEGORIES : INFLOW_CATEGORIES

  // Auto-select first preset category
  useEffect(() => {
    if (activePresets.length > 0) {
      if (!selectedCategoryName || !activePresets.some((p) => p.name === selectedCategoryName)) {
        setSelectedCategoryName(activePresets[0].name)
      }
    }
  }, [mode, activePresets, selectedCategoryName])

  const numericAmount = parseFloat(amountInput) || 0
  const isOverdraft = mode === 'outflow' && numericAmount > liveDrawerBalance

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (numericAmount <= 0) {
      toast.error('Please enter a valid amount greater than ₱0.')
      soundEffects.error()
      return
    }

    if (!targetDrawerId) {
      toast.error('Cash drawer account could not be found.')
      soundEffects.error()
      return
    }

    const cleanBranch = branchId.toLowerCase().includes('manila') ? 'manila_branch' : 'dagupan_main'

    // Find category ID
    let catRec = categories.find((c) => c.category_name === selectedCategoryName && c.flow_type === mode)
    if (!catRec) {
      catRec = categories.find((c) => c.flow_type === mode)
    }

    if (!catRec) {
      toast.error('Could not find matching category in database.')
      soundEffects.error()
      return
    }

    setSubmitting(true)
    try {
      soundEffects.keyClick()

      const voucherRef = `${mode === 'outflow' ? 'EXP' : 'IN'}-${Date.now().toString().slice(-6)}`
      const finalNotes = notes.trim()
        ? `${selectedCategoryName}: ${notes.trim()}`
        : `${selectedCategoryName}`
      const defaultPayee = mode === 'outflow' ? selectedCategoryName : 'Register Cash In'

      // 1. Record Cash Transaction (triggers drawer balance update automatically)
      await recordCashTransaction({
        branchId: cleanBranch,
        cashAccountId: targetDrawerId,
        categoryId: catRec.id,
        flowType: mode,
        amount: numericAmount,
        paymentMethod: 'cash',
        referenceNo: voucherRef,
        sourceModule: 'pos',
        payeeOrPayer: defaultPayee,
        notes: finalNotes,
      })

      // 2. If Outflow, also mirror to expenses so Financials displays it immediately
      if (mode === 'outflow') {
        try {
          const supabase = createClient()
          await supabase.from('expenses').insert({
            category: selectedCategoryName,
            description: notes.trim()
              ? `${selectedCategoryName} — ${notes.trim()}`
              : `${selectedCategoryName} (Paid out from ${drawerName})`,
            amount: numericAmount,
            payment_method: 'Cash',
            date: new Date().toISOString().split('T')[0],
            reference_no: voucherRef,
            branch: cleanBranch === 'manila_branch' ? 'JAPA Manila' : 'JAPA Dagupan (Main Branch)',
          })
        } catch (expErr) {
          console.warn('Could not mirror to expenses table:', expErr)
        }
      }

      soundEffects.success()
      toast.success(
        mode === 'outflow'
          ? `₱${numericAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} paid out from ${drawerName}`
          : `₱${numericAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} added to ${drawerName}`,
        { duration: 4000 }
      )

      onSuccess()
      onClose()
    } catch (err: unknown) {
      soundEffects.error()
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      toast.error(`Error: ${msg}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200/90 shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-5 sm:px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Till Cash Movement
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-800">
                {drawerName}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Current Available Cash in Till:{' '}
              <span className="font-mono font-black text-slate-900">
                ₱{liveDrawerBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Selector (Clear, Intuitive Wording) */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/40">
          <div className="grid grid-cols-2 gap-2 bg-slate-200/80 p-1 rounded-2xl">
            {/* Tab 1: Paid Out (Cash Out) */}
            <button
              type="button"
              onClick={() => {
                soundEffects.keyClick()
                setMode('outflow')
              }}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 shadow-2xs',
                mode === 'outflow'
                  ? 'bg-rose-600 text-white shadow-rose-500/25'
                  : 'text-slate-700 hover:text-slate-900'
              )}
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>Paid Out (Cash Out)</span>
            </button>

            {/* Tab 2: Cash In (Add Cash) */}
            <button
              type="button"
              onClick={() => {
                soundEffects.keyClick()
                setMode('inflow')
              }}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 shadow-2xs',
                mode === 'inflow'
                  ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                  : 'text-slate-700 hover:text-slate-900'
              )}
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>Cash In (Add Cash)</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Category Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                {mode === 'outflow' ? 'Expense Category / Purpose' : 'Cash In Purpose'}
              </label>
              <span className="text-[10px] text-slate-400">Select one</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activePresets.map((preset) => {
                const Icon = preset.icon
                const isSelected = selectedCategoryName === preset.name
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      soundEffects.keyClick()
                      setSelectedCategoryName(preset.name)
                    }}
                    className={cn(
                      'flex flex-col items-start p-2.5 rounded-2xl border text-left transition active:scale-95 shadow-2xs',
                      isSelected
                        ? mode === 'outflow'
                          ? 'border-rose-500 bg-rose-50/80 text-rose-950 ring-2 ring-rose-500/20'
                          : 'border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div
                      className={cn(
                        'p-1.5 rounded-lg mb-1',
                        isSelected
                          ? mode === 'outflow'
                            ? 'bg-rose-200/80 text-rose-700'
                            : 'bg-emerald-200/80 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold leading-tight line-clamp-1">{preset.name}</span>
                    <span className="text-[10px] text-slate-400 leading-tight mt-0.5 line-clamp-1">
                      {preset.sublabel}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Amount Input & Presets */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Amount (PHP) <span className="text-rose-600">*</span>
              </label>
              {isOverdraft && (
                <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>Amount exceeds current drawer balance</span>
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-4 text-2xl font-black text-slate-900 font-mono shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                required
                autoFocus
              />
            </div>

            {/* Quick Amount Denomination Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {AMOUNT_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    soundEffects.keyClick()
                    setAmountInput(String(amt))
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition shadow-2xs"
                >
                  ₱{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Single Focused Reason / Notes Input (No redundant Payee or Waybill fields) */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Notes / Reason (What is this for?)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <textarea
                rows={2}
                placeholder={
                  mode === 'outflow'
                    ? 'e.g. 5x boxes tape, Lalamove rider payment, trike fare to dispatch, snacks...'
                    : 'e.g. Replenished ₱5 & ₱10 coins, manager cash injection, courier remittance...'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Quickly describe the expense or cash in. If left blank, defaults to &ldquo;{selectedCategoryName}&rdquo;.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-slate-100 pt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || numericAmount <= 0}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95',
                submitting || numericAmount <= 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : mode === 'outflow'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Recording Till Movement...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    {mode === 'outflow'
                      ? `Confirm Paid Out (₱${
                          numericAmount > 0
                            ? numericAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })
                            : '0.00'
                        })`
                      : `Confirm Cash In (₱${
                          numericAmount > 0
                            ? numericAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })
                            : '0.00'
                        })`}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
