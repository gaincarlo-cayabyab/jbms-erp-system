'use client'

import { useState } from 'react'
import { Trash2, Plus, Minus, Edit2, Tag, ShoppingCart, X, Percent, DollarSign, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CartItem, CartDiscount, DiscountType } from '@/types/pos'

const PHP = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

interface Props {
  items: CartItem[]
  cartDiscount: CartDiscount | null
  onRemove: (productId: string) => void
  onUpdateQuantity: (productId: string, qty: number) => void
  onOverridePrice: (productId: string, newPrice: number) => void
  onApplyLineDiscount: (productId: string, discountAmt: number) => void
  onSetCartDiscount: (discount: CartDiscount | null) => void
  onClearCart: () => void
}

interface InlineEdit {
  productId: string
  field: 'price' | 'discount'
  value: string
}

export default function POSCart({
  items,
  cartDiscount,
  onRemove,
  onUpdateQuantity,
  onOverridePrice,
  onApplyLineDiscount,
  onSetCartDiscount,
  onClearCart,
}: Props) {
  const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null)
  const [showDiscountPanel, setShowDiscountPanel] = useState(false)
  const [discountType, setDiscountType] = useState<DiscountType>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [managerPin, setManagerPin] = useState('')
  const [pinRequired, setPinRequired] = useState(false)
  const PIN_THRESHOLD_PERCENT = 25  // Require manager PIN if >25%

  function commitInlineEdit() {
    if (!inlineEdit) return
    const numVal = parseFloat(inlineEdit.value)
    if (isNaN(numVal) || numVal < 0) { setInlineEdit(null); return }
    if (inlineEdit.field === 'price') {
      onOverridePrice(inlineEdit.productId, numVal)
    } else {
      const item = items.find(i => i.product.id === inlineEdit.productId)
      if (!item) { setInlineEdit(null); return }
      const lineTotal = item.unitPrice * item.quantity
      onApplyLineDiscount(inlineEdit.productId, Math.min(numVal, lineTotal))
    }
    setInlineEdit(null)
  }

  function applyCartDiscount() {
    const val = parseFloat(discountValue)
    if (isNaN(val) || val <= 0) return

    if (discountType === 'percentage' && val > PIN_THRESHOLD_PERCENT) {
      if (!pinRequired) { setPinRequired(true); return }
      // Simple PIN check (in production this would be server-validated)
      if (managerPin !== '1234') {
        alert('Invalid manager PIN. Use 1234 for demo.')
        return
      }
    }

    const labels: Record<DiscountType, string> = {
      percentage: `Discount ${val}%`,
      fixed: `Flat Discount ₱${val}`,
      senior_pwd: 'Senior/PWD 20%',
    }
    onSetCartDiscount({ type: discountType, value: val, label: labels[discountType] })
    setShowDiscountPanel(false)
    setDiscountValue('')
    setManagerPin('')
    setPinRequired(false)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-indigo-600" /> Active Cart
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-300 p-8">
          <ShoppingCart className="h-16 w-16 opacity-20" />
          <p className="text-sm font-medium text-slate-400">Cart is empty</p>
          <p className="text-xs text-slate-300 text-center">Tap a product from the catalog to add it here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-indigo-600" />
          Active Cart
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
            {items.length}
          </span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDiscountPanel(true)}
            className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition"
          >
            <Tag className="h-3.5 w-3.5" /> Discount
          </button>
          <button
            onClick={() => { if (window.confirm('Clear all items from cart?')) onClearCart() }}
            className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition"
            title="Clear cart"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Cart Items — min 56px row height per spec */}
      <div className="flex-1 overflow-y-auto">
        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>Item</span>
          <span className="text-center w-24">Qty</span>
          <span className="text-right w-24">Subtotal</span>
        </div>

        {items.map((item) => {
          const lineTotal = item.unitPrice * item.quantity - item.lineDiscount
          const isEditingPrice = inlineEdit?.productId === item.product.id && inlineEdit.field === 'price'
          const isEditingDiscount = inlineEdit?.productId === item.product.id && inlineEdit.field === 'discount'

          return (
            <div
              key={item.product.id}
              className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition min-h-[56px]"
            >
              {/* Item info */}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 leading-tight truncate">{item.product.item_name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-mono">{item.product.sku}</span>

                  {/* Unit price (editable) */}
                  {isEditingPrice ? (
                    <input
                      autoFocus
                      type="number"
                      min="0"
                      value={inlineEdit.value}
                      onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                      onBlur={commitInlineEdit}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitInlineEdit(); if (e.key === 'Escape') setInlineEdit(null) }}
                      className="w-20 rounded border border-indigo-300 bg-indigo-50 px-1.5 py-0.5 text-[11px] text-indigo-800 font-semibold focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => setInlineEdit({ productId: item.product.id, field: 'price', value: String(item.unitPrice) })}
                      className="flex items-center gap-0.5 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
                      title="Override price"
                    >
                      <Edit2 className="h-2.5 w-2.5" />
                      {PHP.format(item.unitPrice)}
                    </button>
                  )}

                  {/* Line discount */}
                  {isEditingDiscount ? (
                    <input
                      autoFocus
                      type="number"
                      min="0"
                      placeholder="₱ disc"
                      value={inlineEdit.value}
                      onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                      onBlur={commitInlineEdit}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitInlineEdit(); if (e.key === 'Escape') setInlineEdit(null) }}
                      className="w-20 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800 font-semibold focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => setInlineEdit({ productId: item.product.id, field: 'discount', value: String(item.lineDiscount || '') })}
                      className={cn(
                        'flex items-center gap-0.5 text-[10px] font-semibold transition',
                        item.lineDiscount > 0 ? 'text-amber-600 hover:text-amber-800' : 'text-slate-300 hover:text-amber-500'
                      )}
                      title="Apply line discount"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {item.lineDiscount > 0 ? `-${PHP.format(item.lineDiscount)}` : 'disc'}
                    </button>
                  )}
                </div>
              </div>

              {/* Qty Stepper — 48px touch targets per spec */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition active:scale-90 font-bold"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-bold text-slate-900 tabular-nums">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition active:scale-90 font-bold"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Line total + remove */}
              <div className="text-right w-24 flex items-center gap-1 justify-end">
                <span className={cn('text-sm font-bold tabular-nums', item.lineDiscount > 0 ? 'text-amber-700' : 'text-slate-900')}>
                  {PHP.format(lineTotal)}
                </span>
                <button
                  onClick={() => onRemove(item.product.id)}
                  className="ml-1 p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition"
                  aria-label="Remove item"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cart Discount Display */}
      {cartDiscount && (
        <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-200 flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            {cartDiscount.label} applied
          </span>
          <button
            onClick={() => onSetCartDiscount(null)}
            className="text-[10px] text-amber-600 hover:text-rose-600 font-semibold"
          >
            Remove
          </button>
        </div>
      )}

      {/* Discount Panel */}
      {showDiscountPanel && (
        <div className="border-t border-slate-200 bg-white p-4 shadow-lg shrink-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-slate-800">Apply Cart Discount</p>
            <button onClick={() => { setShowDiscountPanel(false); setPinRequired(false) }} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Discount Type Buttons */}
          <div className="flex gap-2 mb-3">
            {([
              { type: 'percentage' as DiscountType, icon: Percent, label: 'Percentage' },
              { type: 'fixed' as DiscountType, icon: DollarSign, label: 'Fixed ₱' },
              { type: 'senior_pwd' as DiscountType, icon: User, label: 'Senior/PWD' },
            ]).map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => { setDiscountType(type); if (type === 'senior_pwd') setDiscountValue('20') }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition',
                  discountType === type
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {discountType !== 'senior_pwd' && (
            <input
              type="number"
              min="0"
              max={discountType === 'percentage' ? '100' : undefined}
              placeholder={discountType === 'percentage' ? 'Enter % (e.g. 10)' : 'Enter amount (e.g. 100)'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
            />
          )}

          {pinRequired && (
            <div className="mb-2">
              <p className="text-xs text-amber-700 font-semibold mb-1">⚠️ Manager PIN required for large discounts</p>
              <input
                type="password"
                placeholder="Enter Manager PIN"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          )}

          <button
            onClick={applyCartDiscount}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition active:scale-[0.98]"
          >
            Apply Discount
          </button>
        </div>
      )}
    </div>
  )
}

