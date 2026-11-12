'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Banknote, CreditCard, Smartphone, Building2, CheckCircle2,
  ArrowLeft, Keyboard, ShoppingBag, Package, Truck,
  User, Phone, MapPin, Calendar, FileText, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PaymentMethod, CartDiscount } from '@/types/pos'
import type { Customer } from '@/types/customer'
import POSCustomerSelector from './pos-customer-selector'
import { useDeviceMode, handlePosInputFocus } from '@/lib/device-context'
import { TouchKeypad } from '@/components/ui/touch-keypad'

const PHP = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

interface Totals {
  subtotal: number
  discountAmount: number
  vatAmount: number
  grandTotal: number
}

export interface FulfillmentData {
  fulfillmentType: 'walk_in' | 'pickup' | 'delivery'
  fulfillmentStatus: string
  paymentTerms: string
  amountPaid: number
  balanceDue: number
  pickupDate?: string | null
  customerId?: string | null
  customerName?: string
  customerPhone?: string
  customerLoyaltyTier?: string
  deliveryDetails?: {
    recipientName?: string
    recipientPhone?: string
    shippingAddress?: string
    courierName?: string
    shippingFee?: number
    dueDate?: string | null
  }
}

interface Props {
  totals: Totals
  itemCount: number
  cartDiscount: CartDiscount | null
  selectedCustomer?: Customer | null
  onSelectCustomer?: (customer: Customer | null) => void
  onCheckout: (method: PaymentMethod, amountTendered: number, fulfillmentData: FulfillmentData) => void
  onSaveQuotation?: (fulfillmentData: FulfillmentData) => void
  onBackToCart?: () => void
}

const PAYMENT_METHODS: {
  id: PaymentMethod
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'CASH',          label: 'Cash',            icon: Banknote },
  { id: 'GCASH',         label: 'GCash',           icon: Smartphone },
  { id: 'CARD',          label: 'Credit / Debit',  icon: CreditCard },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer',   icon: Building2 },
]

const FULFILLMENT_TYPES = [
  {
    id:       'walk_in' as const,
    label:    'Walk-in',
    sublabel: 'Cash & Carry',
    icon:     ShoppingBag,
    color:    'emerald',
    status:   'handed_over',
    activeClass:   'bg-emerald-600 text-white border-emerald-700',
    hoverClass:    'hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700',
  },
  {
    id:       'pickup' as const,
    label:    'Store Pickup',
    sublabel: 'Agreed date',
    icon:     Package,
    color:    'amber',
    status:   'pending_staging',
    activeClass:   'bg-amber-500 text-white border-amber-600',
    hoverClass:    'hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700',
  },
  {
    id:       'delivery' as const,
    label:    'Delivery',
    sublabel: 'Ship to address',
    icon:     Truck,
    color:    'blue',
    status:   'pending_dispatch',
    activeClass:   'bg-blue-600 text-white border-blue-700',
    hoverClass:    'hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700',
  },
]

const PAYMENT_TERMS = [
  { id: 'full_payment',    label: 'Full Payment' },
  { id: 'downpayment_50', label: '50% Downpayment' },
  { id: 'custom_deposit',  label: 'Custom Deposit' },
  { id: 'pay_on_pickup',   label: 'Pay on Pickup' },
]

const COURIERS = ['Lalamove', 'J&T Express', 'Grab Express', 'LBC', 'JRS Express', 'In-House Rider']

