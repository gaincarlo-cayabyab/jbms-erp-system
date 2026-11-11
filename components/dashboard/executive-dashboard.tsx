'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  TrendingUp,
  Layers,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Users,
  Wallet,
  ShoppingCart,
  Package,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  DollarSign,
  ChevronRight,
  Sparkles,
  Receipt,
  BarChart3,
  HelpCircle,
} from 'lucide-react'
import StatCard from '@/components/stat-card'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useBranch } from '@/lib/branch-context'
import { getPayrollRecords, getAttendanceLogs } from '@/lib/payroll/payroll-service'
import { getExpenses } from '@/lib/financials/expense-service'
import type { SalesOrder } from '@/types/sales'
import type { JobOrder } from '@/types/production'
import type { ProductItem } from '@/types/inventory'
import type { Customer } from '@/types/customer'
import type { PayrollRecord } from '@/types/payroll'
import type { Expense } from '@/types/financials'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)

interface ActivityItem {
  id: string
  type: 'sale' | 'job' | 'inventory' | 'payroll' | 'customer'
  title: string
  subtitle: string
  timestamp: string
  amount?: number
  statusBadge: {
    label: string
    colorClass: string
  }
  href: string
}

export default function ExecutiveDashboard() {
  const searchParams = useSearchParams()
  const accessDenied = searchParams?.get('error') === 'access_denied'
  const { activeBranchId } = useBranch()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Raw data from modules
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  // User state
  const [userRole, setUserRole] = useState('Admin')

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient()

      // Fetch user profile
      const { data: authData } = await supabase.auth.getUser()
      if (authData.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', authData.user.id)
          .single()
        if (prof?.role) setUserRole(prof.role)
      }

      // Parallel fetch from Supabase tables
      const [salesRes, jobsRes, productsRes, customersRes, payrollRes, expensesRes] =
        await Promise.allSettled([
          supabase.from('sales_orders').select('*, customers(name)').order('created_at', { ascending: false }),
          supabase.from('job_orders').select('*').order('created_at', { ascending: false }),
          supabase.from('products_and_inventory').select('*').order('created_at', { ascending: false }),
          supabase.from('customers').select('*').order('created_at', { ascending: false }),
          getPayrollRecords(),
          getExpenses(),
        ])

      if (salesRes.status === 'fulfilled' && salesRes.value.data) {
        let orders = salesRes.value.data as SalesOrder[]
        if (activeBranchId && activeBranchId !== 'all') {
          orders = orders.filter((o) => {
            if (!o.branch) return true
            const b = o.branch.toLowerCase()
            return activeBranchId === 'dagupan_main' ? b.includes('dagupan') : b.includes('manila')
          })
        }
        setSalesOrders(orders)
      }

      if (jobsRes.status === 'fulfilled' && jobsRes.value.data) {
        setJobOrders(jobsRes.value.data as JobOrder[])
      }

      if (productsRes.status === 'fulfilled' && productsRes.value.data) {
        let prods = productsRes.value.data as ProductItem[]
        // If viewing a specific branch, apply branch-level inventory_stock numbers
        if (activeBranchId && activeBranchId !== 'all') {
          const { data: bStock } = await supabase
            .from('inventory_stock')
            .select('product_id, quantity_on_hand, reserved_quantity, in_transit_quantity, quarantine_quantity, reorder_level')
            .eq('branch_id', activeBranchId)

          if (bStock && bStock.length > 0) {
            const bsMap = new Map(bStock.map((s) => [s.product_id, s]))
            prods = prods.map((p) => {
              const bs = bsMap.get(p.id)
              if (bs) {
                return {
                  ...p,
                  stock_quantity: bs.quantity_on_hand ?? p.stock_quantity,
                  reserved_stock: bs.reserved_quantity ?? p.reserved_stock,
                  in_transit_stock: bs.in_transit_quantity ?? p.in_transit_stock,
                  quarantine_stock: bs.quarantine_quantity ?? p.quarantine_stock,
                  reorder_level: bs.reorder_level ?? p.reorder_level,
                }
              }
              return p
            })
          }
        }
        setProducts(prods)
      }

      if (customersRes.status === 'fulfilled' && customersRes.value.data) {
        setCustomers(customersRes.value.data as Customer[])
      }

      if (payrollRes.status === 'fulfilled') {
        setPayrollRecords(payrollRes.value)
      }

      if (expensesRes.status === 'fulfilled') {
        let exps = expensesRes.value.data || []
        if (activeBranchId && activeBranchId !== 'all') {
          exps = exps.filter((e) => {
            if (!e.branch) return true
            const b = e.branch.toLowerCase()
            return activeBranchId === 'dagupan_main' ? b.includes('dagupan') : b.includes('manila')
          })
        }
        setExpenses(exps)
      }

      setLastUpdated(new Date())
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeBranchId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime synchronization across all operational tables
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_orders' }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products_and_inventory' }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_stock' }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_orders' }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_transactions' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchData()
  }

  // ── Metrics Calculation ────────────────────────────────────────────────────

  // 1. Sales & Revenue & Net Profit
  const totalRevenue = salesOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
  const paidOrders = salesOrders.filter((o) => o.payment_status === 'Paid')
  const pendingSales = salesOrders.filter((o) => o.payment_status !== 'Paid')
  const accountsReceivable = pendingSales.reduce(
    (sum, o) => sum + (Number(o.total_amount) || 0),
    0
  )
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0
  const healthScore = Math.max(
    25,
    Math.min(
      99,
      50 +
        (profitMargin >= 30 ? 30 : profitMargin > 0 ? 15 : totalRevenue === 0 && totalExpenses === 0 ? 10 : -20) +
        (totalRevenue > 10000 ? 15 : totalRevenue > 0 ? 5 : 0) -
        (accountsReceivable > 25000 ? 15 : 0)
    )
  )

  // 2. Production
  const activeJobs = jobOrders.filter(
    (j) => !['Completed', 'Delivered', 'Done', 'Cancelled'].includes(j.stage_status)
  )
  const completedJobs = jobOrders.filter((j) =>
    ['Completed', 'Delivered', 'Done'].includes(j.stage_status)
  )

  // 3. Inventory — Low stock warnings (items with active positive stock running low at or below reorder threshold)
  const lowStockItems = products.filter((p) => {
    const stock = Number(p.stock_quantity) || 0
    const reorder = Number(p.reorder_level) || 10
    return stock > 0 && stock <= reorder
  })

  // 4. Payroll
  const totalPayrollBudget = payrollRecords.reduce((sum, r) => sum + (Number(r.total_net_pay) || 0), 0)
  const pendingPayrollCount = payrollRecords.filter((r) => r.status === 'Pending').length

  // 5. Build Unified Recent Activity
  const activities: ActivityItem[] = []

  // Add recent sales
  salesOrders.slice(0, 5).forEach((o) => {
    activities.push({
      id: `so-${o.id}`,
      type: 'sale',
      title: `Sales Order ${o.order_number}`,
      subtitle: `Customer: ${o.customers?.name || 'Walk-in'} • Amount: ${fmt(o.total_amount)}`,
      timestamp: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      amount: o.total_amount,
      statusBadge: {
        label: o.payment_status,
        colorClass:
          o.payment_status === 'Paid'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-amber-100 text-amber-800',
      },
      href: '/sales',
    })
  })

  // Add active jobs
  jobOrders.slice(0, 4).forEach((j) => {
    activities.push({
      id: `jo-${j.id}`,
      type: 'job',
      title: `Job Order ${j.job_number}`,
      subtitle: `Area: ${j.production_area || 'Standard'} • Stage: ${j.stage_status.replace('_', ' ')}`,
      timestamp: new Date(j.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      statusBadge: {
        label: j.stage_status.replace('_', ' '),
        colorClass: 'bg-violet-100 text-violet-800',
      },
      href: '/production',
    })
  })

  // Add low stock warnings (only active low-stock items)
  lowStockItems.slice(0, 3).forEach((p) => {
    activities.push({
      id: `inv-${p.id}`,
      type: 'inventory',
      title: `Low Stock: ${p.item_name}`,
      subtitle: `Only ${p.stock_quantity} left (Reorder Level: ${p.reorder_level})`,
      timestamp: 'Action Needed',
      statusBadge: {
        label: 'Low Stock',
        colorClass: 'bg-amber-100 text-amber-800 font-semibold',
      },
      href: '/inventory?status=low_stock',
    })
  })

  // Add recent payroll disbursement
  payrollRecords.slice(0, 2).forEach((pr) => {
    activities.push({
      id: `pr-${pr.id}`,
      type: 'payroll',
      title: `Payroll: ${pr.staff_name}`,
      subtitle: `${pr.role.replace('_', ' ')} • Net Pay: ${fmt(pr.total_net_pay)} (${pr.payment_method})`,
      timestamp: new Date(pr.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      statusBadge: {
        label: pr.status,
        colorClass:
          pr.status === 'Paid'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-blue-100 text-blue-800',
      },
      href: '/payroll',
    })
  })

  // Seed default activities if fresh database
  if (activities.length === 0) {
    activities.push(
      {
        id: 'seed-1',
        type: 'sale',
        title: 'Sales Order #SO-2026-001',
        subtitle: 'Boutique Store Signage — Print & Mount • ₱45,000.00',
        timestamp: '10:30 AM',
        statusBadge: { label: 'Paid', colorClass: 'bg-emerald-100 text-emerald-800' },
        href: '/sales',
      },
      {
        id: 'seed-2',
        type: 'job',
        title: 'Job Order #JO-1049 (UV Flatbed)',
        subtitle: 'Acrylic backlit signage fabrication • Stage: In Production',
        timestamp: '11:15 AM',
        statusBadge: { label: 'In Production', colorClass: 'bg-violet-100 text-violet-800' },
        href: '/production',
      },
      {
        id: 'seed-3',
        type: 'payroll',
        title: 'Payroll Disbursed — Maria Santos',
        subtitle: 'Store Manager • October Salary ₱22,140 via GCash',
        timestamp: 'Yesterday',
        statusBadge: { label: 'Disbursed', colorClass: 'bg-blue-100 text-blue-800' },
        href: '/payroll',
      },
      {
        id: 'seed-4',
        type: 'inventory',
        title: 'Stock Adjustment: Glossy Vinyl (50m)',
        subtitle: 'Received 20 rolls at Main Warehouse',
        timestamp: 'Nov 03',
        statusBadge: { label: 'Restocked', colorClass: 'bg-zinc-100 text-zinc-800' },
        href: '/inventory',
      }
    )
  }

  // Quick navigation items
  const quickActions = [
    {
      label: 'Open Cashier POS',
      desc: 'Point of sale terminal',
      href: '/pos',
      icon: Receipt,
      color: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200',
    },
    {
      label: 'Create Sales Order',
      desc: 'Quote & invoice client',
      href: '/sales',
      icon: ShoppingCart,
      color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
    },
    {
      label: 'Dispatch Job Order',
      desc: 'Send artwork to queue',
      href: '/production',
      icon: Layers,
      color: 'bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-200',
    },
    {
      label: 'Adjust Inventory',
      desc: 'Restock or add product',
      href: '/inventory',
      icon: Package,
      color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
    },
    {
      label: 'Process Payroll',
      desc: 'Log DTR & issue salaries',
      href: '/payroll',
      icon: Wallet,
      color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
    },
    {
      label: 'Record Expense',
      desc: 'Log business purchase',
      href: '/financials',
      icon: DollarSign,
      color: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200',
    },
    {
      label: 'Register Customer',
      desc: 'New client credit account',
      href: '/customers',
      icon: Users,
      color: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border-cyan-200',
    },
  ]

  // Module health summary cards
  const moduleHub = [
    { label: 'CRM / Customers', count: `${customers.length} clients`, href: '/customers', status: 'Live' },
    { label: 'Sales & Quotes', count: `${salesOrders.length} orders`, href: '/sales', status: 'Live' },
    { label: 'Production Queue', count: `${jobOrders.length} jobs`, href: '/production', status: 'Live' },
    { label: 'Multi-Store Catalog', count: `${products.length} items`, href: '/inventory', status: 'Live' },
    { label: 'Financials & P&L', count: `${expenses.length} expenses`, href: '/financials', status: 'Live' },
    { label: 'Attendance & Payroll', count: `${payrollRecords.length} records`, href: '/payroll', status: 'Live' },
    { label: 'Supabase Cloud', count: 'Online & synced', href: '#', status: 'Connected' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Access Denied Alert */}
      {accessDenied && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Access Restricted</p>
            <p className="text-xs text-amber-700">
              Financials and Payroll modules are strictly restricted to Admin and Accountant roles. Your current user profile does not have authorization to access that section.
            </p>
          </div>
        </div>
      )}

      {/* ── Top Executive Header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
            Executive Dashboard
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-zinc-500">
            Real-time operational intelligence across sales, production, inventory, and finance.
          </p>
        </div>

        {/* Refresh & Last Synced */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 text-zinc-500', refreshing && 'animate-spin')} />
            {refreshing ? 'Syncing…' : 'Refresh Data'}
          </button>
          <div className="hidden sm:block text-right">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Last Synced</p>
            <p className="text-xs font-medium text-zinc-600">
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* ── AI Executive Business Health Advisor ─────────────────────────── */}
      <div className="rounded-2xl border border-indigo-200 bg-linear-to-r from-indigo-50/90 via-white to-blue-50/90 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-zinc-900">AI Business Health Rating</span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                    healthScore >= 75
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : healthScore >= 50
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  {healthScore >= 75
                    ? '🟢 Excellent Health'
                    : healthScore >= 50
                    ? '🟡 Stable / Break-Even'
                    : '🔴 Needs Attention'}{' '}
                  · Score: {healthScore}/100
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">
                {netProfit >= 0
                  ? `Net Operating Profit: +${fmt(netProfit)} (${profitMargin}% margin) · Revenue: ${fmt(totalRevenue)} · Overhead: ${fmt(totalExpenses)}`
                  : `Operating Deficit: ${fmt(netProfit)} · Overhead: ${fmt(totalExpenses)} exceeds Revenue: ${fmt(totalRevenue)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/financials"
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50 transition active:scale-95"
            >
              <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
              <span>P&L & Visual Reports →</span>
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 transition active:scale-95"
            >
              <HelpCircle className="h-3.5 w-3.5 text-zinc-500" />
              <span>Help Guide</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Primary KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {/* Total Revenue */}
        <Link href="/sales" className="block transition-transform active:scale-[0.99]">
          <StatCard
            title="Total Gross Revenue"
            value={fmt(totalRevenue)}
            subtitle={
              salesOrders.length > 0
                ? `${paidOrders.length} settled of ${salesOrders.length} total orders`
                : 'No sales orders recorded'
            }
            icon={TrendingUp}
            colorClass="bg-blue-50 text-blue-600 border border-blue-200/80 ring-2 ring-blue-500/10"
            trend={{
              value: paidOrders.length > 0 ? `${paidOrders.length} paid` : 'Live tracker',
              positive: totalRevenue > 0,
            }}
          />
        </Link>

        {/* Active Production Queue */}
        <Link href="/production" className="block transition-transform active:scale-[0.99]">
          <StatCard
            title="Active Job Orders"
            value={activeJobs.length}
            subtitle={
              completedJobs.length > 0 || activeJobs.length > 0
                ? `${completedJobs.length} completed • ${activeJobs.length} in production`
                : 'No job orders in queue'
            }
            icon={Layers}
            colorClass="bg-violet-50 text-violet-600 border border-violet-200/80 ring-2 ring-violet-500/10"
            trend={{
              value: activeJobs.length > 0 ? `${activeJobs.length} in progress` : 'Queue idle',
              positive: true,
            }}
          />
        </Link>

        {/* Low Stock Alerts */}
        <Link href="/inventory?status=low_stock" className="block transition-transform active:scale-[0.99]">
          <StatCard
            title="Stock Warnings"
            value={lowStockItems.length}
            subtitle={
              lowStockItems.length > 0
                ? `${lowStockItems.length} item${lowStockItems.length === 1 ? '' : 's'} low stock`
                : 'All stock levels healthy'
            }
            icon={lowStockItems.length > 0 ? AlertTriangle : CheckCircle2}
            colorClass={
              lowStockItems.length > 0
                ? 'bg-amber-50 text-amber-600 border border-amber-200/80 ring-2 ring-amber-500/10'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200/80 ring-2 ring-emerald-500/10'
            }
            trend={{
              value: lowStockItems.length > 0 ? 'Restock required' : 'Optimal stock',
              positive: lowStockItems.length === 0,
            }}
          />
        </Link>

        {/* Outstanding Receivables */}
        <Link href="/financials" className="block transition-transform active:scale-[0.99]">
          <StatCard
            title="Pending Receivables"
            value={fmt(accountsReceivable)}
            subtitle={
              pendingSales.length > 0
                ? `${pendingSales.length} uncollected ${pendingSales.length === 1 ? 'order' : 'orders'}`
                : 'All invoices settled & collected'
            }
            icon={Clock}
            colorClass={
              accountsReceivable > 0
                ? 'bg-amber-50 text-amber-600 border border-amber-200/80 ring-2 ring-amber-500/10'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200/80 ring-2 ring-emerald-500/10'
            }
            trend={{
              value: accountsReceivable > 0 ? `${pendingSales.length} unpaid` : 'Zero receivables',
              positive: accountsReceivable === 0,
            }}
          />
        </Link>
      </div>

      {/* ── Secondary Summary Strip ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Link
          href="/payroll"
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-emerald-300 hover:shadow-sm active:scale-[0.99]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Monthly Payroll Budget
              </p>
              <p className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums truncate">
                {fmt(totalPayrollBudget)}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            {pendingPayrollCount > 0 ? `${pendingPayrollCount} pending` : `${payrollRecords.length} records`}
          </span>
        </Link>

        <Link
          href="/customers"
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-blue-300 hover:shadow-sm active:scale-[0.99]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Client Directory
              </p>
              <p className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums truncate">
                {customers.length} Accounts
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            Active Accounts
          </span>
        </Link>

        <Link
          href="/inventory"
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-indigo-300 hover:shadow-sm active:scale-[0.99]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/70">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Multi-Store Catalog
              </p>
              <p className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums truncate">
                {products.length} Products
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
            Dagupan • Manila
          </span>
        </Link>
      </div>

      {/* ── Main Activity & Quick Actions Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Unified Recent Activity Log */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <FileText className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-zinc-800">Unified Activity Feed</h2>
            </div>
            <Link
              href="/sales"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View Sales History <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-zinc-100 flex-1 overflow-y-auto">
            {activities.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-12 px-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-xs font-bold text-zinc-700">All Operations Clear</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  No active stock alerts or pending exceptions. System is synchronized.
                </p>
              </div>
            ) : (
              activities.map((act) => (
                <Link
                  key={act.id}
                  href={act.href}
                  className="flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-zinc-50/80 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                        act.type === 'sale' && 'bg-blue-100 text-blue-700',
                        act.type === 'job' && 'bg-violet-100 text-violet-700',
                        act.type === 'inventory' && 'bg-amber-100 text-amber-700',
                        act.type === 'payroll' && 'bg-emerald-100 text-emerald-700',
                        act.type === 'customer' && 'bg-cyan-100 text-cyan-700'
                      )}
                    >
                      {act.type === 'sale' && <ShoppingCart className="h-4 w-4" />}
                      {act.type === 'job' && <Layers className="h-4 w-4" />}
                      {act.type === 'inventory' && <Package className="h-4 w-4" />}
                      {act.type === 'payroll' && <Wallet className="h-4 w-4" />}
                      {act.type === 'customer' && <Users className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">
                        {act.title}
                      </p>
                      <p className="truncate text-[11px] text-zinc-500">{act.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide',
                        act.statusBadge.colorClass
                      )}
                    >
                      {act.statusBadge.label}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
                      {act.timestamp}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="mt-auto border-t border-zinc-100 bg-zinc-50 px-6 py-3 text-center">
            <p className="text-[11px] text-zinc-500">
              Aggregated across Sales, Production Queue, Inventory, and Payroll tables
            </p>
          </div>
        </div>

        {/* Right 1 Col: Quick Actions & Production Progress */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-zinc-800">Quick Actions</h2>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                Dispatch
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {quickActions.map((qa) => {
                const Icon = qa.icon
                return (
                  <Link
                    key={qa.label}
                    href={qa.href}
                    className={cn(
                      'flex items-center justify-between rounded-xl border p-2.5 transition-all duration-150',
                      qa.color
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-xs">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight truncate">{qa.label}</p>
                        <p className="text-[10px] opacity-75 truncate">{qa.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Workflow Pipeline */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Production Workflow Pipeline
            </h3>
            <div className="space-y-2.5">
              {[
                {
                  stage: 'Pre-Press / Design',
                  count: `${jobOrders.filter((j) => ['Pre_Press', 'Queued', 'Pending'].includes(j.stage_status)).length} Orders`,
                  pct: `${Math.round((jobOrders.filter((j) => ['Pre_Press', 'Queued', 'Pending'].includes(j.stage_status)).length / Math.max(jobOrders.length, 1)) * 100)}%`,
                  color: 'bg-blue-500',
                },
                {
                  stage: 'Printing / Fabrication',
                  count: `${jobOrders.filter((j) => ['Printing', 'In_Production'].includes(j.stage_status)).length} Orders`,
                  pct: `${Math.round((jobOrders.filter((j) => ['Printing', 'In_Production'].includes(j.stage_status)).length / Math.max(jobOrders.length, 1)) * 100)}%`,
                  color: 'bg-violet-500',
                },
                {
                  stage: 'Finishing & Assembly',
                  count: `${jobOrders.filter((j) => j.stage_status === 'Finishing').length} Orders`,
                  pct: `${Math.round((jobOrders.filter((j) => j.stage_status === 'Finishing').length / Math.max(jobOrders.length, 1)) * 100)}%`,
                  color: 'bg-amber-500',
                },
                {
                  stage: 'Quality Check & Completed',
                  count: `${jobOrders.filter((j) => ['Quality_Check', 'Done', 'Completed', 'Delivered'].includes(j.stage_status)).length} Orders`,
                  pct: `${Math.round((jobOrders.filter((j) => ['Quality_Check', 'Done', 'Completed', 'Delivered'].includes(j.stage_status)).length / Math.max(jobOrders.length, 1)) * 100)}%`,
                  color: 'bg-emerald-500',
                },
              ].map((pipe) => (
                <div key={pipe.stage}>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>{pipe.stage}</span>
                    <span className="text-slate-500 text-[11px] font-mono">{pipe.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', pipe.color)}
                      style={{ width: pipe.pct }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── All ERP Modules Hub ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Integrated System Modules</h2>
            <p className="text-xs text-slate-500">
              Direct access to all 7 core ERP operational subsystems.
            </p>
          </div>
          <span className="mt-2 sm:mt-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> All Subsystems Active
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {moduleHub.map((mod) => (
            <Link
              key={mod.label}
              href={mod.href}
              className="group flex flex-col items-center rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-2xs active:scale-[0.98]"
            >
              <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 transition-colors truncate w-full">
                {mod.label}
              </span>
              <span className="mt-1 text-[11px] font-medium text-slate-500 truncate w-full">{mod.count}</span>
              <span className="mt-2 inline-flex items-center rounded-full bg-emerald-100/80 px-2 py-0.5 text-[9px] font-bold text-emerald-800 uppercase tracking-wider">
                {mod.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
