'use client'

import { useRef } from 'react'
import {
  X,
  Printer,
  Calendar,
  Layers,
  User,
  Building,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Clock,
  Sparkles,
  MapPin,
  Tag,
  FileText,
} from 'lucide-react'
import { JobOrder, JobStageStatus } from '@/types/production'
import { getLoyaltyBadge } from '@/components/pos/pos-customer-selector'
import { cn } from '@/lib/utils'

interface Props {
  job: JobOrder | null
  isOpen: boolean
  onClose: () => void
  onUpdateStage: (jobId: string, nextStage: JobStageStatus) => void
}

const PHP = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

export default function JobTicketModal({ job, isOpen, onClose, onUpdateStage }: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !job) return null

  const customer = job.sales_orders?.customers
  const salesOrder = job.sales_orders
  const overdue = job.deadline ? new Date(job.deadline) < new Date(new Date().setHours(0, 0, 0, 0)) : false
  const loyaltyInfo = customer ? getLoyaltyBadge(customer.loyalty_tier, customer.customer_type) : null

  const handlePrint = () => {
    window.print()
  }

  const branchLabel = job.branch_id === 'manila_branch' ? 'JAPA Manila Hub' : 'JAPA Dagupan (Main Branch)'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative my-6 w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-2xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 font-mono tracking-tight">
                  {job.job_number}
                </h2>
                {job.priority === 'Rush' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
                    ⚡ RUSH PRIORITY
                  </span>
                )}
                {job.priority === 'High' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    High Priority
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Production Routing Slip & Machine Ticket
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs active:scale-95"
            >
              <Printer className="h-4 w-4 text-slate-600" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Area */}
        <div ref={printRef} className="p-6 overflow-y-auto max-h-[75vh] space-y-5 text-slate-800">
          {/* Header Banner for Printed Sheet */}
          <div className="text-center pb-4 border-b-2 border-dashed border-slate-200">
            <p className="text-lg font-black tracking-widest text-slate-900">JAPA GLOBAL DIGITAL</p>
            <p className="text-xs font-semibold text-slate-600">{branchLabel}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
              WORK ORDER & PRODUCTION ROUTING SLIP
            </p>
          </div>

          {/* Core Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Left: Job & Customer Details */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Client & Order Identity
              </span>

              <div>
                <span className="text-slate-500 text-[11px] block">Customer / Account:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-slate-900 text-sm">
                    {customer?.name || salesOrder?.recipient_name || 'Walk-in Customer'}
                  </span>
                  {loyaltyInfo && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.2 rounded-full border',
                        loyaltyInfo.badgeClass
                      )}
                    >
                      {loyaltyInfo.label}
                    </span>
                  )}
                </div>
                {(customer?.contact_number || salesOrder?.recipient_phone) && (
                  <p className="font-mono text-slate-600 mt-0.5">
                    📞 {customer?.contact_number || salesOrder?.recipient_phone}
                  </p>
                )}
              </div>

              {salesOrder && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Linked Sales Order:</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-mono font-bold text-indigo-700">
                      {salesOrder.order_number}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        salesOrder.payment_status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {salesOrder.payment_status}
                    </span>
                  </div>
                  {salesOrder.balance_due && Number(salesOrder.balance_due) > 0 ? (
                    <p className="text-[11px] text-amber-700 font-bold mt-0.5">
                      Pending Balance on Pickup: {PHP.format(Number(salesOrder.balance_due))}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Right: Production Area & Schedule */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Shop Floor Assignment
              </span>

              <div>
                <span className="text-slate-500 text-[11px] block">Production Area:</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {job.production_area || 'Large Format Printing'}
                </p>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Assigned Operator / Machine:</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {job.assigned_operator || 'Team Operator (Floor Queue)'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[11px] block">Target Deadline:</span>
                  <p
                    className={cn(
                      'font-bold mt-0.5',
                      overdue && job.stage_status !== 'Done' && job.stage_status !== 'Completed'
                        ? 'text-rose-600'
                        : 'text-slate-900'
                    )}
                  >
                    {job.deadline
                      ? new Date(job.deadline).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'No fixed deadline'}
                  </p>
                </div>
                {overdue && job.stage_status !== 'Done' && job.stage_status !== 'Completed' && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    ⚠️ Overdue
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Specifications Box */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Technical Specifications & Finishing
            </span>
            <p className="text-xs font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">
              {job.specifications ||
                'No special specifications entered. Check linked sales order line items.'}
            </p>
          </div>

          {/* Artwork Proof & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-2xl border border-slate-200 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Artwork / Cloud Asset Proof
              </span>
              {job.artwork_url ? (
                <a
                  href={job.artwork_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 truncate"
                >
                  <span className="truncate">{job.artwork_url}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ) : (
                <p className="text-slate-400 text-xs">No artwork link attached</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Operator / Shop Notes
              </span>
              <p className="text-xs text-slate-700 font-medium">
                {job.notes || 'None'}
              </p>
            </div>
          </div>

          {/* Quality & Sign-Off Lines for Physical Printouts */}
          <div className="pt-4 border-t-2 border-dashed border-slate-200 grid grid-cols-3 gap-4 text-[10px] text-slate-500">
            <div className="space-y-6">
              <p className="font-bold text-slate-600">Pre-Press Proof Approved:</p>
              <div className="border-b border-slate-300 w-full" />
              <p className="text-[9px]">Client / Supervisor Signature</p>
            </div>
            <div className="space-y-6">
              <p className="font-bold text-slate-600">Machine Print Quality Pass:</p>
              <div className="border-b border-slate-300 w-full" />
              <p className="text-[9px]">Lead Machine Operator</p>
            </div>
            <div className="space-y-6">
              <p className="font-bold text-slate-600">Release & Pickup Acceptance:</p>
              <div className="border-b border-slate-300 w-full" />
              <p className="text-[9px]">Cashier / Releasing Staff</p>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Current Stage:</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
              {job.stage_status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

