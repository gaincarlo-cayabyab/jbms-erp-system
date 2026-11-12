'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Layers,
  FileText,
  Calendar,
  User,
  Link as LinkIcon,
  AlertCircle,
  Loader2,
  Building,
  Zap,
  MapPin,
  ClipboardList,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SalesOrder } from '@/types/sales'
import { JobOrder, JobStageStatus, JobPriority } from '@/types/production'

interface JobOrderFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newJob: JobOrder) => void
  salesOrders: SalesOrder[]
  defaultBranch?: string
}

export default function JobOrderFormModal({
  isOpen,
  onClose,
  onSuccess,
  salesOrders,
  defaultBranch = 'dagupan_main',
}: JobOrderFormModalProps) {
  const [jobNumber, setJobNumber] = useState('')
  const [salesOrderId, setSalesOrderId] = useState('')
  const [branchId, setBranchId] = useState(defaultBranch)
  const [priority, setPriority] = useState<JobPriority>('Normal')
  const [productionArea, setProductionArea] = useState('Large Format Printing')
  const [assignedOperator, setAssignedOperator] = useState('Production Floor Team A')
  const [specifications, setSpecifications] = useState('')
  const [notes, setNotes] = useState('')
  const [stageStatus, setStageStatus] = useState<JobStageStatus>('Queued')
  const [deadline, setDeadline] = useState('')
  const [artworkUrl, setArtworkUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Auto-generate job number & defaults on open
  useEffect(() => {
    if (isOpen) {
      const datePart = new Date().toISOString().slice(2, 7).replace('-', '')
      const randPart = Math.floor(1000 + Math.random() * 9000)
      setJobNumber(`JO-${datePart}-${randPart}`)

      // Default deadline to 2 days from now
      const defaultDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      setDeadline(defaultDate.toISOString().split('T')[0])
      setBranchId(defaultBranch)
    }
  }, [isOpen, defaultBranch])

  // When sales order is selected, auto-sync branch & deadline
  const handleSelectSalesOrder = (soId: string) => {
    setSalesOrderId(soId)
    if (!soId) return

    const selectedSO = salesOrders.find((so) => so.id === soId)
    if (selectedSO) {
      if (selectedSO.branch?.toLowerCase().includes('manila')) {
        setBranchId('manila_branch')
      } else {
        setBranchId('dagupan_main')
      }

      if (selectedSO.pickup_date) {
        setDeadline(selectedSO.pickup_date.split('T')[0])
      }

      if (selectedSO.customer_notes) {
        setNotes(selectedSO.customer_notes)
      }
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!jobNumber.trim()) {
      setErrorMessage('Job order number is required.')
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()

      const payload = {
        job_number: jobNumber.trim(),
        sales_order_id: salesOrderId || null,
        branch_id: branchId,
        priority: priority,
        production_area: productionArea || 'Large Format Printing',
        assigned_operator: assignedOperator.trim() || null,
        specifications: specifications.trim() || null,
        notes: notes.trim() || null,
        stage_status: stageStatus,
        deadline: deadline || null,
        artwork_url: artworkUrl.trim() || null,
      }

      const { data, error } = await supabase
        .from('job_orders')
        .insert([payload])
        .select('*, sales_orders(*, customers(*))')
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error(`A job order with number "${jobNumber}" already exists.`)
        }
        throw new Error(error.message || 'Failed to create job order.')
      }

      onSuccess(data as JobOrder)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="relative my-8 w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-zinc-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-zinc-900">Create Production Job Order</h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                Module 8 · 7-Stage
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Dispatch a work ticket to machine queues, assign operators, and track shop floor progress.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <p className="font-semibold">Unable to create job order</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Row 1: Job Number & Branch */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Job Order # <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  required
                  value={jobNumber}
                  onChange={(e) => setJobNumber(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 py-2 pl-9 pr-3 text-xs text-zinc-900 font-mono font-bold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Target Branch / Facility
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 py-2 pl-9 pr-3 text-xs text-zinc-900 bg-white font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                >
                  <option value="dagupan_main">📍 JAPA Dagupan (Main Branch)</option>
                  <option value="manila_branch">📍 JAPA Manila Hub</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 2: Link to Sales Order & Priority */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Link to Sales Order
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <select
                  value={salesOrderId}
                  onChange={(e) => handleSelectSalesOrder(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 py-2 pl-9 pr-3 text-xs text-zinc-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                >
                  <option value="">Standalone Job (No linked sales order)</option>
                  {salesOrders.map((so) => (
                    <option key={so.id} value={so.id}>
                      {so.order_number} {so.customers?.name ? `— ${so.customers.name}` : so.recipient_name ? `— ${so.recipient_name}` : ''} ({so.payment_status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Order Priority
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Low', 'Normal', 'High', 'Rush'] as JobPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg border text-center transition ${
                      priority === p
                        ? p === 'Rush'
                          ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                          : p === 'High'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                          : 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {p === 'Rush' ? '⚡ Rush' : p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Production Area & Assigned Operator */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Production Area / Workstation
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <select
                  value={productionArea}
                  onChange={(e) => setProductionArea(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 py-2 pl-9 pr-3 text-xs text-zinc-900 bg-white font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                >
                  <option value="Large Format Printing">Large Format Printing (Tarpaulin / Vinyl / Stickers)</option>
                  <option value="Digital Press">Digital Press (Flyers / Brochures / Cards)</option>
                  <option value="Sublimation & Apparel">Sublimation & Apparel (Jerseys / Shirts / Uniforms)</option>
                  <option value="Signage Fabrication">Signage Fabrication & Acrylics (Lighted / Panaflex)</option>
                  <option value="Finishing & Lamination">Finishing & Lamination (Grommets / Cutting / Mounting)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Assigned Operator / Machine Team
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={assignedOperator}
                  onChange={(e) => setAssignedOperator(e.target.value)}
                  placeholder="e.g. Lead Operator Marco / Shift 1"
                  className="w-full rounded-xl border border-zinc-300 py-2 pl-9 pr-3 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Technical Specifications */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">
              Material, Dimensions & Finishing Specifications
            </label>
            <textarea
              rows={2}
              value={specifications}
              onChange={(e) => setSpecifications(e.target.value)}
              placeholder="e.g. 2 pcs 3ft x 6ft Banner on 10oz Glossy Tarpaulin • 4 corner eyelets with folded border hem • Full color high resolution print"
              className="w-full rounded-xl border border-zinc-300 p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition resize-none leading-relaxed"
            />
          </div>

          {/* Row 5: Initial Stage & Deadline */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Initial Pipeline Stage
              </label>
              <select
                value={stageStatus}
                onChange={(e) => setStageStatus(e.target.value as JobStageStatus)}
                className="w-full rounded-xl border border-zinc-300 py-2 px-3 text-xs text-zinc-900 bg-white font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              >
                <option value="Queued">1. Intake Queue (Awaiting layout)</option>
                <option value="Pre_Press">2. Pre-Press Proofing (RIP / Color)</option>
                <option value="Printing">3. Active Print Bed (Running)</option>
                <option value="Finishing">4. Finishing & Assembly</option>
                <option value="Quality_Check">5. Quality Inspection</option>
                <option value="Ready">6. Ready for Release / Pickup</option>
                <option value="Done">7. Claimed / Fulfilled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Target Fulfillment Deadline
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 py-2 pl-9 pr-3 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>
          </div>

          {/* Row 6: Artwork Link & Notes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Artwork / Cloud Asset URL
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="url"
                  value={artworkUrl}
                  onChange={(e) => setArtworkUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full rounded-xl border border-zinc-300 py-2 pl-9 pr-3 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Shop Floor Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Client requested dark contrast"
                className="w-full rounded-xl border border-zinc-300 py-2 px-3 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Dispatching Job...
                </>
              ) : (
                'Dispatch to Production Floor'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
