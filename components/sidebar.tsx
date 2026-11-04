'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Layers,
  Package,
  DollarSign,
  Clock,
  ChevronRight,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    label: 'Dashboard Overview',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'CRM / Customers',
    href: '/crm',
    icon: Users,
  },
  {
    label: 'Sales & Quotations',
    href: '/sales',
    icon: ShoppingCart,
  },
  {
    label: 'Production Queue & Job Orders',
    href: '/production',
    icon: Layers,
  },
  {
    label: 'Multi-Store Inventory',
    href: '/inventory',
    icon: Package,
  },
  {
    label: 'Financials & Expenses',
    href: '/financials',
    icon: DollarSign,
  },
  {
    label: 'Attendance & Payroll',
    href: '/payroll',
    icon: Clock,
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-200 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none text-zinc-900">JBMS ERP</p>
          <p className="mt-0.5 text-xs text-zinc-500">Enterprise Resource Planning</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          Main Menu
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive ? 'text-blue-600' : 'text-zinc-400 group-hover:text-zinc-600'
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 text-blue-500" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            A
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-zinc-800">Admin User</p>
            <p className="truncate text-[10px] text-zinc-500">admin@jbms.com</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

