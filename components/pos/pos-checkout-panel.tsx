'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Banknote,
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle2,
  ArrowLeft,
  ShoppingBag,
  Package,
  Truck,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ChevronDown,
  Tag,
  X,
  Percent,
  DollarSign,
  Delete,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PaymentMethod, CartDiscount, DiscountType } from '@/types/pos'
import type { Customer } from '@/types/customer'
import { getLoyaltyBadge } from './pos-customer-selector'
import { handlePosInputFocus } from '@/lib/device-context'
import { soundEffects } from '@/lib/sound-effects'

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
  onSetCartDiscount?: (discount: CartDiscount | null) => void
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
  { id: 'CARD',          label: 'Card',            icon: CreditCard },
  { id: 'BANK_TRANSFER', label: 'Bank',            icon: Building2 },
]

const FULFILLMENT_TYPES = [
  {
    id:       'walk_in' as const,
    label:    'Walk-in',
    icon:     ShoppingBag,
    status:   'handed_over',
    activeClass:   'bg-emerald-600 text-white border-emerald-700',
    hoverClass:    'hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700',
  },
  {
    id:       'pickup' as const,
    label:    'Pickup',
    icon:     Package,
    status:   'pending_staging',
    activeClass:   'bg-amber-500 text-white border-amber-600',
    hoverClass:    'hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700',
  },
  {
    id:       'delivery' as const,
    label:    'Delivery',
    icon:     Truck,
    status:   'pending_dispatch',
    activeClass:   'bg-blue-600 text-white border-blue-700',
    hoverClass:    'hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700',
  },
]

const PAYMENT_TERMS = [
  { id: 'full_payment',    label: 'Full Payment' },
  { id: 'downpayment_50',  label: '50% Downpayment' },
  { id: 'custom_deposit',  label: 'Custom Deposit' },
  { id: 'pay_on_pickup',   label: 'Pay on Pickup' },
]

const COURIERS = ['Lalamove', 'J&T Express', 'Grab Express', 'LBC', 'JRS Express', 'In-House Rider']

