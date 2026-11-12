'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import Sidebar from './sidebar'
import { Menu, X, Bell, ChevronRight, Store, Receipt, AlertTriangle, Layers, Monitor, Tablet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FullscreenToggle, requestAppFullscreen } from '@/components/ui/auto-fullscreen'
import { useAuth } from '@/lib/auth-context'
import { useBranch } from '@/lib/branch-context'
import { useDeviceMode } from '@/lib/device-context'
import { toast } from 'sonner'

function AccessDeniedNotifier() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams?.get('error') === 'access_denied') {
      toast.error('Access Restricted: Your profile does not have permission to access that module.')
    }
  }, [searchParams])

  return null
}

// Map pathnames → readable breadcrumb titles
const BREADCRUMB_MAP: Record<string, string> = {
  '/': 'Executive Dashboard',
  '/pos': 'Cashier / POS Terminal',
  '/customers': 'CRM / Customers',
  '/crm': 'CRM / Customers',
  '/sales': 'Sales & Quotations',
  '/production': 'Production Queue & Job Orders',
  '/inventory': 'Multi-Store Inventory',
  '/transfers': 'Inter-Branch Stock Transfers',
  '/cash-management': 'Cash Management & Treasury',
  '/financials': 'Financials & Expenses',
  '/payroll': 'Attendance & Payroll',
  '/audit': 'System Security & Audit Logs',
  '/help': 'Help & Knowledge Base',
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  // Mobile / Tablet Portrait overlay drawer state (< 1024px)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  // Desktop / Tablet Landscape collapsible sidebar state (>= 1024px)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const { user: authUser } = useAuth()
  const {
    activeBranchId,
    activeBranch,
    availableBranches,
    isBranchLocked,
    isSuperAdmin,
    impersonatedBranchId,
    setActiveBranchId,
    setViewAsBranch,
  } = useBranch()
  const { deviceMode, openModeModal } = useDeviceMode()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const pathname = usePathname()

  const rawRole = authUser?.role || 'Staff'
  const userRole =
    rawRole === 'Production_Staff' ? 'Staff' :
      rawRole === 'Store_Manager' ? 'Manager' : rawRole

  const canAccessPos = userRole === 'Admin' || userRole === 'Manager' || userRole === 'Cashier'
  const canAccessInventory = userRole === 'Admin' || userRole === 'Manager' || userRole === 'Inventory' || userRole === 'Staff'
  const canAccessSales = userRole === 'Admin' || userRole === 'Manager'
  const canAccessProduction = userRole === 'Admin' || userRole === 'Manager' || userRole === 'Staff' || userRole === 'Inventory'

  // Whenever on the POS / Cashier terminal, always minimize the sidebar to maximize terminal width
  useEffect(() => {
    if (pathname === '/pos') {
      setDesktopSidebarOpen(false)
      setMobileDrawerOpen(false)
    } else {
      const stored = localStorage.getItem('japa_desktop_sidebar_open')
      if (stored !== null) {
        setDesktopSidebarOpen(stored === 'true')
      } else {
        setDesktopSidebarOpen(true)
      }
    }
  }, [pathname])

  // Auto-recover from Next.js deployment version skew (e.g. Server Action hash mismatch when new code is deployed)
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event?.reason?.message || String(event?.reason || '')
      if (
        msg.includes('was not found on the server') ||
        msg.includes('failed-to-find-server-action') ||
        msg.includes('Failed to find Server Action')
      ) {
        event.preventDefault()
        console.warn('[Deployment Sync] New server version detected. Refreshing workspace...')
        window.location.reload()
      }
    }

    const handleError = (event: ErrorEvent) => {
      const msg = event?.message || ''
      if (
        msg.includes('was not found on the server') ||
        msg.includes('failed-to-find-server-action') ||
        msg.includes('Failed to find Server Action')
      ) {
        event.preventDefault()
        console.warn('[Deployment Sync] New server version detected. Refreshing workspace...')
        window.location.reload()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

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
      <Suspense fallback={null}>
        <AccessDeniedNotifier />
      </Suspense>
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
          <Sidebar onNavigate={(href) => {
            if (href === '/pos') {
              setDesktopSidebarOpen(false)
            }
          }} />
        </div>
      </div>

      {/* ── Main Workspace Area ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-2 sm:px-4 lg:px-5 shadow-xs whitespace-nowrap overflow-hidden">
          {/* Left: Sidebar toggle + Breadcrumbs */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
            <button
              type="button"
              className="rounded-lg p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95 shrink-0"
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
            <nav className="flex items-center gap-1.5 text-xs min-w-0 truncate">
              <span className="hidden xl:inline font-medium text-slate-400">JAPA Core ERP</span>
              <ChevronRight className="hidden xl:inline h-3 w-3 text-slate-300 shrink-0" />
              <span className="font-bold text-slate-800 text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[200px] xl:max-w-none">
                {pageTitle}
              </span>
            </nav>
          </div>

          {/* Right: Cashier shortcut + branch selector + fullscreen + notifications */}
          <div className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 shrink-0">
            {/* Direct Cashier / POS Launcher (Only for authorized POS users) */}
            {canAccessPos && (
              <Link
                href="/pos"
                onClick={() => {
                  requestAppFullscreen()
                  setDesktopSidebarOpen(false)
                  setMobileDrawerOpen(false)
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-bold transition active:scale-95 shadow-2xs',
                  pathname === '/pos'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300'
                )}
                title="Launch Cashier / POS Terminal"
              >
                <Receipt className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden xl:inline">
                  {pathname === '/pos' ? 'POS Terminal' : 'Cashier POS'}
                </span>
              </Link>
            )}

            {/* Branch / Store Selector — Scoped & Multi-Branch Ready */}
            <div className={cn(
              "flex items-center gap-1 rounded-lg border px-1.5 xl:px-2.5 py-1.5 shadow-2xs transition",
              impersonatedBranchId
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : isBranchLocked
                  ? "border-slate-200 bg-slate-100/70 text-slate-700"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300"
            )}>
              <Store className={cn(
                "h-3.5 w-3.5 shrink-0",
                impersonatedBranchId ? "text-amber-600 animate-pulse" : "text-indigo-600"
              )} />
              {/* Tablet: show only shortCode badge pill; Desktop: full select dropdown */}
              <select
                value={activeBranchId}
                onChange={(e) => setActiveBranchId(e.target.value)}
                disabled={isBranchLocked}
                className="bg-transparent text-xs font-semibold outline-none cursor-pointer max-w-[62px] xl:max-w-[160px] 2xl:max-w-none truncate disabled:cursor-not-allowed"
                title={isBranchLocked ? `Branch locked to ${activeBranch.name}` : 'Switch Branch View'}
              >
                {availableBranches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-white text-slate-900">
                    {b.shortCode !== 'ALL'
                      ? `${b.shortCode} — ${b.name.split('(')[0].trim()}`
                      : b.name}
                  </option>
                ))}
              </select>
              {impersonatedBranchId && (
                <button
                  type="button"
                  onClick={() => setViewAsBranch(null)}
                  className="ml-1 text-[10px] bg-amber-200 text-amber-900 px-1 rounded font-bold hover:bg-amber-300 transition"
                  title="Exit View As Branch mode"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dual-Mode Interface Toggle (Desktop vs. POS Terminal) */}
            <button
              type="button"
              onClick={openModeModal}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-bold transition active:scale-95 shadow-2xs',
                deviceMode === 'pos'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              )}
              title={`Active: ${deviceMode === 'pos' ? 'POS Terminal Touch Mode' : 'Desktop / Laptop Mode'} — Tap to switch interface mode`}
            >
              {deviceMode === 'pos' ? (
                <>
                  <Tablet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="hidden xl:inline">POS Touch</span>
                </>
              ) : (
                <>
                  <Monitor className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span className="hidden xl:inline">Desktop</span>
                </>
              )}
            </button>

            {/* Global Fullscreen Toggle */}
            <FullscreenToggle />

            {/* Notification bell & In-App Alerts Drawer */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className={cn(
                  'relative rounded-lg p-1.5 transition active:scale-95',
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
                      {canAccessInventory && (
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
                      )}

                      {/* Alert 2: Uncollected Invoices */}
                      {canAccessSales && (
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
                      )}

                      {/* Alert 3: Production Queue */}
                      {canAccessProduction && (
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
                      )}

                      {/* Alert 4: Cashier Terminal */}
                      {canAccessPos && (
                        <Link
                          href="/pos"
                          onClick={() => {
                            setNotificationsOpen(false)
                            requestAppFullscreen()
                          }}
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
                      )}
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
