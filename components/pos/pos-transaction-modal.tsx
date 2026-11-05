'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Transaction } from '@/types/pos'
import { Loader2 } from 'lucide-react'

interface Props {
  transaction: Transaction
  onComplete: (transaction: Transaction) => void
}

export default function POSTransactionModal({ transaction, onComplete }: Props) {
  const [videoFailed, setVideoFailed] = useState(false)
  const [statusText, setStatusText] = useState('Committing transaction to database...')
  const hasFinishedRef = useRef(false)

  useEffect(() => {
    let isCancelled = false

    async function processTransaction() {
      try {
        const supabase = createClient()

        // 1. Deduct stock in Supabase for each cart item
        for (const item of transaction.items) {
          const newStock = Math.max(0, item.product.stock_quantity - item.quantity)
          await supabase
            .from('inventory_items')
            .update({ stock_quantity: newStock })
            .eq('id', item.product.id)
        }

        // 2. Status update
        if (!isCancelled) {
          setStatusText('Finalizing digital receipt & invoice records...')
        }

        // 3. Optional order record insertion if sales_orders exists
        try {
          await supabase.from('sales_orders').insert({
            order_number: transaction.invoiceNo,
            total_amount: transaction.grandTotal,
            status: 'COMPLETED',
            notes: `POS Cashier Transaction - ${transaction.branchName} (${transaction.paymentMethod})`,
          })
        } catch {
          // Table structure might vary; gracefully handle
        }

        // Ensure user sees the high-end animation smoothly (at least 2.2 seconds)
        await new Promise((r) => setTimeout(r, 2200))

        if (!isCancelled && !hasFinishedRef.current) {
          hasFinishedRef.current = true
          onComplete(transaction)
        }
      } catch (err) {
        console.error('POS transaction commit error:', err)
        // Even if non-fatal DB write error occurs, still proceed to show receipt
        if (!isCancelled && !hasFinishedRef.current) {
          hasFinishedRef.current = true
          onComplete(transaction)
        }
      }
    }

    processTransaction()

    return () => {
      isCancelled = true
    }
  }, [transaction, onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col items-center justify-center max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center text-white overflow-hidden">
        {/* Subtle glowing radial background */}
        <div className="absolute inset-0 bg-radial from-indigo-500/20 via-transparent to-transparent pointer-events-none" />

        {/* Video Player */}
        {!videoFailed ? (
          <div className="relative w-52 h-52 mb-6 rounded-2xl overflow-hidden shadow-inner bg-slate-950 border border-slate-800">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              onError={() => setVideoFailed(true)}
            >
              <source src="/assets/video/JAPA_loading_animation.mp4" type="video/mp4" />
              <source src="/assets/video/loading.mp4" type="video/mp4" />
              <source src="/assets/video/transaction_loading.mp4" type="video/mp4" />
            </video>
          </div>
        ) : (
          <div className="flex items-center justify-center w-28 h-28 rounded-full bg-indigo-600/20 text-indigo-400 mb-6 border border-indigo-500/30">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-400" />
          </div>
        )}

        {/* Status text */}
        <h3 className="text-xl font-bold tracking-tight text-white mb-2">
          Processing Sale
        </h3>
        <p className="text-sm text-indigo-200 font-mono mb-4">{transaction.invoiceNo}</p>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{statusText}</span>
        </div>
      </div>
    </div>
  )
}
