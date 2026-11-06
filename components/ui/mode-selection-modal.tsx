'use client'

import React from 'react'
import { useDeviceMode, DeviceMode } from '@/lib/device-context'
import { Monitor, Tablet, Check, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  isOpen?: boolean
  onClose?: () => void
}

export const ModeSelectionModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { deviceMode, setDeviceMode, isModeModalOpen, closeModeModal } = useDeviceMode()

  const modalOpen = isOpen !== undefined ? isOpen : isModeModalOpen
  const handleClose = onClose || closeModeModal

  if (!modalOpen) return null

  const handleSelect = (mode: DeviceMode) => {
    setDeviceMode(mode, true)
    handleClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dual-Mode Interface</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Select Interface Mode
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Optimize ERP layout, button sizes, and input controls for your current physical device.
          </p>
        </div>

        {/* Mode Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
          {/* Desktop / Laptop Mode */}
          <button
            type="button"
            onClick={() => handleSelect('desktop')}
            className={cn(
              'relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all text-left group active:scale-[0.98]',
              deviceMode === 'desktop'
                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-md ring-2 ring-indigo-200'
                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-800'
            )}
          >
            {deviceMode === 'desktop' && (
              <span className="absolute top-3 right-3 bg-indigo-600 text-white rounded-full p-1 shadow-sm">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
            <div
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition shadow-2xs',
                deviceMode === 'desktop'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600'
              )}
            >
              <Monitor className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-sm sm:text-base text-center block">
              Desktop / Laptop
            </span>
            <span className="text-[11px] text-slate-500 mt-1 text-center font-medium block">
              Compact tables, multi-column density &amp; keyboard shortcuts
            </span>
          </button>

          {/* POS Terminal Mode */}
          <button
            type="button"
            onClick={() => handleSelect('pos')}
            className={cn(
              'relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all text-left group active:scale-[0.98]',
              deviceMode === 'pos'
                ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 shadow-md ring-2 ring-emerald-200'
                : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50 text-slate-800'
            )}
          >
            {deviceMode === 'pos' && (
              <span className="absolute top-3 right-3 bg-emerald-600 text-white rounded-full p-1 shadow-sm">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
            <div
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition shadow-2xs',
                deviceMode === 'pos'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-600'
              )}
            >
              <Tablet className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-sm sm:text-base text-center block">
              POS Terminal
            </span>
            <span className="text-[11px] text-slate-500 mt-1 text-center font-medium block">
              56px+ touch targets, on-screen keypads &amp; fast register layout
            </span>
          </button>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleClose}
          className="w-full py-3 bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-slate-800 active:scale-[0.99] transition shadow-md"
        >
          Confirm &amp; Continue
        </button>
      </div>
    </div>
  )
}
