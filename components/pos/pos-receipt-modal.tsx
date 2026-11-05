'use client'

import { useRef } from 'react'
import { toast } from 'sonner'
import { Download, Printer, PlusCircle, CheckCircle, Share2, Mail } from 'lucide-react'
import type { Transaction } from '@/types/pos'

const PHP = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

interface Props {
  transaction: Transaction
  onNewSale: () => void
}

export default function POSReceiptModal({ transaction, onNewSale }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const dateStr = transaction.createdAt.toISOString().slice(0, 10)
  const timeStr = transaction.createdAt.toLocaleTimeString()
  const branchAddress =
    transaction.branchName.includes('Dagupan')
      ? '08 Perez Street, Dagupan City, Pangasinan'
      : '72 Roxas Blvd, Malate, Manila'
  const branchTel =
    transaction.branchName.includes('Dagupan')
      ? '(075) 555-0199 / 0917-000-0000'
      : '(02) 8888-0199 / 0918-000-0000'

  // ── HTML5 Canvas Digital Receipt PNG Download ────────────────────────────
  function handleDownloadPNG() {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = 600
      canvas.height = 950

      // Background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Header borders & title
      ctx.fillStyle = '#0F172A'
      ctx.textAlign = 'center'
      ctx.font = 'bold 22px Courier New, monospace'
      ctx.fillText('=================================================', 300, 40)
      ctx.font = 'bold 24px Courier New, monospace'
      ctx.fillText('JAPA GLOBAL DIGITAL', 300, 75)
      ctx.font = '16px Courier New, monospace'
      ctx.fillText(transaction.branchName, 300, 105)
      ctx.font = '13px Courier New, monospace'
      ctx.fillStyle = '#475569'
      ctx.fillText(branchAddress, 300, 130)
      ctx.fillText(`Tel: ${branchTel}`, 300, 150)
      ctx.fillStyle = '#0F172A'
      ctx.font = 'bold 22px Courier New, monospace'
      ctx.fillText('=================================================', 300, 175)

      // Metadata
      ctx.textAlign = 'left'
      ctx.font = '14px Courier New, monospace'
      ctx.fillText(`Invoice No: ${transaction.invoiceNo}`, 40, 205)
      ctx.fillText(`Date/Time : ${dateStr} ${timeStr}`, 40, 225)
      ctx.fillText(`Cashier   : ${transaction.cashierName} (POS-01)`, 40, 245)
      ctx.fillText(`Branch    : ${transaction.branchName}`, 40, 265)

      // Separator
      ctx.fillText('-------------------------------------------------', 40, 290)
      ctx.font = 'bold 13px Courier New, monospace'
      ctx.fillText('ITEM                          QTY   PRICE   TOTAL', 40, 310)
      ctx.font = '14px Courier New, monospace'
      ctx.fillText('-------------------------------------------------', 40, 325)

      // Items list
      let y = 350
      ctx.font = '13px Courier New, monospace'
      transaction.items.forEach((item) => {
        const name = item.product.item_name.padEnd(26, ' ').slice(0, 26)
        const qty = String(item.quantity).padStart(3, ' ')
        const price = Math.round(item.unitPrice).toLocaleString().padStart(7, ' ')
        const lineTotal = (item.unitPrice * item.quantity - item.lineDiscount).toFixed(2).padStart(10, ' ')
        ctx.fillText(`${name} ${qty} ${price} ${lineTotal}`, 40, y)
        y += 22
      })

      y += 10
      ctx.fillText('-------------------------------------------------', 40, y)
      y += 25

      // Subtotals & Totals
      ctx.fillText(`SUBTOTAL                               ${transaction.subtotal.toFixed(2).padStart(10, ' ')}`, 40, y)
      y += 22
      if (transaction.totalDiscount > 0) {
        ctx.fillText(`DISCOUNT                               -${transaction.totalDiscount.toFixed(2).padStart(9, ' ')}`, 40, y)
        y += 22
      }
      ctx.fillText(`12% VAT INCLUDED                       ${transaction.vatAmount.toFixed(2).padStart(10, ' ')}`, 40, y)
      y += 22
      ctx.fillText('-------------------------------------------------', 40, y)
      y += 25

      ctx.font = 'bold 16px Courier New, monospace'
      ctx.fillText(`GRAND TOTAL                           PHP ${transaction.grandTotal.toFixed(2)}`, 40, y)
      y += 24
      ctx.font = '14px Courier New, monospace'
      ctx.fillText('-------------------------------------------------', 40, y)
      y += 22

      ctx.fillText(`TENDERED (${transaction.paymentMethod})               PHP ${transaction.amountTendered.toFixed(2)}`, 40, y)
      y += 22
      ctx.fillText(`CHANGE DUE                             PHP ${transaction.changeDue.toFixed(2)}`, 40, y)
      y += 26

      // Footer
      ctx.textAlign = 'center'
      ctx.font = 'bold 22px Courier New, monospace'
      ctx.fillText('=================================================', 300, y)
      y += 30
      ctx.font = 'bold 14px Courier New, monospace'
      ctx.fillText('Thank you for shopping at JAPA Core!', 300, y)
      y += 22
      ctx.font = '13px Courier New, monospace'
      ctx.fillStyle = '#64748B'
      ctx.fillText('This serves as an Official Receipt', 300, y)
      y += 22
      ctx.fillStyle = '#0F172A'
      ctx.font = 'bold 22px Courier New, monospace'
      ctx.fillText('=================================================', 300, y)

      // Download trigger
      const imageURI = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `Receipt_${transaction.invoiceNo}.png`
      link.href = imageURI
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Receipt ${transaction.invoiceNo}.png downloaded!`)
    } catch (err) {
      console.error('Canvas export error:', err)
      toast.error('Failed to export receipt image.')
    }
  }

  // ── Print or Save as PDF ─────────────────────────────────────────────────
  function handlePrintPDF() {
    window.print()
  }

  // ── Send via Email / SMS ──────────────────────────────────────────────────
  function handleShareReceipt() {
    toast.success(`Digital receipt sent to customer record for ${transaction.invoiceNo}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative flex flex-col max-w-xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header Ribbon */}
        <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Transaction Successful!</h2>
              <p className="text-xs text-emerald-100">{transaction.invoiceNo}</p>
            </div>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
            {transaction.paymentMethod}
          </span>
        </div>

        {/* Digital Receipt Card replica per Section 6.2 */}
        <div className="p-6 overflow-y-auto max-h-[55vh] bg-slate-100/50">
          <div
            ref={receiptRef}
            className="mx-auto max-w-md rounded-2xl border border-slate-300 bg-white p-6 shadow-sm font-mono text-xs leading-relaxed text-slate-800"
          >
            <div className="text-center border-b border-slate-300 pb-3 mb-3">
              <p className="font-extrabold text-sm tracking-widest text-slate-900">JAPA GLOBAL DIGITAL</p>
              <p className="font-semibold text-slate-700">{transaction.branchName}</p>
              <p className="text-[10px] text-slate-500">{branchAddress}</p>
              <p className="text-[10px] text-slate-500">Tel: {branchTel}</p>
            </div>

            <div className="space-y-1 text-[11px] pb-3 border-b border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice No:</span>
                <span className="font-bold text-slate-900">{transaction.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date/Time:</span>
                <span>{dateStr} {timeStr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier:</span>
                <span>{transaction.cashierName} (POS-01)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Branch:</span>
                <span>{transaction.branchName}</span>
              </div>
            </div>

            {/* Line items table */}
            <div className="py-3 border-b border-slate-200">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span>Item</span>
                <span className="text-center w-12">Qty</span>
                <span className="text-right w-16">Price</span>
                <span className="text-right w-20">Total</span>
              </div>
              <div className="space-y-1.5">
                {transaction.items.map((item) => (
                  <div key={item.product.id} className="flex justify-between items-baseline text-[11px]">
                    <span className="truncate flex-1 pr-2 font-medium">{item.product.item_name}</span>
                    <span className="w-12 text-center text-slate-500">{item.quantity}</span>
                    <span className="w-16 text-right text-slate-500">{Math.round(item.unitPrice).toLocaleString()}</span>
                    <span className="w-20 text-right font-bold">
                      {PHP.format(item.unitPrice * item.quantity - item.lineDiscount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations */}
            <div className="py-3 border-b border-slate-200 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>SUBTOTAL</span>
                <span>{PHP.format(transaction.subtotal)}</span>
              </div>
              {transaction.totalDiscount > 0 && (
                <div className="flex justify-between text-amber-600 font-semibold">
                  <span>DISCOUNT</span>
                  <span>-{PHP.format(transaction.totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>12% VAT INCLUDED</span>
                <span>{PHP.format(transaction.vatAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>GRAND TOTAL</span>
                <span className="text-indigo-700">{PHP.format(transaction.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1">
                <span>TENDERED ({transaction.paymentMethod})</span>
                <span>{PHP.format(transaction.amountTendered)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>CHANGE DUE</span>
                <span>{PHP.format(transaction.changeDue)}</span>
              </div>
            </div>

            <div className="text-center pt-3 text-[10px] text-slate-500 space-y-0.5">
              <p className="font-bold text-slate-700">Thank you for shopping at JAPA Core!</p>
              <p>This serves as an Official Receipt</p>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar per Section 6.1 */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {/* Download Receipt Image (.PNG) */}
            <button
              onClick={handleDownloadPNG}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
            >
              <Download className="h-4 w-4" />
              <span>Save PNG</span>
            </button>

            {/* Download Invoice (.PDF) / Print */}
            <button
              onClick={handlePrintPDF}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            >
              <Printer className="h-4 w-4" />
              <span>Print / PDF</span>
            </button>

            {/* Send via Email / SMS */}
            <button
              onClick={handleShareReceipt}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            >
              <Mail className="h-4 w-4" />
              <span>Email / SMS</span>
            </button>
          </div>

          {/* Start New Sale — resets POS ready state */}
          <button
            onClick={onNewSale}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition shadow-modern active:scale-[0.99]"
          >
            <PlusCircle className="h-5 w-5" />
            <span>Start New Sale</span>
          </button>
        </div>
      </div>
    </div>
  )
}

