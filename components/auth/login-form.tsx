'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, LogIn, AlertCircle, KeyRound, Sparkles, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const DEMO_PRESETS = [
  {
    role: 'Admin',
    name: 'Administrator',
    email: 'admin@japacore.com',
    password: 'JapaCore2026!',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    icon: '👑',
  },
  {
    role: 'Manager',
    name: 'Store Manager',
    email: 'manager@japacore.com',
    password: 'JapaCore2026!',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
    icon: '🏪',
  },
  {
    role: 'Staff',
    name: 'Production Staff',
    email: 'staff@japacore.com',
    password: 'JapaCore2026!',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
    icon: '🏭',
  },
]

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/'
  const accessError = searchParams.get('error')

  // Pre-fill with default admin credentials for instant testing
  const [email, setEmail] = useState('admin@japacore.com')
  const [password, setPassword] = useState('JapaCore2026!')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeRole, setActiveRole] = useState('Admin')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  function fillCredentials(preset: typeof DEMO_PRESETS[number]) {
    setEmail(preset.email)
    setPassword(preset.password)
    setActiveRole(preset.role)
    setEmailError(null)
    setPasswordError(null)
    setGeneralError(null)
    toast.info(`Filled credentials for ${preset.name}`)
  }

  function validate(): boolean {
    let isValid = true
    setEmailError(null)
    setPasswordError(null)
    setGeneralError(null)

    if (!email.trim()) {
      setEmailError('Email address is required')
      isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address')
      isValid = false
    }

    if (!password) {
      setPasswordError('Password is required')
      isValid = false
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      isValid = false
    }

    return isValid
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setLoading(true)
    setGeneralError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setGeneralError(error.message || 'Invalid login credentials')
        toast.error(error.message || 'Failed to sign in')
        setLoading(false)
        return
      }

      toast.success('Signed in successfully. Redirecting…')
      router.push(redirectTo)
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setGeneralError(msg)
      toast.error(msg)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Access Denied Warning */}
      {accessError === 'access_denied' && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Access Restricted</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Financials and Payroll modules require Admin or Accountant privileges.
            </p>
          </div>
        </div>
      )}

      {/* General Form Error */}
      {generalError && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Sign In Failed</p>
            <p className="text-xs text-rose-700 mt-0.5">{generalError}</p>
          </div>
        </div>
      )}

      {/* Quick 1-Click Role Selector */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Quick Demo Autofill:
          </span>
          <span className="text-[11px] text-indigo-600 font-medium">Click to populate</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {DEMO_PRESETS.map((p) => {
            const isSelected = email === p.email
            return (
              <button
                key={p.role}
                type="button"
                onClick={() => fillCredentials(p)}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-150',
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : p.badgeColor
                )}
              >
                <span>{p.icon}</span>
                <span>{p.role}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Authentication Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Email Address */}
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
            disabled={loading}
            className={cn(
              "w-full rounded-xl border bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition duration-150 focus:bg-white",
              emailError
                ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                : "border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
            )}
          />
          {emailError && (
            <p className="mt-1.5 text-xs text-rose-600 font-medium">{emailError}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Password
            </label>
            <span className="text-xs text-indigo-600 font-mono">JapaCore2026!</span>
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
              disabled={loading}
              className={cn(
                "w-full rounded-xl border bg-slate-50/50 px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition duration-150 focus:bg-white font-mono",
                passwordError
                  ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  : "border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-modern transition duration-150",
            loading
              ? "opacity-75 cursor-not-allowed"
              : "hover:bg-indigo-700 hover:shadow-lg active:scale-[0.99]"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying credentials…</span>
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              <span>Sign In to Workspace</span>
            </>
          )}
        </button>
      </form>

      {/* Credential Helper Reference Box */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <KeyRound className="w-3.5 h-3.5 text-slate-500" />
          <span>System Login Credentials:</span>
        </div>
        <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-600 font-mono">
          <div className="flex justify-between items-center bg-white px-2.5 py-1 rounded border border-slate-100">
            <span>Email: <strong className="text-slate-900">admin@japacore.com</strong></span>
            <span className="text-[10px] text-indigo-600 font-sans font-bold">Admin</span>
          </div>
          <div className="flex justify-between items-center bg-white px-2.5 py-1 rounded border border-slate-100">
            <span>Password: <strong className="text-slate-900">JapaCore2026!</strong></span>
            <span className="text-[10px] text-emerald-600 font-sans font-bold">Universal</span>
          </div>
        </div>
      </div>
    </div>
  )
}
