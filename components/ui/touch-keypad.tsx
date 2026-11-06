'use client'

import React from 'react'
import { Delete, CornerDownLeft, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KeypadProps {
  onKeyPress: (val: string) => void
  onDelete: () => void
  onClear?: () => void
  onSubmit?: () => void
  submitLabel?: string
  submitDisabled?: boolean
  presets?: number[]
  onPresetSelect?: (amount: number) => void
  className?: string
}

export const TouchKeypad: React.FC<KeypadProps> = ({
  onKeyPress,
  onDelete,
  onClear,
  onSubmit,
  submitLabel = 'Complete Entry',
  submitDisabled = false,
  presets,
  onPresetSelect,
  className = '',
}) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0']

  return (
    <div className={cn('p-3 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-inner space-y-2.5', className)}>
      {/* Quick Cash Presets if provided */}
      {presets && presets.length > 0 && onPresetSelect && (
        <div className="grid grid-cols-4 gap-1.5 pb-1">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onPresetSelect(preset)}
              className="h-11 text-xs font-bold bg-white text-indigo-700 hover:bg-indigo-50 active:scale-95 border border-indigo-200 rounded-xl transition shadow-2xs flex items-center justify-center select-none"
            >
              +₱{preset >= 1000 ? `${preset / 1000}k` : preset}
            </button>
          ))}
        </div>
      )}

      {/* 3×4 Touch Keypad Grid — minimum 56px touch targets */}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onKeyPress(key)}
            className="h-14 sm:h-16 text-2xl font-black bg-white text-slate-800 rounded-xl border border-slate-200/90 shadow-2xs hover:bg-indigo-50/70 hover:border-indigo-300 active:bg-slate-200 active:scale-95 transition-all flex items-center justify-center select-none"
          >
            {key}
          </button>
        ))}

        {/* Backspace / Delete Key */}
        <button
          type="button"
          onClick={onDelete}
          className="h-14 sm:h-16 text-xl bg-rose-50 text-rose-700 hover:bg-rose-100 active:bg-rose-200 active:scale-95 border border-rose-200 rounded-xl transition-all flex items-center justify-center select-none shadow-2xs"
          title="Delete Digit"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Bar: Clear + Submit Button */}
      <div className="grid grid-cols-4 gap-2 pt-0.5">
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="col-span-1 h-13 bg-slate-200/80 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-300 active:scale-95 transition flex items-center justify-center gap-1 select-none"
            title="Clear Input"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear</span>
          </button>
        )}

        {onSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled}
            className={cn(
              'h-13 bg-emerald-600 text-white font-black text-sm rounded-xl shadow-md hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 select-none disabled:opacity-50',
              onClear ? 'col-span-3' : 'col-span-4'
            )}
          >
            <span>{submitLabel}</span>
            <CornerDownLeft className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
