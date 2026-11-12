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
  ArrowLeftRight,
  FileText,
  CheckCircle2,
  Layers,
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
  const [activeCategoryTab, setActiveCategoryTab] = useState<'ALL' | 'STO' | 'STOCK' | 'PRICE' | 'SECURITY'>('ALL')
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

  // Category counts
  const tabCounts = useMemo(() => {
    const sto = logs.filter((l) => l.action_type.includes('STO')).length
    const stock = logs.filter((l) => l.action_type.includes('STOCK')).length
    const price = logs.filter((l) => l.action_type.includes('PRICE') || l.action_type.includes('OVERRIDE')).length
    const security = logs.filter(
      (l) => l.action_type.includes('SECURITY') || l.action_type.includes('VIEW_AS') || l.action_type.includes('AUTH')
    ).length
    return { all: logs.length, sto, stock, price, security }
  }, [logs])

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category tab filter
      if (activeCategoryTab === 'STO' && !log.action_type.includes('STO')) return false
      if (activeCategoryTab === 'STOCK' && !log.action_type.includes('STOCK')) return false
      if (activeCategoryTab === 'PRICE' && !log.action_type.includes('PRICE') && !log.action_type.includes('OVERRIDE')) return false
      if (activeCategoryTab === 'SECURITY' && !log.action_type.includes('SECURITY') && !log.action_type.includes('VIEW_AS') && !log.action_type.includes('AUTH')) return false

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
  }, [logs, branchFilter, actionFilter, searchQuery, activeCategoryTab])

  // Distinct action types for dropdown filter
  const actionTypes = useMemo(() => {
    const set = new Set(logs.map((l) => l.action_type))
    return Array.from(set)
  }, [logs])

  // Export audit events to CSV
  const exportAuditCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No audit records to export.')
      return
    }
    const headers = ['Timestamp', 'User', 'Role', 'Branch', 'Action Type', 'Entity', 'Entity ID', 'IP Address']
    const rows = filteredLogs.map((l) => [
      `"${new Date(l.timestamp).toLocaleString()}"`,
      `"${l.user_name || 'System'}"`,
      `"${l.role || ''}"`,
      `"${l.branch_id === 'dagupan_main' ? 'Dagupan Main' : l.branch_id === 'manila_branch' ? 'Manila Branch' : 'Consolidated'}"`,
      `"${l.action_type}"`,
      `"${l.entity_name}"`,
      `"${l.entity_id}"`,
      `"${l.ip_address || ''}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `japa_audit_ledger_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Audit ledger exported to CSV.')
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              System Audit &amp; Compliance Ledger
            </h1>
            <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
              Module 10 · Audit Ledger
            </span>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              Immutable Chronological Trail · Level 1
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Immutable chronological record of all multi-branch operations, STO dispatches, overrides, and security events.
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchAuditLogs}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition disabled:opacity-50"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            <span>Refresh Ledger</span>
          </button>

          <button
            type="button"
            onClick={exportAuditCSV}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition active:scale-95 disabled:opacity-40"
          >
            <FileText className="h-4 w-4 text-zinc-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Metric Cards Row (Matching Multi-Store Inventory & Dashboard) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Records */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                TOTAL AUDIT EVENTS
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl truncate">
                {logs.length}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs bg-indigo-600">
              <History className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 border-t border-zinc-100 pt-3">
            <p className="text-xs text-zinc-500 truncate">Retained chronological events</p>
          </div>
        </div>

        {/* Card 2: STO Dispatches */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                STO &amp; LOGISTICS
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl truncate">
                {tabCounts.sto}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs bg-blue-600">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 border-t border-zinc-100 pt-3">
            <p className="text-xs text-zinc-500 truncate">Inter-branch inventory dispatches</p>
          </div>
        </div>

        {/* Card 3: Security & Checkpoints */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                SECURITY &amp; SESSIONS
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl truncate">
                {tabCounts.security}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs bg-amber-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 border-t border-zinc-100 pt-3">
            <p className="text-xs text-zinc-500 truncate">Auth checks, logins &amp; view-as</p>
          </div>
        </div>

        {/* Card 4: Overrides & Adjustments */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                OVERRIDES &amp; ADJUSTS
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl truncate">
                {tabCounts.stock + tabCounts.price}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs bg-rose-600">
              <Tag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 border-t border-zinc-100 pt-3">
            <p className="text-xs text-zinc-500 truncate">Price overrides &amp; shelf adjustments</p>
          </div>
        </div>
      </div>

      {/* ── Event Category Tabs (Matching Inventory & Help Design) ── */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {[
          { id: 'ALL', label: 'ALL EVENTS', count: tabCounts.all },
          { id: 'STO', label: 'STO TRANSFERS', count: tabCounts.sto },
          { id: 'STOCK', label: 'STOCK ADJUSTMENTS', count: tabCounts.stock },
          { id: 'PRICE', label: 'PRICE OVERRIDES', count: tabCounts.price },
          { id: 'SECURITY', label: 'SECURITY & SESSIONS', count: tabCounts.security },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveCategoryTab(tab.id as typeof activeCategoryTab)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-2xs flex items-center gap-1.5',
              activeCategoryTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            )}
          >
            <span>{tab.label}</span>
            <span className="opacity-75">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* ── Filters & Search Bar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by user, action type, entity name, or record ID…"
            className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition shadow-2xs placeholder:text-zinc-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-zinc-300 transition shadow-2xs"
          >
            <option value="all">All Branches</option>
            <option value="dagupan_main">DAG — Dagupan Main</option>
            <option value="manila_branch">MNL — Manila Operations</option>
          </select>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-zinc-300 transition shadow-2xs max-w-[160px] truncate"
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
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
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

