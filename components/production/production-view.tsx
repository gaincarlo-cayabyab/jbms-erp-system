'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import DashboardShell from '@/components/dashboard-shell'
import ProductionSummaryCards from './production-summary-cards'
import JobOrderFormModal from './job-order-form-modal'
import { createClient } from '@/lib/supabase/client'
import { JobOrder, JobStageStatus } from '@/types/production'
import { SalesOrder } from '@/types/sales'
import {
  Layers,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ExternalLink,
  Clock,
  Building,
  Check,
  Receipt,
} from 'lucide-react'

const KANBAN_STAGES: Array<{
  id: JobStageStatus
  title: string
  color: string
  badgeBg: string
}> = [
  { id: 'Queued', title: 'Pending / Queued', color: 'border-zinc-400 bg-zinc-50', badgeBg: 'bg-zinc-200 text-zinc-800' },
  { id: 'Pre_Press', title: 'Pre-Press / Design', color: 'border-amber-400 bg-amber-50/30', badgeBg: 'bg-amber-100 text-amber-800' },
  { id: 'Printing', title: 'In Production', color: 'border-blue-400 bg-blue-50/30', badgeBg: 'bg-blue-100 text-blue-800' },
  { id: 'Finishing', title: 'Finishing / Assembly', color: 'border-purple-400 bg-purple-50/30', badgeBg: 'bg-purple-100 text-purple-800' },
  { id: 'Quality_Check', title: 'Quality Check', color: 'border-teal-400 bg-teal-50/30', badgeBg: 'bg-teal-100 text-teal-800' },
  { id: 'Done', title: 'Completed', color: 'border-emerald-400 bg-emerald-50/30', badgeBg: 'bg-emerald-100 text-emerald-800' },
]

