'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  Building2,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  {
    label: 'Dashboard Overview',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'CRM / Customers',
    href: '/customers',
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
    restricted: true,
  },
  {
    label: 'Attendance & Payroll',
    href: '/payroll',
    icon: Clock,
    restricted: true,
  },
]

interface SidebarProps {
  userEmail?: string
  userInitial?: string
}

export default function Sidebar({ userEmail, userInitial }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState(userEmail || 'admin@japacore.com')
  const [role, setRole] = useState('Admin')

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          setEmail(user.email)
          const metaRole = user.user_metadata?.role
          if (metaRole) setRole(metaRole)
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          if (profile?.role) setRole(profile.role)
        }
      } catch {
        /* fallback */
      }
    }
    loadUser()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayEmail = email
  const displayInitial = userInitial ?? (displayEmail ? displayEmail.charAt(0).toUpperCase() : 'A')

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-200 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none text-zinc-900">JAPA Core ERP</p>
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
                  {item.restricted && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700">
                      Admin
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 text-blue-500" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer — user + sign out */}
      <div className="border-t border-zinc-200 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {displayInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs font-semibold text-zinc-800">
                {displayEmail.split('@')[0]}
              </p>
              <span className="rounded bg-blue-100 px-1 py-0.5 text-[9px] font-semibold text-blue-700">
                {role.replace('_', ' ')}
              </span>
            </div>
            <p className="truncate text-[10px] text-zinc-500">{displayEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="shrink-0 rounded-md p-1 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-600"
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
