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
  actionLabel = 'Authorize & Permanently Delete',
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
      setErrorMsg('Please enter at least 4 digits')
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
        const finalReason = reason === 'Other administrative adjustment' && customReason.trim()
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={cn(
          'relative w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden transition-transform',
          isShaking && 'animate-shake'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/70 px-5 py-3.5">
          <div className="flex items-center gap-2 text-rose-800">
            <div className="rounded-lg bg-rose-100 p-1.5 text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Manager PIN Required</h3>
              <p className="text-[11px] text-rose-600 font-medium">Authorization required for deletion</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/80 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <h4 className="text-sm font-black text-slate-900">{title}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>

          {/* Item Details Preview */}
          {itemDetails.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-1.5">
              {itemDetails.map((detail, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">{detail.label}:</span>
                  <span className="font-bold text-slate-900">{detail.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Reason for Deletion */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Reason for Deletion <span className="text-rose-600">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
            >
              {COMMON_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {reason === 'Other administrative adjustment' && (
              <input
                type="text"
                placeholder="Specify administrative reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white mt-1.5"
              />
            )}
          </div>

          {/* PIN Display Digits */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Lock className="h-3 w-3 text-slate-500" />
                <span>Enter Manager / Admin PIN</span>
              </span>
              <span className="text-[10px] text-slate-400">4–6 digits</span>
            </div>

            <div className="flex justify-center items-center gap-3 py-2 bg-slate-100/70 rounded-2xl border border-slate-200">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'h-4 w-4 rounded-full transition-all duration-150',
                    pin.length > i
                      ? 'bg-rose-600 scale-110 shadow-sm shadow-rose-500/30'
                      : 'border-2 border-slate-300 bg-white'
                  )}
                />
              ))}
            </div>

            {errorMsg && (
              <div className="mt-2 text-center text-xs font-semibold text-rose-600 animate-in fade-in flex items-center justify-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-1.5 pt-1 max-w-[280px] mx-auto select-none">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                disabled={verifying}
                className="h-11 rounded-xl border border-slate-200 bg-white text-base font-bold text-slate-800 shadow-2xs hover:bg-slate-50 active:scale-95 transition"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={verifying || pin.length === 0}
              className="h-11 rounded-xl border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200 active:scale-95 transition disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              disabled={verifying}
              className="h-11 rounded-xl border border-slate-200 bg-white text-base font-bold text-slate-800 shadow-2xs hover:bg-slate-50 active:scale-95 transition"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              disabled={verifying || pin.length === 0}
              className="h-11 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition disabled:opacity-40"
            >
              <Delete className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={verifying}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAuthorize}
            disabled={verifying || pin.length < 4}
            className={cn(
              'flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95',
              verifying || pin.length < 4
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25'
            )}
          >
            {verifying ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Verifying PIN...</span>
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

