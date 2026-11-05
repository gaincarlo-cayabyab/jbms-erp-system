'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, LogIn, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── Quick Demo Role Tabs ───────────────────────────────────────────────────────
const DEMO_ROLES = [
  {
    label: 'Admin',
    email: 'admin@japacore.com',
    password: 'JapaCore2026!',
    role: 'Admin',
    color: 'bg-[#0B3BBE] text-white hover:bg-blue-700',
  },
  {
    label: 'Store Manager',
    email: 'manager@japacore.com',
    password: 'JapaCore2026!',
    role: 'Store_Manager',
    color: 'bg-[#1e293b] text-white/80 hover:bg-zinc-700',
  },
  {
    label: 'Production Staff',
    email: 'staff@japacore.com',
    password: 'JapaCore2026!',
    role: 'Production_Staff',
    color: 'bg-[#1e293b] text-white/80 hover:bg-zinc-700',
  },
]

// ── Feature Highlights for left panel ────────────────────────────────────────
const FEATURES = [
  {
    icon: '🏭',
    title: '7-Stage Production Pipeline',
    desc: 'Full sublimation & apparel job tracking with real-time Kanban queue visibility.',
  },
  {
    icon: '🏪',
    title: 'Multi-Store Branch Management',
    desc: 'Main, North, and South branches with consolidated inventory across all stores.',
  },
  {
    icon: '📊',
    title: 'Real-time Executive Analytics',
    desc: 'Live revenue, expenses, receivables, and payroll dashboard in one view.',
  },
]

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/'
  const accessError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoLoadingIdx, setDemoLoadingIdx] = useState<number | null>(null)

  // ── Standard sign-in ────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter your email and password.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      toast.error(authError.message)
      setLoading(false)
      return
    }

    toast.success('Signed in successfully. Redirecting…')
    router.push(redirectTo)
    router.refresh()
  }

  // ── 1-Click Demo Sign-In ─────────────────────────────────────────────────────
  async function handleDemoLogin(idx: number) {
    const demo = DEMO_ROLES[idx]
    setDemoLoadingIdx(idx)

    const supabase = createClient()

    // Try sign-in first
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: demo.email,
      password: demo.password,
    })

    if (!signInErr) {
      toast.success(`Signed in as ${demo.label} (Demo)`)
      router.push(redirectTo)
      router.refresh()
      return
    }

    // Auto-create if not exists
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: demo.email,
      password: demo.password,
      options: {
        data: { full_name: `${demo.label} Demo`, role: demo.role, branch: 'Main' },
      },
    })

    if (signUpErr) {
      toast.error(`Demo login failed: ${signInErr.message}`)
      setDemoLoadingIdx(null)
      return
    }

    if (signUpData.user) {
      try {
        await supabase.from('profiles').upsert([{
          id: signUpData.user.id,
          full_name: `${demo.label} Demo`,
          role: demo.role,
          branch: 'Main',
        }])
      } catch { /* ignore */ }
    }

    if (signUpData.session) {
      toast.success(`Demo account created & signed in as ${demo.label}`)
      router.push(redirectTo)
      router.refresh()
    } else {
      // Email confirmation enabled — prefill credentials
      setEmail(demo.email)
      setPassword(demo.password)
      toast.info('Demo account initialized. Click Sign In to continue.')
      setDemoLoadingIdx(null)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── LEFT PANEL: Brand Showcase ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #101828 0%, #0B3BBE 100%)' }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid-overlay pointer-events-none" />

        {/* Glow accent */}
        <div
          className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: '#0B3BBE' }}
        />
        <div
          className="absolute -top-32 -right-20 h-80 w-80 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: '#D3122A' }}
        />

        {/* Top: Logo + brand name */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white p-1 shadow-xl">
              <Image
                src="/images/japa-logo.jpg"
                alt="JAPA Global"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-white leading-tight tracking-tight">
                JAPA Global
              </p>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                Enterprise Operations
              </p>
            </div>
          </div>

          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Manage everything.<br />
            <span style={{ color: '#60a5fa' }}>From one platform.</span>
          </h1>
          <p className="text-sm text-white/60 leading-relaxed max-w-sm">
            A complete ERP built for multi-store retail and 7-stage sublimation & apparel production businesses.
          </p>
        </div>

        {/* Middle: Feature Highlights */}
        <div className="relative z-10 space-y-5 my-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg shadow"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                {f.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{f.title}</p>
                <p className="text-xs text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: Version tag */}
        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white/60"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <CheckCircle className="h-3.5 w-3.5 text-green-400" />
            System Online • Supabase Connected
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Authentication Card ──────────────────────────────── */}
      <div
        className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12"
        style={{ background: '#F8FAFC' }}
      >
        {/* Mobile logo */}
        <div className="flex items-center gap-3 mb-8 lg:hidden">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white p-0.5 shadow">
            <Image src="/images/japa-logo.jpg" alt="JAPA" fill className="object-contain" />
          </div>
          <div>
            <p className="text-lg font-extrabold text-zinc-900">JAPA Global</p>
            <p className="text-xs text-zinc-500">Enterprise Operations</p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          {/* Access denied banner */}
          {accessError === 'access_denied' && (
            <div
              className="mb-6 rounded-xl border p-4 text-sm"
              style={{ background: '#fff7ed', borderColor: '#fed7aa', color: '#9a3412' }}
            >
              <strong>Access Restricted.</strong> Financials and Payroll are limited to Admin & Accountant roles.
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-zinc-900">Welcome back</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Sign in to your JAPA Global account to continue.
            </p>
          </div>

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Email Address
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@japacore.com"
                required
                className="w-full rounded-xl border px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400"
                style={{
                  borderColor: '#E2E8F0',
                  background: 'white',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#0B3BBE'; e.target.style.boxShadow = '0 0 0 3px rgba(11,59,190,0.1)' }}
                onBlur={(e)  => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border px-4 py-3 pr-11 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400"
                  style={{
                    borderColor: '#E2E8F0',
                    background: 'white',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#0B3BBE'; e.target.style.boxShadow = '0 0 0 3px rgba(11,59,190,0.1)' }}
                  onBlur={(e)  => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition',
                loading ? 'opacity-70 cursor-not-allowed' : 'hover:brightness-110 active:scale-[0.98]'
              )}
              style={{ background: '#0B3BBE' }}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
              ) : (
                <><LogIn className="h-4 w-4" /> Sign In</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center">
            <div className="w-full border-t border-zinc-200" />
            <span className="absolute left-1/2 -translate-x-1/2 bg-[#F8FAFC] px-3 text-[11px] uppercase font-semibold tracking-wider text-zinc-400">
              or quick demo access
            </span>
          </div>

          {/* Quick Demo Role Tabs */}
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ROLES.map((demo, idx) => (
              <button
                key={demo.label}
                type="button"
                onClick={() => handleDemoLogin(idx)}
                disabled={demoLoadingIdx !== null}
                className={cn(
                  'flex flex-col items-center rounded-xl px-2 py-3 text-xs font-bold transition disabled:opacity-50',
                  demo.color
                )}
              >
                {demoLoadingIdx === idx ? (
                  <Loader2 className="h-4 w-4 animate-spin mb-1" />
                ) : (
                  <span className="mb-1 text-base">
                    {idx === 0 ? '👑' : idx === 1 ? '🏪' : '🏭'}
                  </span>
                )}
                <span className="leading-tight text-center">{demo.label}</span>
              </button>
            ))}
          </div>

          <p className="mt-8 text-center text-[11px] text-zinc-400">
            Restricted to authorized JAPA Global personnel.
          </p>
        </div>
      </div>
    </div>
  )
}
