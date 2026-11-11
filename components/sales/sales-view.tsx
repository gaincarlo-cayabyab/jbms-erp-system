'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import DashboardShell from '@/components/dashboard-shell'
import SalesSummaryCards from './sales-summary-cards'
import OrderFormModal from './order-form-modal'
import OrderDetailModal from './order-detail-modal'
import { createClient } from '@/lib/supabase/client'
import { Customer } from '@/types/customer'
import { SalesOrder, OrderStatus, PaymentStatus } from '@/types/sales'
import {
  FileText,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Building,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  X,
  Eye,
  FileCheck,
  Receipt,
  Edit2,
  Trash2,
  Ban,
} from 'lucide-react'
import { useConfirm } from '@/components/ui/confirm-dialog'
import ManagerPinModal from '@/components/ui/manager-pin-modal'

export default function SalesView() {
  const confirm = useConfirm()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'quotes' | 'orders' | 'pos'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pendingDeleteOrder, setPendingDeleteOrder] = useState<SalesOrder | null>(null)
  const [isPending, startTransition] = useTransition()

  // URL query params: e.g. /sales?new=true
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true)
    }
  }, [searchParams])

  // Fetch orders and customers from Supabase
  const loadData = async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const supabase = createClient()

      // Fetch sales_orders with joined customer and line items
      const { data: ordersData, error: ordersError } = await supabase
        .from('sales_orders')
        .select('*, customers(*), items:sales_order_items(*)')
        .order('created_at', { ascending: false })

      if (ordersError) throw new Error(ordersError.message)

      // Fetch customers for selector
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true })

      if (customersError) {
        console.warn('Customer list warning:', customersError.message)
      }

      setOrders((ordersData as SalesOrder[]) || [])
      setCustomers((customersData as Customer[]) || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch sales data.'
      setFetchError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOrderSaved = (savedOrder: SalesOrder, isEdit?: boolean) => {
    if (isEdit) {
      setOrders((prev) =>
        prev.map((o) => (o.id === savedOrder.id ? savedOrder : o))
      )
      toast.success(`Order "${savedOrder.order_number}" updated successfully.`)
    } else {
      setOrders((prev) => [savedOrder, ...prev])
      toast.success(`Order/Quotation "${savedOrder.order_number}" created successfully.`)
    }
    setEditingOrder(null)
  }

  const handleEditOrder = (order: SalesOrder) => {
    setEditingOrder(order)
    setIsModalOpen(true)
  }

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(Number(val) || 0)
  }

  const handleDeleteOrder = (order: SalesOrder) => {
    setPendingDeleteOrder(order)
    setPinModalOpen(true)
  }

  const handleAuthorizedDelete = async ({
    authorizedBy,
    role,
    reason,
  }: {
    authorizedBy: string
    role: string
    reason: string
  }) => {
    if (!pendingDeleteOrder) return
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('delete_sales_order_with_reversal', {
        p_order_id: pendingDeleteOrder.id,
        p_authorized_by: `${authorizedBy} (${role})`,
        p_reason: reason,
      })

      if (error) throw new Error(error.message)
      if (data && typeof data === 'object' && 'success' in data && !(data as { success: boolean }).success) {
        throw new Error((data as { error?: string }).error || 'Failed to delete order')
      }

      setOrders((prev) => prev.filter((o) => o.id !== pendingDeleteOrder.id))
      if (selectedOrder?.id === pendingDeleteOrder.id) {
        setSelectedOrder(null)
      }
      toast.success(
        `Order ${pendingDeleteOrder.order_number} deleted. Inventory stock & cash drawer reconciled.`
      )
      setPinModalOpen(false)
      setPendingDeleteOrder(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete order'
      toast.error(`Error deleting order: ${msg}`)
      throw err // allow ManagerPinModal to show the error message
    }
  }

  const handleCancelOrder = async (order: SalesOrder) => {
    const ok = await confirm({
      title: `Cancel Order ${order.order_number}?`,
      message: `Mark this order as Cancelled? This preserves the audit trail while voiding the transaction.`,
      confirmText: 'Cancel Order',
      variant: 'warning',
    })
    if (!ok) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('sales_orders')
        .update({ order_status: 'Cancelled' })
        .eq('id', order.id)
        .select('*, customers(*)')
        .single()

      if (error) throw new Error(error.message)

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? (data as SalesOrder) : o))
      )
      toast.success(`Order ${order.order_number} marked as Cancelled.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel order'
      toast.error(`Error cancelling order: ${msg}`)
    }
  }

  // Filtered and searched orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === 'quotes') {
        const isQuote =
          order.order_type === 'quotation' ||
          order.order_number.startsWith('QT') ||
          order.order_status === 'Draft'
        if (!isQuote) return false
      }
      if (activeTab === 'orders') {
        const isOrder =
          order.order_type !== 'quotation' &&
          !order.order_number.startsWith('QT') &&
          order.order_status !== 'Draft'
        if (!isOrder) return false
      }
      if (activeTab === 'pos') {
        const isPos = order.order_number.startsWith('INV-') || order.branch?.includes('POS')
        if (!isPos) return false
      }

      // Text search
      const q = searchQuery.toLowerCase().trim()
      const customerName = (order.customers?.name || order.recipient_name || '').toLowerCase()
      const orderNum = order.order_number.toLowerCase()
      const branchName = order.branch?.toLowerCase() || ''

      const matchesSearch =
        !q ||
        orderNum.includes(q) ||
        customerName.includes(q) ||
        branchName.includes(q)

      if (!matchesSearch) return false

      // Status filter
      if (statusFilter !== 'all' && order.order_status !== statusFilter) {
        return false
      }

      // Payment filter
      if (paymentFilter !== 'all' && order.payment_status !== paymentFilter) {
        return false
      }

      return true
    })
  }, [orders, searchQuery, statusFilter, paymentFilter, activeTab])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Draft':
        return 'bg-zinc-100 text-zinc-700 border-zinc-200'
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'Approved':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Invoiced':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Confirmed':
        return 'bg-teal-100 text-teal-800 border-teal-200'
      case 'In_Production':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      case 'Ready':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'Delivered':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200'
    }
  }

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Partial':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'Pending':
        return 'bg-zinc-50 text-zinc-600 border-zinc-200'
      case 'Overdue':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-zinc-50 text-zinc-600 border-zinc-200'
    }
  }

  return (
    <DashboardShell>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Sales & Quotations
              </h1>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                Module 2
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Manage estimates, sales orders, itemized line items, and payment fulfillment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  loadData()
                })
              }}
              disabled={isLoading || isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition disabled:opacity-50"
              title="Refresh Sales Orders"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Direct Link to POS Cashier */}
            <Link
              href="/pos"
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 transition active:scale-95"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>🛒 Open POS Cashier</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Draft Order / Quote</span>
            </button>
          </div>
        </div>

        {/* Key Metrics Summary Cards */}
        <SalesSummaryCards orders={orders} isLoading={isLoading} />

        {/* Error notification */}
        {fetchError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to fetch sales orders from Supabase</p>
              <p className="mt-0.5 text-xs text-red-700">{fetchError}</p>
              <p className="mt-2 text-xs text-red-600">
                Execute the script at &quot;supabase/migrations/03_sales_orders_policies.sql&quot; in your Supabase SQL Editor if testing in dev mode.
              </p>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {/* Tabs & Controls */}
          <div className="border-b border-zinc-200 bg-zinc-50/50">
            {/* Top row: Tabs */}
            <div className="flex border-b border-zinc-200 px-4 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                  activeTab === 'all'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                All Documents ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('quotes')}
                className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                  activeTab === 'quotes'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Quotations (
                {
                  orders.filter(
                    (o) =>
                      o.order_type === 'quotation' ||
                      o.order_number.startsWith('QT') ||
                      o.order_status === 'Draft'
                  ).length
                }
                )
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                  activeTab === 'orders'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Confirmed / Invoiced Orders (
                {
                  orders.filter(
                    (o) =>
                      o.order_type !== 'quotation' &&
                      !o.order_number.startsWith('QT') &&
                      o.order_status !== 'Draft'
                  ).length
                }
                )
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'pos'
                    ? 'border-rose-600 text-rose-600 font-bold'
                    : 'border-transparent text-zinc-500 hover:text-rose-600'
                }`}
              >
                <Receipt className="h-3 w-3" />
                POS Counter Sales (
                {
                  orders.filter(
                    (o) => o.order_number.startsWith('INV-') || o.branch?.includes('POS')
                  ).length
                }
                )
              </button>
            </div>

            {/* Bottom row: Search & Filters */}
            <div className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by order #, customer, or branch..."
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-9 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Order Status */}
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-zinc-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-medium text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All Order Statuses</option>
                    <option value="Draft">Draft (Quotation)</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Invoiced">Invoiced</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="In_Production">In Production</option>
                  </select>
                </div>

                {/* Payment Status */}
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" />
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-medium text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All Payment Statuses</option>
                    <option value="Paid">Fully Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Pending">Pending (Unpaid)</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>

                {/* Reset Filters */}
                {(searchQuery || statusFilter !== 'all' || paymentFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('all')
                      setPaymentFilter('all')
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Order / Quotation #
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Payment
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Total Amount
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Branch
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Date Created
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-28 rounded bg-zinc-200" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-36 rounded bg-zinc-200" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 w-20 rounded-full bg-zinc-200" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 w-16 rounded-full bg-zinc-200" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="h-4 w-20 rounded bg-zinc-200 ml-auto" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 rounded bg-zinc-200" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="h-3 w-20 rounded bg-zinc-200 ml-auto" />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="h-6 w-16 rounded bg-zinc-200 mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-zinc-50/70 transition-colors cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        {/* Order Number */}
                        <td className="px-6 py-4 font-medium text-zinc-900">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-zinc-400" />
                            <span className="font-mono text-xs font-semibold text-blue-700">
                              {order.order_number}
                            </span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-900 truncate max-w-xs">
                            {order.customers?.name || order.recipient_name || 'Walk-in Customer'}
                          </div>
                          {(order.customers?.contact_number || order.recipient_phone) && (
                            <p className="text-xs text-zinc-500">
                              {order.customers?.contact_number || order.recipient_phone}
                            </p>
                          )}
                        </td>

                        {/* Order Status & Fulfillment */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getOrderStatusBadge(
                                order.order_status
                              )}`}
                            >
                              {order.order_status}
                            </span>
                            {order.fulfillment_type && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                                {order.fulfillment_type === 'walk_in' ? '🛍️ Cash & Carry' :
                                 order.fulfillment_type === 'pickup' ? '📦 Store Pickup' :
                                 '🚚 Delivery'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Payment Status */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPaymentStatusBadge(
                              order.payment_status
                            )}`}
                          >
                            {order.payment_status}
                          </span>
                        </td>

                        {/* Total Amount */}
                        <td className="px-6 py-4 text-right font-bold text-zinc-900">
                          {formatCurrency(order.total_amount)}
                        </td>

                        {/* Branch */}
                        <td className="px-6 py-4 text-xs text-zinc-600">
                          {order.branch || 'Main Branch'}
                        </td>

                        {/* Created At */}
                        <td className="px-6 py-4 text-right text-xs text-zinc-500">
                          {formatDate(order.created_at)}
                        </td>

                        {/* Action */}
                        <td
                          className="px-6 py-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition"
                              title="View order details"
                            >
                              <Eye className="h-3.5 w-3.5 text-zinc-400" />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditOrder(order)}
                              className="rounded-md border border-zinc-200 bg-white p-1 text-zinc-600 hover:text-indigo-600 hover:bg-zinc-50 transition"
                              title="Edit order"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order)}
                              className="rounded-md border border-zinc-200 bg-white p-1 text-zinc-400 hover:text-rose-600 hover:bg-zinc-50 transition"
                              title="Delete order"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  // Empty State
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                        {searchQuery ? (
                          <Search className="h-6 w-6" />
                        ) : (
                          <FileText className="h-6 w-6" />
                        )}
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-zinc-900">
                        {searchQuery
                          ? 'No matching orders or quotations found'
                          : 'No sales orders or quotations created yet'}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                        {searchQuery
                          ? `No records match "${searchQuery}". Try searching with a different order number or customer name.`
                          : 'Draft your first quotation or sales order with customer details and line items.'}
                      </p>
                      <div className="mt-4">
                        {searchQuery ? (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Clear search
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Draft First Quotation</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="border-t border-zinc-200 px-6 py-3 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing <span className="font-semibold text-zinc-700">{filteredOrders.length}</span> of{' '}
              <span className="font-semibold text-zinc-700">{orders.length}</span> orders
            </span>
            <span className="text-[11px] text-zinc-400">
              JAPA Core Sales & Quotation Engine
            </span>
          </div>
        </div>
      </div>

      {/* Draft / Edit Order Modal */}
      <OrderFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingOrder(null)
        }}
        onSuccess={handleOrderSaved}
        customers={customers}
        orderToEdit={editingOrder}
      />

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onEdit={(ord) => handleEditOrder(ord)}
        onDelete={(ord) => handleDeleteOrder(ord)}
        onCancel={(ord) => handleCancelOrder(ord)}
      />

      {/* Manager PIN Authorization Modal for Destructive Order Deletion */}
      <ManagerPinModal
        isOpen={pinModalOpen}
        title={`Authorize Deletion: ${pendingDeleteOrder?.order_number || ''}`}
        description="Permanently delete this order from the system, restore deducted inventory quantities to stock, and reverse any linked POS cash drawer payments."
        itemDetails={[
          { label: 'Order / Invoice #', value: pendingDeleteOrder?.order_number || '—' },
          {
            label: 'Customer',
            value:
              pendingDeleteOrder?.customers?.name ||
              pendingDeleteOrder?.recipient_name ||
              'Walk-in Customer',
          },
          {
            label: 'Total Amount',
            value: formatCurrency(pendingDeleteOrder?.total_amount || 0),
          },
          { label: 'Order Status', value: pendingDeleteOrder?.order_status || 'Draft' },
          { label: 'Payment Status', value: pendingDeleteOrder?.payment_status || 'Unpaid' },
        ]}
        actionLabel="Authorize & Permanently Delete"
        onClose={() => {
          setPinModalOpen(false)
          setPendingDeleteOrder(null)
        }}
        onAuthorized={handleAuthorizedDelete}
      />
    </DashboardShell>
  )
}