export default function POSCheckoutPanel({
  totals,
  itemCount,
  cartDiscount,
  onSetCartDiscount,
  selectedCustomer,
  onCheckout,
  onSaveQuotation,
  onBackToCart,
}: Props) {
  // Payment: numpad is open and default
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH')
  const [tenderedInput, setTenderedInput]   = useState<string>('')
  const [showKeypad, setShowKeypad]         = useState(true)

  // Discount Modal State
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [discountType, setDiscountType]           = useState<DiscountType>('senior_pwd')
  const [discountValue, setDiscountValue]         = useState('20')
  const [managerPin, setManagerPin]               = useState('')
  const [pinRequired, setPinRequired]             = useState(false)
  const PIN_THRESHOLD_PERCENT = 25

  // Fulfillment
  const [fulfillmentType, setFulfillmentType] = useState<'walk_in' | 'pickup' | 'delivery'>('walk_in')
  const [paymentTerms, setPaymentTerms]       = useState('full_payment')
  const [customDeposit, setCustomDeposit]     = useState('')
  const [pickupDate, setPickupDate]           = useState('')

  // Customer (derived from selectedCustomer or manual inputs)
  const [customerName, setCustomerName]   = useState(selectedCustomer?.name || '')
  const [customerPhone, setCustomerPhone] = useState(selectedCustomer?.contact_number || '')

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

  // Derived values
  const tendered         = parseFloat(tenderedInput) || 0
  const changeDue        = Math.max(0, tendered - totals.grandTotal)
  const isExactOrGreater = tendered >= totals.grandTotal && totals.grandTotal > 0
  const needsCustomer    = fulfillmentType !== 'walk_in'

  const customerLoyalty = selectedCustomer
    ? getLoyaltyBadge(selectedCustomer.loyalty_tier, selectedCustomer.customer_type)
    : null

  function handleQuickAmount(amt: number) {
    soundEffects.keyClick(String(amt))
    setTenderedInput(String(amt))
  }

  function handleAddAmount(delta: number) {
    soundEffects.keyClick(String(delta))
    const current = parseFloat(tenderedInput) || 0
    setTenderedInput(String(current + delta))
  }

  function handleExact() {
    soundEffects.keyClick('E')
    setTenderedInput(String(Math.ceil(totals.grandTotal)))
  }

  function handleKeypadPress(val: string) {
    soundEffects.keyClick(val)
    if (val === '.' && tenderedInput.includes('.')) return
    setTenderedInput((prev) => prev + val)
  }

  function handleKeypadDelete() {
    soundEffects.backspace()
    setTenderedInput((prev) => prev.slice(0, -1))
  }

  function handleKeypadClear() {
    soundEffects.clear()
    setTenderedInput('')
  }

  // Handle applying a discount
  function handleApplyDiscount() {
    if (!onSetCartDiscount) return
    const val = parseFloat(discountValue)
    if (isNaN(val) || val <= 0) {
      toast.error('Enter a valid discount number.')
      return
    }

    if (discountType === 'percentage' && val > PIN_THRESHOLD_PERCENT) {
      if (!pinRequired) {
        setPinRequired(true)
        return
      }
      if (managerPin !== '1234') {
        soundEffects.error()
        toast.error('Invalid Manager PIN. (Use 1234 for demo)')
        return
      }
    }

    const labels: Record<DiscountType, string> = {
      senior_pwd: 'Senior/PWD 20%',
      percentage: `${val}% Discount`,
      fixed: `₱${val} Flat Discount`,
    }

    onSetCartDiscount({
      type: discountType,
      value: val,
      label: labels[discountType],
    })

    soundEffects.success()
    toast.success(`Discount applied: ${labels[discountType]}`)
    setShowDiscountModal(false)
    setDiscountValue('')
    setManagerPin('')
    setPinRequired(false)
  }

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
    const finalCustName =
      customerName.trim() ||
      selectedCustomer?.name ||
      (fulfillmentType === 'walk_in' ? 'Walk-in Customer' : undefined)
    const finalCustPhone = customerPhone.trim() || selectedCustomer?.contact_number || undefined

    return {
      fulfillmentType,
      fulfillmentStatus: ft.status,
      paymentTerms,
      amountPaid,
      balanceDue,
      pickupDate: fulfillmentType === 'pickup' ? (pickupDate || null) : null,
      customerId: selectedCustomer?.id || null,
      customerName: finalCustName,
      customerPhone: finalCustPhone,
      customerLoyaltyTier: selectedCustomer?.loyalty_tier,
      deliveryDetails:
        fulfillmentType === 'delivery'
          ? {
              recipientName: finalCustName,
              recipientPhone: finalCustPhone,
              shippingAddress: shippingAddress || undefined,
              courierName: courierName || undefined,
              shippingFee: parseFloat(shippingFee) || 0,
              dueDate: deliveryDue || null,
            }
          : undefined,
    }
  }

  function triggerCheckout() {
    if (totals.grandTotal <= 0) return
    const finalTendered = selectedMethod === 'CASH' ? tendered : totals.grandTotal

    if (fulfillmentType === 'walk_in' && selectedMethod === 'CASH' && !isExactOrGreater) {
      soundEffects.error()
      toast.error('Tendered amount must be equal to or greater than the total amount due.')
      return
    }

    if (needsCustomer && !customerName.trim() && !selectedCustomer?.name) {
      soundEffects.error()
      toast.error('Please specify a customer name for pickup / delivery orders.')
      return
    }

    soundEffects.success()
    onCheckout(selectedMethod, finalTendered, buildFulfillmentData())
  }

  function triggerQuotation() {
    if (totals.grandTotal <= 0) return
    soundEffects.keyClick('Q')
    onSaveQuotation?.(buildFulfillmentData())
  }

  const { amountPaid: depositNow, balanceDue: depositBalance } = computePaymentAmounts()

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 select-none">
      {/* ── Top Header Bar ────────────────────────────────────────────── */}
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-800">Order Summary</h3>
          <p className="text-[10px] text-slate-500">
            {itemCount} distinct {itemCount === 1 ? 'item' : 'items'} in cart
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

      {/* ── Calculations Breakdown (Subtotal + ALWAYS VISIBLE Discount + Grand Total) ── */}
      <div className="px-3.5 py-2 space-y-1.5 border-b border-slate-100 text-xs shrink-0 bg-white">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-900 tabular-nums">{PHP.format(totals.subtotal)}</span>
        </div>

        {/* ── Prominent Discount Line ── */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600 font-medium flex items-center gap-1">
            <Tag className="h-3 w-3 text-amber-600" />
            <span>Discount</span>
          </span>

          {totals.discountAmount > 0 && cartDiscount ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-bold text-[11px] tabular-nums">
                -{PHP.format(totals.discountAmount)}
                <span className="font-medium text-[10px] opacity-75">({cartDiscount.label})</span>
              </span>
              {onSetCartDiscount && (
                <button
                  type="button"
                  onClick={() => onSetCartDiscount(null)}
                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                  title="Remove Discount"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDiscountType('senior_pwd')
                setDiscountValue('20')
                setShowDiscountModal(true)
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg transition active:scale-95"
              title="Apply Senior/PWD, promo or manual discount"
            >
              <span>+ Add Discount</span>
            </button>
          )}
        </div>

        {/* Grand Total */}
        <div className="pt-1.5 border-t border-slate-200 flex justify-between items-baseline">
          <span className="text-xs sm:text-sm font-bold text-slate-900">Grand Total</span>
          <span className="text-xl sm:text-2xl font-black text-indigo-700 tabular-nums tracking-tight">
            {PHP.format(totals.grandTotal)}
          </span>
        </div>
      </div>

      {/* ── Payment Method Quick Selector (Compact Pills) ─────────────── */}
      <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
        <div className="grid grid-cols-4 gap-1">
          {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
            const isSelected = selectedMethod === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  soundEffects.keyClick(id)
                  setSelectedMethod(id)
                  if (id !== 'CASH') {
                    setTenderedInput(String(totals.grandTotal))
                  }
                }}
                className={cn(
                  'flex items-center justify-center gap-1 rounded-lg border py-1.5 px-1 text-center transition active:scale-95',
                  isSelected
                    ? 'border-indigo-600 bg-indigo-600 text-white font-bold shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'text-white' : 'text-slate-500')} />
                <span className="text-[10px] font-bold truncate">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── TENDERED AMOUNT & DEFAULT TOUCH KEYPAD (FIRST TO BE TYPED) ─── */}
      {selectedMethod === 'CASH' ? (
        <div className="px-3 py-2 border-b border-slate-100 space-y-1.5 shrink-0 bg-white">
          {/* Readout Bar: Tendered input + Change Due */}
          <div className="grid grid-cols-2 gap-1.5 items-center">
            {/* Tendered Input Field */}
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₱</span>
              <input
                type="number"
                min="0"
                placeholder="0.00"
                value={tenderedInput}
                onChange={(e) => setTenderedInput(e.target.value)}
                onFocus={handlePosInputFocus}
                className="w-full rounded-xl border-2 border-indigo-500 bg-indigo-50/30 py-1.5 pl-6 pr-2 text-sm sm:text-base font-black text-slate-900 focus:outline-none focus:bg-white tabular-nums"
              />
            </div>

            {/* Change Due Display */}
            <div
              className={cn(
                'rounded-xl border px-2.5 py-1.5 flex justify-between items-center transition',
                isExactOrGreater
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
              <span className="text-sm font-black tabular-nums">
                {PHP.format(changeDue)}
              </span>
            </div>
          </div>

          {/* Quick Cash Presets */}
          <div className="grid grid-cols-5 gap-1">
            <button
              type="button"
              onClick={handleExact}
              className="py-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:scale-95 border border-indigo-200 rounded-lg transition shadow-2xs select-none"
              title="Pay exact grand total"
            >
              Exact
            </button>
            <button
              type="button"
              onClick={() => handleAddAmount(100)}
              className="py-1 text-[10px] font-bold bg-white text-slate-700 hover:bg-slate-100 active:scale-95 border border-slate-200 rounded-lg transition shadow-2xs select-none"
            >
              +₱100
            </button>
            <button
              type="button"
              onClick={() => handleAddAmount(200)}
              className="py-1 text-[10px] font-bold bg-white text-slate-700 hover:bg-slate-100 active:scale-95 border border-slate-200 rounded-lg transition shadow-2xs select-none"
            >
              +₱200
            </button>
            <button
              type="button"
              onClick={() => handleAddAmount(500)}
              className="py-1 text-[10px] font-bold bg-white text-slate-700 hover:bg-slate-100 active:scale-95 border border-slate-200 rounded-lg transition shadow-2xs select-none"
            >
              +₱500
            </button>
            <button
              type="button"
              onClick={() => handleAddAmount(1000)}
              className="py-1 text-[10px] font-bold bg-white text-slate-700 hover:bg-slate-100 active:scale-95 border border-slate-200 rounded-lg transition shadow-2xs select-none"
            >
              +₱1k
            </button>
          </div>

          {/* 3×4 Touch Keypad Grid (DEFAULT VISIBLE / NO SCROLLING NEEDED) */}
          <div className="grid grid-cols-3 gap-1 pt-0.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="h-9 sm:h-10 text-base sm:text-lg font-black bg-white text-slate-800 rounded-lg border border-slate-200 shadow-2xs hover:bg-indigo-50 hover:border-indigo-300 active:scale-95 transition flex items-center justify-center select-none"
              >
                {digit}
              </button>
            ))}

            {/* Backspace Button */}
            <button
              type="button"
              onClick={handleKeypadDelete}
              className="h-9 sm:h-10 bg-rose-50 text-rose-700 hover:bg-rose-100 active:scale-95 border border-rose-200 rounded-lg transition flex items-center justify-center select-none shadow-2xs"
              title="Delete Digit"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          {/* Keypad Utility Bar: Clear & Hide Keypad toggle */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
            <button
              type="button"
              onClick={handleKeypadClear}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-600 font-bold px-1.5 py-0.5 rounded transition"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear Amount</span>
            </button>

            <button
              type="button"
              onClick={() => setShowKeypad((v) => !v)}
              className="text-slate-400 hover:text-slate-600 underline font-medium"
            >
              {showKeypad ? 'Compact Keypad' : 'Show Keypad'}
            </button>
          </div>
        </div>
      ) : (
        /* Digital / Card Terminal info */
        <div className="p-3 border-b border-slate-100 flex flex-col justify-center items-center text-center text-slate-500 shrink-0 bg-slate-50/50">
          <CreditCard className="h-6 w-6 text-indigo-600 mb-1" />
          <p className="text-xs font-bold text-slate-800">Card / Digital Payment</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Charge exact <span className="font-extrabold text-indigo-700">{PHP.format(totals.grandTotal)}</span> on terminal
          </p>
        </div>
      )}

      {/* ── Customer Tag & Order Type Row (Compact) ──────────────────── */}
      <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/40 shrink-0 space-y-1.5">
        {/* Customer Badge */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-medium">Customer:</span>
          <span className="font-bold text-slate-800 truncate max-w-[170px] flex items-center gap-1">
            <User className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="truncate">{customerName || selectedCustomer?.name || 'Walk-in Customer'}</span>
            {customerLoyalty && (
              <span className={cn('text-[9px] px-1 py-0.2 rounded border shrink-0', customerLoyalty.badgeClass)}>
                {customerLoyalty.label}
              </span>
            )}
          </span>
        </div>

        {/* Order Type Toggle (Walk-in, Pickup, Delivery) */}
        <div className="grid grid-cols-3 gap-1">
          {FULFILLMENT_TYPES.map((ft) => {
            const Icon     = ft.icon
            const isActive = fulfillmentType === ft.id
            return (
              <button
                key={ft.id}
                type="button"
                onClick={() => { setFulfillmentType(ft.id); setPaymentTerms('full_payment') }}
                className={cn(
                  'flex items-center justify-center gap-1 rounded-lg border py-1 px-1.5 text-center transition active:scale-95',
                  isActive
                    ? ft.activeClass
                    : `bg-white border-slate-200 text-slate-600 ${ft.hoverClass}`
                )}
              >
                <Icon className="h-3 w-3" />
                <span className="text-[10px] font-bold truncate">{ft.label}</span>
              </button>
            )
          })}
        </div>

        {/* Pickup / Delivery Extended Inputs if selected */}
        {needsCustomer && (
          <div className="space-y-1.5 pt-1">
            <input
              type="text"
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="tel"
              placeholder="Contact Phone #"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {fulfillmentType === 'pickup' && (
              <input
                type="datetime-local"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            )}
            {fulfillmentType === 'delivery' && (
              <div className="space-y-1">
                <textarea
                  placeholder="Delivery Address"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
                <div className="grid grid-cols-2 gap-1">
                  <select
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white py-1 px-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Courier</option>
                    {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    type="number"
                    min="0"
                    placeholder="Fee ₱"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Action Buttons ─────────────────────────────────────── */}
      <div className="p-2.5 bg-slate-50 mt-auto shrink-0 space-y-1.5">
        {/* Save as Quotation */}
        {onSaveQuotation && (
          <button
            type="button"
            onClick={triggerQuotation}
            disabled={totals.grandTotal <= 0}
            className={cn(
              'w-full py-1.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-all duration-150 active:scale-[0.98] border',
              totals.grandTotal <= 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wide">Save as Quotation</span>
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
            'w-full min-h-[50px] rounded-2xl flex items-center justify-center gap-2 font-black text-white shadow-modern transition-all duration-150 active:scale-[0.98]',
            totals.grandTotal <= 0 ||
            (fulfillmentType === 'walk_in' && selectedMethod === 'CASH' && !isExactOrGreater)
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 active:scale-95'
          )}
        >
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-xs sm:text-sm uppercase tracking-wide">
            {fulfillmentType === 'walk_in' && selectedMethod === 'CASH' && !isExactOrGreater && totals.grandTotal > 0
              ? 'Enter Tendered Amount'
              : fulfillmentType !== 'walk_in'
                ? `Confirm Order (${PHP.format(depositNow)} deposit)`
                : `Complete Sale (${PHP.format(totals.grandTotal)})`}
          </span>
        </button>
      </div>

      {/* ── DISCOUNT MODAL OVERLAY ─────────────────────────────────────── */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-amber-600" />
                <h4 className="text-sm font-bold text-slate-900">Apply Transaction Discount</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDiscountModal(false)
                  setPinRequired(false)
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick 1-Tap Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Quick Discount Presets
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('senior_pwd')
                    setDiscountValue('20')
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center p-2 rounded-xl border text-center transition active:scale-95',
                    discountType === 'senior_pwd'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  )}
                >
                  <span className="text-sm font-black">20%</span>
                  <span className="text-[10px] leading-tight">Senior / PWD</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('percentage')
                    setDiscountValue('10')
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center p-2 rounded-xl border text-center transition active:scale-95',
                    discountType === 'percentage' && discountValue === '10'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  )}
                >
                  <span className="text-sm font-black">10%</span>
                  <span className="text-[10px] leading-tight">VIP / Repeat</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('percentage')
                    setDiscountValue('5')
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center p-2 rounded-xl border text-center transition active:scale-95',
                    discountType === 'percentage' && discountValue === '5'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  )}
                >
                  <span className="text-sm font-black">5%</span>
                  <span className="text-[10px] leading-tight">Promo</span>
                </button>
              </div>
            </div>

            {/* Custom Discount Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Custom Discount
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountType('percentage')}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-bold rounded-lg border transition',
                    discountType === 'percentage'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  )}
                >
                  % Percentage
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('fixed')}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-bold rounded-lg border transition',
                    discountType === 'fixed'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  )}
                >
                  ₱ Fixed Amount
                </button>
              </div>

              <div className="relative mt-2">
                <input
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? 100 : undefined}
                  placeholder={discountType === 'percentage' ? 'Enter % (e.g. 15)' : 'Enter ₱ amount (e.g. 50)'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Manager PIN if >25% */}
            {pinRequired && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 space-y-1">
                <p className="text-xs text-amber-800 font-bold">⚠️ Manager Authorization Required</p>
                <input
                  type="password"
                  placeholder="Manager PIN"
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 bg-white py-1.5 px-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            {/* Dialog Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDiscountModal(false)
                  setPinRequired(false)
                }}
                className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyDiscount}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