export default function ProductionView() {
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<JobOrder[]>([])
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [activeTabStage, setActiveTabStage] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // URL query params: e.g. /production?new=true
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true)
    }
  }, [searchParams])

  // Load Job Orders & Sales Orders from Supabase
  const loadData = async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const supabase = createClient()

      // Fetch job_orders joined with sales_orders & customers
      const { data: jobData, error: jobError } = await supabase
        .from('job_orders')
        .select('*, sales_orders(*, customers(*))')
        .order('created_at', { ascending: false })

      if (jobError) throw new Error(jobError.message)

      // Fetch confirmed / active sales orders for linking
      const { data: soData, error: soError } = await supabase
        .from('sales_orders')
        .select('*, customers(*)')
        .order('created_at', { ascending: false })

      if (soError) console.warn('Sales orders load warning:', soError.message)

      setJobs((jobData as JobOrder[]) || [])
      setSalesOrders((soData as SalesOrder[]) || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch production data.'
      setFetchError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleJobCreated = (newJob: JobOrder) => {
    setJobs((prev) => [newJob, ...prev])
    toast.success(`Job Order "${newJob.job_number}" scheduled successfully.`)
  }

  // Update job order stage directly
  const handleUpdateStage = async (jobId: string, nextStage: JobStageStatus) => {
    try {
      // Optimistic update
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, stage_status: nextStage } : j))
      )

      const supabase = createClient()
      const { error } = await supabase
        .from('job_orders')
        .update({ stage_status: nextStage })
        .eq('id', jobId)

      if (error) {
        throw new Error(error.message)
      }

      toast.success(`Job stage moved to ${nextStage.replace('_', ' ')}.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update stage'
      toast.error(`Error updating stage: ${msg}`)
      loadData()
    }
  }

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Tab stage filter for table view
      if (viewMode === 'table' && activeTabStage !== 'all') {
        if (job.stage_status !== activeTabStage) return false
      }

      // Production Area filter
      if (areaFilter !== 'all' && job.production_area !== areaFilter) {
        return false
      }

      // Search query
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true

      const jobNum = job.job_number.toLowerCase()
      const orderNum = job.sales_orders?.order_number?.toLowerCase() || ''
      const custName = job.sales_orders?.customers?.name?.toLowerCase() || ''
      const area = job.production_area?.toLowerCase() || ''

      return (
        jobNum.includes(q) ||
        orderNum.includes(q) ||
        custName.includes(q) ||
        area.includes(q)
      )
    })
  }, [jobs, searchQuery, areaFilter, viewMode, activeTabStage])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No deadline'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false
    return new Date(deadline) < new Date(new Date().setHours(0, 0, 0, 0))
  }

  const getStageNext = (current: JobStageStatus): JobStageStatus | null => {
    switch (current) {
      case 'Queued':
      case 'Pending':
        return 'Pre_Press'
      case 'Pre_Press':
        return 'Printing'
      case 'Printing':
      case 'In_Production':
        return 'Finishing'
      case 'Finishing':
        return 'Quality_Check'
      case 'Quality_Check':
        return 'Done'
      default:
        return null
    }
  }

  const getStagePrev = (current: JobStageStatus): JobStageStatus | null => {
    switch (current) {
      case 'Pre_Press':
        return 'Queued'
      case 'Printing':
      case 'In_Production':
        return 'Pre_Press'
      case 'Finishing':
        return 'Printing'
      case 'Quality_Check':
        return 'Finishing'
      case 'Done':
      case 'Completed':
        return 'Quality_Check'
      default:
        return null
    }
  }

  return (
    <DashboardShell>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Production Queue & Job Orders
              </h1>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                Module 8
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Track active manufacturing stages, machine queues, artwork proofs, and fulfillment deadlines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  loadData()
                })
              }}
              disabled={isLoading || isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition disabled:opacity-50"
              title="Refresh Queue"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Direct Link to Cashier POS */}
            <Link
              href="/pos"
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 transition active:scale-95"
              title="Open POS Terminal for retail apparel & print checkout"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>🛒 POS Counter Orders</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Create Job Order</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <ProductionSummaryCards jobs={jobs} isLoading={isLoading} />

        {/* Supabase policy notice if error */}
        {fetchError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to fetch job orders from Supabase</p>
              <p className="mt-0.5 text-xs text-red-700">{fetchError}</p>
              <p className="mt-2 text-xs text-red-600">
                Run the script at &quot;supabase/migrations/04_job_orders_policies.sql&quot; in your Supabase SQL Editor if testing in dev mode.
              </p>
            </div>
          </div>
        )}

        {/* Controls Bar: Search, Filters, View Switcher */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job #, sales order #, customer, area..."
              className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-9 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Area Filter */}
            <div className="flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-zinc-400" />
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-medium text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Production Areas</option>
                <option value="Large Format Printing">Large Format Printing</option>
                <option value="Digital Press">Digital Press</option>
                <option value="Sublimation & Apparel">Sublimation & Apparel</option>
                <option value="Signage Fabrication">Signage Fabrication</option>
                <option value="Finishing & Lamination">Finishing & Lamination</option>
              </select>
            </div>

            {/* View Mode Toggle: Kanban vs Table */}
            <div className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'kanban'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Kanban Board</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'table'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Tabbed Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Mode 1: KANBAN BOARD */}
        {viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
            {KANBAN_STAGES.map((col) => {
              // Group jobs for this column
              const colJobs = filteredJobs.filter((j) => {
                if (col.id === 'Queued') return j.stage_status === 'Queued' || j.stage_status === 'Pending'
                if (col.id === 'Printing') return j.stage_status === 'Printing' || j.stage_status === 'In_Production'
                if (col.id === 'Done') return j.stage_status === 'Done' || j.stage_status === 'Completed'
                return j.stage_status === col.id
              })

              return (
                <div
                  key={col.id}
                  className="flex flex-col rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 min-h-[460px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80 mb-3">
                    <span className="text-xs font-bold text-zinc-800 tracking-tight">
                      {col.title}
                    </span>
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold ${col.badgeBg}`}
                    >
                      {colJobs.length}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] pr-0.5">
                    {colJobs.length > 0 ? (
                      colJobs.map((job) => {
                        const next = getStageNext(job.stage_status)
                        const prev = getStagePrev(job.stage_status)
                        const overdue = isOverdue(job.deadline)

                        return (
                          <div
                            key={job.id}
                            className="rounded-lg border border-zinc-200 bg-white p-3.5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-2.5"
                          >
                            {/* Card Header: Job Number & Urgent Badge */}
                            <div className="flex items-start justify-between">
                              <span className="font-mono text-xs font-bold text-blue-700">
                                {job.job_number}
                              </span>
                              {overdue && job.stage_status !== 'Done' && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                  <AlertTriangle className="h-3 w-3" />
                                  Overdue
                                </span>
                              )}
                            </div>

                            {/* Linked Sales Order & Customer */}
                            <div>
                              <p className="text-xs font-semibold text-zinc-900 truncate">
                                {job.sales_orders?.customers?.name || 'Walk-in Customer'}
                              </p>
                              {job.sales_orders && (
                                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                                  SO: {job.sales_orders.order_number}
                                </p>
                              )}
                            </div>

                            {/* Production Area */}
                            <div className="text-[11px] text-zinc-600 bg-zinc-50 rounded px-2 py-1 border border-zinc-100 flex items-center gap-1">
                              <Layers className="h-3 w-3 text-zinc-400 shrink-0" />
                              <span className="truncate">{job.production_area || 'General Printing'}</span>
                            </div>

                            {/* Deadline & Artwork */}
                            <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-100">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-zinc-400" />
                                {formatDate(job.deadline)}
                              </span>

                              {job.artwork_url && (
                                <a
                                  href={job.artwork_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5 text-[11px] font-medium"
                                  title="View Artwork Asset"
                                >
                                  Proof <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>

                            {/* Move Stage Quick Action Buttons */}
                            <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                              {prev ? (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStage(job.id, prev)}
                                  className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-100"
                                  title={`Move back to ${prev}`}
                                >
                                  <ChevronLeft className="h-3 w-3" /> Back
                                </button>
                              ) : (
                                <span />
                              )}

                              {next ? (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStage(job.id, next)}
                                  className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100 transition"
                                  title={`Advance to ${next}`}
                                >
                                  Advance <ChevronRight className="h-3 w-3" />
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                  <Check className="h-3 w-3" /> Done
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="h-28 flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 text-center p-3">
                        <span className="text-[11px] text-zinc-400">Queue is empty</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* View Mode 2: TABBED TABLE VIEW */
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-zinc-200 overflow-x-auto bg-zinc-50/50 px-4 pt-2">
              <button
                type="button"
                onClick={() => setActiveTabStage('all')}
                className={`border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition ${
                  activeTabStage === 'all'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                All Jobs ({jobs.length})
              </button>
              {KANBAN_STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveTabStage(s.id)}
                  className={`border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition ${
                    activeTabStage === s.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {s.title} (
                  {
                    jobs.filter((j) => {
                      if (s.id === 'Queued') return j.stage_status === 'Queued' || j.stage_status === 'Pending'
                      if (s.id === 'Printing') return j.stage_status === 'Printing' || j.stage_status === 'In_Production'
                      if (s.id === 'Done') return j.stage_status === 'Done' || j.stage_status === 'Completed'
                      return j.stage_status === s.id
                    }).length
                  }
                  )
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-600">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Job Order #</th>
                    <th scope="col" className="px-6 py-3.5">Customer / Sales Order</th>
                    <th scope="col" className="px-6 py-3.5">Production Area</th>
                    <th scope="col" className="px-6 py-3.5">Current Stage</th>
                    <th scope="col" className="px-6 py-3.5">Deadline</th>
                    <th scope="col" className="px-6 py-3.5">Artwork</th>
                    <th scope="col" className="px-6 py-3.5 text-center">Stage Progression</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-zinc-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-36 rounded bg-zinc-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-28 rounded bg-zinc-200" /></td>
                        <td className="px-6 py-4"><div className="h-5 w-20 rounded-full bg-zinc-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-zinc-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-12 rounded bg-zinc-200" /></td>
                        <td className="px-6 py-4"><div className="h-6 w-24 rounded bg-zinc-200 mx-auto" /></td>
                      </tr>
                    ))
                  ) : filteredJobs.length > 0 ? (
                    filteredJobs.map((job) => {
                      const next = getStageNext(job.stage_status)
                      const prev = getStagePrev(job.stage_status)
                      const overdue = isOverdue(job.deadline)

                      return (
                        <tr key={job.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-bold text-blue-700">
                              {job.job_number}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-zinc-900 truncate">
                              {job.sales_orders?.customers?.name || 'Walk-in Customer'}
                            </p>
                            {job.sales_orders && (
                              <p className="text-xs text-zinc-500 font-mono">
                                SO: {job.sales_orders.order_number}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-zinc-700 font-medium">
                            {job.production_area || 'General Printing'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                              {job.stage_status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <span className={overdue && job.stage_status !== 'Done' ? 'text-red-600 font-bold' : 'text-zinc-600'}>
                              {formatDate(job.deadline)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            {job.artwork_url ? (
                              <a
                                href={job.artwork_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                View File <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-zinc-400">None</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {prev && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStage(job.id, prev)}
                                  className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                                >
                                  Back
                                </button>
                              )}
                              {next ? (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStage(job.id, next)}
                                  className="rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition"
                                >
                                  Advance to {next.replace('_', ' ')}
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                  <Check className="h-3.5 w-3.5" /> Completed
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 text-xs">
                        No job orders in this view. Create a new job order above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-200 px-6 py-3 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-500">
              <span>Showing {filteredJobs.length} of {jobs.length} job orders</span>
              <span className="text-[11px] text-zinc-400">JAPA Core Production Workflow</span>
            </div>
          </div>
        )}
      </div>

      {/* Create Job Order Modal */}
      <JobOrderFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleJobCreated}
        salesOrders={salesOrders}
      />
    </DashboardShell>
  )
}

