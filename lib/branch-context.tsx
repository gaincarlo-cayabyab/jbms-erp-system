'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from './auth-context'
import { createClient } from './supabase/client'
import { toast } from 'sonner'

export interface BranchInfo {
  id: string
  name: string
  shortCode: 'DAG' | 'MNL' | 'ALL'
  address: string
  contactNumber: string
}

export const BRANCH_LIST: BranchInfo[] = [
  {
    id: 'dagupan_main',
    name: 'JAPA Dagupan (Main Branch)',
    shortCode: 'DAG',
    address: 'AB Fernandez Ave, Downtown District, Dagupan City, Pangasinan',
    contactNumber: '(075) 522-1234',
  },
  {
    id: 'manila_branch',
    name: 'JAPA Manila Operations Hub',
    shortCode: 'MNL',
    address: 'Morayta St, Sampaloc, Manila, Metro Manila',
    contactNumber: '(02) 8123-4567',
  },
]

export const CONSOLIDATED_BRANCH: BranchInfo = {
  id: 'all',
  name: 'All Stores — Consolidated',
  shortCode: 'ALL',
  address: 'Global Multi-Branch Network',
  contactNumber: 'Enterprise Operations',
}

interface BranchContextType {
  activeBranchId: string
  activeBranch: BranchInfo
  userAssignedBranchId: string
  isBranchLocked: boolean
  isSuperAdmin: boolean
  impersonatedBranchId: string | null
  availableBranches: BranchInfo[]
  setActiveBranchId: (branchId: string) => void
  setViewAsBranch: (branchId: string | null) => Promise<void>
  logAuditEvent: (
    actionType: string,
    entityName: string,
    entityId: string,
    newState?: Record<string, unknown>,
    previousState?: Record<string, unknown>
  ) => Promise<void>
}

const BranchContext = createContext<BranchContextType | null>(null)

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  // Determine user's primary assigned branch
  const userAssignedBranchId = useMemo(() => {
    if (!user) return 'dagupan_main'
    if (user.branch_id) return user.branch_id
    if (user.full_name?.includes('Manila') || user.full_name?.includes('(MNL)')) {
      return 'manila_branch'
    }
    return 'dagupan_main'
  }, [user])

  const isSuperAdmin = useMemo(() => {
    return Boolean(user?.role === 'Admin' || user?.full_name?.includes('Gain Carlo') || user?.full_name?.includes('Belinda Dee'))
  }, [user])

  // Active branch ID state
  const [activeBranchId, setActiveBranchIdState] = useState<string>('dagupan_main')
  const [impersonatedBranchId, setImpersonatedBranchId] = useState<string | null>(null)

  // Initialize and synchronize branch when user logs in
  useEffect(() => {
    if (user) {
      if (!isSuperAdmin) {
        // Non-admin users are strictly locked to their assigned branch
        setActiveBranchIdState(userAssignedBranchId)
        setImpersonatedBranchId(null)
      } else {
        // Admin remembers preference from localStorage or defaults to 'all'
        const stored = localStorage.getItem('japa_active_branch')
        if (stored && (stored === 'all' || stored === 'dagupan_main' || stored === 'manila_branch')) {
          setActiveBranchIdState(stored)
        } else {
          setActiveBranchIdState('all')
        }
      }
    }
  }, [user, userAssignedBranchId, isSuperAdmin])

  const isBranchLocked = !isSuperAdmin

  const setActiveBranchId = useCallback(
    (branchId: string) => {
      if (!isSuperAdmin && branchId !== userAssignedBranchId) {
        toast.error('Permission Denied: Your profile is scoped to your assigned branch.')
        return
      }
      setActiveBranchIdState(branchId)
      try {
        localStorage.setItem('japa_active_branch', branchId)
      } catch {}
    },
    [isSuperAdmin, userAssignedBranchId]
  )

  // Helper to log audit events directly to Supabase audit_logs table
  const logAuditEvent = useCallback(
    async (
      actionType: string,
      entityName: string,
      entityId: string,
      newState?: Record<string, unknown>,
      previousState?: Record<string, unknown>
    ) => {
      try {
        const supabase = createClient()
        await supabase.from('audit_logs').insert({
          user_id: user?.id || null,
          user_name: user?.full_name || 'System User',
          role: user?.role || 'Staff',
          branch_id: activeBranchId === 'all' ? 'dagupan_main' : activeBranchId,
          action_type: actionType,
          entity_name: entityName,
          entity_id: entityId,
          new_state: newState || null,
          previous_state: previousState || null,
          impersonated_by: impersonatedBranchId ? user?.id : null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        })
      } catch (err) {
        console.warn('Audit logging warning:', err)
      }
    },
    [user, activeBranchId, impersonatedBranchId]
  )

  // Super Admin "View As Branch" Impersonation Session
  const setViewAsBranch = useCallback(
    async (branchId: string | null) => {
      if (!isSuperAdmin) {
        toast.error('Only Super Administrators can activate View As Branch mode.')
        return
      }

      setImpersonatedBranchId(branchId)
      if (branchId) {
        setActiveBranchIdState(branchId)
        toast.info(`Active Workspace: View As ${branchId === 'dagupan_main' ? 'Dagupan Main' : 'Manila Branch'}`)
        await logAuditEvent('VIEW_AS_BRANCH_START', 'branches', branchId, {
          impersonating_branch: branchId,
          admin: user?.full_name,
        })
      } else {
        setActiveBranchIdState('all')
        toast.success('Exited View As Branch mode — Consolidated View Restored')
        await logAuditEvent('VIEW_AS_BRANCH_END', 'branches', 'all', {
          admin: user?.full_name,
        })
      }
    },
    [isSuperAdmin, user, logAuditEvent]
  )

  const activeBranch = useMemo(() => {
    if (activeBranchId === 'all') return CONSOLIDATED_BRANCH
    return BRANCH_LIST.find((b) => b.id === activeBranchId) || BRANCH_LIST[0]
  }, [activeBranchId])

  const availableBranches = useMemo(() => {
    if (isSuperAdmin) {
      return [CONSOLIDATED_BRANCH, ...BRANCH_LIST]
    }
    return BRANCH_LIST.filter((b) => b.id === userAssignedBranchId)
  }, [isSuperAdmin, userAssignedBranchId])

  return (
    <BranchContext.Provider
      value={{
        activeBranchId,
        activeBranch,
        userAssignedBranchId,
        isBranchLocked,
        isSuperAdmin,
        impersonatedBranchId,
        availableBranches,
        setActiveBranchId,
        setViewAsBranch,
        logAuditEvent,
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const context = useContext(BranchContext)
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider')
  }
  return context
}

