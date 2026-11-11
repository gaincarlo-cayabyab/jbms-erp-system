'use client'

import { useState, useMemo } from 'react'
import { CashTransaction } from '@/types/cash'
import { soundEffects } from '@/lib/sound-effects'
import {
  Printer,
  X,
  Receipt,
  Building2,
  Calendar,
  User,
  ArrowUpRight,
  CheckCircle2,
  FileText,
} from 'lucide-react'

interface PayoutSlipModalProps {
  isOpen: boolean
  branchId: string
  transactions: CashTransaction[]
  onClose: () => void
}

export default function PayoutSlipModal({
  isOpen,
  branchId,
  transactions,
  onClose,
}: PayoutSlipModalProps) {
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today')

  const branchLabel =
    branchId === 'dagupan_main'
      ? 'JAPA Dagupan (Main Branch)'
      : branchId === 'manila_branch'
      ? 'JAPA Manila Hub'
      : 'All Store Branches'

  // Filter disbursements (CDV outflows)
  const payouts = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    return transactions.filter((tx) => {
      if (tx.flow_type !== 'outflow') return false
      if (tx.status !== 'completed') return false
      if (dateFilter === 'today') {
        const txDate = new Date(tx.created_at).toISOString().slice(0, 10)
        if (txDate !== todayStr) return false
      }
      return true
    })
  }, [transactions, dateFilter])

  const totalPayoutAmount = useMemo(() => {
    return payouts.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
  }, [payouts])

  if (!isOpen) return null

  const handlePrint = () => {
    soundEffects.success()
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity print:hidden"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:max-h-none">
        {/* Modal Header (Hidden on print) */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-6 py-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                End-of-Shift Payout Vouchers Slip
              </h2>
              <p className="text-xs text-zinc-500">
                Consolidated audit report of all cash drawer disbursements and paid outs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'today' | 'all')}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 focus:border-rose-500 focus:outline-hidden"
            >
              <option value="today">Today&apos;s Shift</option>
              <option value="all">All Recent Payouts</option>
            </select>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 active:scale-95 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Slip</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Slip Content */}
        <div className="flex-1 overflow-y-auto p-6 text-zinc-900 print:overflow-visible print:p-0 print:text-black">
          {/* Slip Outer Receipt Border for physical print */}
          <div className="mx-auto max-w-xl rounded-xl border-2 border-dashed border-zinc-300 bg-white p-6 shadow-xs print:border-none print:p-2 print:shadow-none">
            {/* Store & Header */}
            <div className="text-center border-b border-zinc-200 pb-4">
              <div className="inline-flex items-center justify-center gap-1.5 font-black text-lg text-zinc-900 tracking-wider">
                <span>JAPA CORE ERP</span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mt-0.5">
                Daily Till Disbursement & Paid Out Audit Slip
              </p>
              <div className="mt-2 text-xs text-zinc-600 space-y-0.5">
                <p className="font-semibold text-zinc-800">{branchLabel}</p>
                <p>Date Printed: {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                <p className="font-mono text-[11px] text-zinc-400">SHIFT AUDIT RECORD • NON-VAT DOCUMENT</p>
              </div>
            </div>

            {/* Total Highlight */}
            <div className="my-4 rounded-xl bg-rose-50/70 border border-rose-200 p-4 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                Total Drawer Paid Out (Money Out)
              </span>
              <div className="text-2xl font-black text-rose-700 mt-1">
                ₱{totalPayoutAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-rose-600 mt-0.5 font-medium">
                {payouts.length} itemized disbursement voucher{payouts.length === 1 ? '' : 's'}
              </p>
            </div>

            {/* Itemized Table */}
            {payouts.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs">
                No cash disbursements or paid outs recorded for this period.
              </div>
            ) : (
              <div className="space-y-3">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">
                      <th className="py-2">Voucher & Time</th>
                      <th className="py-2">Category & Payee</th>
                      <th className="py-2">Waybill / Ref</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {payouts.map((tx) => (
                      <tr key={tx.id} className="align-top">
                        <td className="py-2 font-mono text-[11px]">
                          <div className="font-bold text-zinc-900">{tx.transaction_no}</div>
                          <div className="text-[10px] text-zinc-400">
                            {new Date(tx.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="py-2">
                          <div className="font-semibold text-zinc-800">
                            {tx.cash_categories?.category_name || 'Paid Out'}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            Payee: {tx.payee_or_payer || '—'}
                          </div>
                          {tx.notes && (
                            <div className="text-[10px] text-zinc-400 italic mt-0.5">
                              {tx.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-2 font-mono text-[11px] text-zinc-600">
                          {tx.reference_no || '—'}
                        </td>
                        <td className="py-2 text-right font-bold text-rose-700 whitespace-nowrap">
                          -₱{Number(tx.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Dual Signatures and Instructions */}
            <div className="mt-8 border-t border-zinc-200 pt-6">
              <div className="grid grid-cols-2 gap-6 text-center">
                <div>
                  <div className="border-b border-zinc-400 pb-1 mb-1 font-mono text-xs text-zinc-400">
                    &nbsp;
                  </div>
                  <p className="text-xs font-bold text-zinc-800">Cashier / Disbursed By</p>
                  <p className="text-[10px] text-zinc-500">Signature & Printed Name</p>
                </div>
                <div>
                  <div className="border-b border-zinc-400 pb-1 mb-1 font-mono text-xs text-zinc-400">
                    &nbsp;
                  </div>
                  <p className="text-xs font-bold text-zinc-800">Store Manager Sign-off</p>
                  <p className="text-[10px] text-zinc-500">Audit Verification & Date</p>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-zinc-50 p-2.5 text-center text-[10px] text-zinc-500 border border-zinc-200">
                Please attach all physical receipts, courier invoices, and COD airway bills to this shift audit slip and deposit into the Manager Safe Box at register closing.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden on print) */}
        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-6 py-3 print:hidden">
          <span className="text-xs text-zinc-500">
            Consolidated print saves paper • All {payouts.length} vouchers included
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 active:scale-95 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

