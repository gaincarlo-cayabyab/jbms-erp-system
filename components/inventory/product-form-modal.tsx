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
  Folder,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ProductItem, ProductFormData } from '@/types/inventory'

interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (product: ProductItem, isEdit: boolean) => void
  productToEdit?: ProductItem | null
}

export const INVENTORY_TABS = [
  'APPAREL BRAND',
  'DIGITAL CONSUMABLE',
  'SILKSCREEN SUPPLIES',
  'SUBLIMATION APPARELS',
  'MEDIA SUPPLY',
]

export const POPULAR_BRANDS = [
  'Gildan',
  'Smilee',
  'Fruit of the Loom',
  '3K',
  'Blu-Print',
  'AIIZ',
  'Simple',
  'Winner',
  'Tulco',
  'Yalex',
  'Artix',
  'JJ Virgo',
  'Digital Consumable',
  'Sublimation',
  'Media Supply',
  'Other',
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
    barcode: '',
    category: '76000-GIL-PREM',
    tab: 'APPAREL BRAND',
    brand: 'Gildan',
    unit_price: '0',
    cost_price: '0',
    stock_quantity: '0',
    reserved_stock: '0',
    in_transit_stock: '0',
    quarantine_stock: '0',
    reorder_level: '10',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null)
      if (productToEdit) {
        setFormData({
          sku: productToEdit.sku,
          item_name: productToEdit.item_name,
          barcode: productToEdit.barcode || '',
          category: productToEdit.category || '76000-GIL-PREM',
          tab: productToEdit.tab || 'APPAREL BRAND',
          brand: productToEdit.brand || 'Gildan',
          unit_price: productToEdit.unit_price.toString(),
          cost_price: productToEdit.cost_price.toString(),
          stock_quantity: productToEdit.stock_quantity.toString(),
          reserved_stock: (productToEdit.reserved_stock || 0).toString(),
          in_transit_stock: (productToEdit.in_transit_stock || 0).toString(),
          quarantine_stock: (productToEdit.quarantine_stock || 0).toString(),
          reorder_level: productToEdit.reorder_level.toString(),
        })
      } else {
        const rand = Math.floor(1000 + Math.random() * 9000)
        setFormData({
          sku: `SKU-${new Date().getFullYear()}-${rand}`,
          item_name: '',
          barcode: '',
          category: '76000-GIL-PREM',
          tab: 'APPAREL BRAND',
          brand: 'Gildan',
          unit_price: '0',
          cost_price: '0',
          stock_quantity: '0',
          reserved_stock: '0',
          in_transit_stock: '0',
          quarantine_stock: '0',
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
      setErrorMessage('Product name is required.')
      return
    }

    const unitPrice = parseFloat(formData.unit_price as string) || 0
    const costPrice = parseFloat(formData.cost_price as string) || 0
    const stockQty = Math.max(0, parseInt(formData.stock_quantity as string, 10) || 0)
    const reservedQty = Math.max(0, parseInt((formData.reserved_stock || '0') as string, 10) || 0)
    const inTransitQty = Math.max(0, parseInt((formData.in_transit_stock || '0') as string, 10) || 0)
    const quarantineQty = Math.max(0, parseInt((formData.quarantine_stock || '0') as string, 10) || 0)
    const reorderLevel = Math.max(1, parseInt(formData.reorder_level as string, 10) || 10)

    setIsSubmitting(true)

    try {
      const supabase = createClient()

      const payload = {
        sku: formData.sku.trim(),
        item_name: formData.item_name.trim(),
        barcode: formData.barcode?.trim() || null,
        category: formData.category?.trim() || null,
        tab: formData.tab?.trim() || null,
        brand: formData.brand?.trim() || null,
        unit_price: unitPrice,
        cost_price: costPrice,
        stock_quantity: stockQty,
        reserved_stock: reservedQty,
        in_transit_stock: inTransitQty,
        quarantine_stock: quarantineQty,
        reorder_level: reorderLevel,
      }

      if (isEditMode && productToEdit) {
        const { data, error } = await supabase
          .from('products_and_inventory')
          .update(payload)
          .eq('id', productToEdit.id)
          .select()
          .single()

        if (error) throw new Error(error.message)

        // Sync with inventory_stock
        await supabase
          .from('inventory_stock')
          .update({
            quantity_on_hand: stockQty,
            reserved_quantity: reservedQty,
            in_transit_quantity: inTransitQty,
            quarantine_quantity: quarantineQty,
            reorder_level: reorderLevel,
            last_updated: new Date().toISOString(),
          })
          .eq('product_id', productToEdit.id)

        onSuccess(data as ProductItem, true)
      } else {
        const { data, error } = await supabase
          .from('products_and_inventory')
          .insert([payload])
          .select()
          .single()

        if (error) {
          if (error.code === '23505') {
            throw new Error(`A product with SKU "${formData.sku}" already exists.`)
          }
          throw new Error(error.message)
        }

        const newProd = data as ProductItem

        // Auto-seed inventory_stock for both branches
        await supabase.from('inventory_stock').insert([
          {
            branch_id: 'dagupan_main',
            product_id: newProd.id,
            quantity_on_hand: stockQty,
            reserved_quantity: reservedQty,
            in_transit_quantity: inTransitQty,
            quarantine_quantity: quarantineQty,
            reorder_level: reorderLevel,
          },
          {
            branch_id: 'manila_branch',
            product_id: newProd.id,
            quantity_on_hand: 0,
            reserved_quantity: 0,
            in_transit_quantity: 0,
            quarantine_quantity: 0,
            reorder_level: reorderLevel,
          },
        ])

        onSuccess(newProd, false)
      }

      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving the product.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50/50">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              {isEditMode ? 'Edit Product Item' : 'Add New Inventory Product'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isEditMode
                ? 'Update SKU, categorizations, pricing, and stock status levels.'
                : 'Register a new stock item with standard SKU and branch stock status.'}
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
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                SKU Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  name="sku"
                  required
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="e.g. 76000-GIL-PREM-BLACK-XL"
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Barcode / UPC
              </label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode || ''}
                onChange={handleChange}
                placeholder="Optional Barcode / UPC"
                className="w-full rounded-lg border border-zinc-300 py-2 px-3 text-sm text-zinc-900 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                name="item_name"
                required
                value={formData.item_name}
                onChange={handleChange}
                placeholder="e.g. Gildan Premium 76000 Black - XL"
                className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>

          {/* Tab, Category, Brand (Section 1.1) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Catalog Tab
              </label>
              <select
                name="tab"
                value={formData.tab || 'APPAREL BRAND'}
                onChange={handleChange}
                className="w-full rounded-lg border border-zinc-300 py-2 px-3 text-xs text-zinc-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              >
                {INVENTORY_TABS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Category Code
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g. 76000-GIL-PREM"
                className="w-full rounded-lg border border-zinc-300 py-2 px-3 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Sub-Category / Brand
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand || ''}
                onChange={handleChange}
                placeholder="e.g. Gildan, Smilee, 3K"
                className="w-full rounded-lg border border-zinc-300 py-2 px-3 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Unit Cost (₱)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-zinc-400">₱</span>
                <input
                  type="number"
                  name="cost_price"
                  min="0"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-8 pr-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Retail Price (₱)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-zinc-400">₱</span>
                <input
                  type="number"
                  name="unit_price"
                  min="0"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-8 pr-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>
          </div>

          {/* Stock Location & Status Tabs Structure (Section 1.2) */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Stock Location & Status Breakdown (Blueprint 1.2)
              </p>
              <span className="text-[11px] font-mono text-zinc-500">
                Physical = Available + Reserved + Audit
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-emerald-700 mb-1">
                  Available (S_avail)
                </label>
                <input
                  type="number"
                  name="stock_quantity"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-emerald-300 bg-white py-1.5 px-2.5 text-xs font-bold text-emerald-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-amber-700 mb-1">
                  Reserved (S_res)
                </label>
                <input
                  type="number"
                  name="reserved_stock"
                  min="0"
                  value={formData.reserved_stock || '0'}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-amber-300 bg-white py-1.5 px-2.5 text-xs font-bold text-amber-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-blue-700 mb-1">
                  In-Transit (S_trans)
                </label>
                <input
                  type="number"
                  name="in_transit_stock"
                  min="0"
                  value={formData.in_transit_stock || '0'}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-blue-300 bg-white py-1.5 px-2.5 text-xs font-bold text-blue-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-rose-700 mb-1">
                  Quarantine / Audit
                </label>
                <input
                  type="number"
                  name="quarantine_stock"
                  min="0"
                  value={formData.quarantine_stock || '0'}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-rose-300 bg-white py-1.5 px-2.5 text-xs font-bold text-rose-900 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                Low Stock Reorder Threshold
              </label>
              <input
                type="number"
                name="reorder_level"
                min="1"
                value={formData.reorder_level}
                onChange={handleChange}
                className="w-full rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Form Actions */}
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
                  Saving...
                </>
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Create Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
