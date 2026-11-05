'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import DashboardShell from '@/components/dashboard-shell'
import FinancialsSummaryCards from './financials-summary-cards'
import ExpenseFormModal from './expense-form-modal'
import { createClient } from '@/lib/supabase/client'
import { getExpenses, removeExpense } from '@/lib/financials/expense-service'
import { Expense } from '@/types/financials'
import { SalesOrder } from '@/types/sales'
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  CreditCard,
  Building,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
} from 'lucide-react'

export default function FinancialsView() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'income' | 'expenses' | 'pnl'>('income')
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUsingMockNotice, setIsUsingMockNotice] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // URL query check (e.g. /financials?new=true)
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsExpenseModalOpen(true)
    }
  }, [searchParams])

  // Load Income (Sales Orders) and Expenses
  const loadFinancialData = async () => {
    setIsLoading(true)
    setIsUsingMockNotice(null)
    try {
      const supabase = createClient()

      // 1. Fetch sales orders for Income
      const { data: soData, error: soError } = await supabase
        .from('sales_orders')
        .select('*, customers(*)')
        .order('created_at', { ascending: false })

      if (soError) console.warn('Sales orders error:', soError.message)
      setSalesOrders((soData as SalesOrder[]) || [])

      // 2. Fetch expenses via service (Supabase with graceful fallback)
      const expRes = await getExpenses()
      setExpenses(expRes.data)
      if (expRes.isUsingMock && expRes.error) {
        setIsUsingMockNotice(expRes.error)
      }
    } catch (err: unknown) {
      console.error('Failed to load financial data', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFinancialData()
  }, [])

  const handleExpenseCreated = (newExp: Expense) => {
    setExpenses((prev) => [newExp, ...prev])
    toast.success(`Expense of ₱${Number(newExp.amount).toLocaleString()} recorded.`)
  }

  const handleDeleteExpense = async (id: string, desc: string) => {
    if (!confirm(`Are you sure you want to delete expense "${desc}"?`)) return
    await removeExpense(id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))
    toast.success('Expense entry removed.')
  }

  // Financial Metrics Calculations
  const metrics = useMemo(() => {
    const paidOrders = salesOrders.filter((o) => o.payment_status === 'Paid')
    const unpaidOrders = salesOrders.filter((o) => o.payment_status !== 'Paid')

    const grossRevenue = paidOrders.reduce(
      (sum, o) => sum + (Number(o.total_amount) || 0),
      0
    )

    const accountsReceivable = unpaidOrders.reduce(
      (sum, o) => sum + (Number(o.total_amount) || 0),
      0
    )

    const totalExpenses = expenses.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    )

    return {
      grossRevenue,
      totalExpenses,
      accountsReceivable,
      paidOrdersCount: paidOrders.length,
      unpaidOrdersCount: unpaidOrders.length,
    }
  }, [salesOrders, expenses])

  // Filtered Income (Sales Orders)
  const filteredIncome = useMemo(() => {
    return salesOrders.filter((order) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        order.order_number.toLowerCase().includes(q) ||
        order.customers?.name?.toLowerCase().includes(q)

      if (!matchesSearch) return false

      if (paymentStatusFilter !== 'all' && order.payment_status !== paymentStatusFilter) {
        return false
      }

      return true
    })
  }, [salesOrders, searchQuery, paymentStatusFilter])

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        exp.description.toLowerCase().includes(q) ||
        exp.category.toLowerCase().includes(q) ||
        exp.reference_no?.toLowerCase().includes(q)

      if (!matchesSearch) return false

      if (expenseCategoryFilter !== 'all' && exp.category !== expenseCategoryFilter) {
        return false
      }

      return true
    })
  }, [expenses, searchQuery, expenseCategoryFilter])

  // Categories list for filter
  const expenseCategories = useMemo(() => {
    const set = new Set<string>()
    expenses.forEach((e) => set.add(e.category))
    return Array.from(set).sort()
  }, [expenses])

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(Number(val) || 0)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <DashboardShell>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Financials & Expense Management
              </h1>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                Module 5
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Track collected revenue, operational expenditures, disbursement vouchers, and cash flow.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  loadFinancialData()
                })
              }}
              disabled={isLoading || isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 transition disabled:opacity-50"
              title="Refresh Financials"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <FinancialsSummaryCards
          grossRevenue={metrics.grossRevenue}
          totalExpenses={metrics.totalExpenses}
          accountsReceivable={metrics.accountsReceivable}
          paidOrdersCount={metrics.paidOrdersCount}
          unpaidOrdersCount={metrics.unpaidOrdersCount}
          isLoading={isLoading}
        />

        {/* Informative notice for cloud DB sync */}
        {isUsingMockNotice && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Local Storage Mode Active</p>
              <p className="mt-0.5">{isUsingMockNotice}</p>
            </div>
          </div>
        )}

        {/* Main Tabbed Container */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-zinc-200 bg-zinc-50/50">
            <div className="flex border-b border-zinc-200 px-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('income')
                  setSearchQuery('')
                }}
                className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                  activeTab === 'income'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                <span>Income / Sales Orders ({salesOrders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('expenses')
                  setSearchQuery('')
                }}
                className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                  activeTab === 'expenses'
                    ? 'border-rose-600 text-rose-700'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <ArrowDownRight className="h-4 w-4 text-rose-600" />
                <span>Operating Expenses ({expenses.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pnl')}
                className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                  activeTab === 'pnl'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span>P&L Financial Breakdown</span>
              </button>
            </div>

            {/* Search and Filters row (for Income & Expenses tabs) */}
            {activeTab !== 'pnl' && (
              <div className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      activeTab === 'income'
                        ? 'Search income by order # or customer...'
                        : 'Search expenses by description, category, or ref...'
                    }
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

                <div className="flex flex-wrap items-center gap-2">
                  {activeTab === 'income' ? (
                    <div className="flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-zinc-400" />
                      <select
                        value={paymentStatusFilter}
                        onChange={(e) => setPaymentStatusFilter(e.target.value)}
                        className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-medium text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="all">All Payment Statuses</option>
                        <option value="Paid">Fully Paid (Realized Revenue)</option>
                        <option value="Partial">Partial Payment</option>
                        <option value="Pending">Pending / Receivables</option>
                        <option value="Overdue">Overdue Invoices</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-zinc-400" />
                      <select
                        value={expenseCategoryFilter}
                        onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                        className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-medium text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="all">All Expense Categories</option>
                        {expenseCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(searchQuery || paymentStatusFilter !== 'all' || expenseCategoryFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setPaymentStatusFilter('all')
                        setExpenseCategoryFilter('all')
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
                    >
                      Reset filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* TAB 1: INCOME TABLE */}
          {activeTab === 'income' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-600">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Sales Order #</th>
                    <th scope="col" className="px-6 py-3.5">Customer / Client</th>
                    <th scope="col" className="px-6 py-3.5">Branch</th>
                    <th scope="col" className="px-6 py-3.5">Payment Status</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Order Amount</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 w-28 rounded bg-zinc-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-36 rounded bg-zinc-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-zinc-200" /></td>
                        <td className="px-6 py-4"><div className="h-5 w-16 rounded-full bg-zinc-200" /></td>
                        <td className="px-6 py-4 text-right"><div className="h-4 w-20 rounded bg-zinc-200 ml-auto" /></td>
                        <td className="px-6 py-4 text-right"><div className="h-3 w-16 rounded bg-zinc-200 ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredIncome.length > 0 ? (
                    filteredIncome.map((order) => {
                      const isPaid = order.payment_status === 'Paid'
                      return (
                        <tr key={order.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-bold text-blue-700">
                              {order.order_number}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-zinc-900 truncate">
                              {order.customers?.name || 'Walk-in Customer'}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-xs text-zinc-600">
                            {order.branch || 'Main Branch'}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.payment_status === 'Partial'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-zinc-100 text-zinc-700'
                              }`}
                            >
                              {order.payment_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-zinc-900">
                            <span className={isPaid ? 'text-emerald-700' : 'text-zinc-800'}>
                              +{formatCurrency(order.total_amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-xs text-zinc-500">
                            {formatDate(order.created_at)}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-xs text-zinc-500">
                        No sales order transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="border-t border-zinc-200 px-6 py-3 bg-zinc-50/50 text-xs text-zinc-500 flex justify-between">
                <span>Showing {filteredIncome.length} of {salesOrders.length} sales orders</span>
                <span className="font-semibold text-emerald-700">
                  Total Realized: {formatCurrency(metrics.grossRevenue)}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: EXPENSES TABLE */}
          {activeTab === 'expenses' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-600">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Category</th>
                    <th scope="col" className="px-6 py-3.5">Description</th>
                    <th scope="col" className="px-6 py-3.5">Payment Method</th>
                    <th scope="col" className="px-6 py-3.5">Ref No.</th>
                    <th scope="col" className="px-6 py-3.5">Branch</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Amount</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Date</th>
                    <th scope="col" className="px-6 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-zinc-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-40 rounded bg-zinc-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-zinc-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-zinc-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-zinc-200" /></td>
                        <td className="px-6 py-4 text-right"><div className="h-4 w-20 rounded bg-zinc-200 ml-auto" /></td>
                        <td className="px-6 py-4 text-right"><div className="h-3 w-16 rounded bg-zinc-200 ml-auto" /></td>
                        <td className="px-6 py-4 text-center"><div className="h-6 w-8 rounded bg-zinc-200 mx-auto" /></td>
                      </tr>
                    ))
                  ) : filteredExpenses.length > 0 ? (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-md bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-800">
                            {exp.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-zinc-900 max-w-xs truncate">
                          {exp.description}
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-600">
                          {exp.payment_method}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                          {exp.reference_no || '—'}
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-600">
                          {exp.branch || 'Main Branch'}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-rose-700">
                          -{formatCurrency(exp.amount)}
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-zinc-500">
                          {formatDate(exp.date)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id, exp.description)}
                            className="rounded p-1 text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 transition"
                            title="Remove expense"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-xs text-zinc-500">
                        No expenses recorded matching the criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="border-t border-zinc-200 px-6 py-3 bg-zinc-50/50 text-xs text-zinc-500 flex justify-between">
                <span>Showing {filteredExpenses.length} of {expenses.length} expense items</span>
                <span className="font-semibold text-rose-700">
                  Total Disbursed: {formatCurrency(metrics.totalExpenses)}
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: P&L FINANCIAL BREAKDOWN */}
          {activeTab === 'pnl' && (
            <div className="p-6 space-y-6">
              <div className="max-w-2xl mx-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
                <div>
                  <h2 className="text-base font-bold text-zinc-900">
                    Profit & Loss Statement Summary
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Operating cash flow comparing realized revenue against operational expenditures.
                  </p>
                </div>

                <div className="space-y-3 divide-y divide-zinc-100 text-sm">
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-semibold text-zinc-700">Gross Realized Revenue</span>
                    <span className="font-bold text-emerald-700">
                      +{formatCurrency(metrics.grossRevenue)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <span className="font-semibold text-zinc-700">Total Operating Expenses</span>
                    <span className="font-bold text-rose-700">
                      -{formatCurrency(metrics.totalExpenses)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t-2 border-zinc-300">
                    <div>
                      <span className="text-base font-bold text-zinc-900">Net Operating Profit</span>
                      <p className="text-xs text-zinc-500">
                        {metrics.grossRevenue >= metrics.totalExpenses ? 'Net Gain' : 'Net Deficit'}
                      </p>
                    </div>
                    <span
                      className={`text-xl font-bold ${
                        metrics.grossRevenue >= metrics.totalExpenses
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {formatCurrency(metrics.grossRevenue - metrics.totalExpenses)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                    <div>
                      <span className="text-xs font-semibold text-zinc-700">
                        Uncollected Accounts Receivable
                      </span>
                      <p className="text-[11px] text-zinc-500">
                        Outstanding client orders awaiting collection
                      </p>
                    </div>
                    <span className="text-sm font-bold text-amber-700">
                      {formatCurrency(metrics.accountsReceivable)}
                    </span>
                  </div>
                </div>

                {/* Progress bar comparison */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-zinc-600 mb-1.5">
                    <span>Revenue vs. Expense Ratio</span>
                    <span>
                      {metrics.grossRevenue + metrics.totalExpenses > 0
                        ? `${Math.round(
                            (metrics.grossRevenue /
                              (metrics.grossRevenue + metrics.totalExpenses)) *
                              100
                          )}% Revenue / ${Math.round(
                            (metrics.totalExpenses /
                              (metrics.grossRevenue + metrics.totalExpenses)) *
                              100
                          )}% Expenses`
                        : '0% / 0%'}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100 flex">
                    <div
                      className="bg-emerald-500 transition-all duration-500"
                      style={{
                        width: `${
                          metrics.grossRevenue + metrics.totalExpenses > 0
                            ? (metrics.grossRevenue /
                                (metrics.grossRevenue + metrics.totalExpenses)) *
                              100
                            : 50
                        }%`,
                      }}
                    />
                    <div
                      className="bg-rose-500 transition-all duration-500"
                      style={{
                        width: `${
                          metrics.grossRevenue + metrics.totalExpenses > 0
                            ? (metrics.totalExpenses /
                                (metrics.grossRevenue + metrics.totalExpenses)) *
                              100
                            : 50
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Expense Modal */}
      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={handleExpenseCreated}
      />
    </DashboardShell>
  )
}

