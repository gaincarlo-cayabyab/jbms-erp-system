'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { soundEffects } from '@/lib/sound-effects'
import {
  ShieldAlert,
  Lock,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Delete,
  KeyRound,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ManagerPinModalProps {
  isOpen: boolean
  title: string
  description?: string
  itemDetails?: {
    label: string
    value: string | number
  }[]
  actionLabel?: string
  onClose: () => void
  onAuthorized: (auth: { authorizedBy: string; role: string; reason: string }) => Promise<void> | void
}

const COMMON_REASONS = [
  'Cashier testing / demo transaction',
  'Customer changed mind / cancelled',
  'Duplicate accidental entry',
  'Incorrect item / quantity / price',
  'Cashier error during checkout',
  'Other administrative adjustment',
]

export default function ManagerPinModal({
  isOpen,
  title,
  description = 'This destructive action requires Manager or Administrator authorization.',
  itemDetails = [],
  actionLabel = 'Authorize Delete',
  onClose,
  onAuthorized,
}: ManagerPinModalProps) {
  const [pin, setPin] = useState('')
  const [reason, setReason] = useState(COMMON_REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isShaking, setIsShaking] = useState(false)

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setPin('')
      setErrorMsg(null)
      setVerifying(false)
      setIsShaking(false)
      setReason(COMMON_REASONS[0])
      setCustomReason('')
    }
  }, [isOpen])

  const triggerShake = useCallback(() => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }, [])

  const handleKeyPress = (num: string) => {
    if (pin.length >= 6) return
    soundEffects.keyClick()
    setErrorMsg(null)
    setPin((prev) => prev + num)
  }

  const handleBackspace = () => {
    soundEffects.keyClick()
    setPin((prev) => prev.slice(0, -1))
    setErrorMsg(null)
  }

  const handleClear = () => {
    soundEffects.keyClick()
    setPin('')
    setErrorMsg(null)
  }

  // Keyboard support (0-9, backspace, enter, escape)
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key)
      } else if (e.key === 'Backspace') {
        handleBackspace()
      } else if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && pin.length >= 4) {
        handleAuthorize()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, pin])

  const handleAuthorize = async () => {
    if (pin.length < 4) {
      setErrorMsg('Please enter 4 to 6 digit Manager PIN')
      triggerShake()
      soundEffects.error()
      return
    }

    setVerifying(true)
    setErrorMsg(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('verify_manager_pin', {
        p_pin: pin.trim(),
      })

      if (error) {
        throw new Error(error.message)
      }

      const authResult = data?.[0]
      if (authResult && authResult.success) {
        soundEffects.success()
        const finalReason =
          reason === 'Other administrative adjustment' && customReason.trim()
            ? customReason.trim()
            : reason

        await onAuthorized({
          authorizedBy: authResult.full_name || 'Manager',
          role: authResult.role || 'Manager',
          reason: finalReason,
        })
        onClose()
      } else {
        triggerShake()
        soundEffects.error()
        setErrorMsg(authResult?.message || 'Invalid Manager or Admin PIN')
        setPin('')
      }
    } catch (err: unknown) {
      triggerShake()
      soundEffects.error()
      const msg = err instanceof Error ? err.message : 'Authentication failed'
      setErrorMsg(msg)
      setPin('')
    } finally {
      setVerifying(false)
    }
  }

  if (!isOpen) return null

  // Find amount if present in itemDetails for a hero highlight
  const amountDetail = itemDetails.find(
    (d) =>
      d.label.toLowerCase().includes('amount') ||
      d.label.toLowerCase().includes('total')
  )
  const otherDetails = itemDetails.filter((d) => d !== amountDetail)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={cn(
          'relative w-full max-w-2xl rounded-3xl bg-white border border-slate-200/80 shadow-2xl overflow-hidden transition-all duration-200',
          isShaking && 'animate-shake'
        )}
      >
        {/* Top Gradient Accent Bar */}
        <div className="h-1.5 w-full bg-linear-to-r from-rose-500 via-amber-500 to-indigo-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 sm:px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100/80 text-rose-700 shadow-2xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Manager Authorization Required
                </h3>
                <span className="rounded-full bg-rose-100 px-2 py-0.2 text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                  Override
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Admin or Store Manager PIN verification required
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: Responsive 2-Column Grid */}
        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* LEFT COLUMN: Target Details & Reason */}
          <div className="flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-sm font-black text-slate-900 leading-snug">
                {title}
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {description}
              </p>
            </div>

            {/* Target Highlight & Item Details Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3.5 space-y-2.5 shadow-2xs">
              {amountDetail && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {amountDetail.label}
                  </span>
                  <span className="text-base font-black text-rose-600 font-mono">
                    {amountDetail.value}
                  </span>
                </div>
              )}

              {otherDetails.length > 0 && (
                <div className="space-y-1.5 text-xs">
                  {otherDetails.map((detail, idx) => (
                    <div key={idx} className="flex justify-between items-baseline gap-2">
                      <span className="text-[11px] text-slate-500 font-medium shrink-0">
                        {detail.label}:
                      </span>
                      <span className="font-semibold text-slate-800 text-right truncate">
                        {detail.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reason for Deletion */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Audit Reason <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                >
                  {COMMON_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>

              {reason === 'Other administrative adjustment' && (
                <input
                  type="text"
                  placeholder="Specify administrative reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 mt-1.5 transition"
                />
              )}
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Full audit log saved with supervisor identity</span>
            </div>
          </div>

          {/* RIGHT COLUMN: Tactile PIN Keypad */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 shadow-2xs">
            {/* PIN Dots Header */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                  <Lock className="h-3 w-3 text-slate-500" />
                  <span>Enter Manager PIN</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {pin.length > 0 ? `${pin.length} digits entered` : '4–6 digits'}
                </span>
              </div>

              {/* PIN Indicator Dots */}
              <div className="flex justify-center items-center gap-2.5 py-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-3.5 w-3.5 rounded-full transition-all duration-150',
                      pin.length > i
                        ? 'bg-rose-600 scale-110 shadow-xs shadow-rose-500/40 ring-2 ring-rose-200'
                        : i < 4
                        ? 'border-2 border-slate-300 bg-slate-50'
                        : 'border border-dashed border-slate-200 bg-transparent'
                    )}
                  />
                ))}
              </div>

              {/* Error Message */}
              {errorMsg ? (
                <div className="mt-2 text-center text-xs font-bold text-rose-600 animate-in fade-in flex items-center justify-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              ) : (
                <div className="mt-2 text-center text-[10px] text-slate-400">
                  Cashier PINs are rejected. Use Manager or Admin PIN.
                </div>
              )}
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-2 pt-3 select-none">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  disabled={verifying}
                  className="h-10 sm:h-11 rounded-xl border border-slate-200 bg-white text-base font-bold text-slate-800 shadow-2xs hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                disabled={verifying || pin.length === 0}
                className="h-10 sm:h-11 rounded-xl border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200 active:scale-95 transition disabled:opacity-40"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                disabled={verifying}
                className="h-10 sm:h-11 rounded-xl border border-slate-200 bg-white text-base font-bold text-slate-800 shadow-2xs hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                disabled={verifying || pin.length === 0}
                className="h-10 sm:h-11 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition disabled:opacity-40"
              >
                <Delete className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200/80 bg-slate-50/80 px-5 sm:px-6 py-3.5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={verifying}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAuthorize}
            disabled={verifying || pin.length < 4}
            className={cn(
              'rounded-xl px-5 py-2 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap',
              verifying || pin.length < 4
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
            )}
          >
            {verifying ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Verifying Authorization...</span>
              </>
            ) : (
              <>
                <KeyRound className="h-3.5 w-3.5" />
                <span>{actionLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
