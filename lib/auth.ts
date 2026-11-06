'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Robust, client-safe signout function that:
 * 1. Informs the server endpoint to revoke the session and delete HTTP auth cookies.
 * 2. Revokes browser client session.
 * 3. Clears local and session storage.
 * 4. Cleans any accessible cookies.
 * 5. Safely exits fullscreen if currently active.
 * 6. Hard-redirects to /login?logout=1 to force clean reinitialization of React memory and Next.js router caches.
 */
export async function performSignOut(): Promise<void> {
  try {
    // 1. Notify server route to delete all auth cookies and session
    await Promise.allSettled([
      fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
      fetch('/api/auth/session', {
        method: 'DELETE',
      }),
    ])

    // 2. Clear browser client auth
    try {
      const supabase = createClient()
      await supabase.auth.signOut().catch(() => {})
    } catch {
      /* ignore */
    }

    // 3. Clear all browser storage keys
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      /* ignore */
    }

    // 4. Force expire all accessible cookies
    try {
      const cookies = document.cookie.split(';')
      for (const cookie of cookies) {
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
        }
      }
    } catch {
      /* ignore */
    }

    // 5. Exit fullscreen if active
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }

    // 6. Hard redirect to /login with explicit logout flag
    window.location.href = '/login?logout=1'
  } catch (err) {
    console.error('Sign out error:', err)
    window.location.href = '/login?logout=1'
  }
}

