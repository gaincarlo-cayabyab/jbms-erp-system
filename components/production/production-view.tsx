'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import DashboardShell from '@/components/dashboard-shell'
import ProductionSummaryCards from './production-summary-cards'
import JobOrderFormModal from './job-order-form-modal'
import JobTicketModal from './job-ticket-modal'
import { createClient } from '@/lib/supabase/client'
import { JobOrder, JobStageStatus, JobPriority } from '@/types/production'
import { SalesOrder } from '@/types/sales'
import { getLoyaltyBadge } from '@/components/pos/pos-customer-selector'
import { requestAppFullscreen } from '@/components/ui/auto-fullscreen'
import { cn } from '@/lib/utils'
import {
  Layers,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  AlertTriangle,
  X,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Building,
  Check,
  Receipt,
  Zap,
  User2,
  FileText,
  Package,
} from 'lucide-react'

const KANBAN_STAGES: Array<{
  id: JobStageStatus
  title: string
  color: string
  badgeBg: string
  dotColor: string
}> = [
  { id: 'Queued', title: '📋 Queued', color: 'border-zinc-300 bg-zinc-50/70', badgeBg: 'bg-zinc-200 text-zinc-700', dotColor: 'bg-zinc-400' },
  { id: 'Pre_Press', title: '🎨 Pre-Press', color: 'border-amber-300 bg-amber-50/40', badgeBg: 'bg-amber-100 text-amber-800', dotColor: 'bg-amber-500' },
  { id: 'Printing', title: '🖨️ Printing', color: 'border-blue-300 bg-blue-50/40', badgeBg: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-500' },
  { id: 'Finishing', title: '✂️ Finishing', color: 'border-purple-300 bg-purple-50/40', badgeBg: 'bg-purple-100 text-purple-800', dotColor: 'bg-purple-500' },
  { id: 'Quality_Check', title: '🔍 Quality Check', color: 'border-teal-300 bg-teal-50/40', badgeBg: 'bg-teal-100 text-teal-800', dotColor: 'bg-teal-500' },
  { id: 'Ready', title: '📦 Ready / Pickup', color: 'border-orange-300 bg-orange-50/40', badgeBg: 'bg-orange-100 text-orange-800', dotColor: 'bg-orange-500' },
  { id: 'Done', title: '✅ Completed', color: 'border-emerald-300 bg-emerald-50/40', badgeBg: 'bg-emerald-100 text-emerald-800', dotColor: 'bg-emerald-500' },
]

export default function ProductionView() {
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<JobOrder[]>([])
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState<'all' | 'dagupan_main' | 'manila_branch'>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [activeTabStage, setActiveTabStage] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobOrder | null>(null)
  const [showTicketModal, setShowTicketModal] = useState(false)
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

  // Supabase Realtime Subscription for automatic multi-device sync
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('production_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_orders' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob((prev) => (prev ? { ...prev, stage_status: nextStage } : null))
      }

      const supabase = createClient()
      const { error } = await supabase
        .from('job_orders')
        .update({ stage_status: nextStage })
        .eq('id', jobId)

      if (error) {
        throw new Error(error.message)
      }

      toast.success(`Job stage moved to ${nextStage.replace(/_/g, ' ')}.`)
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
        if (activeTabStage === 'Queued') {
          if (job.stage_status !== 'Queued' && job.stage_status !== 'Pending') return false
        } else if (activeTabStage === 'Printing') {
          if (job.stage_status !== 'Printing' && job.stage_status !== 'In_Production') return false
        } else if (activeTabStage === 'Ready') {
          if (job.stage_status !== 'Ready' && job.stage_status !== 'Ready_For_Pickup') return false
        } else if (activeTabStage === 'Done') {
          if (job.stage_status !== 'Done' && job.stage_status !== 'Completed') return false
        } else if (job.stage_status !== activeTabStage) {
          return false
        }
      }

      // Branch Filter
      if (branchFilter !== 'all') {
        const jBranch = job.branch_id || 'dagupan_main'
        if (jBranch !== branchFilter) return false
      }

      // Priority Filter
      if (priorityFilter !== 'all') {
        const jPriority = job.priority || 'Normal'
        if (jPriority !== priorityFilter) return false
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
      const operator = job.assigned_operator?.toLowerCase() || ''
      const specs = job.specifications?.toLowerCase() || ''

      return (
        jobNum.includes(q) ||
        orderNum.includes(q) ||
        custName.includes(q) ||
        area.includes(q) ||
        operator.includes(q) ||
        specs.includes(q)
      )
    })
  }, [jobs, searchQuery, areaFilter, branchFilter, priorityFilter, viewMode, activeTabStage])

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
        return 'Ready'
      case 'Ready':
      case 'Ready_For_Pickup':
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
      case 'Ready':
      case 'Ready_For_Pickup':
        return 'Quality_Check'
      case 'Done':
      case 'Completed':
        return 'Ready'
      default:
        return null
    }
  }

  const getPriorityBadge = (priority?: JobPriority | string) => {
    switch (priority) {
      case 'Rush':
        return {
          label: '⚡ Rush',
          className: 'bg-red-100 text-red-700 border-red-300 font-bold animate-pulse',
        }
      case 'High':
        return {
          label: '🔺 High',
          className: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
        }
      case 'Low':
        return {
          label: 'Low',
          className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
        }
      default:
        return null
    }
  }

  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case 'Queued':
      case 'Pending':
        return 'bg-zinc-100 text-zinc-700 border-zinc-300'
      case 'Pre_Press':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'Printing':
      case 'In_Production':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'Finishing':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'Quality_Check':
        return 'bg-teal-100 text-teal-800 border-teal-300'
      case 'Ready':
      case 'Ready_For_Pickup':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'Done':
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'Cancelled':
        return 'bg-red-100 text-red-700 border-red-300'
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-300'
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
              Track manufacturing stages, machine scheduling, operator dispatch, and fulfillment deadlines.
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
              onClick={() => requestAppFullscreen()}
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
                Run the script at &quot;supabase/migrations/22_production_queue_enhancements.sql&quot; in your Supabase SQL Editor if testing in dev mode.
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
              placeholder="Search by JO#, SO#, client, specs, operator..."
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
            {/* Branch Filter Segment */}
            <div className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBranchFilter('all')}
                className={cn(
                  'px-3 py-1.5 rounded-md transition',
                  branchFilter === 'all'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                )}
              >
                All Branches
              </button>
              <button
                type="button"
                onClick={() => setBranchFilter('dagupan_main')}
                className={cn(
                  'px-3 py-1.5 rounded-md transition',
                  branchFilter === 'dagupan_main'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                )}
              >
                🏢 Dagupan
              </button>
              <button
                type="button"
                onClick={() => setBranchFilter('manila_branch')}
                className={cn(
                  'px-3 py-1.5 rounded-md transition',
                  branchFilter === 'manila_branch'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                )}
              >
                🏙️ Manila
              </button>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-zinc-400" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-medium text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Priorities</option>
                <option value="Rush">⚡ Rush Only</option>
                <option value="High">🔺 High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>

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
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  viewMode === 'kanban'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Kanban Board</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  viewMode === 'table'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                )}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Tabbed Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Mode 1: 7-STAGE KANBAN BOARD */}
        {viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5 items-start">
            {KANBAN_STAGES.map((col) => {
              // Group jobs for this column
              const colJobs = filteredJobs.filter((j) => {
                if (col.id === 'Queued') return j.stage_status === 'Queued' || j.stage_status === 'Pending'
                if (col.id === 'Printing') return j.stage_status === 'Printing' || j.stage_status === 'In_Production'
                if (col.id === 'Ready') return j.stage_status === 'Ready' || j.stage_status === 'Ready_For_Pickup'
                if (col.id === 'Done') return j.stage_status === 'Done' || j.stage_status === 'Completed'
                return j.stage_status === col.id
              })

              return (
                <div
                  key={col.id}
                  className={cn(
                    'flex flex-col rounded-xl border p-2.5 min-h-[500px]',
                    col.color
                  )}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-zinc-200/80 mb-2.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', col.dotColor)} />
                      <span className="text-xs font-bold text-zinc-800 tracking-tight truncate">
                        {col.title}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold shrink-0',
                        col.badgeBg
                      )}
                    >
                      {colJobs.length}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[720px] pr-0.5">
                    {colJobs.length > 0 ? (
                      colJobs.map((job) => {
                        const next = getStageNext(job.stage_status)
                        const prev = getStagePrev(job.stage_status)
                        const overdue = isOverdue(job.deadline)
                        const priorityBadge = getPriorityBadge(job.priority)
                        const customer = job.sales_orders?.customers
                        const loyaltyInfo = customer
                          ? getLoyaltyBadge(customer.loyalty_tier, customer.customer_type)
                          : null

                        const isCompletedStage = job.stage_status === 'Done' || job.stage_status === 'Completed'

                        return (
                          <div
                            key={job.id}
                            className={cn(
                              'rounded-xl border bg-white p-3 shadow-xs hover:shadow-md transition-all flex flex-col gap-2',
                              overdue && !isCompletedStage
                                ? 'ring-2 ring-red-400 ring-offset-1 border-red-300'
                                : job.priority === 'Rush'
                                ? 'ring-1 ring-red-300 border-red-200'
                                : 'border-zinc-200'
                            )}
                          >
                            {/* Card Header: Job Number & Priority/Overdue Badges */}
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-mono text-xs font-bold text-blue-700">
                                {job.job_number}
                              </span>
                              <div className="flex flex-wrap items-center gap-1 justify-end">
                                {priorityBadge && (
                                  <span
                                    className={cn(
                                      'text-[10px] px-1.5 py-0.5 rounded border',
                                      priorityBadge.className
                                    )}
                                  >
                                    {priorityBadge.label}
                                  </span>
                                )}
                                {overdue && !isCompletedStage && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1 py-0.5 rounded">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    OVERDUE
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Customer & Loyalty Badge */}
                            <div>
                              <p className="text-xs font-semibold text-zinc-900 truncate flex items-center gap-1">
                                <span className="truncate">
                                  {customer?.name || 'Walk-in Customer'}
                                </span>
                              </p>
                              {loyaltyInfo && (
                                <div className="mt-0.5">
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded border',
                                      loyaltyInfo.badgeClass
                                    )}
                                  >
                                    {loyaltyInfo.label}
                                  </span>
                                </div>
                              )}
                              {job.sales_orders && (
                                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                  SO: {job.sales_orders.order_number}
                                </p>
                              )}
                            </div>

                            {/* Production Area */}
                            <div className="text-[10px] text-zinc-600 bg-zinc-50 rounded px-2 py-1 border border-zinc-100 flex items-center gap-1">
                              <Layers className="h-2.5 w-2.5 text-zinc-400 shrink-0" />
                              <span className="truncate">{job.production_area || 'General Printing'}</span>
                            </div>

                            {/* Specifications snippet */}
                            {job.specifications && (
                              <p className="text-[10px] text-zinc-500 italic line-clamp-2 bg-amber-50/40 p-1 rounded border border-amber-100">
                                📐 {job.specifications}
                              </p>
                            )}

                            {/* Operator + Branch */}
                            <div className="flex items-center justify-between text-[10px] text-zinc-500">
                              {job.assigned_operator ? (
                                <span className="flex items-center gap-0.5 truncate max-w-[110px]" title={job.assigned_operator}>
                                  <User2 className="h-2.5 w-2.5 shrink-0 text-zinc-400" />
                                  <span className="truncate">{job.assigned_operator}</span>
                                </span>
                              ) : (
                                <span className="text-zinc-400 italic">Unassigned</span>
                              )}
                              <span className="font-medium shrink-0">
                                {job.branch_id === 'manila_branch' ? '🏙️ Manila' : '🏢 Dagupan'}
                              </span>
                            </div>

                            {/* Deadline & Artwork */}
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-100">
                              <span
                                className={cn(
                                  'flex items-center gap-1',
                                  overdue && !isCompletedStage ? 'text-red-600 font-bold' : ''
                                )}
                              >
                                <Calendar className="h-2.5 w-2.5 text-zinc-400" />
                                {formatDate(job.deadline)}
                              </span>

                              {job.artwork_url ? (
                                <a
                                  href={job.artwork_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-medium"
                                  title="View Artwork Asset"
                                >
                                  Proof <ExternalLink className="h-2 w-2" />
                                </a>
                              ) : (
                                <span className="text-[9px] text-zinc-300">No proof</span>
                              )}
                            </div>

                            {/* Footer Actions: Ticket Modal & Progression */}
                            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedJob(job)
                                  setShowTicketModal(true)
                                }}
                                className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition border border-indigo-200"
                                title="Open Printable Job Ticket"
                              >
                                <FileText className="h-2.5 w-2.5" /> Ticket
                              </button>

                              <div className="flex items-center gap-1">
                                {prev && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStage(job.id, prev)}
                                    className="inline-flex items-center gap-0.5 rounded px-1.5 py-1 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-100 border border-zinc-200 transition"
                                    title={`Move back to ${prev.replace(/_/g, ' ')}`}
                                  >
                                    <ChevronLeft className="h-3 w-3" />
                                  </button>
                                )}

                                {next ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStage(job.id, next)}
                                    className="inline-flex items-center gap-0.5 rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-blue-700 transition"
                                    title={`Advance to ${next.replace(/_/g, ' ')}`}
                                  >
                                    <span>Next</span>
                                    <ChevronRight className="h-3 w-3" />
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    <Check className="h-3 w-3" /> Done
                                  </span>
                                )}
                              </div>
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
                className={cn(
                  'border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition',
                  activeTabStage === 'all'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                )}
              >
                All Jobs ({jobs.length})
              </button>
              {KANBAN_STAGES.map((s) => {
                const count = jobs.filter((j) => {
                  if (s.id === 'Queued') return j.stage_status === 'Queued' || j.stage_status === 'Pending'
                  if (s.id === 'Printing') return j.stage_status === 'Printing' || j.stage_status === 'In_Production'
                  if (s.id === 'Ready') return j.stage_status === 'Ready' || j.stage_status === 'Ready_For_Pickup'
                  if (s.id === 'Done') return j.stage_status === 'Done' || j.stage_status === 'Completed'
                  return j.stage_status === s.id
                }).length

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveTabStage(s.id)}
                    className={cn(
                      'border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition',
                      activeTabStage === s.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-zinc-500 hover:text-zinc-800'
                    )}
                  >
                    {s.title} ({count})
                  </button>
                )
              })}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-600">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Job Order #</th>
                    <th scope="col" className="px-4 py-3.5">Priority</th>
                    <th scope="col" className="px-5 py-3.5">Customer & Loyalty</th>
                    <th scope="col" className="px-4 py-3.5">Sales Order</th>
                    <th scope="col" className="px-4 py-3.5">Production Area & Branch</th>
                    <th scope="col" className="px-4 py-3.5">Operator</th>
                    <th scope="col" className="px-4 py-3.5">Current Stage</th>
                    <th scope="col" className="px-4 py-3.5">Deadline</th>
                    <th scope="col" className="px-4 py-3.5">Artwork</th>
                    <th scope="col" className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-zinc-200" /></td>
                        <td className="px-4 py-4"><div className="h-4 w-12 rounded bg-zinc-200" /></td>
                        <td className="px-5 py-4"><div className="h-4 w-36 rounded bg-zinc-200" /></td>
                        <td className="px-4 py-4"><div className="h-4 w-20 rounded bg-zinc-200" /></td>
                        <td className="px-4 py-4"><div className="h-4 w-28 rounded bg-zinc-200" /></td>
                        <td className="px-4 py-4"><div className="h-4 w-20 rounded bg-zinc-200" /></td>
                        <td className="px-4 py-4"><div className="h-5 w-20 rounded-full bg-zinc-200" /></td>
                        <td className="px-4 py-4"><div className="h-4 w-20 rounded bg-zinc-200" /></td>
                        <td className="px-4 py-4"><div className="h-4 w-12 rounded bg-zinc-200" /></td>
                        <td className="px-5 py-4"><div className="h-6 w-24 rounded bg-zinc-200 mx-auto" /></td>
                      </tr>
                    ))
                  ) : filteredJobs.length > 0 ? (
                    filteredJobs.map((job) => {
                      const next = getStageNext(job.stage_status)
                      const prev = getStagePrev(job.stage_status)
                      const overdue = isOverdue(job.deadline)
                      const priorityBadge = getPriorityBadge(job.priority)
                      const customer = job.sales_orders?.customers
                      const loyaltyInfo = customer
                        ? getLoyaltyBadge(customer.loyalty_tier, customer.customer_type)
                        : null
                      const isCompletedStage = job.stage_status === 'Done' || job.stage_status === 'Completed'

                      return (
                        <tr key={job.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs font-bold text-blue-700">
                              {job.job_number}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {priorityBadge ? (
                              <span className={cn('text-xs px-2 py-0.5 rounded border font-semibold', priorityBadge.className)}>
                                {priorityBadge.label}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-500">Normal</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-zinc-900 truncate">
                              {customer?.name || 'Walk-in Customer'}
                            </p>
                            {loyaltyInfo && (
                              <span className={cn('inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded border mt-0.5', loyaltyInfo.badgeClass)}>
                                {loyaltyInfo.label}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {job.sales_orders ? (
                              <span className="text-xs text-zinc-600 font-mono">
                                {job.sales_orders.order_number}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-400 italic">None</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-xs">
                            <p className="text-zinc-800 font-medium">{job.production_area || 'General Printing'}</p>
                            <p className="text-zinc-500 text-[11px]">
                              {job.branch_id === 'manila_branch' ? '🏙️ Manila' : '🏢 Dagupan'}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-xs text-zinc-600">
                            {job.assigned_operator || <span className="text-zinc-400 italic">Unassigned</span>}
                          </td>
                          <td className="px-4 py-4">
                            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', getStageBadgeColor(job.stage_status))}>
                              {job.stage_status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs">
                            <span className={cn(overdue && !isCompletedStage ? 'text-red-600 font-bold' : 'text-zinc-600')}>
                              {formatDate(job.deadline)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs">
                            {job.artwork_url ? (
                              <a
                                href={job.artwork_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                              >
                                Proof <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-zinc-400 text-xs">None</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedJob(job)
                                  setShowTicketModal(true)
                                }}
                                className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition flex items-center gap-1"
                                title="Open Job Ticket"
                              >
                                <FileText className="h-3 w-3" /> Ticket
                              </button>

                              {prev && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStage(job.id, prev)}
                                  className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                                  title={`Back to ${prev.replace(/_/g, ' ')}`}
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
                                  Advance to {next.replace(/_/g, ' ')}
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
                      <td colSpan={10} className="px-6 py-12 text-center text-zinc-500 text-xs">
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
        defaultBranch={branchFilter !== 'all' ? branchFilter : 'dagupan_main'}
      />

      {/* Printable Job Ticket Modal */}
      <JobTicketModal
        job={selectedJob}
        isOpen={showTicketModal}
        onClose={() => {
          setShowTicketModal(false)
          setSelectedJob(null)
        }}
        onUpdateStage={handleUpdateStage}
      />
    </DashboardShell>
  )
}
