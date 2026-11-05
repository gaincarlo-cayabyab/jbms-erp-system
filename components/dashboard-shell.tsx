'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './sidebar'
import { Menu, X, Bell, ChevronRight, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

// Map pathnames → readable breadcrumb titles
const BREADCRUMB_MAP: Record<string, string> = {
  '/':           'Executive Dashboard',
  '/customers':  'CRM / Customers',
  '/crm':        'CRM / Customers',
  '/sales':      'Sales & Quotations',
  '/production': 'Production Queue & Job Orders',
  '/inventory':  'Multi-Store Inventory',
  '/financials': 'Financials & Expenses',
  '/payroll':    'Attendance & Payroll',
}

const BRANCH_OPTIONS = [
  { value: 'all',   label: 'All Stores — Consolidated' },
  { value: 'main',  label: 'Main Branch' },
  { value: 'north', label: 'North Branch' },
  { value: 'south', label: 'South Branch' },
]

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeBranch, setActiveBranch] = useState('all')
  const pathname = usePathname()

  // Persist sidebar collapse state via localStorage
  useEffect(() => {
    const stored = localStorage.getItem('japa_sidebar_open')
    if (stored !== null) setSidebarOpen(stored === 'true')
  }, [])

  function toggleSidebar() {
    setSidebarOpen((prev) => {
      const next = !prev
      localStorage.setItem('japa_sidebar_open', String(next))
      return next
    })
  }

  const pageTitle = BREADCRUMB_MAP[pathname] ?? 'JAPA Global'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8FAFC' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top header bar — JAPA brand dark */}
        <header
          className="flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6"
          style={{ background: '#101828', borderColor: '#1e293b' }}
        >
          {/* Left: mobile toggle + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md p-1.5 text-zinc-400 hover:bg-white/10 lg:hidden"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Breadcrumb */}
            <nav className="hidden items-center gap-1.5 text-xs lg:flex">
              <span className="font-semibold text-white/50">JAPA Global</span>
              <ChevronRight className="h-3 w-3 text-white/30" />
              <span className="font-semibold text-white">{pageTitle}</span>
            </nav>
          </div>

          {/* Right: branch selector + notifications */}
          <div className="flex items-center gap-3">
            {/* Branch / Store Selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
              <Store className="h-3.5 w-3.5 text-blue-400" />
              <select
                value={activeBranch}
                onChange={(e) => setActiveBranch(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white/80 outline-none cursor-pointer"
              >
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value} className="bg-zinc-900 text-white">
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notification bell */}
            <button
              type="button"
              className="relative rounded-md p-1.5 text-zinc-400 hover:bg-white/10 transition"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
