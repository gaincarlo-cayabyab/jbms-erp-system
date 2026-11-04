import DashboardShell from '@/components/dashboard-shell'
import StatCard from '@/components/stat-card'
import {
  TrendingUp,
  Layers,
  AlertTriangle,
  Clock,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

// Placeholder stat data — replace with real Supabase queries as the app grows
const stats = [
  {
    title: 'Total Sales (Month)',
    value: '₱0',
    subtitle: 'No sales recorded yet',
    icon: TrendingUp,
    colorClass: 'bg-blue-500',
    trend: { value: 'No data yet', positive: true },
    href: '/sales',
  },
  {
    title: 'Active Job Orders',
    value: 0,
    subtitle: 'In production queue',
    icon: Layers,
    colorClass: 'bg-violet-500',
    trend: { value: 'No data yet', positive: true },
    href: '/production',
  },
  {
    title: 'Low Stock Items',
    value: 0,
    subtitle: 'Below reorder level',
    icon: AlertTriangle,
    colorClass: 'bg-amber-500',
    trend: { value: 'No data yet', positive: true },
    href: '/inventory',
  },
  {
    title: 'Pending Payments',
    value: '₱0',
    subtitle: 'Awaiting collection',
    icon: Clock,
    colorClass: 'bg-rose-500',
    trend: { value: 'No data yet', positive: true },
    href: '/financials',
  },
]

const quickLinks = [
  { label: 'Create New Sales Order', href: '/sales/new', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
  { label: 'Add Job Order', href: '/production/new', color: 'text-violet-600 bg-violet-50 hover:bg-violet-100' },
  { label: 'Register Customer', href: '/customers?new=true', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
  { label: 'Update Inventory', href: '/inventory', color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
]

export default function DashboardPage() {
  return (
    <DashboardShell>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Welcome to JBMS ERP — your central hub for business operations.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.title} href={stat.href} className="block">
              <StatCard
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                icon={stat.icon}
                colorClass={stat.colorClass}
                trend={stat.trend}
              />
            </Link>
          ))}
        </div>

        {/* Quick Actions & Activity */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-1">
            <h2 className="text-sm font-semibold text-zinc-700">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors ${link.color}`}
                >
                  <span>{link.label}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-700">Recent Activity</h2>
              <Link href="/sales" className="text-xs text-blue-600 hover:underline">
                View all
              </Link>
            </div>

            {/* Empty state */}
            <div className="mt-8 flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                <Layers className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="mt-3 text-sm font-medium text-zinc-700">No recent activity</p>
              <p className="mt-1 text-xs text-zinc-500">
                Transactions and job orders will appear here once you start using the system.
              </p>
              <Link
                href="/sales/new"
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Create First Order
              </Link>
            </div>
          </div>
        </div>

        {/* Modules Overview */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-700">System Modules</h2>
          <p className="mt-1 text-xs text-zinc-500">
            All ERP modules are configured and ready. Connect your Supabase database to activate live data.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            {[
              { label: 'CRM', href: '/customers', status: 'Ready' },
              { label: 'Sales', href: '/sales', status: 'Ready' },
              { label: 'Production', href: '/production', status: 'Ready' },
              { label: 'Inventory', href: '/inventory', status: 'Ready' },
              { label: 'Financials', href: '/financials', status: 'Ready' },
              { label: 'Payroll', href: '/payroll', status: 'Ready' },
              { label: 'Supabase', href: '#', status: 'Connected' },
            ].map((mod) => (
              <Link
                key={mod.label}
                href={mod.href}
                className="flex flex-col items-center rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-center transition-colors hover:border-blue-200 hover:bg-blue-50"
              >
                <span className="text-xs font-semibold text-zinc-700">{mod.label}</span>
                <span className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  {mod.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
