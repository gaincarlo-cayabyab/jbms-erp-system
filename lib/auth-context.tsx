'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { performSignOut } from '@/lib/auth'

export interface AppUserSession {
  id: string
  full_name: string
  role: 'Admin' | 'Manager' | 'Cashier' | 'Inventory' | 'Staff' | string
  email?: string
}

interface AuthContextType {
  user: AppUserSession | null
  isLoading: boolean
  loginWithPinSession: (session: AppUserSession) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUserSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize session from localStorage / cookie or Supabase auth
  useEffect(() => {
    async function initSession() {
      try {
        // 1. Check local storage for PIN session
        const stored = localStorage.getItem('japa_user_session')
        if (stored) {
          const parsed = JSON.parse(stored) as AppUserSession
          if (parsed?.id && parsed?.role) {
            setUser(parsed)
            setIsLoading(false)
            return
          }
        }

        // 2. Fallback to Supabase Auth user (email/password login)
        const supabase = createClient()
        const { data: { user: sbUser } } = await supabase.auth.getUser()

        if (sbUser) {
          let role = (sbUser.user_metadata?.role as string) || 'Admin'
          if (sbUser.email === 'admin@japacore.com' || sbUser.email === 'admin@japa.com') role = 'Admin'

          const fallbackSession: AppUserSession = {
            id: sbUser.id,
            full_name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'User',
            role,
            email: sbUser.email,
          }
          setUser(fallbackSession)
        }
      } catch (err) {
        console.warn('Failed to initialize auth session:', err)
      } finally {
        setIsLoading(false)
      }
    }

    initSession()
  }, [])

  const loginWithPinSession = useCallback(async (sessionData: AppUserSession) => {
    setUser(sessionData)

    // Save to localStorage for instant client access
    try {
      localStorage.setItem('japa_user_session', JSON.stringify(sessionData))
    } catch {}

    // Save cookie directly in browser
    try {
      document.cookie = `japa_session=${encodeURIComponent(JSON.stringify(sessionData))};path=/;max-age=604800;SameSite=Lax`
    } catch {}

    // Synchronize with server route for middleware / SSR
    try {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      })
    } catch (err) {
      console.warn('Failed to sync session cookie with server:', err)
    }
  }, [])

  const logout = useCallback(async () => {
    setUser(null)
    try {
      localStorage.removeItem('japa_user_session')
      await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {})
    } catch {}
    await performSignOut()
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, loginWithPinSession, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

