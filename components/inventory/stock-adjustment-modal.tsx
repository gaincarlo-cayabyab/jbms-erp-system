'use client'

import { useState } from 'react'
import {
  X,
  Boxes,
  Plus,
  Minus,
  ArrowRight,
  AlertCircle,
  Loader2,
  FileEdit,
  CheckCircle2,
  Clock,
  Truck,
  AlertOctagon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useBranch } from '@/lib/branch-context'
import { ProductItem } from '@/types/inventory'

interface StockAdjustmentModalProps {
  product: ProductItem | null
  onClose: () => void
  onSuccess: (updatedProduct: ProductItem) => void
}

type StockTarget = 'available' | 'reserved' | 'in_transit' | 'quarantine'

export default function StockAdjustmentModal({
  product,
  onClose,
  onSuccess,
}: StockAdjustmentModalProps) {
  const { activeBranchId } = useBranch()
  const [stockTarget, setStockTarget] = useState<StockTarget>('available')
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add')
  const [amount, setAmount] = useState<string>('10')
  const [reason, setReason] = useState<string>('Restocked from Supplier')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!product) return null

  // Get current stock based on target
  const getCurrentTargetStock = (): number => {
    switch (stockTarget) {
      case 'available':
        return Number(product.stock_quantity) || 0
      case 'reserved':
        return Number(product.reserved_stock) || 0
      case 'in_transit':
        return Number(product.in_transit_stock) || 0
      case 'quarantine':
        return Number(product.quarantine_stock) || 0
    }
  }

  const currentStock = getCurrentTargetStock()
  const changeValue = Math.max(0, parseInt(amount) || 0)

  let calculatedNewStock = currentStock
  if (adjustmentType === 'add') {
    calculatedNewStock = currentStock + changeValue
  } else if (adjustmentType === 'subtract') {
    calculatedNewStock = Math.max(0, currentStock - changeValue)
  } else if (adjustmentType === 'set') {
    calculatedNewStock = changeValue
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (calculatedNewStock < 0) {
      setErrorMessage('Resulting stock cannot be negative.')
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()

      // Build update fields
      const updateFields: Record<string, number> = {}
      const stockUpdateFields: Record<string, number> = {}

      if (stockTarget === 'available') {
        updateFields.stock_quantity = calculatedNewStock
        stockUpdateFields.quantity_on_hand = calculatedNewStock
      } else if (stockTarget === 'reserved') {
        updateFields.reserved_stock = calculatedNewStock
        stockUpdateFields.reserved_quantity = calculatedNewStock
      } else if (stockTarget === 'in_transit') {
        updateFields.in_transit_stock = calculatedNewStock
        stockUpdateFields.in_transit_quantity = calculatedNewStock
      } else if (stockTarget === 'quarantine') {
        updateFields.quarantine_stock = calculatedNewStock
        stockUpdateFields.quarantine_quantity = calculatedNewStock
      }

      const { data, error } = await supabase
        .from('products_and_inventory')
        .update(updateFields)
        .eq('id', product.id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message || 'Failed to adjust stock level.')
      }

      // Sync branch-specific inventory_stock table
      const targetBranches =
        !activeBranchId || activeBranchId === 'all'
          ? ['dagupan_main', 'manila_branch']
          : [activeBranchId]

      for (const bId of targetBranches) {
        await supabase
          .from('inventory_stock')
          .update({
            ...stockUpdateFields,
            last_updated: new Date().toISOString(),
          })
          .match({ branch_id: bId, product_id: product.id })
      }

      onSuccess(data as ProductItem)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900">Adjust Stock Quantity</h2>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                Blueprint 1.2
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{product.sku}</p>
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
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Item summary */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
            <p className="text-xs font-bold text-zinc-900">{product.item_name}</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Current {stockTarget.toUpperCase()} Stock:</span>
              <span className="font-bold text-zinc-900">{currentStock} units</span>
            </div>
          </div>

          {/* Stock Target Tab Selector (Blueprint 1.2) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Stock Category to Adjust
            </label>
            <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-zinc-200 p-1 bg-zinc-50">
              <button
                type="button"
                onClick={() => setStockTarget('available')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition ${
                  stockTarget === 'available'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Available (S_avail)
              </button>
              <button
                type="button"
                onClick={() => setStockTarget('reserved')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition ${
                  stockTarget === 'reserved'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Clock className="h-3.5 w-3.5" /> Reserved (S_res)
              </button>
              <button
                type="button"
                onClick={() => setStockTarget('in_transit')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition ${
                  stockTarget === 'in_transit'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Truck className="h-3.5 w-3.5" /> In-Transit (S_trans)
              </button>
              <button
                type="button"
                onClick={() => setStockTarget('quarantine')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition ${
                  stockTarget === 'quarantine'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <AlertOctagon className="h-3.5 w-3.5" /> Audit (S_audit)
              </button>
            </div>
          </div>

          {/* Action Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Adjustment Operation
            </label>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-zinc-200 p-1 bg-zinc-50">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold transition ${
                  adjustmentType === 'add'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('subtract')}
                className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold transition ${
                  adjustmentType === 'subtract'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Minus className="h-3.5 w-3.5" /> Deduct
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('set')}
                className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold transition ${
                  adjustmentType === 'set'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <FileEdit className="h-3.5 w-3.5" /> Set Exact
              </button>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              {adjustmentType === 'set' ? 'New Total Count' : 'Units to Adjust'}
            </label>
            <div className="relative">
              <Boxes className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="number"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>

          {/* Reason selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Reason for Adjustment
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 py-2 px-3 text-xs text-zinc-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
            >
              <option value="Restocked from Supplier">Restocked from Supplier / PO</option>
              <option value="Physical Inventory Audit">Physical Inventory Audit Discrepancy</option>
              <option value="Damaged / Vendor Return">Damaged / Defective Stock to Quarantine</option>
              <option value="Customer Reservation Allocated">Customer Reservation Allocated</option>
              <option value="Inter-Branch Transfer In Transit">Inter-Branch STO Dispatch</option>
              <option value="Production Consumption">Consumed in Production</option>
            </select>
          </div>

          {/* Preview result */}
          <div className="flex items-center justify-between rounded-xl bg-indigo-50 p-3.5 border border-indigo-100">
            <div className="text-xs text-indigo-900">
              <span className="font-semibold">Calculated New {stockTarget.toUpperCase()} Stock:</span>
              <p className="text-[11px] text-indigo-700">
                {currentStock} → {calculatedNewStock} units
              </p>
            </div>
            <div className="text-xl font-bold text-indigo-700">
              {calculatedNewStock} units
            </div>
          </div>

          {/* Buttons */}
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
                  Updating...
                </>
              ) : (
                'Save Adjustment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
