'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { AlertTriangle, Trash2, Info, CheckCircle2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider')
  }
  return context.confirm
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    options: ConfirmOptions
    resolve: (value: boolean) => void
  } | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        isOpen: true,
        options: {
          confirmText: options.confirmText ?? 'Confirm',
          cancelText: options.cancelText ?? 'Cancel',
          variant: options.variant ?? 'danger',
          ...options,
        },
        resolve,
      })
    })
  }, [])

  const handleConfirm = () => {
    dialogState?.resolve(true)
    setDialogState(null)
  }

  const handleCancel = () => {
    dialogState?.resolve(false)
    setDialogState(null)
  }

  const variant = dialogState?.options.variant ?? 'danger'

  const variantStyles = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
      confirmButton: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
      confirmButton: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200',
    },
    info: {
      icon: Info,
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      confirmButton: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200',
    },
    success: {
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      confirmButton: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
    },
  }[variant]

  const Icon = variantStyles.icon

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* In-App System Confirmation Modal (Zero browser dialog, stays in Fullscreen) */}
      {dialogState?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Close button */}
            <button
              onClick={handleCancel}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                  variantStyles.iconBg
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {dialogState.options.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  {dialogState.options.message}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95"
              >
                {dialogState.options.cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={cn(
                  'rounded-xl px-4 py-2 text-xs font-bold transition active:scale-95 shadow-sm',
                  variantStyles.confirmButton
                )}
              >
                {dialogState.options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
