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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SalesOrder } from '@/types/sales'
import { JobOrder, JobStageStatus } from '@/types/production'

interface JobOrderFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newJob: JobOrder) => void
  salesOrders: SalesOrder[]
}

export default function JobOrderFormModal({
  isOpen,
  onClose,
  onSuccess,
  salesOrders,
}: JobOrderFormModalProps) {
  const [jobNumber, setJobNumber] = useState('')
  const [salesOrderId, setSalesOrderId] = useState('')
  const [productionArea, setProductionArea] = useState('Large Format Printing')
  const [assignedWorker, setAssignedWorker] = useState('Production Team A')
  const [stageStatus, setStageStatus] = useState<JobStageStatus>('Queued')
  const [deadline, setDeadline] = useState('')
  const [artworkUrl, setArtworkUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Auto-generate job number on open
  useEffect(() => {
    if (isOpen) {
      const datePart = new Date().toISOString().slice(2, 7).replace('-', '')
      const randPart = Math.floor(1000 + Math.random() * 9000)
      setJobNumber(`JO-${datePart}-${randPart}`)

      // Default deadline to 3 days from now
      const defaultDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      setDeadline(defaultDate.toISOString().split('T')[0])
    }
  }, [isOpen])

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
        production_area: productionArea || 'General Printing',
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
        if (error.code === '42501') {
          throw new Error(
            'Supabase Row-Level Security blocked this job order insert. Run the script "supabase/migrations/04_job_orders_policies.sql" in your Supabase SQL editor to allow dev access.'
          )
        }
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
        className="relative my-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900">Create Job Order</h2>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                Production Queue
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Assign a manufacturing task to a production area and track fulfillment stages.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <p className="font-semibold">Unable to create job order</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Job Number & Linked Sales Order */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Job Order # <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  required
                  value={jobNumber}
                  onChange={(e) => setJobNumber(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Link to Sales Order
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <select
                  value={salesOrderId}
                  onChange={(e) => setSalesOrderId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                >
                  <option value="">No linked sales order (Standalone)</option>
                  {salesOrders.map((so) => (
                    <option key={so.id} value={so.id}>
                      {so.order_number} {so.customers?.name ? `— ${so.customers.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Production Area & Assigned Worker */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Production Area
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <select
                  value={productionArea}
                  onChange={(e) => setProductionArea(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                >
                  <option value="Large Format Printing">Large Format Printing (Tarpaulin/Stickers)</option>
                  <option value="Digital Press">Digital Press (Flyers/Brochures)</option>
                  <option value="Sublimation & Apparel">Sublimation & Apparel (Shirts/Uniforms)</option>
                  <option value="Signage Fabrication">Signage Fabrication & Acrylics</option>
                  <option value="Finishing & Lamination">Finishing & Lamination</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Assigned Operator / Team
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={assignedWorker}
                  onChange={(e) => setAssignedWorker(e.target.value)}
                  placeholder="e.g. Lead Operator Marco / Shift 1"
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>
          </div>

          {/* Stage Status & Target Deadline */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Initial Workflow Stage
              </label>
              <select
                value={stageStatus}
                onChange={(e) => setStageStatus(e.target.value as JobStageStatus)}
                className="w-full rounded-lg border border-zinc-300 py-2 px-3 text-sm text-zinc-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              >
                <option value="Queued">Pending / Queued</option>
                <option value="Pre_Press">Pre-Press & Design Proofing</option>
                <option value="Printing">Printing / In Production</option>
                <option value="Finishing">Finishing & Assembly</option>
                <option value="Quality_Check">Quality Check</option>
                <option value="Done">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Target Deadline
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>
          </div>

          {/* Artwork URL / Design asset */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Artwork / Asset Reference Link
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={artworkUrl}
                onChange={(e) => setArtworkUrl(e.target.value)}
                placeholder="https://drive.google.com/... or design file path"
                className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Provide link to print-ready PDF, vector file, or Google Drive folder.
            </p>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Job...
                </>
              ) : (
                'Create Job Order'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
