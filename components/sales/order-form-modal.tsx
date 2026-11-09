'use client'

import { useState, useEffect, useId } from 'react'
import {
  X,
  Plus,
  Trash2,
  FileText,
  User,
  Building,
  DollarSign,
  AlertCircle,
  Loader2,
  Calculator,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { recordCashTransaction } from '@/app/actions/cash'
import { Customer } from '@/types/customer'
import { OrderStatus, PaymentStatus, SalesOrder } from '@/types/sales'

interface OrderFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newOrder: SalesOrder) => void
  customers: Customer[]
}

interface LineItemDraft {
  id: string
  item_name: string
  quantity: number
  unit_price: number
}

export default function OrderFormModal({
  isOpen,
  onClose,
  onSuccess,
  customers,
}: OrderFormModalProps) {
  const [orderType, setOrderType] = useState<'quotation' | 'sales_order'>('quotation')
  const [orderNumber, setOrderNumber] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('Draft')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Pending')
  const [branch, setBranch] = useState('Main Branch')
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([
    { id: '1', item_name: 'Custom Tarpaulin Printing (3x4 ft)', quantity: 2, unit_price: 350 },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Generate initial Order/Quotation Number on open
  useEffect(() => {
    if (isOpen) {
      const prefix = orderType === 'quotation' ? 'QT' : 'SO'
      const datePart = new Date().toISOString().slice(2, 7).replace('-', '')
      const randPart = Math.floor(1000 + Math.random() * 9000)
      setOrderNumber(`${prefix}-${datePart}-${randPart}`)
    }
  }, [isOpen, orderType])

  if (!isOpen) return null

  // Calculate total amount from line items
  const totalAmount = lineItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0
  )

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        item_name: '',
        quantity: 1,
        unit_price: 0,
      },
    ])
  }

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length === 1) return
    setLineItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleLineItemChange = (
    id: string,
    field: 'item_name' | 'quantity' | 'unit_price',
    value: string | number
  ) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value }
        }
        return item
      })
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!orderNumber.trim()) {
      setErrorMessage('Order/Quotation number is required.')
      return
    }

    if (lineItems.length === 0 || !lineItems.some((i) => i.item_name.trim())) {
      setErrorMessage('Please add at least one line item with a description.')
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()

      // Primary insertion attempt with selected status
      let payloadStatus: string = orderStatus
      let payload = {
        order_number: orderNumber.trim(),
        customer_id: customerId || null,
        total_amount: totalAmount,
        payment_status: paymentStatus,
        order_status: payloadStatus,
        branch: branch || 'Main Branch',
      }

      let res = await supabase
        .from('sales_orders')
        .insert([payload])
        .select('*, customers(*)')
        .single()

      // If check constraint fails because 'Approved'/'Invoiced' are not in original schema:
      if (res.error && res.error.code === '23514') {
        // Fallback status mapping for legacy schema
        const fallbackStatus =
          orderStatus === 'Approved' || orderStatus === 'Invoiced'
            ? 'Confirmed'
            : orderStatus === 'Pending'
            ? 'Draft'
            : 'Draft'

        payload.order_status = fallbackStatus
        res = await supabase
          .from('sales_orders')
          .insert([payload])
          .select('*, customers(*)')
          .single()
      }

      if (res.error) {
        if (res.error.code === '42501') {
          throw new Error(
            'Supabase Row-Level Security blocked this order insert. Run the script "supabase/migrations/03_sales_orders_policies.sql" in your Supabase SQL editor to allow dev access.'
          )
        }
        if (res.error.code === '23505') {
          throw new Error(`An order with number "${orderNumber}" already exists.`)
        }
        throw new Error(res.error.message || 'Failed to save sales order.')
      }

      // Attach client-side line items to returned order
      const completeOrder: SalesOrder = {
        ...(res.data as SalesOrder),
        items: lineItems.map((item) => ({
          ...item,
          subtotal: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        })),
      }

      // Cash Management Hook: If paid on creation, record cash inflow
      if (paymentStatus === 'Paid' && totalAmount > 0) {
        try {
          const branchId = branch?.toLowerCase().includes('manila') ? 'manila_branch' : 'dagupan_main'
          const { data: targetAccount } = await supabase
            .from('cash_accounts')
            .select('id')
            .eq('branch_id', branchId)
            .in('account_type', ['bank_checking', 'vault', 'cash_drawer'])
            .limit(1)
            .maybeSingle()

          const { data: arCat } = await supabase
            .from('cash_categories')
            .select('id')
            .eq('category_name', 'Accounts Receivable Settlement')
            .maybeSingle()

          if (targetAccount?.id && arCat?.id) {
            await recordCashTransaction({
              branchId,
              cashAccountId: targetAccount.id,
              categoryId: arCat.id,
              flowType: 'inflow',
              amount: totalAmount,
              paymentMethod: 'bank_transfer',
              referenceNo: orderNumber,
              sourceModule: 'sales',
              payeeOrPayer: customers.find((c) => c.id === customerId)?.name || 'Client Order',
              notes: `Sales Order Settlement — Order #${orderNumber}`,
            })
          }
        } catch (cashErr) {
          console.warn('Could not record cash transaction for sales order:', cashErr)
        }
      }

      onSuccess(completeOrder)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(val)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="relative my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900">
                {orderType === 'quotation' ? 'Draft New Quotation' : 'Create Sales Order'}
              </h2>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                {orderType === 'quotation' ? 'Quotation' : 'Sales Order'}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Configure customer account, itemized line items, pricing, and fulfillment status.
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

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <p className="font-semibold">Unable to save order</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Document Type Selector & Order Number */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Document Type
              </label>
              <div className="flex rounded-lg border border-zinc-200 p-1 bg-zinc-50">
                <button
                  type="button"
                  onClick={() => setOrderType('quotation')}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                    orderType === 'quotation'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Quotation
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('sales_order')}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                    orderType === 'sales_order'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Sales Order
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Reference Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>
          </div>

          {/* Customer Selection & Branch */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Customer / Account <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                >
                  <option value="">Walk-in / General Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.contact_number ? `(${c.contact_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Store Branch
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                >
                  <option value="Main Branch">Main Branch (HQ)</option>
                  <option value="Branch 1 - North">Branch 1 - North Hub</option>
                  <option value="Branch 2 - South">Branch 2 - South Hub</option>
                </select>
              </div>
            </div>
          </div>

          {/* Order Status & Payment Status */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Order Status
              </label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                className="w-full rounded-lg border border-zinc-300 py-2 px-3 text-sm text-zinc-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              >
                <option value="Draft">Draft (Quotation)</option>
                <option value="Pending">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Invoiced">Invoiced / Billed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="In_Production">In Production</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full rounded-lg border border-zinc-300 py-2 px-3 text-sm text-zinc-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              >
                <option value="Pending">Pending (Unpaid)</option>
                <option value="Partial">Partial Payment</option>
                <option value="Paid">Fully Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-blue-600" />
                Line Items & Pricing
              </h3>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="inline-flex items-center gap-1 rounded-md bg-white border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-xs hover:bg-zinc-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {lineItems.map((item, index) => {
                const subtotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg bg-white p-2.5 border border-zinc-200 shadow-xs"
                  >
                    {/* Item Description */}
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Item name / specifications..."
                        value={item.item_name}
                        onChange={(e) =>
                          handleLineItemChange(item.id, 'item_name', e.target.value)
                        }
                        className="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="w-20">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) =>
                          handleLineItemChange(
                            item.id,
                            'quantity',
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        className="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 text-center focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="w-28 relative">
                      <span className="absolute left-2 top-1.5 text-xs text-zinc-400">₱</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) =>
                          handleLineItemChange(
                            item.id,
                            'unit_price',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full rounded-md border border-zinc-200 py-1.5 pl-5 pr-2 text-xs text-zinc-900 text-right focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Subtotal */}
                    <div className="w-24 text-right text-xs font-semibold text-zinc-800 self-center">
                      {formatCurrency(subtotal)}
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      disabled={lineItems.length === 1}
                      onClick={() => handleRemoveLineItem(item.id)}
                      className="rounded p-1 text-zinc-400 hover:text-red-600 disabled:opacity-30 self-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Total Footer */}
            <div className="flex items-center justify-between border-t border-zinc-200 pt-3 px-1">
              <span className="text-xs font-semibold text-zinc-600">Total Order Amount:</span>
              <span className="text-base font-bold text-blue-700">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Order...
                </>
              ) : (
                `Save ${orderType === 'quotation' ? 'Quotation' : 'Sales Order'}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

