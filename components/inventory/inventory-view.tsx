'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import DashboardShell from '@/components/dashboard-shell'
import InventorySummaryCards from './inventory-summary-cards'
import ProductFormModal from './product-form-modal'
import StockAdjustmentModal from './stock-adjustment-modal'
import { createClient } from '@/lib/supabase/client'
import { ProductItem, StockStatusTab } from '@/types/inventory'
import { parseProductPresentation } from '@/lib/product-presentation'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useBranch } from '@/lib/branch-context'
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
  Eye,
  Receipt,
  ArrowLeftRight,
  Clock,
  Truck,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react'

const CATALOG_TABS = [
  'ALL',
  'APPAREL BRAND',
  'DIGITAL CONSUMABLE',
  'SILKSCREEN SUPPLIES',
  'SUBLIMATION APPARELS',
  'MEDIA SUPPLY',
]

const INVENTORY_SIZE_PILLS = ['All', 'XS', 'SM', 'MD', 'LG', 'XL', '2XL', '3XL', '4XL', '5XL']

function extractSizeFromSku(sku: string, name: string): string | null {
  const src = `${sku} ${name}`.toUpperCase()
  for (const sz of ['6XL', '5XL', '4XL', '3XL', '2XL', '2XS', 'XS', 'SM', 'MD', 'LG', 'XL']) {
    if (new RegExp(`(^|[-/\\s])${sz}([-/\\s]|$)`).test(src)) return sz
  }
  return null
}

