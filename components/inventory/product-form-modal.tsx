'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Package,
  Barcode,
  Layers,
  DollarSign,
  Boxes,
  AlertCircle,
  Loader2,
  Tag,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ProductItem, ProductFormData } from '@/types/inventory'

interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (product: ProductItem, isEdit: boolean) => void
  productToEdit?: ProductItem | null
}

const CATEGORIES = [
  'Roll Media & Vinyl',
  'Tarpaulin & Banners',
  'Printing Inks & Toners',
  'Signage & Acrylic Hardware',
  'Apparel & Textiles',
  'Lamination & Films',
  'Packaging & Boxes',
  'General Supplies',
]

export default function ProductFormModal({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
}: ProductFormModalProps) {
  const isEditMode = Boolean(productToEdit)
  const [formData, setFormData] = useState<ProductFormData>({
    sku: '',
    item_name: '',
    category: 'Roll Media & Vinyl',
    unit_price: '0',
    cost_price: '0',
    stock_quantity: '0',
    reorder_level: '10',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Populate form if editing or generating default SKU if new
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null)
      if (productToEdit) {
        setFormData({
          sku: productToEdit.sku,
          item_name: productToEdit.item_name,
          category: productToEdit.category || 'Roll Media & Vinyl',
          unit_price: productToEdit.unit_price.toString(),
          cost_price: productToEdit.cost_price.toString(),
          stock_quantity: productToEdit.stock_quantity.toString(),
          reorder_level: productToEdit.reorder_level.toString(),
        })
      } else {
        const rand = Math.floor(1000 + Math.random() * 9000)
        setFormData({
          sku: `SKU-${new Date().getFullYear()}-${rand}`,
          item_name: '',
          category: 'Roll Media & Vinyl',
          unit_price: '0',
          cost_price: '0',
          stock_quantity: '0',
          reorder_level: '10',
        })
      }
    }
  }, [isOpen, productToEdit])

  if (!isOpen) return null

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errorMessage) setErrorMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!formData.sku.trim()) {
      setErrorMessage('SKU code is required.')
      return
    }
    if (!formData.item_name.trim()) {
      setErrorMessage('Item name is required.')
      return
    }

    const unitPriceNum = parseFloat(String(formData.unit_price)) || 0
    const costPriceNum = parseFloat(String(formData.cost_price)) || 0
    const stockQtyNum = parseInt(String(formData.stock_quantity)) || 0
    const reorderLevelNum = parseInt(String(formData.reorder_level)) || 0

    if (unitPriceNum < 0 || costPriceNum < 0) {
      setErrorMessage('Prices cannot be negative.')
      return
    }
    if (stockQtyNum < 0) {
      setErrorMessage('Stock quantity cannot be negative.')
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()

      const payload = {
        sku: formData.sku.trim().toUpperCase(),
        item_name: formData.item_name.trim(),
        category: formData.category || 'General Supplies',
        unit_price: unitPriceNum,
        cost_price: costPriceNum,
        stock_quantity: stockQtyNum,
        reorder_level: reorderLevelNum,
      }

      let res
      if (isEditMode && productToEdit) {
        res = await supabase
          .from('products_and_inventory')
          .update(payload)
          .eq('id', productToEdit.id)
          .select()
          .single()
      } else {
        res = await supabase
          .from('products_and_inventory')
          .insert([payload])
          .select()
          .single()
      }

      if (res.error) {
        if (res.error.code === '42501') {
          throw new Error(
            'Supabase Row-Level Security blocked this inventory operation. Run "supabase/migrations/05_inventory_policies.sql" in your Supabase SQL editor to allow dev access.'
          )
        }
        if (res.error.code === '23505') {
          throw new Error(`A product with SKU "${formData.sku}" already exists.`)
        }
        throw new Error(res.error.message || 'Failed to save product.')
      }

      onSuccess(res.data as ProductItem, isEditMode)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred.'
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
              <h2 className="text-lg font-bold text-zinc-900">
                {isEditMode ? 'Edit Product Item' : 'Add New Inventory Item'}
              </h2>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                {isEditMode ? 'Edit Mode' : 'New Catalog SKU'}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Configure product details, cost & retail valuation, and reorder levels.
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
              <p className="font-semibold">Unable to save product</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* SKU & Category */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Product SKU <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  name="sku"
                  required
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="SKU-2026-0001"
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 font-mono uppercase focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Category
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Item Name / Description <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                name="item_name"
                required
                value={formData.item_name}
                onChange={handleChange}
                placeholder="e.g. Glossy Tarpaulin Roll 13oz (3.2m x 50m)"
                className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>

          {/* Cost Price & Selling Unit Price */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Cost Price (PHP ₱)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-medium text-zinc-400">₱</span>
                <input
                  type="number"
                  name="cost_price"
                  min="0"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-8 pr-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">Inventory valuation unit cost.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Retail / Selling Price (PHP ₱)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-medium text-zinc-400">₱</span>
                <input
                  type="number"
                  name="unit_price"
                  min="0"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-8 pr-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">Standard sales quotation rate.</p>
            </div>
          </div>

          {/* Stock Quantity & Reorder Level */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Initial / Current Stock Quantity
              </label>
              <div className="relative">
                <Boxes className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="number"
                  name="stock_quantity"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Reorder Alert Level
              </label>
              <div className="relative">
                <AlertCircle className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="number"
                  name="reorder_level"
                  min="0"
                  value={formData.reorder_level}
                  onChange={handleChange}
                  placeholder="10"
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">Triggers low-stock warning.</p>
            </div>
          </div>

          {/* Footer actions */}
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
                  Saving Product...
                </>
              ) : isEditMode ? (
                'Update Product'
              ) : (
                'Add Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

