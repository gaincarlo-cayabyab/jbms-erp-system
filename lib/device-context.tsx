'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

export type DeviceMode = 'desktop' | 'pos'

interface DeviceContextType {
  deviceMode: DeviceMode
  isInitialized: boolean
  isModeModalOpen: boolean
  setDeviceMode: (mode: DeviceMode, showToast?: boolean) => void
  toggleDeviceMode: () => void
  openModeModal: () => void
  closeModeModal: () => void
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined)

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceMode, setDeviceModeState] = useState<DeviceMode>('desktop')
  const [isInitialized, setIsInitialized] = useState(false)
  const [isModeModalOpen, setIsModeModalOpen] = useState(false)

  // Initialize from client storage
  useEffect(() => {
    try {
      const storedMode = localStorage.getItem('erp_device_mode') as DeviceMode | null
      if (storedMode === 'pos' || storedMode === 'desktop') {
        setDeviceModeState(storedMode)
      } else {
        // Auto-detect tablet or touch capability if no preference saved
        const hasTouch =
          typeof window !== 'undefined' &&
          ('ontouchstart' in window || navigator.maxTouchPoints > 0)
        const isTabletViewport =
          typeof window !== 'undefined' && window.innerWidth <= 1180 && window.innerWidth >= 600

        if (hasTouch && isTabletViewport) {
          setDeviceModeState('pos')
          localStorage.setItem('erp_device_mode', 'pos')
        }
      }
    } catch {}
    setIsInitialized(true)
  }, [])

  // Sync class on <html> element
  useEffect(() => {
    if (isInitialized) {
      document.documentElement.classList.remove('desktop-mode', 'pos-terminal-mode')
      document.documentElement.classList.add(
        deviceMode === 'pos' ? 'pos-terminal-mode' : 'desktop-mode'
      )
    }
  }, [deviceMode, isInitialized])

  const setDeviceMode = useCallback((mode: DeviceMode, showToast = true) => {
    setDeviceModeState(mode)
    try {
      localStorage.setItem('erp_device_mode', mode)
    } catch {}

    if (showToast) {
      if (mode === 'pos') {
        toast.info('POS Terminal Mode Activated', {
          description: 'Enlarged 56px+ touch targets and touch keypad layout enabled.',
          duration: 3500,
        })
      } else {
        toast.info('Desktop / Laptop Mode Activated', {
          description: 'High information density and keyboard-first layout enabled.',
          duration: 3500,
        })
      }
    }
  }, [])

  const toggleDeviceMode = useCallback(() => {
    const nextMode = deviceMode === 'desktop' ? 'pos' : 'desktop'
    setDeviceMode(nextMode, true)
  }, [deviceMode, setDeviceMode])

  const openModeModal = useCallback(() => setIsModeModalOpen(true), [])
  const closeModeModal = useCallback(() => setIsModeModalOpen(false), [])

  return (
    <DeviceContext.Provider
      value={{
        deviceMode,
        isInitialized,
        isModeModalOpen,
        setDeviceMode,
        toggleDeviceMode,
        openModeModal,
        closeModeModal,
      }}
    >
      <div className={`w-full min-h-screen ${deviceMode === 'pos' ? 'pos-root-container select-none' : ''}`}>
        {children}
      </div>
    </DeviceContext.Provider>
  )
}

export const useDeviceMode = () => {
  const context = useContext(DeviceContext)
  if (!context) {
    throw new Error('useDeviceMode must be used within a DeviceProvider')
  }
  return context
}

/**
 * Smooth Viewport Scrolling on Input Focus for Touch Terminals
 * Conforms to Section 5.2 of the Dual-Mode Specification
 */
export const handlePosInputFocus = (
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
) => {
  if (typeof document === 'undefined') return
  const isPos = document.documentElement.classList.contains('pos-terminal-mode')
  if (isPos) {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 280)
  }
}
