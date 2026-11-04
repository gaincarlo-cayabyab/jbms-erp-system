'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardShell from '@/components/dashboard-shell'
import InventorySummaryCards from './inventory-summary-cards'
import ProductFormModal from './product-form-modal'
import StockAdjustmentModal from './stock-adjustment-modal'
import { createClient } from '@/lib/supabase/client'
import { ProductItem } from '@/types/inventory'
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Edit2,
  Boxes,
  Trash2,
  Tag,
  Barcode,
} from 'lucide-react'

export default function InventoryView() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<ProductItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'in_stock'>('all')
  const [sortBy, setSortBy] = useState<'name_asc' | 'sku_asc' | 'stock_asc' | 'stock_desc' | 'value_desc'>('name_asc')

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null)
  const [adjustingProduct, setAdjustingProduct] = useState<ProductItem | null>(null)

  const [isPending, startTransition] = useTransition()
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // URL query check (e.g. /inventory?new=true)
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsProductModalOpen(true)
    }
  }, [searchParams])

  // Load products from Supabase
  const loadProducts = async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('products_and_inventory')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      setProducts((data as ProductItem[]) || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch inventory catalog.'
      setFetchError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  // Auto-hide toast
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toastMessage])

  // Handle saved product (create or edit)
  const handleProductSaved = (savedProduct: ProductItem, isEdit: boolean) => {
    if (isEdit) {
      setProducts((prev) =>
        prev.map((p) => (p.id === savedProduct.id ? savedProduct : p))
      )
      setToastMessage(`Product "${savedProduct.item_name}" updated successfully.`)
    } else {
      setProducts((prev) => [savedProduct, ...prev])
      setToastMessage(`Product "${savedProduct.item_name}" added to catalog.`)
    }
  }

  // Handle stock adjustment
  const handleStockAdjusted = (updatedProduct: ProductItem) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    )
    setToastMessage(`Stock for "${updatedProduct.item_name}" updated to ${updatedProduct.stock_quantity} units.`)
  }

  // Handle delete product
  const handleDeleteProduct = async (product: ProductItem) => {
    if (!confirm(`Are you sure you want to delete "${product.item_name}" (${product.sku})?`)) {
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('products_and_inventory')
        .delete()
        .eq('id', product.id)

      if (error) throw new Error(error.message)

      setProducts((prev) => prev.filter((p) => p.id !== product.id))
      setToastMessage(`Product "${product.item_name}" deleted.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete product'
      setToastMessage(`Error deleting product: ${msg}`)
    }
  }

  // Categories list derived from current items + defaults
  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return Array.from(set).sort()
  }, [products])

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search by name or SKU
        const q = searchQuery.toLowerCase().trim()
        const matchesSearch =
          !q ||
          p.item_name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)

        if (!matchesSearch) return false

        // Category filter
        if (categoryFilter !== 'all' && p.category !== categoryFilter) {
          return false
        }

        // Stock status filter
        const stock = Number(p.stock_quantity) || 0
        const reorder = Number(p.reorder_level) || 0

        if (stockStatusFilter === 'low_stock') {
          return stock > 0 && stock <= reorder
        }
        if (stockStatusFilter === 'out_of_stock') {
          return stock <= 0
        }
        if (stockStatusFilter === 'in_stock') {
          return stock > reorder
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.item_name.localeCompare(b.item_name)
        if (sortBy === 'sku_asc') return a.sku.localeCompare(b.sku)
        if (sortBy === 'stock_asc') return (Number(a.stock_quantity) || 0) - (Number(b.stock_quantity) || 0)
        if (sortBy === 'stock_desc') return (Number(b.stock_quantity) || 0) - (Number(a.stock_quantity) || 0)
        if (sortBy === 'value_desc') {
          const valA = (Number(a.stock_quantity) || 0) * (Number(a.cost_price) || 0)
          const valB = (Number(b.stock_quantity) || 0) * (Number(b.cost_price) || 0)
          return valB - valA
        }
        return 0
      })
  }, [products, searchQuery, categoryFilter, stockStatusFilter, sortBy])

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(Number(val) || 0)
  }

  return (
    <DashboardShell>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg animate-in slide-in-from-bottom-5">
            <CheckCircle2 className="h-5 w-5" />
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 rounded p-0.5 hover:bg-emerald-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Multi-Store Inventory & Products
              </h1>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                Module 4
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Track warehouse materials, retail products, live stock counts, and automated reorder alerts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  loadProducts()
                })
              }}
              disabled={isLoading || isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 transition disabled:opacity-50"
              title="Refresh Inventory"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingProduct(null)
                setIsProductModalOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <InventorySummaryCards products={products} isLoading={isLoading} />

        {/* Supabase Error Notice */}
        {fetchError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to fetch products from Supabase</p>
              <p className="mt-0.5 text-xs text-red-700">{fetchError}</p>
              <p className="mt-2 text-xs text-red-600">
                Run the script &quot;supabase/migrations/05_inventory_policies.sql&quot; in your Supabase SQL Editor if testing in dev mode.
              </p>
            </div>
          </div>
        )}

        {/* Main Table Card */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {/* Controls Bar: Search & Filters */}
          <div className="border-b border-zinc-200 p-4 bg-zinc-50/50 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search by Name or SKU */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by SKU or item name..."
                className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-9 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filters & Sorting */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-medium text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock Status Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value as any)}
                  className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-medium text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All Stock Statuses</option>
                  <option value="low_stock">⚠️ Low Stock (≤ Reorder)</option>
                  <option value="out_of_stock">❌ Out of Stock (0 units)</option>
                  <option value="in_stock">✅ Healthy Stock</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-medium text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="sku_asc">SKU (A-Z)</option>
                  <option value="stock_desc">Highest Stock</option>
                  <option value="stock_asc">Lowest Stock</option>
                  <option value="value_desc">Highest Inventory Value</option>
                </select>
              </div>

              {/* Reset filter */}
              {(searchQuery || categoryFilter !== 'all' || stockStatusFilter !== 'all' || sortBy !== 'name_asc') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setCategoryFilter('all')
                    setStockStatusFilter('all')
                    setSortBy('name_asc')
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Inventory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    SKU & Product Name
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Stock Level
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Stock Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Cost Price
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Retail Price
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Total Valuation
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-28 rounded bg-zinc-200 mb-1" />
                        <div className="h-3 w-44 rounded bg-zinc-100" />
                      </td>
                      <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-zinc-200" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 w-16 rounded bg-zinc-200 ml-auto" /></td>
                      <td className="px-6 py-4"><div className="h-5 w-20 rounded-full bg-zinc-200" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 w-16 rounded bg-zinc-200 ml-auto" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 w-16 rounded bg-zinc-200 ml-auto" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 w-20 rounded bg-zinc-200 ml-auto" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-6 w-20 rounded bg-zinc-200 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => {
                    const stock = Number(product.stock_quantity) || 0
                    const reorder = Number(product.reorder_level) || 0
                    const cost = Number(product.cost_price) || 0
                    const price = Number(product.unit_price) || 0
                    const valuation = stock * cost

                    const isOutOfStock = stock <= 0
                    const isLowStock = !isOutOfStock && stock <= reorder

                    return (
                      <tr
                        key={product.id}
                        className={`transition-colors ${
                          isOutOfStock
                            ? 'bg-red-50/30 hover:bg-red-50/50'
                            : isLowStock
                            ? 'bg-amber-50/30 hover:bg-amber-50/50'
                            : 'hover:bg-zinc-50/70'
                        }`}
                      >
                        {/* SKU & Product Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {product.sku}
                            </span>
                          </div>
                          <p className="font-semibold text-zinc-900 mt-1 max-w-sm truncate">
                            {product.item_name}
                          </p>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4 text-xs font-medium text-zinc-600">
                          {product.category || 'General Supplies'}
                        </td>

                        {/* Stock Level & Reorder threshold */}
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-zinc-900 text-sm">
                            {stock.toLocaleString()}
                          </span>
                          <p className="text-[11px] text-zinc-400">Min: {reorder}</p>
                        </td>

                        {/* Stock Status Badge */}
                        <td className="px-6 py-4">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">
                              <XCircle className="h-3 w-3" /> Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                              <AlertTriangle className="h-3 w-3" /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" /> In Stock
                            </span>
                          )}
                        </td>

                        {/* Cost Price */}
                        <td className="px-6 py-4 text-right font-medium text-zinc-600">
                          {formatCurrency(cost)}
                        </td>

                        {/* Retail Unit Price */}
                        <td className="px-6 py-4 text-right font-medium text-zinc-900">
                          {formatCurrency(price)}
                        </td>

                        {/* Total Valuation */}
                        <td className="px-6 py-4 text-right font-bold text-zinc-900">
                          {formatCurrency(valuation)}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Quick Adjust Button */}
                            <button
                              type="button"
                              onClick={() => setAdjustingProduct(product)}
                              className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition shadow-xs"
                              title="Quick stock adjustment"
                            >
                              <Boxes className="h-3.5 w-3.5" />
                              <span>Adjust</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(product)
                                setIsProductModalOpen(true)
                              }}
                              className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50 transition"
                              title="Edit product catalog item"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product)}
                              className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-400 hover:text-red-600 hover:bg-zinc-50 transition"
                              title="Delete product"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  // Empty state
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                        {searchQuery ? (
                          <Search className="h-6 w-6" />
                        ) : (
                          <Package className="h-6 w-6" />
                        )}
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-zinc-900">
                        {searchQuery
                          ? 'No matching catalog items found'
                          : 'No inventory items registered yet'}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                        {searchQuery
                          ? `No items match "${searchQuery}". Try a different product name, SKU, or category.`
                          : 'Begin tracking warehouse stock, media rolls, inks, and retail items by adding your first product.'}
                      </p>
                      <div className="mt-4">
                        {searchQuery ? (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Clear search
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(null)
                              setIsProductModalOpen(true)
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add First Product</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="border-t border-zinc-200 px-6 py-3 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing <span className="font-semibold text-zinc-700">{filteredProducts.length}</span> of{' '}
              <span className="font-semibold text-zinc-700">{products.length}</span> inventory items
            </span>
            <span className="text-[11px] text-zinc-400">
              JAPA Core Multi-Store Inventory Engine
            </span>
          </div>
        </div>
      </div>

      {/* Product Form Modal (Add / Edit) */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false)
          setEditingProduct(null)
        }}
        onSuccess={handleProductSaved}
        productToEdit={editingProduct}
      />

      {/* Quick Adjust Stock Modal */}
      <StockAdjustmentModal
        product={adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        onSuccess={handleStockAdjusted}
      />
    </DashboardShell>
  )
}
