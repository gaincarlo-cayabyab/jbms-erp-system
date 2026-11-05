'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, Eye, EyeOff, Loader2, UserPlus, LogIn, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/'
  const accessError = searchParams.get('error')

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'Admin' | 'Store_Manager' | 'Production_Staff' | 'Accountant'>('Admin')
  const [branch, setBranch] = useState<'Main' | 'North' | 'South'>('Main')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    accessError === 'access_denied'
      ? 'Access restricted: Your role does not have permission for that module. Please sign in as an Admin or Accountant.'
      : null
  )
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    const supabase = createClient()

    if (mode === 'signin') {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      router.push(redirectTo)
      router.refresh()
    } else {
      // Sign Up
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0],
            role,
            branch,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        // Create profile row in profiles table
        try {
          await supabase.from('profiles').upsert([
            {
              id: data.user.id,
              full_name: fullName || email.split('@')[0],
              role,
              branch,
            },
          ])
        } catch {
          // If profiles policy blocks anon insert, metadata in user still holds role
        }
      }

      if (data.session) {
        router.push(redirectTo)
        router.refresh()
      } else {
        setSuccessMsg('Account registered! Please check your email or proceed to sign in.')
        setMode('signin')
        setLoading(false)
      }
    }
  }

  // Quick 1-click Demo Sign-In
  async function handleDemoLogin() {
    setDemoLoading(true)
    setError(null)
    const supabase = createClient()
    const demoEmail = 'admin@japacore.com'
    const demoPw = 'JapaCore2026!'

    // First try to sign in
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPw,
    })

    if (!signInErr) {
      router.push(redirectTo)
      router.refresh()
      return
    }

    // If account doesn't exist yet, automatically create the demo admin account
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: demoEmail,
      password: demoPw,
      options: {
        data: {
          full_name: 'Lead Administrator',
          role: 'Admin',
          branch: 'Main',
        },
      },
    })

    if (signUpErr) {
      // If error (e.g. rate limit or confirmation required), provide helpful guidance
      setError(`Demo account sign-in: ${signInErr.message}. You can register an account below.`)
      setDemoLoading(false)
      return
    }

    if (signUpData.user) {
      try {
        await supabase.from('profiles').upsert([
          {
            id: signUpData.user.id,
            full_name: 'Lead Administrator',
            role: 'Admin',
            branch: 'Main',
          },
        ])
      } catch {
        /* ignore */
      }
    }

    if (signUpData.session) {
      router.push(redirectTo)
      router.refresh()
    } else {
      // In case email confirmation is enabled on Supabase project
      setEmail(demoEmail)
      setPassword(demoPw)
      setSuccessMsg('Demo account initialized. Please click Sign In with the credentials filled in.')
      setDemoLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-zinc-50 via-blue-50 to-indigo-100 p-4">
      {/* Card */}
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200">
        {/* Header */}
        <div className="border-b border-zinc-100 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            JAPA Core ERP
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Enterprise Resource Planning & Operations
          </p>

          {/* Mode Switcher Tabs */}
          <div className="mt-6 flex rounded-xl bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition',
                mode === 'signin'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              )}
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition',
                mode === 'signup'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              )}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Register Account
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8">
          <div className="space-y-4">
            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <span className="mt-0.5 shrink-0 text-red-500">⚠</span>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Success banner */}
            {successMsg && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                <p className="text-xs text-emerald-700">{successMsg}</p>
              </div>
            )}

            {/* Sign Up extra fields */}
            {mode === 'signup' && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    required
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="Admin">Admin (All Access)</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Store_Manager">Store Manager</option>
                      <option value="Production_Staff">Production Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Branch
                    </label>
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value as any)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="Main">Main Branch</option>
                      <option value="North">Branch 1 - North</option>
                      <option value="South">Branch 2 - South</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-600"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@japacore.com"
                required
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-600"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-11 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition',
                loading
                  ? 'cursor-not-allowed bg-blue-300'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'signin' ? 'Signing in…' : 'Registering…'}
                </>
              ) : mode === 'signin' ? (
                'Sign In'
              ) : (
                'Create Account & Enter'
              )}
            </button>

            {/* Quick Demo Sign-In Button */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-zinc-200" />
              <span className="absolute bg-white px-3 text-[11px] uppercase tracking-wider text-zinc-400">
                Or Quick Access
              </span>
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-2.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              {demoLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                  Accessing Demo Session…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  Demo Admin Sign-In (1-Click)
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="rounded-b-2xl border-t border-zinc-100 bg-zinc-50 px-8 py-4">
          <p className="text-center text-xs text-zinc-500">
            Role-Based Access: Admin • Store Manager • Production Staff • Accountant
          </p>
        </div>
      </div>

      {/* Background branding */}
      <p className="mt-6 text-xs text-zinc-400">
        JAPA Core ERP © {new Date().getFullYear()} — Enterprise Resource Planning
      </p>
    </div>
  )
}
