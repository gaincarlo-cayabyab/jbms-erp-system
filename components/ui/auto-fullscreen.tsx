'use client'

import { useEffect, useState, useCallback } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Universal cross-browser fullscreen helper with vendor prefix fallbacks
 */
export function requestAppFullscreen() {
  if (typeof document === 'undefined') return

  const docEl = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>
    mozRequestFullScreen?: () => Promise<void>
    msRequestFullscreen?: () => Promise<void>
  }

  const isFullscreen = !!(
    document.fullscreenElement ||
    (document as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
    (document as { mozFullScreenElement?: Element }).mozFullScreenElement ||
    (document as { msFullscreenElement?: Element }).msFullscreenElement
  )

  if (isFullscreen) return

  const req =
    docEl.requestFullscreen ||
    docEl.webkitRequestFullscreen ||
    docEl.mozRequestFullScreen ||
    docEl.msRequestFullscreen

  if (req) {
    try {
      const res = req.call(docEl)
      if (res && typeof res.catch === 'function') {
        res.catch(() => {
          // Handled silently if browser user activation policy is not satisfied yet
        })
      }
    } catch {
      // Ignore synchronous policy exceptions on older engines
    }
  }
}

export function exitAppFullscreen() {
  if (typeof document === 'undefined') return

  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void>
    mozCancelFullScreen?: () => Promise<void>
    msExitFullscreen?: () => Promise<void>
  }

  const exit =
    doc.exitFullscreen ||
    doc.webkitExitFullscreen ||
    doc.mozCancelFullScreen ||
    doc.msExitFullscreen

  if (exit) {
    try {
      const res = exit.call(doc)
      if (res && typeof res.catch === 'function') {
        res.catch(() => {})
      }
    } catch {}
  }
}

/**
 * Global Automatic Fullscreen Controller:
 * Automatically expands the viewport to full screen upon the first user interaction
 * (touch, tap, click, or keypress) anywhere in the application, ideal for POS & Tablet Kiosk mode.
 */
export default function AutoFullscreenManager() {
  const [, setIsFullscreen] = useState(false)

  const checkFullscreen = useCallback(() => {
    const isFS = !!(
      document.fullscreenElement ||
      (document as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
      (document as { mozFullScreenElement?: Element }).mozFullScreenElement ||
      (document as { msFullscreenElement?: Element }).msFullscreenElement
    )
    setIsFullscreen(isFS)
  }, [])

  useEffect(() => {
    checkFullscreen()

    document.addEventListener('fullscreenchange', checkFullscreen)
    document.addEventListener('webkitfullscreenchange', checkFullscreen)
    document.addEventListener('mozfullscreenchange', checkFullscreen)
    document.addEventListener('MSFullscreenChange', checkFullscreen)

    // Attempt immediately on mount (succeeds if navigated from previous page with user activation)
    requestAppFullscreen()

    // Trigger auto fullscreen on the very first touch/click/press anywhere
    function onUserGesture() {
      requestAppFullscreen()
    }

    // Capture phase ensures execution ahead of any nested component handlers
    window.addEventListener('pointerdown', onUserGesture, { capture: true, passive: true })
    window.addEventListener('touchstart', onUserGesture, { capture: true, passive: true })
    window.addEventListener('click', onUserGesture, { capture: true, passive: true })
    window.addEventListener('keydown', onUserGesture, { capture: true, passive: true })
    window.addEventListener('focus', onUserGesture, { passive: true })
    document.addEventListener('visibilitychange', onUserGesture, { passive: true })

    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen)
      document.removeEventListener('webkitfullscreenchange', checkFullscreen)
      document.removeEventListener('mozfullscreenchange', checkFullscreen)
      document.removeEventListener('MSFullscreenChange', checkFullscreen)
      window.removeEventListener('pointerdown', onUserGesture, { capture: true })
      window.removeEventListener('touchstart', onUserGesture, { capture: true })
      window.removeEventListener('click', onUserGesture, { capture: true })
      window.removeEventListener('keydown', onUserGesture, { capture: true })
      window.removeEventListener('focus', onUserGesture)
      document.removeEventListener('visibilitychange', onUserGesture)
    }
  }, [checkFullscreen])

  return null
}

/**
 * Reusable Fullscreen Toggle Button for Headers and Login page
 */
export function FullscreenToggle({ className }: { className?: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function onFSChange() {
      const isFS = !!(
        document.fullscreenElement ||
        (document as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as { mozFullScreenElement?: Element }).mozFullScreenElement ||
        (document as { msFullscreenElement?: Element }).msFullscreenElement
      )
      setIsFullscreen(isFS)
    }

    onFSChange()
    document.addEventListener('fullscreenchange', onFSChange)
    document.addEventListener('webkitfullscreenchange', onFSChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFSChange)
      document.removeEventListener('webkitfullscreenchange', onFSChange)
    }
  }, [])

  function toggle() {
    if (!isFullscreen) {
      requestAppFullscreen()
    } else {
      exitAppFullscreen()
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl border border-stone-200/90 bg-white/90 px-2.5 py-1 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-100 transition active:scale-95 touch-manipulation cursor-pointer',
        className
      )}
      title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (POS Kiosk Mode)'}
      aria-label="Toggle Fullscreen"
    >
      {isFullscreen ? (
        <>
          <Minimize2 className="h-3.5 w-3.5 text-stone-700 shrink-0" />
          <span className="hidden sm:inline text-[11px] font-bold">Exit Fullscreen</span>
        </>
      ) : (
        <>
          <Maximize2 className="h-3.5 w-3.5 text-stone-700 shrink-0" />
          <span className="hidden sm:inline text-[11px] font-bold">Fullscreen</span>
        </>
      )}
    </button>
  )
}
