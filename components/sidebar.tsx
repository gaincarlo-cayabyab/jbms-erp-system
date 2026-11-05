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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard Overview',           href: '/',           icon: LayoutDashboard },
  { label: 'CRM / Customers',              href: '/customers',  icon: Users },
  { label: 'Sales & Quotations',           href: '/sales',      icon: ShoppingCart },
  { label: 'Production Queue & Job Orders',href: '/production', icon: Layers },
  { label: 'Multi-Store Inventory',        href: '/inventory',  icon: Package },
  { label: 'Financials & Expenses',        href: '/financials', icon: DollarSign, restricted: true },
  { label: 'Attendance & Payroll',         href: '/payroll',    icon: Clock,       restricted: true },
]

interface SidebarProps {
  userEmail?: string
  userInitial?: string
}

export default function Sidebar({ userEmail, userInitial }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState(userEmail || '')
  const [role, setRole] = useState('Admin')
  const [signOutLoading, setSignOutLoading] = useState(false)

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          setEmail(user.email)
          const metaRole = user.user_metadata?.role as string
          if (metaRole) setRole(metaRole)
          const { data: profile } = await supabase
            .from('profiles').select('role').eq('id', user.id).single()
          if (profile?.role) setRole(profile.role)
        }
      } catch { /* fallback */ }
    }
    loadUser()
  }, [])

  async function handleSignOut() {
    if (!window.confirm('Are you sure you want to sign out of JAPA Global?')) return
    setSignOutLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayEmail = email || userEmail || 'admin@japacore.com'
  const displayInitial = userInitial ?? displayEmail.charAt(0).toUpperCase()
  const displayName = displayEmail.split('@')[0]

  const roleBadgeClass = role === 'Admin' || role === 'Accountant'
    ? 'bg-blue-500/20 text-blue-300'
    : 'bg-white/10 text-white/60'

  return (
    <aside
      className="flex h-full w-64 flex-col"
      style={{ background: '#101828', borderRight: '1px solid #1e293b' }}
    >
      {/* ── Brand Header ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid #1e293b' }}
      >
        {/* JAPA Logo */}
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white p-0.5 shadow">
          <Image
            src="/images/japa-logo.jpg"
            alt="JAPA Global Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div>
          <p className="text-sm font-extrabold leading-tight text-white">
            JAPA Global
          </p>
          <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest">
            Enterprise Operations
          </p>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-widest text-white/30">
          Main Menu
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'text-white'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  )}
                  style={
                    isActive
                      ? { background: '#0B3BBE', boxShadow: '0 0 0 1px #1a4fd8' }
                      : {}
                  }
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.restricted && !isActive && (
                    <Lock className="h-3 w-3 text-amber-400/70" />
                  )}
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 text-white/70" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* ── Footer — user card + sign out ────────────────────────── */}
      <div
        className="p-4"
        style={{ borderTop: '1px solid #1e293b' }}
      >
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: '#1e293b' }}>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white"
            style={{ background: '#0B3BBE' }}
          >
            {displayInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs font-semibold text-white/90">{displayName}</p>
              <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', roleBadgeClass)}>
                {role.replace('_', ' ')}
              </span>
            </div>
            <p className="truncate text-[10px] text-white/40">{displayEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signOutLoading}
            className="shrink-0 rounded-md p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white/80 disabled:opacity-50"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
