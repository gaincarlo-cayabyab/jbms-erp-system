'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ShieldCheck,
  Briefcase,
  Receipt,
  Boxes,
  Users,
  ChevronLeft,
  ChevronRight,
  Delete,
  RotateCcw,
  Loader2,
  AlertCircle,
  KeyRound,
  MapPin,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import type { Database } from '@/types/supabase'

export type AppRole = 'Admin' | 'Manager' | 'Cashier' | 'Inventory' | 'Staff'

type AppUser = Database['public']['Functions']['get_users_by_role']['Returns'][number]

interface RoleConfig {
  role: AppRole
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badgeText: string
  colorClasses: {
    bg: string
    border: string
    hoverBorder: string
    iconBg: string
    iconColor: string
    badge: string
  }
}

const ROLES: RoleConfig[] = [
  {
    role: 'Admin',
    title: 'Administrator',
    description: 'Full workspace governance, financials, payroll & configurations',
    icon: ShieldCheck,
    badgeText: 'Full Access',
    colorClasses: {
      bg: 'hover:bg-stone-50',
      border: 'border-stone-200/90',
      hoverBorder: 'hover:border-indigo-400',
      iconBg: 'bg-indigo-100/80',
      iconColor: 'text-indigo-700',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
  },
  {
    role: 'Manager',
    title: 'Store Manager',
    description: 'Order sign-offs, sales quotations, reports & branch workflow',
    icon: Briefcase,
    badgeText: 'Managerial',
    colorClasses: {
      bg: 'hover:bg-stone-50',
      border: 'border-stone-200/90',
      hoverBorder: 'hover:border-violet-400',
      iconBg: 'bg-violet-100/80',
      iconColor: 'text-violet-700',
      badge: 'bg-violet-50 text-violet-700 border-violet-200',
    },
  },
  {
    role: 'Cashier',
    title: 'Cashier POS',
    description: 'Direct access to retail sales terminal, barcode lookup & checkout',
    icon: Receipt,
    badgeText: 'POS Ready',
    colorClasses: {
      bg: 'hover:bg-emerald-50/50',
      border: 'border-emerald-300/80 bg-emerald-50/20',
      hoverBorder: 'hover:border-emerald-500',
      iconBg: 'bg-emerald-100/90',
      iconColor: 'text-emerald-800',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    },
  },
  {
    role: 'Inventory',
    title: 'Inventory Officer',
    description: 'Multi-store catalog, stock adjustments & reorder thresholds',
    icon: Boxes,
    badgeText: 'Stock Audit',
    colorClasses: {
      bg: 'hover:bg-stone-50',
      border: 'border-stone-200/90',
      hoverBorder: 'hover:border-amber-400',
      iconBg: 'bg-amber-100/80',
      iconColor: 'text-amber-700',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  },
  {
    role: 'Staff',
    title: 'Production Staff',
    description: '7-stage customized printing, heat-press, cutting & job statuses',
    icon: Users,
    badgeText: 'Shop Floor',
    colorClasses: {
      bg: 'hover:bg-stone-50',
      border: 'border-stone-200/90',
      hoverBorder: 'hover:border-sky-400',
      iconBg: 'bg-sky-100/80',
      iconColor: 'text-sky-700',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
    },
  },
]

// Fallback users (used only when Supabase RPC is unreachable)
const FALLBACK_USERS: Record<AppRole, AppUser[]> = {
  Admin: [
    { id: '2e7592c5-2e8c-4449-83f8-10cdcb2d06c6', full_name: 'Gain Carlo (Admin)', role: 'Admin' },
    { id: '6ed88c01-453e-4036-9cfe-e3cabb194cba', full_name: 'Belinda Dee (CEO)', role: 'Admin' },
  ],
  Manager: [
    { id: 'c17c2550-000a-4aac-afa3-dda5bb03d1fe', full_name: 'Store Manager — Dagupan (DAG)', role: 'Manager' },
    { id: 'b603e120-dece-4cac-885a-1fff11bd93d3', full_name: 'Store Manager — Manila (MNL)', role: 'Manager' },
  ],
  Cashier: [
    { id: 'e32dac5f-c442-4659-9309-07434b7ed51c', full_name: 'Cashier POS — Dagupan (DAG)', role: 'Cashier' },
    { id: '2baa314b-1af9-4593-89bb-f57feb4abc07', full_name: 'Cashier POS — Manila (MNL)', role: 'Cashier' },
  ],
  Inventory: [
    { id: '7c2a66d2-0308-4631-b843-98d53029ab9e', full_name: 'Inventory Officer — Dagupan (DAG)', role: 'Inventory' },
    { id: 'e7004842-5ccf-4ac0-9f12-7ebb34262143', full_name: 'Inventory Officer — Manila (MNL)', role: 'Inventory' },
  ],
  Staff: [
    { id: '73e5af98-ad35-46af-bb5e-dc7e0e02f0db', full_name: 'Production Staff — Dagupan (DAG)', role: 'Staff' },
    { id: '8414b40f-d834-4e39-b7a7-4a0298cf8159', full_name: 'Production Staff — Manila (MNL)', role: 'Staff' },
  ],
}

// Dagupan cashier shift operators
export const DAGUPAN_CASHIER_STAFF: AppUser[] = [
  { id: 'd1111111-1111-4000-8000-000000000001', full_name: 'JAPA Pearly', role: 'Cashier' },
  { id: 'd1111111-1111-4000-8000-000000000002', full_name: 'JAPA Ivan', role: 'Cashier' },
  { id: 'd1111111-1111-4000-8000-000000000003', full_name: 'JAPA Lanie', role: 'Cashier' },
]

type PinStep = 'role' | 'user' | 'cashier-staff' | 'pin'

interface ProfileDisplayInfo {
  displayName: string
  branchLabel: string
  badgeText: string
  avatarCode: string
  avatarClasses: string
  cardBorder: string
  badgeClasses: string
}

function getProfileDisplayInfo(fullName: string): ProfileDisplayInfo {
  if (fullName.includes('JAPA Pearly') || fullName.includes('Pearly')) {
    return {
      displayName: 'JAPA Pearly',
      branchLabel: 'Dagupan Main Store',
      badgeText: 'Dagupan Cashier • Shift Staff',
      avatarCode: 'JP',
      avatarClasses: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-black group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600',
      cardBorder: 'border-stone-200/90 hover:border-emerald-500 hover:bg-emerald-50/30',
      badgeClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-100',
    }
  }

  if (fullName.includes('JAPA Ivan') || fullName.includes('Ivan')) {
    return {
      displayName: 'JAPA Ivan',
      branchLabel: 'Dagupan Main Store',
      badgeText: 'Dagupan Cashier • Shift Staff',
      avatarCode: 'JI',
      avatarClasses: 'bg-teal-100 text-teal-800 border border-teal-300 font-black group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600',
      cardBorder: 'border-stone-200/90 hover:border-teal-500 hover:bg-teal-50/30',
      badgeClasses: 'bg-teal-50 text-teal-700 border-teal-200 group-hover:bg-teal-100',
    }
  }

  if (fullName.includes('JAPA Lanie') || fullName.includes('Lanie')) {
    return {
      displayName: 'JAPA Lanie',
      branchLabel: 'Dagupan Main Store',
      badgeText: 'Dagupan Cashier • Shift Staff',
      avatarCode: 'JL',
      avatarClasses: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-black group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600',
      cardBorder: 'border-stone-200/90 hover:border-emerald-500 hover:bg-emerald-50/30',
      badgeClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-100',
    }
  }

  if (fullName.includes('Dagupan') || fullName.includes('(DAG)')) {
    const roleTitle = fullName.split('—')[0]?.trim() || fullName.split('-')[0]?.trim() || fullName
    return {
      displayName: roleTitle,
      branchLabel: 'Dagupan Main Store',
      badgeText: 'Dagupan (DAG)',
      avatarCode: 'DAG',
      avatarClasses: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-black group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600',
      cardBorder: 'border-emerald-300/80 hover:border-emerald-500 hover:bg-emerald-50/30 bg-emerald-50/15',
      badgeClasses: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold group-hover:bg-emerald-200',
    }
  }

  if (fullName.includes('Manila') || fullName.includes('(MNL)')) {
    const roleTitle = fullName.split('—')[0]?.trim() || fullName.split('-')[0]?.trim() || fullName
    return {
      displayName: roleTitle,
      branchLabel: 'Manila Operations',
      badgeText: 'Manila (MNL)',
      avatarCode: 'MNL',
      avatarClasses: 'bg-sky-100 text-sky-800 border border-sky-300 font-black group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600',
      cardBorder: 'border-stone-200/90 hover:border-sky-500 hover:bg-sky-50/30',
      badgeClasses: 'bg-sky-50 text-sky-700 border-sky-200 group-hover:bg-sky-100',
    }
  }

  if (fullName.includes('Gain Carlo')) {
    return {
      displayName: 'Gain Carlo',
      branchLabel: 'System Administrator',
      badgeText: 'Admin • Full Access',
      avatarCode: 'GC',
      avatarClasses: 'bg-indigo-100 text-indigo-800 border border-indigo-300 font-black group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600',
      cardBorder: 'border-stone-200/90 hover:border-indigo-500 hover:bg-indigo-50/30',
      badgeClasses: 'bg-indigo-50 text-indigo-700 border-indigo-200 group-hover:bg-indigo-100',
    }
  }

  if (fullName.includes('Belinda Dee')) {
    return {
      displayName: 'Belinda Dee',
      branchLabel: 'Chief Executive Officer',
      badgeText: 'CEO • Executive',
      avatarCode: 'BD',
      avatarClasses: 'bg-purple-100 text-purple-800 border border-purple-300 font-black group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600',
      cardBorder: 'border-stone-200/90 hover:border-purple-500 hover:bg-purple-50/30',
      badgeClasses: 'bg-purple-50 text-purple-700 border-purple-200 group-hover:bg-purple-100',
    }
  }

  return {
    displayName: fullName,
    branchLabel: 'Branch Operations',
    badgeText: 'Active Profile',
    avatarCode: fullName.slice(0, 2).toUpperCase(),
    avatarClasses: 'bg-stone-100 text-stone-700 border border-stone-300 font-bold group-hover:bg-stone-600 group-hover:text-white group-hover:border-stone-600',
    cardBorder: 'border-stone-200/90 hover:border-stone-400 hover:bg-stone-50/80',
    badgeClasses: 'bg-stone-100 text-stone-700 border-stone-200',
  }
}

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/'
  const accessError = searchParams.get('error')
  const { loginWithPinSession } = useAuth()

  // Multi-step state
  const [pinStep, setPinStep] = useState<PinStep>('role')
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null)
  const [users, setUsers] = useState<AppUser[]>([])
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [pin, setPin] = useState('')

  // Loading & Error States
  const [usersLoading, setUsersLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fullscreen video loading overlay
  const [showVideoOverlay, setShowVideoOverlay] = useState(false)
  const [targetDestination, setTargetDestination] = useState<string>('/')
  const redirectedRef = useRef(false)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up fallback timer on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    }
  }, [])

  const handleVideoComplete = useCallback(() => {
    if (redirectedRef.current) return
    redirectedRef.current = true
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    router.push(targetDestination)
    router.refresh()
  }, [router, targetDestination])

  const handleVideoPlay = useCallback(() => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    fallbackTimerRef.current = setTimeout(() => {
      handleVideoComplete()
    }, 10500)
  }, [handleVideoComplete])

  // Fetch users for a chosen role via Supabase RPC
  const fetchUsersForRole = useCallback(async (role: AppRole) => {
    setUsersLoading(true)
    setErrorMessage(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_users_by_role', { p_role: role })

      if (error) {
        console.warn('RPC failed, using fallback:', error.message)
        setUsers(FALLBACK_USERS[role] || [])
      } else if (data && data.length > 0) {
        setUsers(data)
      } else {
        setUsers(FALLBACK_USERS[role] || [])
      }
    } catch (err) {
      console.warn('Network error fetching users:', err)
      setUsers(FALLBACK_USERS[role] || [])
    } finally {
      setUsersLoading(false)
    }
  }, [])

  // Step 1: Select Role
  function handleSelectRole(role: AppRole) {
    setSelectedRole(role)
    setPinStep('user')
    fetchUsersForRole(role)
  }

  // Step 2: Select User / Terminal
  function handleSelectUser(user: AppUser) {
    if (selectedRole === 'Cashier' && (user.full_name.includes('Dagupan') || user.full_name.includes('(DAG)'))) {
      setPinStep('cashier-staff')
      return
    }
    setSelectedUser(user)
    setPin('')
    setErrorMessage(null)
    setPinStep('pin')
  }

  // Step 2b: Select Cashier Shift Staff (Pearly, Ivan, Lanie)
  function handleSelectCashierStaff(staff: AppUser) {
    setSelectedUser(staff)
    setPin('')
    setErrorMessage(null)
    setPinStep('pin')
  }

  // Shake animation on PIN error
  const triggerShake = useCallback(() => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }, [])

  // Verify PIN
  const verifyPin = useCallback(async (pinToVerify: string, userToVerify: AppUser) => {
    setVerifying(true)
    setErrorMessage(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('verify_user_pin', {
        p_user_id: userToVerify.id,
        p_pin: pinToVerify,
      })

      if (error) throw error

      const result = data?.[0]
      if (result && result.success) {
        // Enhanced Middle-Top Welcome Notification
        toast.custom(
          () => (
            <div className="flex items-center gap-3.5 bg-white/95 backdrop-blur-md border border-emerald-300/80 px-4 py-3 rounded-2xl shadow-2xl shadow-emerald-500/15 min-w-[320px] sm:min-w-[420px] animate-in fade-in slide-in-from-top-3 duration-300">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
                <CheckCircle2 className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white"></span>
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-slate-900 truncate">
                    Welcome back, {userToVerify.full_name}!
                  </h4>
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Enterprise Workspace Session Activated • {userToVerify.role}</span>
                </p>
              </div>
            </div>
          ),
          {
            duration: 4500,
            position: 'top-center',
          }
        )

        // Lookup branch_id from app_users or fallback from name
        let branchId: string | undefined = undefined
        try {
          const { data: userRec } = await supabase
            .from('app_users')
            .select('branch_id')
            .eq('id', userToVerify.id)
            .maybeSingle()
          branchId = userRec?.branch_id || undefined
        } catch {}

        if (!branchId) {
          if (userToVerify.full_name.includes('Manila') || userToVerify.full_name.includes('(MNL)')) {
            branchId = 'manila_branch'
          } else if (
            userToVerify.full_name.includes('Dagupan') ||
            userToVerify.full_name.includes('(DAG)') ||
            userToVerify.full_name.startsWith('JAPA ')
          ) {
            branchId = 'dagupan_main'
          }
        }

        await loginWithPinSession({
          id: userToVerify.id,
          full_name: userToVerify.full_name,
          role: userToVerify.role,
          branch_id: branchId,
        })

        // Check & establish erp_device_mode per Section 2.1 of dual-mode specification
        try {
          const storedMode = localStorage.getItem('erp_device_mode')
          if (!storedMode) {
            const defaultMode = userToVerify.role === 'Cashier' ? 'pos' : 'desktop'
            localStorage.setItem('erp_device_mode', defaultMode)
          }
        } catch {}

        const dest =
          userToVerify.role === 'Cashier'
            ? '/pos'
            : userToVerify.role === 'Staff'
            ? '/production'
            : userToVerify.role === 'Inventory'
            ? '/inventory'
            : redirectTo && redirectTo !== '/' && redirectTo !== '/login'
            ? redirectTo
            : '/dashboard'
        setTargetDestination(dest)

        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {})
        }

        setShowVideoOverlay(true)
      } else {
        triggerShake()
        setPin('')
        setErrorMessage(result?.message || 'Invalid PIN code. Please check and try again.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'PIN verification failed'
      triggerShake()
      setPin('')
      setErrorMessage(msg)
    } finally {
      setVerifying(false)
    }
  }, [loginWithPinSession, redirectTo, triggerShake])

  // Handle numpad digit click
  const handleDigitClick = useCallback((digit: string) => {
    if (verifying || !selectedUser) return

    setPin((prev) => {
      if (prev.length >= 4) return prev
      const nextPin = prev + digit
      setErrorMessage(null)

      if (nextPin.length === 4) {
        verifyPin(nextPin, selectedUser)
      }
      return nextPin
    })
  }, [verifying, selectedUser, verifyPin])

  const handleBackspace = useCallback(() => {
    if (verifying) return
    setPin((prev) => prev.slice(0, -1))
    setErrorMessage(null)
  }, [verifying])

  const handleClear = useCallback(() => {
    if (verifying) return
    setPin('')
    setErrorMessage(null)
  }, [verifying])

  // Physical keyboard listener — only active on PIN step
  useEffect(() => {
    if (pinStep !== 'pin') return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        handleDigitClick(e.key)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        handleBackspace()
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        handleClear()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pinStep, handleDigitClick, handleBackspace, handleClear])

  return (
    <div className="space-y-3">
      {/* Access Denied Warning */}
      {accessError === 'access_denied' && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Access Restricted</p>
            <p className="text-amber-800 mt-0.5">
              Your previous request required higher administrative or managerial privileges.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Authentication Alert</p>
            <p className="text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ── STEP 1: ROLE SELECTION ───────────────────────────────────── */}
      {pinStep === 'role' && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h3 className="text-sm sm:text-base font-black text-stone-900 leading-tight">Select Role</h3>
              <p className="text-xs text-stone-500 leading-tight mt-0.5">Tap your operational team to sign in</p>
            </div>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-bold text-stone-600 border border-stone-200">
              Step 1 of 2
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
            {ROLES.map((rc) => {
              const Icon = rc.icon
              return (
                <button
                  key={rc.role}
                  type="button"
                  onClick={() => handleSelectRole(rc.role)}
                  className={cn(
                    'w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border bg-white/90 text-left transition-all duration-150 shadow-2xs group active:scale-[0.99] touch-manipulation cursor-pointer',
                    rc.colorClasses.border,
                    rc.colorClasses.bg,
                    rc.colorClasses.hoverBorder
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl transition shadow-2xs',
                        rc.colorClasses.iconBg,
                        rc.colorClasses.iconColor
                      )}
                    >
                      <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-indigo-600 transition truncate">
                          {rc.title}
                        </span>
                        <span
                          className={cn(
                            'text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0',
                            rc.colorClasses.badge
                          )}
                        >
                          {rc.badgeText}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-stone-500 truncate leading-tight mt-0.5">
                        {rc.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition shrink-0 ml-1.5" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── STEP 2: USER PROFILE SELECTION ───────────────────────────── */}
      {pinStep === 'user' && selectedRole && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
            <button
              type="button"
              onClick={() => {
                setPinStep('role')
                setSelectedRole(null)
                setSelectedUser(null)
              }}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-stone-600 hover:text-indigo-600 transition py-1 px-1.5 rounded-lg hover:bg-stone-100"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Change Role</span>
            </button>
            <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold">
              {selectedRole}
            </span>
          </div>

          <div>
            <h3 className="text-sm sm:text-base font-black text-stone-900 leading-tight">Select Profile</h3>
            <p className="text-xs text-stone-500 leading-tight mt-0.5">Select your name to enter your 4-digit security PIN</p>
          </div>

          {usersLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-stone-400">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold text-stone-600">Loading {selectedRole} roster…</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center rounded-2xl border border-stone-200 bg-stone-50 space-y-1">
              <p className="text-xs font-bold text-stone-700">No active profiles found</p>
              <p className="text-[11px] text-stone-500">Please contact an administrator or switch role.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {(selectedRole === 'Cashier' ? users.filter((u) => !u.full_name.startsWith('JAPA ')) : users).map((u) => {
                const info = getProfileDisplayInfo(u.full_name)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border bg-white/90 text-left transition-all duration-150 shadow-2xs group active:scale-[0.99] touch-manipulation cursor-pointer',
                      info.cardBorder
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar with clear branch code */}
                      <div
                        className={cn(
                          'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl text-xs sm:text-sm tracking-wider transition shadow-2xs font-black',
                          info.avatarClasses
                        )}
                      >
                        {info.avatarCode}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm sm:text-base font-bold text-stone-900 group-hover:text-indigo-600 transition leading-tight">
                            {info.displayName}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 shadow-2xs',
                              info.badgeClasses
                            )}
                          >
                            <MapPin className="h-2.5 w-2.5" />
                            {info.badgeText}
                          </span>
                        </div>
                        <p className="text-xs sm:text-[13px] text-stone-500 font-medium leading-tight mt-1">
                          {info.branchLabel} • <span className="text-indigo-600 font-bold group-hover:underline">{selectedRole === 'Cashier' && (u.full_name.includes('Dagupan') || u.full_name.includes('(DAG)')) ? 'Select Cashier Staff →' : 'Tap to enter PIN'}</span>
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-stone-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition shrink-0 ml-1.5" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2b: DAGUPAN CASHIER SHIFT OPERATOR SELECTION ─────────── */}
      {pinStep === 'cashier-staff' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
            <button
              type="button"
              onClick={() => {
                setPinStep('user')
                setSelectedUser(null)
              }}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-stone-600 hover:text-indigo-600 transition py-1 px-1.5 rounded-lg hover:bg-stone-100"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Terminals</span>
            </button>
            <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold">
              Dagupan Cashiers
            </span>
          </div>

          <div>
            <h3 className="text-sm sm:text-base font-black text-stone-900 leading-tight">
              Select Cashier on Duty
            </h3>
            <p className="text-xs text-stone-500 leading-tight mt-0.5">
              Choose your profile to attribute sales &amp; register operations
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {(users.filter((u) => u.full_name.startsWith('JAPA ')).length > 0
              ? users.filter((u) => u.full_name.startsWith('JAPA '))
              : DAGUPAN_CASHIER_STAFF
            ).map((staff) => {
              const info = getProfileDisplayInfo(staff.full_name)
              return (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => handleSelectCashierStaff(staff)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border bg-white/90 text-left transition-all duration-150 shadow-2xs group active:scale-[0.99] touch-manipulation cursor-pointer',
                    info.cardBorder
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl text-xs sm:text-sm tracking-wider transition shadow-2xs font-black',
                        info.avatarClasses
                      )}
                    >
                      {info.avatarCode}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-bold text-stone-900 group-hover:text-emerald-700 transition leading-tight">
                          {info.displayName}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 shadow-2xs',
                            info.badgeClasses
                          )}
                        >
                          <MapPin className="h-2.5 w-2.5" />
                          {info.badgeText}
                        </span>
                      </div>
                      <p className="text-xs sm:text-[13px] text-stone-500 font-medium leading-tight mt-1">
                        {info.branchLabel} • <span className="text-emerald-600 font-bold group-hover:underline">Tap to enter PIN</span>
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-stone-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition shrink-0 ml-1.5" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── STEP 3: 4-DIGIT PIN ENTRY NUMPAD ─────────────────────────── */}
      {pinStep === 'pin' && selectedUser && (() => {
        const selectedInfo = getProfileDisplayInfo(selectedUser.full_name)
        return (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Back to user list & Profile Indicator */}
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedUser.full_name.startsWith('JAPA ')) {
                    setPinStep('cashier-staff')
                  } else {
                    setPinStep('user')
                  }
                  setPin('')
                  setErrorMessage(null)
                }}
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-stone-600 hover:text-indigo-600 transition py-1 px-1.5 rounded-lg hover:bg-stone-100"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{selectedUser.full_name.startsWith('JAPA ') ? 'Back to Cashiers' : 'Back to Profiles'}</span>
              </button>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-black border shadow-2xs',
                    selectedInfo.avatarClasses
                  )}
                >
                  {selectedInfo.avatarCode}
                </span>
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-bold text-stone-900 block leading-tight">
                    {selectedInfo.displayName}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-stone-500 block leading-tight">
                    {selectedInfo.badgeText}
                  </span>
                </div>
              </div>
            </div>

          {/* Security Header & 4 Dot Indicators */}
          <div className="text-center space-y-2 py-1">
            <p className="text-xs font-black uppercase tracking-wider text-stone-500">
              Enter 4-Digit Security PIN
            </p>

            <div
              className={cn(
                'flex items-center justify-center gap-3.5 py-1 transition-transform',
                isShaking && 'animate-pin-shake'
              )}
            >
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pin.length > idx
                return (
                  <div
                    key={idx}
                    className={cn(
                      'h-4.5 w-4.5 sm:h-5 sm:w-5 rounded-full border-2 transition-all duration-200',
                      isShaking
                        ? 'border-rose-500 bg-rose-500 scale-110 shadow-sm'
                        : isFilled
                        ? 'border-indigo-600 bg-indigo-600 scale-125 shadow-md shadow-indigo-300 ring-4 ring-indigo-100'
                        : 'border-stone-300 bg-stone-100/60'
                    )}
                  />
                )
              })}
            </div>

            {verifying && (
              <div className="flex items-center justify-center gap-2 text-xs text-indigo-600 font-bold animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying security credentials…</span>
              </div>
            )}
          </div>

          {/* 3×4 Large Touch-Friendly PIN Numpad for Tablet/POS */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-[320px] sm:max-w-[360px] mx-auto my-1 sm:my-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigitClick(digit)}
                disabled={verifying}
                className="h-13 sm:h-15 lg:h-16 rounded-2xl border border-stone-200/90 bg-stone-50/80 hover:bg-stone-100 hover:border-stone-300 active:scale-95 active:bg-stone-200/80 text-2xl sm:text-3xl font-black text-stone-800 transition-all shadow-xs flex items-center justify-center select-none disabled:opacity-50 touch-manipulation cursor-pointer"
              >
                {digit}
              </button>
            ))}

            {/* Clear */}
            <button
              type="button"
              onClick={handleClear}
              disabled={verifying || pin.length === 0}
              className="h-13 sm:h-15 lg:h-16 rounded-2xl border border-stone-200/90 bg-stone-100/80 hover:bg-stone-200 active:scale-95 text-xs sm:text-sm font-bold text-stone-600 transition-all shadow-xs flex items-center justify-center gap-1.5 select-none disabled:opacity-40 touch-manipulation cursor-pointer"
              title="Clear PIN"
            >
              <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Clear</span>
            </button>

            {/* Zero */}
            <button
              type="button"
              onClick={() => handleDigitClick('0')}
              disabled={verifying}
              className="h-13 sm:h-15 lg:h-16 rounded-2xl border border-stone-200/90 bg-stone-50/80 hover:bg-stone-100 hover:border-stone-300 active:scale-95 active:bg-stone-200/80 text-2xl sm:text-3xl font-black text-stone-800 transition-all shadow-xs flex items-center justify-center select-none disabled:opacity-50 touch-manipulation cursor-pointer"
            >
              0
            </button>

            {/* Backspace */}
            <button
              type="button"
              onClick={handleBackspace}
              disabled={verifying || pin.length === 0}
              className="h-13 sm:h-15 lg:h-16 rounded-2xl border border-stone-200/90 bg-stone-100/80 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 active:scale-95 text-stone-600 transition-all shadow-xs flex items-center justify-center select-none disabled:opacity-40 touch-manipulation cursor-pointer"
              title="Delete Digit"
            >
              <Delete className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          <p className="text-[11px] sm:text-xs text-center text-stone-400 mt-1">
            Keyboard number keys (0–9) or tap numpad above.
          </p>
        </div>
        )
      })()}

      {/* ── Hidden video preload ──────────────────────────────────────── */}
      <video
        preload="auto"
        muted
        playsInline
        aria-hidden="true"
        style={{ display: 'none', width: 0, height: 0, position: 'absolute' }}
      >
        <source src="/assets/video/JAPA_loading_animation.mp4" type="video/mp4" />
      </video>

      {/* ── Fullscreen Video Loading Overlay ─────────────────────────── */}
      {showVideoOverlay && (
        <div
          className="fixed inset-0 z-[9999] overflow-hidden animate-in fade-in duration-300"
          style={{ background: '#F0F0F0' }}
        >
          <video
            autoPlay
            muted
            playsInline
            preload="auto"
            onPlay={handleVideoPlay}
            onEnded={handleVideoComplete}
            onError={handleVideoComplete}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          >
            <source src="/assets/video/JAPA_loading_animation.mp4" type="video/mp4" />
          </video>
        </div>
      )}
    </div>
  )
}
