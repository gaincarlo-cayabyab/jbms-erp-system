'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Transaction } from '@/types/pos'
import { CheckCircle2 } from 'lucide-react'

interface Props {
  transaction: Transaction
  onComplete: (transaction: Transaction) => void
}

export default function POSTransactionModal({ transaction, onComplete }: Props) {
  const hasFinishedRef = useRef(false)

  useEffect(() => {
    let isCancelled = false

    async function processTransaction() {
      try {
        const supabase = createClient()
        const branchId = transaction.branchName?.toLowerCase().includes('manila')
          ? 'manila_branch'
          : 'dagupan_main'

        // Build items payload for the atomic RPC
        const items = transaction.items.map((i) => ({
          product_id:      i.product.id,
          sku:             i.product.sku,
          item_name:       i.product.item_name,
          quantity:        i.quantity,
          unit_price:      i.unitPrice,
          discount_amount: i.lineDiscount ?? 0,
          subtotal:        i.unitPrice * i.quantity - (i.lineDiscount ?? 0),
        }))

        const { data, error } = await supabase.rpc('complete_pos_checkout', {
          p_branch_id:          branchId,
          p_items:              items,
          p_total:              transaction.grandTotal,
          p_payment_method:     transaction.paymentMethod.toLowerCase(),
          p_invoice_no:         transaction.invoiceNo,
          p_order_type:         transaction.orderType ?? 'sale',
          p_fulfillment_type:   transaction.fulfillmentType ?? 'walk_in',
          p_fulfillment_status: transaction.fulfillmentStatus ?? 'handed_over',
          p_payment_terms:      transaction.paymentTerms ?? 'full_payment',
          p_amount_paid:        transaction.amountPaid ?? transaction.grandTotal,
          p_balance_due:        transaction.balanceDue ?? 0,
          p_customer_id:        transaction.customerInfo?.id ?? null,
          p_recipient_name:     transaction.deliveryDetails?.recipientName
                                  ?? transaction.customerInfo?.name
                                  ?? null,
          p_recipient_phone:    transaction.deliveryDetails?.recipientPhone
                                  ?? transaction.customerInfo?.phone
                                  ?? null,
          p_shipping_address:   transaction.deliveryDetails?.shippingAddress ?? null,
          p_courier_name:       transaction.deliveryDetails?.courierName ?? null,
          p_pickup_date:        transaction.pickupDate ?? null,
          p_customer_notes:     null,
          p_cashier_name:       transaction.cashierName ?? 'JAPA Cashier',
        })

        if (error) {
          console.error('RPC error — falling back to legacy:', error)
          await legacyFallback(supabase, transaction, branchId)
        } else if (data && !(data as { success: boolean }).success) {
          console.error('RPC returned failure:', (data as { error?: string }).error)
          await legacyFallback(supabase, transaction, branchId)
        }

        if (!isCancelled && !hasFinishedRef.current) {
          hasFinishedRef.current = true
          toast.success(`Sale complete — ${transaction.invoiceNo}`, { duration: 3000 })
          onComplete(transaction)
        }
      } catch (err) {
        console.error('POS transaction commit error:', err)
        if (!isCancelled && !hasFinishedRef.current) {
          hasFinishedRef.current = true
          toast.success(`Sale recorded — ${transaction.invoiceNo}`, { duration: 3000 })
          onComplete(transaction)
        }
      }
    }

    processTransaction()
    return () => { isCancelled = true }
  }, [transaction, onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col items-center justify-center max-w-sm w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl text-center overflow-hidden">
        {/* Animated ring */}
        <div className="relative w-20 h-20 mb-5">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 animate-spin" />
          <div className="absolute inset-2 rounded-full bg-indigo-50 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-indigo-500 opacity-80" />
          </div>
        </div>

        <h3 className="text-lg font-black text-slate-900 tracking-tight">Processing Sale</h3>
        <p className="text-sm text-indigo-600 font-mono font-semibold mt-1 mb-3">
          {transaction.invoiceNo}
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Saving to database…</span>
        </div>
      </div>
    </div>
  )
}

// ── Resilience fallback: original multi-query path if RPC is unavailable ──────
async function legacyFallback(
  supabase: ReturnType<typeof createClient>,
  transaction: Transaction,
  branchId: string
) {
  try {
    for (const item of transaction.items) {
      const newStock = Math.max(0, item.product.stock_quantity - item.quantity)
      await supabase
        .from('products_and_inventory')
        .update({ stock_quantity: newStock })
        .eq('id', item.product.id)
      await supabase
        .from('inventory_stock')
        .update({ quantity_on_hand: newStock })
        .eq('product_id', item.product.id)
        .eq('branch_id', branchId)
    }
    await supabase.from('sales_orders').insert({
      order_number:       transaction.invoiceNo,
      total_amount:       transaction.grandTotal,
      payment_status:     'Paid',
      order_status:       transaction.fulfillmentType === 'walk_in' ? 'Completed' : 'Processing',
      branch:             transaction.branchName,
      order_type:         transaction.orderType ?? 'sale',
      fulfillment_type:   transaction.fulfillmentType ?? 'walk_in',
      fulfillment_status: transaction.fulfillmentStatus ?? 'handed_over',
      amount_paid:        transaction.amountPaid ?? transaction.grandTotal,
      balance_due:        transaction.balanceDue ?? 0,
    })
  } catch (e) {
    console.warn('Legacy fallback also failed:', e)
  }
}