export default function InventoryView() {
  const { activeBranchId, activeBranch } = useBranch()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<ProductItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Filters
  const [activeCatalogTab, setActiveCatalogTab] = useState<string>('ALL')
  const [stockStatusTab, setStockStatusTab] = useState<'all' | StockStatusTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'name_asc' | 'sku_asc' | 'stock_asc' | 'stock_desc' | 'audit_desc' | 'value_desc'>('name_asc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sizeFilter, setSizeFilter] = useState('All')

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null)
  const [adjustingProduct, setAdjustingProduct] = useState<ProductItem | null>(null)
  const [isDetailedView, setIsDetailedView] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  const [isPending, startTransition] = useTransition()
  const confirm = useConfirm()

  // Batch delete selected items
  const handleBatchDelete = async () => {
    if (selectedProductIds.length === 0) return
    const confirmed = await confirm({
      title: `Delete ${selectedProductIds.length} Selected Products?`,
      message: 'This will permanently remove these catalog items and branch stock records from the database. Any past sales orders will be safely preserved for financial auditing.',
      confirmText: 'Delete Items',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('products_and_inventory')
        .delete()
        .in('id', selectedProductIds)

      if (error) throw new Error(error.message)

      setSelectedProductIds([])
      toast.success(`Successfully deleted ${selectedProductIds.length} product(s). (Sales history preserved)`)
      await loadProducts()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete selected products'
      toast.error(`Error deleting products: ${msg}`)
    }
  }

  // URL query check (e.g. /inventory?new=true or /inventory?status=low_stock)
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsProductModalOpen(true)
    }
    const statusParam = searchParams.get('status') as StockStatusTab | null
    if (
      statusParam &&
      ['available', 'low_stock', 'out_of_stock', 'reserved', 'in_transit', 'quarantine'].includes(statusParam)
    ) {
      setStockStatusTab(statusParam)
    }
  }, [searchParams])

  // Load ALL products using 3 parallel batches (overcomes Supabase 1000-row PostgREST cap)
  const loadProducts = async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const supabase = createClient()

      // Fetch all 3 ranges simultaneously (~200ms vs ~600ms sequential)
      const [b1, b2, b3] = await Promise.all([
        supabase.from('products_and_inventory').select('*').order('sku', { ascending: true }).range(0, 999),
        supabase.from('products_and_inventory').select('*').order('sku', { ascending: true }).range(1000, 1999),
        supabase.from('products_and_inventory').select('*').order('sku', { ascending: true }).range(2000, 2999),
      ])

      if (b1.error) throw new Error(b1.error.message)

      let prods = [
        ...(b1.data || []),
        ...(b2.data || []),
        ...(b3.data || []),
      ] as ProductItem[]

      // If viewing a specific branch, apply branch-level inventory_stock numbers
      if (activeBranchId !== 'all') {
        const [sb1, sb2, sb3] = await Promise.all([
          supabase.from('inventory_stock')
            .select('product_id, quantity_on_hand, reserved_quantity, in_transit_quantity, quarantine_quantity, reorder_level')
            .eq('branch_id', activeBranchId).range(0, 999),
          supabase.from('inventory_stock')
            .select('product_id, quantity_on_hand, reserved_quantity, in_transit_quantity, quarantine_quantity, reorder_level')
            .eq('branch_id', activeBranchId).range(1000, 1999),
          supabase.from('inventory_stock')
            .select('product_id, quantity_on_hand, reserved_quantity, in_transit_quantity, quarantine_quantity, reorder_level')
            .eq('branch_id', activeBranchId).range(2000, 2999),
        ])

        const branchStocks = [...(sb1.data || []), ...(sb2.data || []), ...(sb3.data || [])]
        if (branchStocks.length > 0) {
          const bsMap = new Map(branchStocks.map((s) => [s.product_id, s]))
          prods = prods.map((p) => {
            const bs = bsMap.get(p.id)
            if (bs) {
              return {
                ...p,
                stock_quantity: bs.quantity_on_hand ?? p.stock_quantity,
                reserved_stock: bs.reserved_quantity ?? p.reserved_stock,
                in_transit_stock: bs.in_transit_quantity ?? p.in_transit_stock,
                quarantine_stock: bs.quarantine_quantity ?? p.quarantine_stock,
                reorder_level: bs.reorder_level ?? p.reorder_level,
              }
            }
            return p
          })
        }
      }

      setProducts(prods)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch inventory catalog.'
      setFetchError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [activeBranchId])

  // Supabase Realtime — auto-refresh inventory when stock changes from any source (POS, edits, etc.)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('inventory-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products_and_inventory' },
        () => { loadProducts() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_stock' },
        () => { loadProducts() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId])

  // Handle saved product (create or edit)
  const handleProductSaved = async (savedProduct: ProductItem, isEdit: boolean) => {
    if (isEdit) {
      toast.success(`Product "${savedProduct.item_name}" updated successfully.`)
    } else {
      toast.success(`Product "${savedProduct.item_name}" added to catalog.`)
    }
    await loadProducts()
  }

  // Handle stock adjustment
  const handleStockAdjusted = async (updatedProduct: ProductItem) => {
    toast.success(`Stock for "${updatedProduct.item_name}" updated.`)
    await loadProducts()
  }

  // Handle delete product — warns if sales history exists (FK is SET NULL, audit trail preserved)
  const handleDeleteProduct = async (product: ProductItem) => {
    const supabase = createClient()

    // Check if product has sales history
    const { count: salesCount } = await supabase
      .from('sales_order_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', product.id)

    const hasSalesHistory = (salesCount ?? 0) > 0

    const ok = await confirm({
      title: `Delete "${product.item_name}"?`,
      message: hasSalesHistory
        ? `This product appears in ${salesCount} sales order line item(s). The sales records will be preserved (product reference will be cleared), but the product will be removed from the catalog and all branch stock records. This action cannot be reversed.`
        : `Are you sure you want to delete SKU: ${product.sku}? This will remove it from the catalog and all branch stock records. This action cannot be reversed.`,
      confirmText: 'Delete Product',
      variant: 'danger',
    })
    if (!ok) return

    try {
      const { error } = await supabase
        .from('products_and_inventory')
        .delete()
        .eq('id', product.id)

      if (error) throw new Error(error.message)

      toast.success(`Product "${product.item_name}" deleted.${hasSalesHistory ? ' Sales history preserved.' : ''}`)
      await loadProducts()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete product'
      toast.error(`Error deleting product: ${msg}`)
    }
  }

  // Derived filter options
  const availableBrands = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.brand) set.add(p.brand)
    })
    return Array.from(set).sort()
  }, [products])

  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (activeCatalogTab === 'ALL' || p.tab === activeCatalogTab) {
        if (p.category) set.add(p.category)
      }
    })
    return Array.from(set).sort()
  }, [products, activeCatalogTab])

  // Count items by catalog tab
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: products.length }
    CATALOG_TABS.slice(1).forEach((t) => (counts[t] = 0))
    products.forEach((p) => {
      if (p.tab && counts[p.tab] !== undefined) {
        counts[p.tab]++
      }
    })
    return counts
  }, [products])

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Catalog Tab Filter
        if (activeCatalogTab !== 'ALL' && p.tab !== activeCatalogTab) {
          return false
        }

        // Plain Business Stock Status Filter
        const avail = Number(p.stock_quantity) || 0
        const reorder = Number(p.reorder_level) || 10
        if (stockStatusTab === 'available') {
          if (avail <= 0) return false
        } else if (stockStatusTab === 'low_stock') {
          if (avail <= 0 || avail > reorder) return false
        } else if (stockStatusTab === 'out_of_stock') {
          if (avail > 0) return false
        } else if (stockStatusTab === 'reserved') {
          if ((Number(p.reserved_stock) || 0) <= 0) return false
        } else if (stockStatusTab === 'in_transit') {
          if ((Number(p.in_transit_stock) || 0) <= 0) return false
        } else if (stockStatusTab === 'quarantine') {
          if ((Number(p.quarantine_stock) || 0) <= 0) return false
        }

        // Category Filter
        if (categoryFilter !== 'all' && p.category !== categoryFilter) {
          return false
        }

        // Brand Filter
        if (brandFilter !== 'all' && p.brand !== brandFilter) {
          return false
        }

        // Size Filter
        if (sizeFilter !== 'All') {
          const sz = extractSizeFromSku(p.sku, p.item_name)
          if (sz !== sizeFilter) return false
        }

        // Search Query (SKU, Clean Title, Variant Specs, Name, Barcode, Category, Brand)
        const q = searchQuery.toLowerCase().trim()
        if (q) {
          const parsed = parseProductPresentation(p)
          const matchSku = p.sku.toLowerCase().includes(q)
          const matchName = p.item_name.toLowerCase().includes(q)
          const matchCleanTitle = parsed.title.toLowerCase().includes(q)
          const matchDetails = parsed.variantDetails.toLowerCase().includes(q)
          const matchBarcode = p.barcode?.toLowerCase().includes(q)
          const matchCat = p.category?.toLowerCase().includes(q)
          const matchBrand = p.brand?.toLowerCase().includes(q)
          if (!matchSku && !matchName && !matchCleanTitle && !matchDetails && !matchBarcode && !matchCat && !matchBrand) {
            return false
          }
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.item_name.localeCompare(b.item_name)
        if (sortBy === 'sku_asc') return a.sku.localeCompare(b.sku)
        if (sortBy === 'stock_desc') return (Number(b.stock_quantity) || 0) - (Number(a.stock_quantity) || 0)
        if (sortBy === 'stock_asc') return (Number(a.stock_quantity) || 0) - (Number(b.stock_quantity) || 0)
        if (sortBy === 'audit_desc') return (Number(b.quarantine_stock) || 0) - (Number(a.quarantine_stock) || 0)
        if (sortBy === 'value_desc') {
          const valA = (Number(a.stock_quantity) || 0) * (Number(a.cost_price) || 0)
          const valB = (Number(b.stock_quantity) || 0) * (Number(b.cost_price) || 0)
          return valB - valA
        }
        return 0
      })
  }, [products, activeCatalogTab, stockStatusTab, categoryFilter, brandFilter, sizeFilter, searchQuery, sortBy])

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeCatalogTab, stockStatusTab, categoryFilter, brandFilter, sizeFilter, searchQuery, sortBy])

  // Paginated items
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [filteredProducts, currentPage, pageSize])

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
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Multi-Store Inventory & Products
              </h1>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                Module 4 · Standardized
              </span>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                📍 {activeBranch.shortCode} — {activeBranch.name.split('(')[0].trim()}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Live multi-tab catalog: 2,556 standardized SKUs across apparel brands, digital consumables, and supplies.
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/transfers"
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 shadow-2xs hover:bg-blue-100 transition active:scale-95"
              title="Manage Inter-Branch Stock Transfers (STO)"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span>Stock Transfers</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  loadProducts()
                })
              }}
              disabled={isLoading || isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition disabled:opacity-50"
              title="Refresh Inventory"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Add New Record */}
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null)
                setIsProductModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add New Record</span>
            </button>

            {/* Link to POS */}
            <Link
              href="/pos"
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 transition active:scale-95"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>🛒 Cashier POS</span>
            </Link>

            {/* Batch Delete */}
            <button
              type="button"
              onClick={handleBatchDelete}
              disabled={selectedProductIds.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete {selectedProductIds.length > 0 ? `(${selectedProductIds.length})` : ''}</span>
            </button>

            {/* Toggle Detailed View */}
            <button
              type="button"
              onClick={() => setIsDetailedView((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-slate-900 transition active:scale-95"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{isDetailedView ? 'Standard View' : 'Detailed View'}</span>
            </button>

            {/* Quick Batch Edit */}
            <button
              type="button"
              onClick={() => {
                const ids = paginatedProducts.map((p) => p.id)
                setSelectedProductIds(ids)
              }}
              disabled={paginatedProducts.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-bold text-violet-700 shadow-2xs hover:bg-violet-100 transition active:scale-95 disabled:opacity-40"
              title="Select all products on current page for batch operations"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Quick Batch Edit</span>
            </button>
          </div>
        </div>

        {/* Metric Cards (Blueprint 1.2) */}
        <InventorySummaryCards products={products} isLoading={isLoading} />

        {/* Error Notice */}
        {fetchError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to fetch products from Supabase</p>
              <p className="mt-0.5 text-xs text-red-700">{fetchError}</p>
            </div>
          </div>
        )}

        {/* Catalog Classification Tabs (APPAREL BRAND, DIGITAL CONSUMABLE, etc.) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATALOG_TABS.map((tab) => {
            const count = tabCounts[tab] ?? 0
            const isActive = activeCatalogTab === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveCatalogTab(tab)
                  setCategoryFilter('all')
                  setSizeFilter('All')
                }}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-blue-200'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {count.toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>

        {/* Size Quick-Filter Pills (Apparel Tabs) */}
        {(activeCatalogTab === 'ALL' || activeCatalogTab === 'APPAREL BRAND') && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="shrink-0 text-[10px] font-bold text-zinc-400 uppercase tracking-wider mr-1">Size</span>
            {INVENTORY_SIZE_PILLS.map((sz) => {
              const isActive = sizeFilter === sz
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => { setSizeFilter(sz); setCurrentPage(1) }}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold border transition ${
                    isActive
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:bg-amber-50 hover:border-amber-300'
                  }`}
                >
                  {sz}
                </button>
              )
            })}
          </div>
        )}

        {/* Main Table Card */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {/* Stock Location & Status Sub-Tabs */}
          <div className="border-b border-zinc-200 px-4 pt-3 pb-0 bg-zinc-50/70 flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setStockStatusTab('all')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition ${
                stockStatusTab === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>All Items</span>
            </button>
            <button
              type="button"
              onClick={() => setStockStatusTab('available')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition ${
                stockStatusTab === 'available'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>In Stock</span>
            </button>
            <button
              type="button"
              onClick={() => setStockStatusTab('low_stock')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition ${
                stockStatusTab === 'low_stock'
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>Low Stock</span>
            </button>
            <button
              type="button"
              onClick={() => setStockStatusTab('out_of_stock')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition ${
                stockStatusTab === 'out_of_stock'
                  ? 'border-zinc-800 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <XCircle className="h-3.5 w-3.5 text-zinc-500" />
              <span>Out of Stock</span>
            </button>
            <button
              type="button"
              onClick={() => setStockStatusTab('reserved')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition ${
                stockStatusTab === 'reserved'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-indigo-600" />
              <span>Reserved / Layaway</span>
            </button>
            <button
              type="button"
              onClick={() => setStockStatusTab('quarantine')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition ${
                stockStatusTab === 'quarantine'
                  ? 'border-rose-600 text-rose-700'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <AlertOctagon className="h-3.5 w-3.5 text-rose-600" />
              <span>Damaged / Review</span>
            </button>
          </div>

          {/* Controls Bar: Search & Filters */}
          <div className="border-b border-zinc-200 p-4 bg-zinc-50/50 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by SKU, product name, barcode, brand..."
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

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Brand Filter */}
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-medium text-zinc-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Brands</option>
                  {availableBrands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-medium text-zinc-700 focus:border-blue-500 focus:outline-none max-w-[160px] truncate"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-medium text-zinc-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="sku_asc">SKU (A-Z)</option>
                  <option value="stock_desc">Highest Available Stock</option>
                  <option value="stock_asc">Lowest Available Stock</option>
                  <option value="audit_desc">Highest Audit Variance</option>
                  <option value="value_desc">Highest Stock Value</option>
                </select>
              </div>

              {/* Reset filter */}
              {(searchQuery || categoryFilter !== 'all' || brandFilter !== 'all' || stockStatusTab !== 'all' || activeCatalogTab !== 'ALL' || sizeFilter !== 'All' || sortBy !== 'name_asc') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setCategoryFilter('all')
                    setBrandFilter('all')
                    setStockStatusTab('all')
                    setActiveCatalogTab('ALL')
                    setSizeFilter('All')
                    setSortBy('name_asc')
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1"
                >
                  Reset all
                </button>
              )}
            </div>
          </div>

          {/* Inventory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th scope="col" className="pl-6 pr-2 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={
                        paginatedProducts.length > 0 &&
                        paginatedProducts.every((p) => selectedProductIds.includes(p.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newIds = new Set(selectedProductIds)
                          paginatedProducts.forEach((p) => newIds.add(p.id))
                          setSelectedProductIds(Array.from(newIds))
                        } else {
                          const pageIds = new Set(paginatedProducts.map((p) => p.id))
                          setSelectedProductIds(selectedProductIds.filter((id) => !pageIds.has(id)))
                        }
                      }}
                      className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Product & SKU Details
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Brand & Category
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right">
                    On-Shelf Stock
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center">
                    Allocations
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Status
                  </th>
                  {isDetailedView && (
                    <>
                      <th scope="col" className="px-4 py-3.5 text-right">
                        Cost Price
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-right">
                        Retail Price
                      </th>
                    </>
                  )}
                  <th scope="col" className="px-6 py-3.5 text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="pl-6 pr-2 py-4"><div className="h-4 w-4 rounded bg-zinc-200" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-52 rounded bg-zinc-200" /><div className="h-3 w-28 rounded bg-zinc-100 mt-1" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-24 rounded bg-zinc-200" /></td>
                      <td className="px-4 py-4 text-right"><div className="h-4 w-12 rounded bg-zinc-200 ml-auto" /></td>
                      <td className="px-4 py-4 text-center"><div className="h-4 w-16 rounded bg-zinc-200 mx-auto" /></td>
                      <td className="px-4 py-4"><div className="h-5 w-20 rounded-full bg-zinc-200" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-6 w-20 rounded bg-zinc-200 mx-auto" /></td>
                    </tr>
                  ))
                ) : paginatedProducts.length > 0 ? (
                  paginatedProducts.map((product) => {
                    const avail = Number(product.stock_quantity) || 0
                    const reserved = Number(product.reserved_stock) || 0
                    const inTransit = Number(product.in_transit_stock) || 0
                    const audit = Number(product.quarantine_stock) || 0
                    const reorder = Number(product.reorder_level) || 10
                    const isSelected = selectedProductIds.includes(product.id)
                    const parsed = parseProductPresentation(product)

                    const isOutOfStock = avail <= 0
                    const isLowStock = !isOutOfStock && avail <= reorder

                    return (
                      <tr
                        key={product.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-indigo-50/60'
                            : audit > 0
                            ? 'bg-rose-50/20 hover:bg-rose-50/40'
                            : isOutOfStock
                            ? 'bg-zinc-50/50 hover:bg-zinc-100/60'
                            : isLowStock
                            ? 'bg-amber-50/30 hover:bg-amber-50/50'
                            : 'hover:bg-zinc-50/70'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="pl-6 pr-2 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductIds((prev) => [...prev, product.id])
                              } else {
                                setSelectedProductIds((prev) => prev.filter((id) => id !== product.id))
                              }
                            }}
                            className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        {/* Product & SKU Details (Distinct Title, Variant Specs, & Internal SKU) */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1">
                            {/* 1. Clean Human-Readable Product Name */}
                            <p className="font-bold text-zinc-900 text-sm max-w-lg leading-snug" title={parsed.title}>
                              {parsed.title}
                            </p>

                            {/* 2. Structured Variant Specifications (Color, Size, Fit) */}
                            {parsed.variantDetails ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-900 border border-amber-200/70 px-2 py-0.5 text-[11px] font-semibold">
                                  {parsed.variantDetails}
                                </span>
                              </div>
                            ) : null}

                            {/* 3. Internal Tracking SKU & Classification Tag */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span
                                className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 shadow-2xs"
                                title="Stock Keeping Unit (Internal Alphanumeric Code)"
                              >
                                SKU: {parsed.sku}
                              </span>
                              {product.barcode && (
                                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                                  UPC: {product.barcode}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Brand & Category */}
                        <td className="px-4 py-3.5">
                          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800">
                            {product.brand || 'General'}
                          </span>
                          <p className="text-[11px] text-zinc-500 truncate max-w-[140px] mt-0.5" title={product.category || ''}>
                            {product.category || 'General'}
                          </p>
                        </td>

                        {/* On-Shelf Stock */}
                        <td className="px-4 py-3.5 text-right">
                          <span className={`font-bold text-sm ${avail > 0 ? 'text-emerald-700' : 'text-zinc-400'}`}>
                            {avail.toLocaleString()}
                          </span>
                          <p className="text-[10px] text-zinc-400">Min: {reorder}</p>
                        </td>

                        {/* Allocations (Reserved / Transit / Review) */}
                        <td className="px-4 py-3.5 text-center">
                          {reserved > 0 || inTransit > 0 || audit > 0 ? (
                            <div className="flex flex-col gap-1 items-center">
                              {reserved > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                  📦 {reserved.toLocaleString()} Reserved
                                </span>
                              )}
                              {inTransit > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                  🚚 {inTransit.toLocaleString()} Transit
                                </span>
                              )}
                              {audit > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                  ⚠️ {audit.toLocaleString()} Review
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-300 text-xs font-medium">—</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-3.5">
                          {audit > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                              <AlertOctagon className="h-3 w-3" /> Under Review
                            </span>
                          ) : isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600">
                              <XCircle className="h-3 w-3 text-zinc-400" /> Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                              <AlertTriangle className="h-3 w-3" /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" /> In Stock
                            </span>
                          )}
                        </td>

                        {/* Detailed View columns */}
                        {isDetailedView && (
                          <>
                            <td className="px-4 py-4 text-right font-mono text-xs text-zinc-600">
                              {formatCurrency(product.cost_price)}
                            </td>
                            <td className="px-4 py-4 text-right font-mono text-xs font-semibold text-zinc-900">
                              {formatCurrency(product.unit_price)}
                            </td>
                          </>
                        )}

                        {/* Actions */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Adjust */}
                            <button
                              type="button"
                              onClick={() => setAdjustingProduct(product)}
                              className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition shadow-2xs"
                              title="Adjust stock (Available, Reserved, Transit, Audit)"
                            >
                              <Boxes className="h-3.5 w-3.5" />
                              <span>Adjust</span>
                            </button>

                            {/* Edit */}
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

                            {/* Delete */}
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
                  <tr>
                    <td colSpan={isDetailedView ? 9 : 7} className="px-6 py-12 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                        <Package className="h-6 w-6" />
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-zinc-900">
                        No matching catalog items found
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                        No items match your active filters in {activeCatalogTab}.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="border-t border-zinc-200 px-6 py-3 bg-zinc-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
            <div>
              Showing <span className="font-semibold text-zinc-900">{Math.min(filteredProducts.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
              <span className="font-semibold text-zinc-900">{Math.min(filteredProducts.length, currentPage * pageSize)}</span> of{' '}
              <span className="font-semibold text-zinc-900">{filteredProducts.length.toLocaleString()}</span> products (Total catalog: {products.length.toLocaleString()})
            </div>

            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-zinc-300 bg-white p-1.5 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-zinc-300 bg-white p-1.5 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
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
