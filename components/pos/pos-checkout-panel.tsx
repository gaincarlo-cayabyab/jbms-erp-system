'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Banknote, CreditCard, Smartphone, Building2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PaymentMethod, CartDiscount } from '@/types/pos'

const PHP = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

interface Totals {
  subtotal: number
  discountAmount: number
  vatAmount: number
  grandTotal: number
}

interface Props {
  totals: Totals
  itemCount: number
  cartDiscount: CartDiscount | null
  onCheckout: (method: PaymentMethod, amountTendered: number) => void
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'GCASH', label: 'GCash / E-Wallet', icon: Smartphone },
  { id: 'CARD', label: 'Credit / Debit', icon: CreditCard },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
]

export default function POSCheckoutPanel({ totals, itemCount, cartDiscount, onCheckout }: Props) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH')
  const [tenderedInput, setTenderedInput] = useState<string>('')

  // Tendered calculation
  const tendered = parseFloat(tenderedInput) || 0
  const changeDue = Math.max(0, tendered - totals.grandTotal)
  const isExactOrGreater = tendered >= totals.grandTotal && totals.grandTotal > 0

  function handleQuickAmount(amt: number) {
    setTenderedInput(String(amt))
  }

  function handleExact() {
    setTenderedInput(String(Math.ceil(totals.grandTotal)))
  }

  function triggerCheckout() {
    if (totals.grandTotal <= 0) return
    const finalTendered = selectedMethod === 'CASH' ? tendered : totals.grandTotal
    if (selectedMethod === 'CASH' && finalTendered < totals.grandTotal) {
      toast.error('Tendered amount must be greater than or equal to Grand Total.')
      return
    }
    onCheckout(selectedMethod, finalTendered)
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Top Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70">
        <h3 className="text-sm font-bold text-slate-800">Order Summary</h3>
        <p className="text-[11px] text-slate-500">{itemCount} distinct line {itemCount === 1 ? 'item' : 'items'} in cart</p>
      </div>

      {/* Calculations Breakdown */}
      <div className="px-4 py-3.5 space-y-2 border-b border-slate-100 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-900 tabular-nums">{PHP.format(totals.subtotal)}</span>
        </div>

        {totals.discountAmount > 0 && (
          <div className="flex justify-between text-amber-600 font-medium">
            <span>Total Discount {cartDiscount ? `(${cartDiscount.label})` : ''}</span>
            <span className="tabular-nums">-{PHP.format(totals.discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between text-slate-500">
          <span className="flex items-center gap-1">
            12% VAT Included
            <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] text-slate-400 font-mono">12%</span>
          </span>
          <span className="tabular-nums">{PHP.format(totals.vatAmount)}</span>
        </div>

        <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
          <span className="text-sm font-bold text-slate-900">Grand Total</span>
          <span className="text-xl font-extrabold text-indigo-700 tabular-nums">
            {PHP.format(totals.grandTotal)}
          </span>
        </div>
      </div>

      {/* Payment Method Selector — oversized touch targets per spec (min 64px) */}
      <div className="p-3 border-b border-slate-100">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          Select Payment Method
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
            const isSelected = selectedMethod === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSelectedMethod(id)
                  if (id !== 'CASH') {
                    setTenderedInput(String(totals.grandTotal))
                  }
                }}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 transition active:scale-95 text-center min-h-[64px]',
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-xs ring-2 ring-indigo-500/20 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                )}
              >
                <Icon className={cn('h-5 w-5', isSelected ? 'text-indigo-600' : 'text-slate-400')} />
                <span className="text-[11px] leading-tight">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Cash Tendered Input & Change Display */}
      {selectedMethod === 'CASH' ? (
        <div className="p-3 border-b border-slate-100 space-y-2 flex-1 overflow-y-auto">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Amount Tendered (₱)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₱</span>
            <input
              type="number"
              min="0"
              placeholder="0.00"
              value={tenderedInput}
              onChange={(e) => setTenderedInput(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-7 pr-3 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Quick Denomination Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={handleExact}
              className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200 transition"
            >
              Exact
            </button>
            {[100, 200, 500, 1000, 2000, 5000].map((denomination) => (
              <button
                key={denomination}
                type="button"
                onClick={() => handleQuickAmount(denomination)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition"
              >
                ₱{denomination}
              </button>
            ))}
          </div>

          {/* Change Due readout */}
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-800">Change Due</span>
            <span className="text-lg font-extrabold text-emerald-700 tabular-nums">
              {PHP.format(changeDue)}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3 border-b border-slate-100 flex-1 flex flex-col justify-center items-center text-center text-slate-400">
          <div className="rounded-2xl bg-indigo-50 p-4 mb-2 text-indigo-600">
            <CreditCard className="h-8 w-8" />
          </div>
          <p className="text-xs font-semibold text-slate-700">Digital / Card Terminal Ready</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
            Charge exact amount {PHP.format(totals.grandTotal)} on external merchant device.
          </p>
        </div>
      )}

      {/* Complete Sale Action Button — Oversized tactile trigger ($64px x 64px min / high ergonomic target) */}
      <div className="p-3 bg-slate-50 shrink-0">
        <button
          type="button"
          onClick={triggerCheckout}
          disabled={totals.grandTotal <= 0 || (selectedMethod === 'CASH' && !isExactOrGreater)}
          className={cn(
            'w-full min-h-[58px] rounded-xl flex items-center justify-center gap-2 font-bold text-white shadow-modern transition-all duration-150 active:scale-[0.98]',
            totals.grandTotal <= 0 || (selectedMethod === 'CASH' && !isExactOrGreater)
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-modern-hover'
          )}
        >
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm uppercase tracking-wide">
            {selectedMethod === 'CASH' && !isExactOrGreater && totals.grandTotal > 0
              ? 'Enter Tendered Amount'
              : `Complete Sale (${PHP.format(totals.grandTotal)})`}
          </span>
        </button>
      </div>
    </div>
  )
}

