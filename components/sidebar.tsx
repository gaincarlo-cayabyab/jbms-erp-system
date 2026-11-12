'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Layers,
  Package,
  DollarSign,
  Clock,
  ChevronRight,
  LogOut,
  Lock,
  Receipt,
  Loader2,
  ArrowLeftRight,
  History,
  Wallet,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { performSignOut } from '@/lib/auth'
import { useAuth } from '@/lib/auth-context'
import { requestAppFullscreen } from '@/components/ui/auto-fullscreen'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  restricted?: boolean
  badge?: string
  badgeClass?: string
  allowedRoles?: string[]
}

const navItems: NavItem[] = [
  // ── Core Revenue & Operations ─────────────────────────────────
  {
    label: 'Dashboard Overview',
    href: '/',
    icon: LayoutDashboard,
    allowedRoles: ['Admin', 'Manager'],
  },
  {
    label: 'Sales & Quotations',
    href: '/sales',
    icon: ShoppingCart,
    badge: 'Sales',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
    allowedRoles: ['Admin', 'Manager'],
  },
  {
    label: 'Cash Management',
    href: '/cash-management',
    icon: Wallet,
    badge: 'Cash',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    allowedRoles: ['Admin', 'Manager'],
  },
  {
    label: 'Financials & P&L Reports',
    href: '/financials',
    icon: DollarSign,
    restricted: true,
    badge: 'P&L',
    badgeClass: 'bg-teal-50 text-teal-700 border border-teal-200',
    allowedRoles: ['Admin'],
  },
  // ── Customer & Inventory ──────────────────────────────────────
  {
    label: 'CRM / Customers',
    href: '/customers',
    icon: Users,
    badge: 'CRM',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
    allowedRoles: ['Admin', 'Manager'],
  },
  {
    label: 'Multi-Store Inventory',
    href: '/inventory',
    icon: Package,
    badge: 'Stock',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    allowedRoles: ['Admin', 'Manager', 'Inventory', 'Staff'],
  },
  {
    label: 'Stock Transfers (STO)',
    href: '/transfers',
    icon: ArrowLeftRight,
    badge: 'STO',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
    allowedRoles: ['Admin', 'Manager', 'Inventory'],
  },
  {
    label: 'Production Queue',
    href: '/production',
    icon: Layers,
    badge: '7-Stage',
    badgeClass: 'bg-violet-50 text-violet-700 border border-violet-200',
    allowedRoles: ['Admin', 'Manager', 'Inventory', 'Staff'],
  },
  // ── Admin-Only ────────────────────────────────────────────────
  {
    label: 'Attendance & Payroll',
    href: '/payroll',
    icon: Clock,
    restricted: true,
    badge: 'DTR',
    badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    allowedRoles: ['Admin'],
  },
  {
    label: 'Audit & Compliance',
    href: '/audit',
    icon: History,
    restricted: true,
    badge: 'Audit',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-300',
    allowedRoles: ['Admin'],
  },
  {
    label: 'Help & Knowledge Base',
    href: '/help',
    icon: HelpCircle,
    badge: 'Guide',
    badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200',
    allowedRoles: ['Admin', 'Manager', 'Cashier', 'Inventory', 'Staff'],
  },
  // ── POS Terminal (Cashier & Manager only — not Admin) ─────────
  {
    label: 'Cashier / POS',
    href: '/pos',
    icon: Receipt,
    badge: 'POS',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    allowedRoles: ['Manager', 'Cashier'],
  },
]

interface SidebarProps {
  userEmail?: string
  userInitial?: string
  onNavigate?: () => void
}

export default function Sidebar({ userEmail, userInitial, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user: authUser, logout } = useAuth()
  const [email, setEmail] = useState(userEmail || '')
  const [localRole, setLocalRole] = useState('Admin')
  const [signOutLoading, setSignOutLoading] = useState(false)

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user?.email) {
          setEmail(user.email)
          const metaRole = user.user_metadata?.role as string
          if (metaRole) setLocalRole(metaRole)
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          if (profile?.role) setLocalRole(profile.role)
        }
      } catch {
        /* graceful fallback */
      }
    }
    loadUser()
  }, [])

  const confirm = useConfirm()

  async function handleSignOut() {
    const ok = await confirm({
      title: 'Sign Out of JAPA Core ERP?',
      message: 'You will need to sign in again to access the operations workspace.',
      confirmText: 'Sign Out',
      variant: 'warning',
    })
    if (!ok) return
    setSignOutLoading(true)
    await logout()
  }

  const role = authUser?.role || localRole || 'Admin'
  const normalizedRole =
    role === 'Production_Staff' ? 'Staff' :
    role === 'Store_Manager' ? 'Manager' : role

  const visibleNavItems = navItems.filter((item) => {
    if (!item.allowedRoles) return true
    return item.allowedRoles.includes(normalizedRole)
  })

  const displayName = authUser?.full_name || email.split('@')[0] || 'User'
  const displayEmail = authUser?.email || (authUser ? `${authUser.role} · Active Session` : (email || 'admin@japacore.com'))
  const displayInitial = authUser?.full_name?.charAt(0).toUpperCase() || userInitial || displayName.charAt(0).toUpperCase()

  const roleBadgeClass =
    role === 'Admin' || role === 'Manager'
      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
      : role === 'Cashier'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : role === 'Inventory'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : 'bg-slate-100 text-slate-600 border border-slate-200'

  return (
    <aside className="flex h-full w-64 flex-col bg-white border-r border-slate-200 select-none shadow-sm">
      {/* ── Brand Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-white">
        {/* JAPA Logo */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
          <Image
            src="/assets/images/JAPA_logo.jpg"
            alt="JAPA Core Logo"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold leading-tight text-slate-900 tracking-tight">
            JAPA Core ERP
          </p>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Operations Workspace
          </p>
        </div>
      </div>

      {/* ── Navigation List ──────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="mb-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            Operations Modules
          </p>
          <ul className="space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              const isActive =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (item.href === '/pos') {
                        requestAppFullscreen()
                      }
                      onNavigate?.()
                    }}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-semibold shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-1'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive
                          ? 'text-indigo-600'
                          : 'text-slate-600 group-hover:text-slate-900'
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>

                    {/* Module Badge Accent */}
                    {item.badge && (
                      <span
                        className={cn(
                          'rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide transition-transform group-hover:scale-105',
                          item.badgeClass
                        )}
                      >
                        {item.badge}
                      </span>
                    )}

                    {item.restricted && !isActive && !item.badge && (
                      <Lock className="h-3.5 w-3.5 text-amber-500/80" />
                    )}

                    {isActive && (
                      <ChevronRight className="h-4 w-4 text-indigo-500 shrink-0" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {/* ── Footer: User Card + Sign Out ─────────────────────────── */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-3 rounded-xl p-2.5 bg-slate-50 border border-slate-200 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm">
            {displayInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs font-bold text-slate-900">
                {displayName}
              </p>
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                  roleBadgeClass
                )}
              >
                {role.replace('_', ' ')}
              </span>
            </div>
            <p className="truncate text-[11px] text-slate-500">{displayEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signOutLoading}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
            aria-label="Sign out"
            title="Sign out"
          >
            {signOutLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}
