'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Banknote, CreditCard, Smartphone, Building2, CheckCircle2, ArrowLeft, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PaymentMethod, CartDiscount } from '@/types/pos'
import { useDeviceMode, handlePosInputFocus } from '@/lib/device-context'
import { TouchKeypad } from '@/components/ui/touch-keypad'

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
  onBackToCart?: () => void
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'GCASH', label: 'GCash', icon: Smartphone },
  { id: 'CARD', label: 'Credit / Debit', icon: CreditCard },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
]

export default function POSCheckoutPanel({ totals, itemCount, cartDiscount, onCheckout, onBackToCart }: Props) {
  const { deviceMode } = useDeviceMode()
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH')
  const [tenderedInput, setTenderedInput] = useState<string>('')
  const [showKeypad, setShowKeypad] = useState(false)

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
      <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-800">Order Summary</h3>
          <p className="text-[10px] sm:text-[11px] text-slate-500">{itemCount} distinct line {itemCount === 1 ? 'item' : 'items'}</p>
        </div>
        {onBackToCart && (
          <button
            type="button"
            onClick={onBackToCart}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition active:scale-95"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Cart</span>
          </button>
        )}
      </div>

      {/* Calculations Breakdown — Compact for Tablet 800px height */}
      <div className="px-3.5 py-2 space-y-1.5 border-b border-slate-100 text-xs shrink-0">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-900 tabular-nums">{PHP.format(totals.subtotal)}</span>
        </div>

        {totals.discountAmount > 0 && (
          <div className="flex justify-between text-emerald-600 font-medium text-[11px]">
            <span>Total Discount {cartDiscount ? `(${cartDiscount.label})` : ''}</span>
            <span className="tabular-nums">-{PHP.format(totals.discountAmount)}</span>
          </div>
        )}

        <div className="pt-1.5 border-t border-slate-200 flex justify-between items-baseline">
          <span className="text-xs sm:text-sm font-bold text-slate-900">Grand Total</span>
          <span className="text-lg sm:text-xl font-extrabold text-indigo-700 tabular-nums">
            {PHP.format(totals.grandTotal)}
          </span>
        </div>
      </div>

      {/* Payment Method Selector — Optimized touch height */}
      <div className="p-2.5 border-b border-slate-100 shrink-0">
        <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Select Payment Method
        </label>
        <div className="grid grid-cols-2 gap-1.5">
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
                  'flex items-center gap-2 rounded-xl border p-2 transition active:scale-95 text-left min-h-[46px]',
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-xs ring-2 ring-indigo-500/20 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isSelected ? 'text-indigo-600' : 'text-slate-400')} />
                <span className="text-[11px] leading-tight truncate">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Cash Tendered Input & Change Display */}
      {selectedMethod === 'CASH' ? (
        <div className="p-2.5 border-b border-slate-100 space-y-2 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between">
            <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Amount Tendered (₱)
            </label>
            <button
              type="button"
              onClick={() => setShowKeypad((prev) => !prev)}
              className={cn(
                'flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border transition shadow-2xs',
                showKeypad || deviceMode === 'pos'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              )}
            >
              <Keyboard className="h-3 w-3" />
              <span>{showKeypad ? 'Hide Keypad' : 'Touch Keypad'}</span>
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₱</span>
            <input
              type="number"
              min="0"
              placeholder="0.00"
              value={tenderedInput}
              onChange={(e) => setTenderedInput(e.target.value)}
              onFocus={handlePosInputFocus}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-7 pr-3 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Touch Keypad Option for Counter Terminals */}
          {(showKeypad || deviceMode === 'pos') ? (
            <div className="pt-1">
              <TouchKeypad
                onKeyPress={(val) => {
                  if (val === '.' && tenderedInput.includes('.')) return
                  setTenderedInput((prev) => prev + val)
                }}
                onDelete={() => setTenderedInput((prev) => prev.slice(0, -1))}
                onClear={() => setTenderedInput('')}
                presets={[100, 200, 500, 1000]}
                onPresetSelect={(amt) => setTenderedInput(String(amt))}
              />
            </div>
          ) : (
            /* Quick Denomination Chips (Desktop view) */
            <div className="flex flex-wrap gap-1 pt-0.5">
              <button
                type="button"
                onClick={handleExact}
                className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Exact
              </button>
              {[100, 200, 500, 1000, 2000, 5000].map((denomination) => (
                <button
                  key={denomination}
                  type="button"
                  onClick={() => handleQuickAmount(denomination)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition"
                >
                  ₱{denomination}
                </button>
              ))}
            </div>
          )}

          {/* Change Due readout */}
          <div className="mt-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2 sm:p-2.5 flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-800">Change Due</span>
            <span className="text-base sm:text-lg font-extrabold text-emerald-700 tabular-nums">
              {PHP.format(changeDue)}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3 border-b border-slate-100 flex-1 flex flex-col justify-center items-center text-center text-slate-400">
          <div className="rounded-2xl bg-indigo-50 p-3 mb-2 text-indigo-600">
            <CreditCard className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold text-slate-700">Digital / Card Terminal Ready</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
            Charge exact amount {PHP.format(totals.grandTotal)} on external merchant device.
          </p>
        </div>
      )}

      {/* Complete Sale Action Button — Tactile trigger */}
      <div className="p-2.5 bg-slate-50 shrink-0">
        <button
          type="button"
          onClick={triggerCheckout}
          disabled={totals.grandTotal <= 0 || (selectedMethod === 'CASH' && !isExactOrGreater)}
          className={cn(
            'w-full min-h-[56px] rounded-2xl flex items-center justify-center gap-2 font-black text-white shadow-modern transition-all duration-150 active:scale-[0.98]',
            totals.grandTotal <= 0 || (selectedMethod === 'CASH' && !isExactOrGreater)
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 active:scale-95'
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs sm:text-sm uppercase tracking-wide">
            {selectedMethod === 'CASH' && !isExactOrGreater && totals.grandTotal > 0
              ? 'Enter Tendered Amount'
              : `Complete Sale (${PHP.format(totals.grandTotal)})`}
          </span>
        </button>
      </div>
    </div>
  )
}
