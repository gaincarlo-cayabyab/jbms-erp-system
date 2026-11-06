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
  LogIn,
  Eye,
  EyeOff,
  UserCheck,
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
  subtitle: string
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
    subtitle: 'System & Executive Controls',
    description: 'Full workspace governance, financials, payroll & configurations',
    icon: ShieldCheck,
    badgeText: 'Full Access',
    colorClasses: {
      bg: 'hover:bg-indigo-50/60',
      border: 'border-slate-200',
      hoverBorder: 'hover:border-indigo-400',
      iconBg: 'bg-indigo-100/70',
      iconColor: 'text-indigo-600',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
  },
  {
    role: 'Manager',
    title: 'Store Manager',
    subtitle: 'Operations & Approvals',
    description: 'Order sign-offs, sales quotations, reports & branch workflow',
    icon: Briefcase,
    badgeText: 'Managerial',
    colorClasses: {
      bg: 'hover:bg-violet-50/60',
      border: 'border-slate-200',
      hoverBorder: 'hover:border-violet-400',
      iconBg: 'bg-violet-100/70',
      iconColor: 'text-violet-600',
      badge: 'bg-violet-50 text-violet-700 border-violet-200',
    },
  },
  {
    role: 'Cashier',
    title: 'Cashier POS',
    subtitle: 'Point of Sale Terminal',
    description: 'Direct access to retail sales terminal, barcode lookup & checkout',
    icon: Receipt,
    badgeText: 'POS Ready',
    colorClasses: {
      bg: 'hover:bg-emerald-50/60',
      border: 'border-emerald-200 bg-emerald-50/20',
      hoverBorder: 'hover:border-emerald-500',
      iconBg: 'bg-emerald-100/80',
      iconColor: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    },
  },
  {
    role: 'Inventory',
    title: 'Inventory Officer',
    subtitle: 'Warehouse & Stock Control',
    description: 'Multi-store catalog, stock adjustments & reorder thresholds',
    icon: Boxes,
    badgeText: 'Stock Audit',
    colorClasses: {
      bg: 'hover:bg-amber-50/60',
      border: 'border-slate-200',
      hoverBorder: 'hover:border-amber-400',
      iconBg: 'bg-amber-100/70',
      iconColor: 'text-amber-600',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  },
  {
    role: 'Staff',
    title: 'Production Staff',
    subtitle: 'Apparel & Sublimation Line',
    description: '7-stage customized printing, heat-press, cutting & job statuses',
    icon: Users,
    badgeText: 'Shop Floor',
    colorClasses: {
      bg: 'hover:bg-sky-50/60',
      border: 'border-slate-200',
      hoverBorder: 'hover:border-sky-400',
      iconBg: 'bg-sky-100/70',
      iconColor: 'text-sky-600',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
    },
  },
]

// Fallback users in case of network isolation
const FALLBACK_USERS: Record<AppRole, AppUser[]> = {
  Admin: [
    { id: '9a4568eb-7cbf-4c25-80e5-8fad06d330ae', full_name: 'Gian Carlo (Admin)', role: 'Admin' },
    { id: 'f8fd33c8-4432-423b-b565-4fa75c0fc68a', full_name: 'System Admin', role: 'Admin' },
  ],
  Manager: [
    { id: '936cc4a6-6bc8-489c-b0e8-dd63c49864e6', full_name: 'Store Manager', role: 'Manager' },
  ],
  Cashier: [
    { id: 'd3bf0d15-f918-4682-b1a4-3b2e15f01940', full_name: 'POS Cashier 1', role: 'Cashier' },
    { id: '97197a63-2be7-423d-af2e-663a51f85171', full_name: 'POS Cashier 2', role: 'Cashier' },
  ],
  Inventory: [
    { id: '22e536cc-a09f-455b-9ecf-e25c23740fd8', full_name: 'Warehouse Lead', role: 'Inventory' },
  ],
  Staff: [
    { id: '3e450f7f-a78e-43da-abaf-7cc7b42bf65e', full_name: 'Production Staff', role: 'Staff' },
  ],
}

