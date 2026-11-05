'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, LogIn, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/'
  const accessError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showVideoOverlay, setShowVideoOverlay] = useState(false)
  const redirectedRef = useRef(false)

  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const handleVideoComplete = useCallback(() => {
    if (redirectedRef.current) return
    redirectedRef.current = true
    router.push(redirectTo)
    router.refresh()
  }, [router, redirectTo])

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

      // Trigger fullscreen automatically
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {})
      }

      // Show full loading animation video
      setShowVideoOverlay(true)

      // Fallback timer: 10.5 seconds in case onEnded does not fire
      setTimeout(() => {
        handleVideoComplete()
      }, 10500)
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

      {/* Authentication Form */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
            placeholder="name@company.com"
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
                "w-full rounded-xl border bg-slate-50/50 px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition duration-150 focus:bg-white",
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

      {/* Footer Notice */}
      <div className="pt-2 text-center">
        <p className="text-xs text-slate-400">
          Authorized personnel only. Contact system administrator for credential assistance.
        </p>
      </div>

      {/* ── Seamless Fullscreen White Video Loading Animation Overlay ─────── */}
      {showVideoOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-300 p-4 sm:p-8"
          style={{
            background: 'radial-gradient(ellipse at center, #FFFFFF 0%, #FAFAFA 35%, #F2F2F2 70%, #ECECEC 100%)',
          }}
        >
          <div className="w-full max-w-xl sm:max-w-2xl flex items-center justify-center">
            <video
              autoPlay
              muted
              playsInline
              onEnded={handleVideoComplete}
              onError={handleVideoComplete}
              style={{
                maskImage: 'radial-gradient(ellipse 92% 88% at center, black 65%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 92% 88% at center, black 65%, transparent 100%)',
              }}
              className="w-full h-auto max-h-[65vh] object-contain"
            >
              <source src="/assets/video/JAPA_loading_animation.mp4" type="video/mp4" />
              <source src="/assets/video/loading.mp4" type="video/mp4" />
              <source src="/assets/video/transaction_loading.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      )}
    </div>
  )
}