export default function POSCheckoutPanel({
  totals,
  itemCount,
  cartDiscount,
  selectedCustomer,
  onSelectCustomer,
  onCheckout,
  onSaveQuotation,
  onBackToCart,
}: Props) {
  const { deviceMode } = useDeviceMode()

  // Payment
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH')
  const [tenderedInput, setTenderedInput]   = useState<string>('')
  const [showKeypad, setShowKeypad]         = useState(false)

  // Fulfillment
  const [fulfillmentType, setFulfillmentType] = useState<'walk_in' | 'pickup' | 'delivery'>('walk_in')
  const [paymentTerms, setPaymentTerms]       = useState('full_payment')
  const [customDeposit, setCustomDeposit]     = useState('')
  const [pickupDate, setPickupDate]           = useState('')

  // Customer
  const [customerName, setCustomerName]   = useState(selectedCustomer?.name || '')
  const [customerPhone, setCustomerPhone] = useState(selectedCustomer?.contact_number || '')

  // Sync when selectedCustomer changes from cart
  useEffect(() => {
    if (selectedCustomer) {
      setCustomerName(selectedCustomer.name)
      setCustomerPhone(selectedCustomer.contact_number || '')
      if (selectedCustomer.address) {
        setShippingAddress(selectedCustomer.address)
      }
    } else {
      setCustomerName('')
      setCustomerPhone('')
    }
  }, [selectedCustomer])

  // Delivery
  const [shippingAddress, setShippingAddress] = useState('')
  const [courierName, setCourierName]         = useState('')
  const [shippingFee, setShippingFee]         = useState('')
  const [deliveryDue, setDeliveryDue]         = useState('')

  // ── Derived values ────────────────────────────────────────────────────────
  const tendered        = parseFloat(tenderedInput) || 0
  const changeDue       = Math.max(0, tendered - totals.grandTotal)
  const isExactOrGreater = tendered >= totals.grandTotal && totals.grandTotal > 0
  const needsCustomer   = fulfillmentType !== 'walk_in'

  function computePaymentAmounts(): { amountPaid: number; balanceDue: number } {
    if (fulfillmentType === 'walk_in') {
      return { amountPaid: totals.grandTotal, balanceDue: 0 }
    }
    if (paymentTerms === 'full_payment') {
      return { amountPaid: totals.grandTotal, balanceDue: 0 }
    }
    if (paymentTerms === 'downpayment_50') {
      const paid = totals.grandTotal * 0.5
      return { amountPaid: paid, balanceDue: totals.grandTotal - paid }
    }
    if (paymentTerms === 'custom_deposit') {
      const paid = parseFloat(customDeposit) || 0
      return { amountPaid: paid, balanceDue: Math.max(0, totals.grandTotal - paid) }
    }
    if (paymentTerms === 'pay_on_pickup') {
      return { amountPaid: 0, balanceDue: totals.grandTotal }
    }
    return { amountPaid: totals.grandTotal, balanceDue: 0 }
  }

  function buildFulfillmentData(): FulfillmentData {
    const { amountPaid, balanceDue } = computePaymentAmounts()
    const ft = FULFILLMENT_TYPES.find((f) => f.id === fulfillmentType)!
    const finalCustName = customerName.trim() || selectedCustomer?.name || (fulfillmentType === 'walk_in' ? 'Walk-in Customer' : undefined)
    const finalCustPhone = customerPhone.trim() || selectedCustomer?.contact_number || undefined

    return {
      fulfillmentType,
      fulfillmentStatus: ft.status,
      paymentTerms,
      amountPaid,
      balanceDue,
      pickupDate: fulfillmentType === 'pickup' ? (pickupDate || null) : null,
      customerId: selectedCustomer?.id || null,
      customerName:  finalCustName,
      customerPhone: finalCustPhone,
      customerLoyaltyTier: selectedCustomer?.loyalty_tier,
      deliveryDetails:
        fulfillmentType === 'delivery'
          ? {
              recipientName:   finalCustName,
              recipientPhone:  finalCustPhone,
              shippingAddress: shippingAddress || undefined,
              courierName:     courierName || undefined,
              shippingFee:     parseFloat(shippingFee) || 0,
              dueDate:         deliveryDue || null,
            }
          : undefined,
    }
  }

  function handleQuickAmount(amt: number) { setTenderedInput(String(amt)) }
  function handleExact() { setTenderedInput(String(Math.ceil(totals.grandTotal))) }

  function triggerCheckout() {
    if (totals.grandTotal <= 0) return
    if (fulfillmentType === 'walk_in') {
      const finalTendered = selectedMethod === 'CASH' ? tendered : totals.grandTotal
      if (selectedMethod === 'CASH' && finalTendered < totals.grandTotal) {
        toast.error('Tendered amount must be ≥ Grand Total.')
        return
      }
      onCheckout(selectedMethod, finalTendered, buildFulfillmentData())
    } else {
      const { amountPaid } = computePaymentAmounts()
      onCheckout(selectedMethod, amountPaid, buildFulfillmentData())
    }
  }

  function triggerQuotation() {
    if (!onSaveQuotation) return
    if (totals.grandTotal <= 0) return
    onSaveQuotation(buildFulfillmentData())
  }

  const { amountPaid: depositNow, balanceDue: depositBalance } = computePaymentAmounts()

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 overflow-y-auto">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-800">Order Summary</h3>
          <p className="text-[10px] sm:text-[11px] text-slate-500">
            {itemCount} distinct line {itemCount === 1 ? 'item' : 'items'}
          </p>
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

      {/* ── Totals ────────────────────────────────────────────────────── */}
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

      {/* ── Customer / Loyalty Profile ──────────────────────────────── */}
      {onSelectCustomer && (
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Customer / Loyalty Profile
          </label>
          <POSCustomerSelector
            selectedCustomer={selectedCustomer ?? null}
            onSelectCustomer={onSelectCustomer}
            compact
          />
        </div>
      )}

      {/* ── Fulfillment Type Selector ─────────────────────────────────── */}
      <div className="px-3 py-2.5 border-b border-slate-100 shrink-0">
        <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Order Type
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {FULFILLMENT_TYPES.map((ft) => {
            const Icon     = ft.icon
            const isActive = fulfillmentType === ft.id
            return (
              <button
                key={ft.id}
                type="button"
                onClick={() => { setFulfillmentType(ft.id); setPaymentTerms('full_payment') }}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-xl border p-2 text-center transition active:scale-95',
                  isActive
                    ? ft.activeClass
                    : `bg-slate-50 border-slate-200 text-slate-600 ${ft.hoverClass}`
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[9px] font-bold leading-tight">{ft.label}</span>
                <span className={cn(
                  'text-[8px] leading-tight',
                  isActive ? 'text-white/80' : 'text-slate-400'
                )}>
                  {ft.sublabel}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Customer Info (Pickup & Delivery) ────────────────────────── */}
      {needsCustomer && (
        <div className="px-3 py-2 border-b border-slate-100 space-y-1.5 shrink-0">
          <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
            Customer Info
          </label>
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Full Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              onFocus={handlePosInputFocus}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <input
              type="tel"
              placeholder="Phone Number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              onFocus={handlePosInputFocus}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>
      )}

      {/* ── Agreed Pickup Date ────────────────────────────────────────── */}
      {fulfillmentType === 'pickup' && (
        <div className="px-3 py-2 border-b border-slate-100 shrink-0">
          <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Agreed Pickup Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <input
              type="datetime-local"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>
      )}

      {/* ── Delivery Details ──────────────────────────────────────────── */}
      {fulfillmentType === 'delivery' && (
        <div className="px-3 py-2 border-b border-slate-100 space-y-1.5 shrink-0">
          <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
            Delivery Details
          </label>
          <div className="relative">
            <MapPin className="absolute left-2.5 top-2 h-3 w-3 text-slate-400 pointer-events-none" />
            <textarea
              placeholder="Delivery Address"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
            />
          </div>
          <div className="relative">
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <select
              value={courierName}
              onChange={(e) => setCourierName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-7 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white appearance-none"
            >
              <option value="">Select Courier / Rider</option>
              {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="number"
              min="0"
              placeholder="Shipping Fee ₱"
              value={shippingFee}
              onChange={(e) => setShippingFee(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            <input
              type="date"
              value={deliveryDue}
              onChange={(e) => setDeliveryDue(e.target.value)}
              title="Delivery Due Date"
              className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>
      )}

      {/* ── Payment Terms (Pickup & Delivery only) ────────────────────── */}
      {needsCustomer && (
        <div className="px-3 py-2 border-b border-slate-100 shrink-0">
          <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Payment Terms
          </label>
          <div className="grid grid-cols-2 gap-1">
            {PAYMENT_TERMS.map((pt) => (
              <button
                key={pt.id}
                type="button"
                onClick={() => setPaymentTerms(pt.id)}
                className={cn(
                  'rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition active:scale-95',
                  paymentTerms === pt.id
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300'
                )}
              >
                {pt.label}
              </button>
            ))}
          </div>

          {paymentTerms === 'custom_deposit' && (
            <div className="mt-1.5 relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₱</span>
              <input
                type="number"
                min="0"
                placeholder="Deposit amount"
                value={customDeposit}
                onChange={(e) => setCustomDeposit(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-6 pr-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          )}

          {depositBalance > 0 && (
            <div className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 p-2 flex justify-between text-xs">
              <span className="text-amber-700 font-semibold">
                Collect now:{' '}
                <span className="font-black">{PHP.format(depositNow)}</span>
              </span>
              <span className="text-slate-500">Balance: {PHP.format(depositBalance)}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Payment Method Selector ───────────────────────────────────── */}
      <div className="p-2.5 border-b border-slate-100 shrink-0">
        <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Payment Method
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
            const isSelected = selectedMethod === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedMethod(id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border p-2 text-left transition active:scale-95',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'text-white' : 'text-slate-500')} />
                <span className="text-[10px] font-bold truncate">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tendered Amount (walk-in cash) ────────────────────────────── */}
      {fulfillmentType === 'walk_in' && selectedMethod === 'CASH' && (
        <div className="p-3 border-b border-slate-100 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Tendered Amount
            </label>
            <button
              type="button"
              onClick={() => setShowKeypad((v) => !v)}
              className={cn(
                'flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition',
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

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2 sm:p-2.5 flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-800">Change Due</span>
            <span className="text-base sm:text-lg font-extrabold text-emerald-700 tabular-nums">
              {PHP.format(changeDue)}
            </span>
          </div>
        </div>
      )}

      {/* Non-cash walk-in info */}
      {fulfillmentType === 'walk_in' && selectedMethod !== 'CASH' && (
        <div className="p-3 border-b border-slate-100 flex flex-col justify-center items-center text-center text-slate-400 shrink-0">
          <div className="rounded-2xl bg-indigo-50 p-3 mb-2 text-indigo-600">
            <CreditCard className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold text-slate-700">Digital / Card Terminal Ready</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
            Charge exact {PHP.format(totals.grandTotal)} on external merchant device.
          </p>
        </div>
      )}

      {/* ── Bottom Action Buttons ─────────────────────────────────────── */}
      <div className="p-2.5 bg-slate-50 mt-auto shrink-0 space-y-2">
        {/* Save as Quotation */}
        {onSaveQuotation && (
          <button
            type="button"
            onClick={triggerQuotation}
            disabled={totals.grandTotal <= 0}
            className={cn(
              'w-full min-h-[42px] rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all duration-150 active:scale-[0.98] border',
              totals.grandTotal <= 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
            )}
          >
            <FileText className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Save as Quotation</span>
          </button>
        )}

        {/* Complete Sale / Confirm Order */}
        <button
          type="button"
          onClick={triggerCheckout}
          disabled={
            totals.grandTotal <= 0 ||
            (fulfillmentType === 'walk_in' && selectedMethod === 'CASH' && !isExactOrGreater)
          }
          className={cn(
            'w-full min-h-[56px] rounded-2xl flex items-center justify-center gap-2 font-black text-white shadow-modern transition-all duration-150 active:scale-[0.98]',
            totals.grandTotal <= 0 ||
            (fulfillmentType === 'walk_in' && selectedMethod === 'CASH' && !isExactOrGreater)
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 active:scale-95'
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs sm:text-sm uppercase tracking-wide">
            {fulfillmentType === 'walk_in' && selectedMethod === 'CASH' && !isExactOrGreater && totals.grandTotal > 0
              ? 'Enter Tendered Amount'
              : fulfillmentType !== 'walk_in'
                ? `Confirm Order (${PHP.format(depositNow)} deposit)`
                : `Complete Sale (${PHP.format(totals.grandTotal)})`}
          </span>
        </button>
      </div>
    </div>
  )
}