type AuthMode = 'pin' | 'email'
type PinStep = 'role' | 'user' | 'pin'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/'
  const accessError = searchParams.get('error')
  const { loginWithPinSession } = useAuth()

  // Mode and Multi-step state
  const [authMode, setAuthMode] = useState<AuthMode>('pin')
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

  // Fullscreen video loading overlay state
  const [showVideoOverlay, setShowVideoOverlay] = useState(false)
  const [targetDestination, setTargetDestination] = useState<string>('/')
  const redirectedRef = useRef(false)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Email/Password state (fallback mode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

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
    }, 11000)
  }, [handleVideoComplete])

  // Fetch users for a chosen role via supabase RPC
  const fetchUsersForRole = useCallback(async (role: AppRole) => {
    setUsersLoading(true)
    setErrorMessage(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_users_by_role', {
        p_role: role,
      })

      if (error) {
        console.warn('Failed to load users from RPC, using fallback:', error.message)
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

  // Step 2: Select User
  function handleSelectUser(user: AppUser) {
    setSelectedUser(user)
    setPin('')
    setErrorMessage(null)
    setPinStep('pin')
  }

  // Step 3: Trigger Shake on Error
  const triggerShake = useCallback(() => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }, [])

  // Verify PIN on 4th digit
  const verifyPin = useCallback(async (pinToVerify: string, userToVerify: AppUser) => {
    setVerifying(true)
    setErrorMessage(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('verify_user_pin', {
        p_user_id: userToVerify.id,
        p_pin: pinToVerify,
      })

      if (error) {
        throw error
      }

      const result = data?.[0]
      if (result && result.success) {
        // Successful authentication
        toast.success(`Welcome, ${userToVerify.full_name}!`)

        // Save session in AuthContext, local storage, and server cookie
        await loginWithPinSession({
          id: userToVerify.id,
          full_name: userToVerify.full_name,
          role: userToVerify.role,
        })

        // Determine destination: Cashier goes directly to /pos, others to /dashboard or redirectTo
        const dest =
          userToVerify.role === 'Cashier'
            ? '/pos'
            : redirectTo && redirectTo !== '/' && redirectTo !== '/login'
            ? redirectTo
            : '/dashboard'
        setTargetDestination(dest)

        // Auto-fullscreen
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {})
        }

        // Show full loading animation video
        setShowVideoOverlay(true)
      } else {
        // Failed PIN code
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
        // Automatically verify on 4th digit
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

  // Physical keyboard listener for PIN step
  useEffect(() => {
    if (authMode !== 'pin' || pinStep !== 'pin') return

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
  }, [authMode, pinStep, handleDigitClick, handleBackspace, handleClear])

  // Fallback: Handle standard email/password authentication
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError(null)
    setPasswordError(null)
    setErrorMessage(null)

    let valid = true
    if (!email.trim()) {
      setEmailError('Email is required')
      valid = false
    }
    if (!password) {
      setPasswordError('Password is required')
      valid = false
    }
    if (!valid) return

    setEmailLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setErrorMessage(error.message || 'Invalid credentials')
        toast.error(error.message || 'Failed to sign in')
        setEmailLoading(false)
        return
      }

      if (data.user) {
        const role = (data.user.user_metadata?.role as string) || 'Admin'
        await loginWithPinSession({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || email.split('@')[0],
          role,
          email: data.user.email,
        })
      }

      const dest = redirectTo && redirectTo !== '/' && redirectTo !== '/login' ? redirectTo : '/dashboard'
      setTargetDestination(dest)

      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {})
      }

      setShowVideoOverlay(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setErrorMessage(msg)
      toast.error(msg)
      setEmailLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Access Denied Warning from RBAC */}
      {accessError === 'access_denied' && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 animate-in fade-in">
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
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Authentication Alert</p>
            <p className="text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4-DIGIT PIN AUTHENTICATION WORKFLOW (PRIMARY ENTERPRISE FLOW) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {authMode === 'pin' && (
        <div className="space-y-4">
          {/* ── STEP 1: ROLE SELECTION ──────────────────────────────── */}
          {pinStep === 'role' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Select Role</h3>
                  <p className="text-xs text-slate-500">Tap your operational team to sign in</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                  Step 1 of 2
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {ROLES.map((rc) => {
                  const Icon = rc.icon
                  return (
                    <button
                      key={rc.role}
                      type="button"
                      onClick={() => handleSelectRole(rc.role)}
                      className={cn(
                        'w-full flex items-center justify-between p-3.5 rounded-xl border bg-white text-left transition-all duration-150 shadow-2xs group active:scale-[0.99]',
                        rc.colorClasses.border,
                        rc.colorClasses.bg,
                        rc.colorClasses.hoverBorder
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition',
                            rc.colorClasses.iconBg,
                            rc.colorClasses.iconColor
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition truncate">
                              {rc.title}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0',
                                rc.colorClasses.badge
                              )}
                            >
                              {rc.badgeText}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {rc.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── STEP 2: USER PROFILE SELECTION ──────────────────────── */}
          {pinStep === 'user' && selectedRole && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setPinStep('role')
                    setSelectedRole(null)
                    setSelectedUser(null)
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Change Role</span>
                </button>
                <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold">
                  {selectedRole}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">Select Profile</h3>
                <p className="text-xs text-slate-500">
                  Select your name to enter your 4-digit security PIN
                </p>
              </div>

              {usersLoading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                  <p className="text-xs font-semibold text-slate-600">
                    Loading {selectedRole} roster…
                  </p>
                </div>
              ) : users.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <p className="text-xs font-bold text-slate-700">No active profiles found</p>
                  <p className="text-[11px] text-slate-500">
                    Please contact an administrator or switch role.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-0.5">
                  {users.map((u) => {
                    const initials = u.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition active:scale-98 shadow-2xs group"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 truncate">
                            {u.full_name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                            Tap to enter PIN
                          </p>
                        </div>
                        <KeyRound className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 transition" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: 4-DIGIT PIN ENTRY NUMPAD ────────────────────── */}
          {pinStep === 'pin' && selectedUser && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Back to user list */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setPinStep('user')
                    setPin('')
                    setErrorMessage(null)
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back to Profiles</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-2xs">
                    {selectedUser.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                    {selectedUser.full_name}
                  </span>
                </div>
              </div>

              {/* Security Header & 4 Dot Indicators */}
              <div className="text-center space-y-2 pt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Enter 4-Digit Security PIN
                </p>

                {/* PIN Visual Indicators */}
                <div
                  className={cn(
                    'flex items-center justify-center gap-3.5 py-2 transition-transform',
                    isShaking && 'animate-pin-shake'
                  )}
                >
                  {[0, 1, 2, 3].map((idx) => {
                    const isFilled = pin.length > idx
                    return (
                      <div
                        key={idx}
                        className={cn(
                          'h-4 w-4 rounded-full border-2 transition-all duration-150',
                          isShaking
                            ? 'border-rose-500 bg-rose-500 scale-110 shadow-sm'
                            : isFilled
                            ? 'border-indigo-600 bg-indigo-600 scale-115 shadow-indigo-300 shadow-md ring-2 ring-indigo-200'
                            : 'border-slate-300 bg-slate-50'
                        )}
                      />
                    )
                  })}
                </div>

                {verifying && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-600 font-semibold animate-pulse pt-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Verifying security credentials…</span>
                  </div>
                )}
              </div>

              {/* 3x4 Touch-Friendly PIN Numpad */}
              <div className="grid grid-cols-3 gap-2.5 pt-1 max-w-xs mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleDigitClick(digit)}
                    disabled={verifying}
                    className="h-14 sm:h-15 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 active:scale-95 text-xl font-bold text-slate-800 transition shadow-2xs flex items-center justify-center select-none disabled:opacity-50"
                  >
                    {digit}
                  </button>
                ))}

                {/* Clear Button */}
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={verifying || pin.length === 0}
                  className="h-14 sm:h-15 rounded-2xl border border-slate-200 bg-slate-100 hover:bg-slate-200 active:scale-95 text-xs font-bold text-slate-600 transition shadow-2xs flex items-center justify-center gap-1 select-none disabled:opacity-40"
                  title="Clear PIN"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Clear</span>
                </button>

                {/* Zero Digit */}
                <button
                  type="button"
                  onClick={() => handleDigitClick('0')}
                  disabled={verifying}
                  className="h-14 sm:h-15 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 active:scale-95 text-xl font-bold text-slate-800 transition shadow-2xs flex items-center justify-center select-none disabled:opacity-50"
                >
                  0
                </button>

                {/* Backspace Button */}
                <button
                  type="button"
                  onClick={handleBackspace}
                  disabled={verifying || pin.length === 0}
                  className="h-14 sm:h-15 rounded-2xl border border-slate-200 bg-slate-100 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 active:scale-95 text-slate-600 transition shadow-2xs flex items-center justify-center select-none disabled:opacity-40"
                  title="Delete Digit"
                >
                  <Delete className="h-5 w-5" />
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-400">
                You can also use your keyboard number keys (0-9).
              </p>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* EMAIL / PASSWORD AUTHENTICATION (ADMINISTRATIVE FALLBACK)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {authMode === 'email' && (
        <form onSubmit={handleEmailSubmit} className="space-y-4 animate-in fade-in duration-200" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailError) setEmailError(null)
              }}
              placeholder="admin@japacore.com"
              disabled={emailLoading}
              className={cn(
                'w-full rounded-xl border bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition duration-150 focus:bg-white',
                emailError
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20'
              )}
            />
            {emailError && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">{emailError}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Password
              </label>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError(null)
                }}
                placeholder="••••••••"
                disabled={emailLoading}
                className={cn(
                  'w-full rounded-xl border bg-slate-50/50 px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition duration-150 focus:bg-white',
                  passwordError
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordError && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">{passwordError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={emailLoading}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-modern transition duration-150',
              emailLoading
                ? 'opacity-75 cursor-not-allowed'
                : 'hover:bg-indigo-700 hover:shadow-lg active:scale-[0.99]'
            )}
          >
            {emailLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying credentials…</span>
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>Sign In via Email</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* ── Auth Mode Switcher / Footer ─────────────────────────────────── */}
      <div className="pt-2 border-t border-slate-100 text-center">
        {authMode === 'pin' ? (
          <button
            type="button"
            onClick={() => {
              setAuthMode('email')
              setErrorMessage(null)
            }}
            className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition inline-flex items-center gap-1.5"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Admin Email & Password Login</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAuthMode('pin')
              setPinStep('role')
              setErrorMessage(null)
            }}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition inline-flex items-center gap-1.5"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Back to 4-Digit Quick PIN Login</span>
          </button>
        )}
      </div>

      {/* ── Hidden preload: start buffering video while user is on login ── */}
      <video
        preload="auto"
        muted
        playsInline
        aria-hidden="true"
        style={{ display: 'none', width: 0, height: 0, position: 'absolute' }}
      >
        <source src="/assets/video/JAPA_loading_animation.mp4" type="video/mp4" />
      </video>

      {/* ── Seamless Fullscreen Video Loading Animation Overlay ─────── */}
      {showVideoOverlay && (
        <div
          className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-300"
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
