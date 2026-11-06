'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBranch, BRANCH_LIST } from '@/lib/branch-context'
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  MapPin,
  Clock,
  User,
  Eye,
  X,
  Loader2,
  FileCode,
  AlertCircle,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface AuditLogItem {
  id: string
  timestamp: string
  user_id: string | null
  user_name: string | null
  role: string | null
  branch_id: string | null
  action_type: string
  entity_name: string
  entity_id: string
  previous_state: Record<string, unknown> | null
  new_state: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  impersonated_by: string | null
}

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  STO_DISPATCH: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  STO_RECEIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  STO_CREATED: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  VIEW_AS_BRANCH_START: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  VIEW_AS_BRANCH_END: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  SECURITY_CHECKPOINT: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  MULTI_BRANCH_INIT: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  PRICE_OVERRIDE: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  STOCK_ADJUSTMENT: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
}

export default function AuditLogsView() {
  const { activeBranchId } = useBranch()
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null)

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(200)

      if (error) throw error
      setLogs((data as unknown as AuditLogItem[]) || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch audit ledger'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  // Realtime subscription for audit updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('audit_logs_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          setLogs((prev) => [payload.new as AuditLogItem, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Sync branch filter with active branch context if set
  useEffect(() => {
    if (activeBranchId !== 'all') {
      setBranchFilter(activeBranchId)
    }
  }, [activeBranchId])

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (branchFilter !== 'all' && log.branch_id !== branchFilter) {
        return false
      }
      if (actionFilter !== 'all' && log.action_type !== actionFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchUser = log.user_name?.toLowerCase().includes(q)
        const matchAction = log.action_type.toLowerCase().includes(q)
        const matchEntity = log.entity_name.toLowerCase().includes(q)
        const matchEntityId = log.entity_id.toLowerCase().includes(q)
        return matchUser || matchAction || matchEntity || matchEntityId
      }
      return true
    })
  }, [logs, branchFilter, actionFilter, searchQuery])

  // Distinct action types for dropdown filter
  const actionTypes = useMemo(() => {
    const set = new Set(logs.map((l) => l.action_type))
    return Array.from(set)
  }, [logs])

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-slate-900 text-white shadow-sm">
              <History className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              System Audit &amp; Compliance Ledger
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Immutable chronological record of all multi-branch operations, STO dispatches, overrides, and security events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAuditLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition shadow-2xs"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* ── Metric Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-xs font-bold text-slate-500 block">Total Audit Records</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{logs.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Retained chronological events</p>
        </div>

        <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 shadow-2xs">
          <span className="text-xs font-bold text-blue-700 block">STO Dispatches</span>
          <p className="text-2xl font-black text-blue-900 mt-2">
            {logs.filter((l) => l.action_type.includes('STO')).length}
          </p>
          <p className="text-[11px] text-blue-600 font-medium mt-0.5">Transfer movements</p>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-2xs">
          <span className="text-xs font-bold text-emerald-700 block">Dagupan Events</span>
          <p className="text-2xl font-black text-emerald-900 mt-2">
            {logs.filter((l) => l.branch_id === 'dagupan_main').length}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Main store operations</p>
        </div>

        <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 shadow-2xs">
          <span className="text-xs font-bold text-indigo-700 block">Manila Events</span>
          <p className="text-2xl font-black text-indigo-900 mt-2">
            {logs.filter((l) => l.branch_id === 'manila_branch').length}
          </p>
          <p className="text-[11px] text-indigo-600 font-medium mt-0.5">Operations hub actions</p>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by user, action type, entity name, or record ID…"
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none cursor-pointer hover:border-slate-300 transition"
          >
            <option value="all">All Branches</option>
            <option value="dagupan_main">DAG — Dagupan Main</option>
            <option value="manila_branch">MNL — Manila Operations</option>
          </select>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none cursor-pointer hover:border-slate-300 transition"
          >
            <option value="all">All Actions</option>
            {actionTypes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Audit Logs Table ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-xs font-semibold text-slate-600">Loading audit ledger entries…</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No audit records match your filters</p>
            <p className="text-xs text-slate-400">Adjust the branch or action filter above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor / Profile</th>
                  <th className="py-3 px-4">Branch Scoped</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredLogs.map((log) => {
                  const actionStyle =
                    ACTION_COLORS[log.action_type] || {
                      bg: 'bg-slate-100',
                      text: 'text-slate-800',
                      border: 'border-slate-200',
                    }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-sans">
                        <div className="font-bold text-slate-900">{log.user_name || 'System'}</div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {log.role || 'System'}
                        </span>
                        {log.impersonated_by && (
                          <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold">
                            View As
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-sans">
                        {log.branch_id === 'dagupan_main' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            <MapPin className="h-2.5 w-2.5" />
                            <span>DAG Main</span>
                          </span>
                        ) : log.branch_id === 'manila_branch' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                            <MapPin className="h-2.5 w-2.5" />
                            <span>MNL Hub</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Consolidated</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border',
                            actionStyle.bg,
                            actionStyle.text,
                            actionStyle.border
                          )}
                        >
                          {log.action_type}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        <span className="font-bold text-slate-800">{log.entity_name}</span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                          id: {log.entity_id}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-sans">
                        {(log.new_state || log.previous_state) && (
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 text-xs font-semibold transition"
                            title="Inspect JSON Payload"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Inspect</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: Inspect Audit Payload ──────────────────────────────── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                    Payload Details: {selectedLog.action_type}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {new Date(selectedLog.timestamp).toLocaleString()} • {selectedLog.entity_name} ({selectedLog.entity_id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {selectedLog.previous_state && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Previous State
                  </span>
                  <pre className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 text-rose-900 text-xs font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.previous_state, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_state && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    New State / Event Data
                  </span>
                  <pre className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-900 text-xs font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.new_state, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
