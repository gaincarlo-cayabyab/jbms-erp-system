'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Sidebar from './sidebar'
import { Menu, X, Bell, ChevronRight, Store, Receipt, PanelLeftClose, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FullscreenToggle } from '@/components/ui/auto-fullscreen'

// Map pathnames → readable breadcrumb titles
const BREADCRUMB_MAP: Record<string, string> = {
  '/':           'Executive Dashboard',
  '/pos':        'Cashier / POS Terminal',
  '/customers':  'CRM / Customers',
  '/crm':        'CRM / Customers',
  '/sales':      'Sales & Quotations',
  '/production': 'Production Queue & Job Orders',
  '/inventory':  'Multi-Store Inventory',
  '/financials': 'Financials & Expenses',
  '/payroll':    'Attendance & Payroll',
}

const BRANCH_OPTIONS = [
  { value: 'all',     label: 'All Stores',      fullLabel: 'All Stores — Consolidated' },
  { value: 'dagupan', label: 'Dagupan (Main)',  fullLabel: 'JAPA Dagupan (Main Branch)' },
  { value: 'manila',  label: 'Manila',          fullLabel: 'JAPA Manila' },
]

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  // Mobile / Tablet Portrait overlay drawer state (< 1024px)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  // Desktop / Tablet Landscape collapsible sidebar state (>= 1024px)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const [activeBranch, setActiveBranch] = useState('all')
  const pathname = usePathname()

  // Detect screen size and initialize sidebar preference
  useEffect(() => {
    const isTabletLandscapeOrSmaller = window.innerWidth <= 1280
    // On POS page on tablet (e.g. Galaxy Tab A8 1280x800), default sidebar to collapsed to maximize terminal
    if (pathname === '/pos' && isTabletLandscapeOrSmaller) {
      setDesktopSidebarOpen(false)
    } else {
      const stored = localStorage.getItem('japa_desktop_sidebar_open')
      if (stored !== null) {
        setDesktopSidebarOpen(stored === 'true')
      }
    }
  }, [pathname])

  function toggleSidebar() {
    if (window.innerWidth < 1024) {
      setMobileDrawerOpen((prev) => !prev)
    } else {
      setDesktopSidebarOpen((prev) => {
        const next = !prev
        localStorage.setItem('japa_desktop_sidebar_open', String(next))
        return next
      })
    }
  }

  const pageTitle = BREADCRUMB_MAP[pathname] ?? 'Workspace'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Mobile & Tablet Portrait Overlay Backdrop (< 1024px) ────────── */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* ── Mobile / Tablet Portrait Drawer (< 1024px) ──────────────────── */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out lg:hidden',
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar onNavigate={() => setMobileDrawerOpen(false)} />
      </div>

      {/* ── Desktop & Tablet Landscape Collapsible Sidebar (>= 1024px) ─── */}
      <div
        className={cn(
          'hidden lg:block shrink-0 transition-all duration-300 ease-in-out overflow-hidden',
          desktopSidebarOpen ? 'w-64' : 'w-0'
        )}
      >
        <div className="w-64 h-full">
          <Sidebar />
        </div>
      </div>

      {/* ── Main Workspace Area ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-5 shadow-xs">
          {/* Left: Sidebar toggle + Breadcrumbs */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95"
              onClick={toggleSidebar}
              title={desktopSidebarOpen ? 'Collapse Navigation' : 'Expand Navigation'}
              aria-label="Toggle navigation menu"
            >
              {mobileDrawerOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            {/* Breadcrumb / Title */}
            <nav className="flex items-center gap-1.5 text-xs min-w-0">
              <span className="hidden md:inline font-medium text-slate-400">JAPA Core ERP</span>
              <ChevronRight className="hidden md:inline h-3 w-3 text-slate-300 shrink-0" />
              <span className="font-bold text-slate-800 text-xs sm:text-sm truncate max-w-[160px] sm:max-w-none">
                {pageTitle}
              </span>
            </nav>
          </div>

          {/* Right: Cashier shortcut + branch selector + fullscreen + notifications */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Direct Cashier / POS Launcher */}
            <Link
              href="/pos"
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition active:scale-95 shadow-2xs',
                pathname === '/pos'
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300'
              )}
              title="Launch Cashier / POS Terminal"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {pathname === '/pos' ? 'POS Terminal' : 'Cashier POS'}
              </span>
            </Link>

            {/* Branch / Store Selector — Responsive on Tablets */}
            <div className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 sm:px-2.5 py-1.5 shadow-2xs">
              <Store className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <select
                value={activeBranch}
                onChange={(e) => setActiveBranch(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer max-w-[100px] sm:max-w-[160px] md:max-w-none truncate"
                title="Active Store Branch"
              >
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value} className="bg-white text-slate-900">
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Global Fullscreen Toggle */}
            <FullscreenToggle />

            {/* Notification bell */}
            <button
              type="button"
              className="relative rounded-lg p-1.5 sm:p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
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
