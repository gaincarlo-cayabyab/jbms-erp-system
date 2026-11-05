'use client'

import { useEffect, useState, useCallback } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Global Automatic Fullscreen Controller:
 * Automatically expands the viewport to full screen upon the first user interaction
 * (click, touch, or keypress) anywhere in the application, matching Kiosk / POS mode.
 */
export default function AutoFullscreenManager() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasRequestedAuto, setHasRequestedAuto] = useState(false)

  const checkFullscreen = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement)
  }, [])

  const enterFullscreen = useCallback(() => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Suppress browser rejection if user gesture hasn't satisfied policy yet
      })
    }
  }, [])

  useEffect(() => {
    checkFullscreen()
    document.addEventListener('fullscreenchange', checkFullscreen)

    // Trigger auto fullscreen on very first user interaction anywhere
    function onFirstInteraction() {
      if (!hasRequestedAuto && !document.fullscreenElement) {
        setHasRequestedAuto(true)
        enterFullscreen()
      }
    }

    window.addEventListener('click', onFirstInteraction, { passive: true })
    window.addEventListener('touchstart', onFirstInteraction, { passive: true })
    window.addEventListener('keydown', onFirstInteraction, { passive: true })

    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen)
      window.removeEventListener('click', onFirstInteraction)
      window.removeEventListener('touchstart', onFirstInteraction)
      window.removeEventListener('keydown', onFirstInteraction)
    }
  }, [checkFullscreen, enterFullscreen, hasRequestedAuto])

  return null
}

/**
 * Reusable Fullscreen Toggle Button for Headers and Login page
 */
export function FullscreenToggle({ className }: { className?: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function onFSChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFSChange)
    return () => document.removeEventListener('fullscreenchange', onFSChange)
  }, [])

  function toggle() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition active:scale-95',
        className
      )}
      title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (Kiosk Mode)'}
      aria-label="Toggle Fullscreen"
    >
      {isFullscreen ? (
        <>
          <Minimize2 className="h-3.5 w-3.5 text-slate-700" />
          <span className="hidden sm:inline">Exit Fullscreen</span>
        </>
      ) : (
        <>
          <Maximize2 className="h-3.5 w-3.5 text-slate-700" />
          <span className="hidden sm:inline">Fullscreen</span>
        </>
      )}
    </button>
  )
}
