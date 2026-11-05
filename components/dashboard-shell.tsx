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

  const pageTitle = BREADCRUMB_MAP[pathname] ?? 'Workspace'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/30 backdrop-blur-xs lg:hidden"
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
        {/* Top header bar — Light Theme */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 shadow-xs">
          {/* Left: mobile toggle + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden transition"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Breadcrumb */}
            <nav className="hidden items-center gap-1.5 text-xs lg:flex">
              <span className="font-medium text-slate-400">JAPA Core ERP</span>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <span className="font-semibold text-slate-800">{pageTitle}</span>
            </nav>
          </div>

          {/* Right: branch selector + notifications */}
          <div className="flex items-center gap-3">
            {/* Branch / Store Selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 shadow-2xs">
              <Store className="h-3.5 w-3.5 text-indigo-600" />
              <select
                value={activeBranch}
                onChange={(e) => setActiveBranch(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value} className="bg-white text-slate-900">
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notification bell */}
            <button
              type="button"
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  )
}
