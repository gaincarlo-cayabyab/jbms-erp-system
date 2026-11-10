'use client'

import { X, Printer, Building, User, Calendar, FileText, CheckCircle2, Clock, Edit2, Trash2, Ban } from 'lucide-react'
import { SalesOrder } from '@/types/sales'

interface OrderDetailModalProps {
  order: SalesOrder | null
  onClose: () => void
  onEdit?: (order: SalesOrder) => void
  onDelete?: (order: SalesOrder) => void
  onCancel?: (order: SalesOrder) => void
}

export default function OrderDetailModal({
  order,
  onClose,
  onEdit,
  onDelete,
  onCancel,
}: OrderDetailModalProps) {
  if (!order) return null

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(Number(val) || 0)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="relative my-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 font-mono">
                {order.order_number}
              </h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                {order.order_status}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Created on {formatDate(order.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 transition"
              title="Print document"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Customer Information
              </span>
              <p className="mt-1 font-semibold text-zinc-900">
                {order.customers?.name || order.recipient_name || 'Walk-in Customer'}
              </p>
              {(order.customers?.contact_number || order.recipient_phone) && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  📞 {order.customers?.contact_number || order.recipient_phone}
                </p>
              )}
              {order.customers?.email && (
                <p className="text-xs text-zinc-500">✉️ {order.customers.email}</p>
              )}
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Payment & Fulfillment
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    order.payment_status === 'Paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.payment_status === 'Partial'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-zinc-100 text-zinc-800'
                  }`}
                >
                  {order.payment_status}
                </span>
                {order.fulfillment_type && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    {order.fulfillment_type === 'walk_in' ? '🛍️ Cash & Carry' :
                     order.fulfillment_type === 'pickup' ? '📦 Store Pickup' :
                     '🚚 Delivery'}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Branch: {order.branch || 'Main Branch'}</p>
            </div>
          </div>

          {/* Fulfillment details: Pickup or Delivery */}
          {order.fulfillment_type === 'pickup' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Store Pickup Details
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700">
                <div>
                  <span className="text-slate-500">Agreed Pickup: </span>
                  <span className="font-semibold text-slate-900">
                    {order.pickup_date ? formatDate(order.pickup_date) : 'Pending scheduling'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Payment Terms: </span>
                  <span className="font-semibold text-slate-900">{order.payment_terms || 'Full payment'}</span>
                </div>
                {order.balance_due !== undefined && Number(order.balance_due) > 0 && (
                  <div className="col-span-2 flex justify-between pt-1 border-t border-amber-200 font-medium">
                    <span className="text-amber-800">Deposit Paid: {formatCurrency(order.amount_paid || 0)}</span>
                    <span className="text-rose-700 font-bold">Balance Due: {formatCurrency(order.balance_due)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {order.fulfillment_type === 'delivery' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                Delivery & Shipment Tracking
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-700">
                <div>
                  <span className="text-slate-500">Recipient: </span>
                  <span className="font-semibold text-slate-900">{order.recipient_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Phone: </span>
                  <span className="font-semibold text-slate-900">{order.recipient_phone || 'N/A'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500">Address: </span>
                  <span className="font-semibold text-slate-900">{order.shipping_address || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Courier: </span>
                  <span className="font-semibold text-slate-900">{order.courier_name || 'In-House'}</span>
                </div>
                {order.tracking_number && (
                  <div>
                    <span className="text-slate-500">Tracking #: </span>
                    <span className="font-mono font-bold text-indigo-700">{order.tracking_number}</span>
                  </div>
                )}
                {order.due_date && (
                  <div>
                    <span className="text-slate-500">Delivery Due: </span>
                    <span className="font-semibold text-slate-900">{formatDate(order.due_date)}</span>
                  </div>
                )}
                {order.shipping_fee !== undefined && Number(order.shipping_fee) > 0 && (
                  <div>
                    <span className="text-slate-500">Shipping Fee: </span>
                    <span className="font-semibold text-slate-900">{formatCurrency(order.shipping_fee)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Line items if available */}
          {order.items && order.items.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Itemized Breakdown
              </h3>
              <div className="rounded-xl border border-zinc-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
                    <tr>
                      <th className="px-4 py-2.5">Item</th>
                      <th className="px-3 py-2.5 text-center">Qty</th>
                      <th className="px-3 py-2.5 text-right">Unit Price</th>
                      <th className="px-4 py-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {order.items.map((it) => (
                      <tr key={it.id}>
                        <td className="px-4 py-2 font-medium text-zinc-900">{it.item_name}</td>
                        <td className="px-3 py-2 text-center">{it.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(it.unit_price)}</td>
                        <td className="px-4 py-2 text-right font-semibold">
                          {formatCurrency(it.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Total Bar */}
          <div className="flex items-center justify-between rounded-xl bg-blue-50 p-4 border border-blue-100">
            <div>
              <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
                Total Payable Amount
              </span>
              <p className="text-[11px] text-blue-700">Inclusive of all applicable items & fees</p>
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(order.total_amount)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-6 py-3.5 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onEdit(order)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Order</span>
              </button>
            )}
            {onCancel && order.order_status !== 'Cancelled' && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onCancel(order)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Cancel / Void</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onDelete(order)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-900 transition"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  )
}

