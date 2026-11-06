'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Sidebar from './sidebar'
import { Menu, X, Bell, ChevronRight, Store, Receipt, AlertTriangle, Layers, LogOut, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FullscreenToggle } from '@/components/ui/auto-fullscreen'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { performSignOut } from '@/lib/auth'

// Map pathnames → readable breadcrumb titles
const BREADCRUMB_MAP: Record<string, string> = {
  '/': 'Executive Dashboard',
  '/pos': 'Cashier / POS Terminal',
  '/customers': 'CRM / Customers',
  '/crm': 'CRM / Customers',
  '/sales': 'Sales & Quotations',
  '/production': 'Production Queue & Job Orders',
  '/inventory': 'Multi-Store Inventory',
  '/financials': 'Financials & Expenses',
  '/payroll': 'Attendance & Payroll',
}

const BRANCH_OPTIONS = [
  { value: 'all', label: 'All Stores', fullLabel: 'All Stores — Consolidated' },
  { value: 'dagupan', label: 'Dagupan (Main)', fullLabel: 'JAPA Dagupan (Main Branch)' },
  { value: 'manila', label: 'Manila', fullLabel: 'JAPA Manila' },
]

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  // Mobile / Tablet Portrait overlay drawer state (< 1024px)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  // Desktop / Tablet Landscape collapsible sidebar state (>= 1024px)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const [activeBranch, setActiveBranch] = useState('all')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [headerSignOutLoading, setHeaderSignOutLoading] = useState(false)
  const confirm = useConfirm()
  const pathname = usePathname()

  async function handleHeaderSignOut() {
    const ok = await confirm({
      title: 'Sign Out of JAPA Core ERP?',
      message: 'You will need to sign in again to access the operations workspace.',
      confirmText: 'Sign Out',
      variant: 'warning',
    })
    if (!ok) return
    setHeaderSignOutLoading(true)
    await performSignOut()
  }

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

            {/* Notification bell & In-App Alerts Drawer */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className={cn(
                  'relative rounded-lg p-1.5 sm:p-2 transition active:scale-95',
                  notificationsOpen
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                )}
                aria-label="Notifications"
                title="Operational Notifications & Alerts"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
              </button>

              {/* Notification Popover Dropdown */}
              {notificationsOpen && (
                <>
                  {/* Backdrop for closing */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotificationsOpen(false)}
                  />

                  {/* Dropdown panel */}
                  <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Notifications & Alerts</span>
                        <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 text-[10px] font-bold">
                          Live
                        </span>
                      </div>
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto my-1">
                      {/* Alert 1: Low Stock */}
                      <Link
                        href="/inventory"
                        onClick={() => setNotificationsOpen(false)}
                        className="flex items-start gap-2.5 p-2 hover:bg-slate-50 rounded-xl transition group"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-100 mt-0.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition truncate">
                            Inventory Threshold Monitor
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            Check multi-store catalog for products at or below reorder level.
                          </p>
                        </div>
                      </Link>

                      {/* Alert 2: Uncollected Invoices */}
                      <Link
                        href="/sales"
                        onClick={() => setNotificationsOpen(false)}
                        className="flex items-start gap-2.5 p-2 hover:bg-slate-50 rounded-xl transition group"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100 mt-0.5">
                          <Receipt className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition truncate">
                            Receivables Collection
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            Pending quotes and unpaid sales orders awaiting customer collection.
                          </p>
                        </div>
                      </Link>

                      {/* Alert 3: Production Queue */}
                      <Link
                        href="/production"
                        onClick={() => setNotificationsOpen(false)}
                        className="flex items-start gap-2.5 p-2 hover:bg-slate-50 rounded-xl transition group"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 border border-violet-100 mt-0.5">
                          <Layers className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition truncate">
                            7-Stage Production Pipeline
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            Job orders in pre-press, sublimation, and fabrication queues.
                          </p>
                        </div>
                      </Link>

                      {/* Alert 4: Cashier Terminal */}
                      <Link
                        href="/pos"
                        onClick={() => setNotificationsOpen(false)}
                        className="flex items-start gap-2.5 p-2 hover:bg-slate-50 rounded-xl transition group"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 mt-0.5">
                          <Store className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition truncate">
                            Cashier POS Ready
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            Dagupan & Manila terminal online for retail transactions.
                          </p>
                        </div>
                      </Link>
                    </div>

                    <div className="border-t border-slate-100 pt-2 px-1 text-center">
                      <p className="text-[10px] text-slate-400 font-medium">
                        Real-time ERP notifications synced with Supabase
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Direct Header Sign Out (Accessible on all devices & when sidebar is collapsed) */}
            <button
              type="button"
              onClick={handleHeaderSignOut}
              disabled={headerSignOutLoading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition active:scale-95 shadow-2xs disabled:opacity-50"
              title="Sign Out of JAPA Core ERP"
              aria-label="Sign Out"
            >
              {headerSignOutLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
              ) : (
                <LogOut className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span className="hidden md:inline">Sign Out</span>
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
