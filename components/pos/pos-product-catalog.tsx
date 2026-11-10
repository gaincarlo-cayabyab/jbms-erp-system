'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  Search,
  Package,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
  Barcode,
  Shirt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { POSProduct, CartItem } from '@/types/pos'
import { handlePosInputFocus } from '@/lib/device-context'
import { playSuccessChime, playErrorBuzz } from '@/lib/sound-effects'

const PHP = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

// ── Tabs ──────────────────────────────────────────────────────────────────────
const CATALOG_TABS = [
  { key: 'All',                  label: '⚡ All Products' },
  { key: 'APPAREL BRAND',        label: '👕 Apparel Brands' },
  { key: 'DIGITAL CONSUMABLE',   label: '🖨️ Digital' },
  { key: 'SILKSCREEN SUPPLIES',  label: '🎨 Silkscreen' },
  { key: 'SUBLIMATION APPARELS', label: '🌈 Sublimation' },
  { key: 'MEDIA SUPPLY',         label: '📦 Media' },
]

const APPAREL_BRANDS = [
  'All', 'Smilee', 'Fruit of the Loom', 'Gildan', '3K',
  'AIIZ', 'Blu-Print', 'Winner', 'Simple', 'Tulco', 'Yalex', 'Artix', 'JJ Virgo',
]

const SIZE_PILLS = ['All', 'XS', 'SM', 'MD', 'LG', 'XL', '2XL', '3XL', '4XL', '5XL']

const PAGE_SIZE = 48

// ── Size extractor ────────────────────────────────────────────────────────────
function extractSize(sku: string, name: string): string | null {
  const src = `${sku} ${name}`.toUpperCase()
  for (const sz of ['6XL', '5XL', '4XL', '3XL', '2XL', '2XS', 'XS', 'SM', 'MD', 'LG', 'XL']) {
    if (new RegExp(`(^|[-/\\s])${sz}([-/\\s]|$)`).test(src)) return sz
  }
  return null
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  products: POSProduct[]
  isLoading: boolean
  onAddToCart: (product: POSProduct) => void
  cartItems: CartItem[]
}

export default function POSProductCatalog({
  products,
  isLoading,
  onAddToCart,
  cartItems,
}: Props) {
  const [search, setSearch]           = useState('')
  const [scanInput, setScanInput]     = useState('')
  const [activeTab, setActiveTab]     = useState('All')
  const [activeBrand, setActiveBrand] = useState('All')
  const [activeSize, setActiveSize]   = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const scanRef = useRef<HTMLInputElement>(null)

  // ── Cart lookup ─────────────────────────────────────────────────────────────
  const cartMap = useMemo(() => {
    const m: Record<string, number> = {}
    cartItems.forEach((i) => { m[i.product.id] = i.quantity })
    return m
  }, [cartItems])

  // ── Reset state helpers ─────────────────────────────────────────────────────
  const switchTab = useCallback((tab: string) => {
    setActiveTab(tab)
    setActiveBrand('All')
    setActiveSize('All')
    setCurrentPage(1)
    setSearch('')
  }, [])

  useEffect(() => { setCurrentPage(1) }, [search, activeBrand, activeSize])

  // ── Tab & brand counts ──────────────────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const c: Record<string, number> = { All: products.length }
    products.forEach((p) => {
      const tab = (p as any).tab as string | undefined
      if (tab) c[tab] = (c[tab] || 0) + 1
    })
    return c
  }, [products])

  const brandCounts = useMemo(() => {
    const c: Record<string, number> = { All: 0 }
    products.forEach((p) => {
      if ((p as any).tab !== 'APPAREL BRAND') return
      const br = (p as any).brand as string | undefined
      if (br) { c[br] = (c[br] || 0) + 1; c['All']++ }
    })
    return c
  }, [products])

  // ── Core filtered list ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return products.filter((p) => {
      const pTab   = (p as any).tab   as string | undefined
      const pBrand = (p as any).brand as string | undefined

      if (activeTab !== 'All' && pTab !== activeTab) return false
      if (activeTab === 'APPAREL BRAND' && activeBrand !== 'All' && pBrand !== activeBrand) return false

      if (activeSize !== 'All') {
        const sz = extractSize(p.sku, p.item_name)
        if (sz !== activeSize) return false
      }

      if (q) {
        const hay = `${p.item_name} ${p.sku} ${p.category || ''} ${pBrand || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }

      return true
    })
  }, [products, activeTab, activeBrand, activeSize, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(currentPage, totalPages)

  const paginated = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, safePage])

  // ── SKU/Barcode quick-add ───────────────────────────────────────────────────
  const handleScan = useCallback(() => {
    const q = scanInput.trim().toUpperCase()
    if (!q) return
    const hit = products.find(
      (p) => p.sku.toUpperCase() === q || (p as any).barcode === q
    )
    if (hit) {
      if (hit.stock_quantity <= 0) {
        playErrorBuzz()
      } else {
        onAddToCart(hit)
        playSuccessChime()
      }
    } else {
      playErrorBuzz()
    }
    setScanInput('')
  }, [scanInput, products, onAddToCart])

  const startItem = (safePage - 1) * PAGE_SIZE + 1
  const endItem   = Math.min(safePage * PAGE_SIZE, filtered.length)
  const showSizePills = activeTab === 'All' || activeTab === 'APPAREL BRAND'

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* ── SKU / Barcode Quick-Scan Bar ─────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2.5 bg-gradient-to-r from-indigo-700 to-indigo-900 border-b border-indigo-900">
        <div className="flex items-center gap-2">
          <Barcode className="h-4 w-4 text-indigo-300 shrink-0" />
          <div className="relative flex-1">
            <input
              ref={scanRef}
              type="text"
              placeholder="Scan barcode or type exact SKU + Enter → instant add to cart"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleScan() }}
              onFocus={handlePosInputFocus}
              className="w-full rounded-lg border border-indigo-500/40 bg-indigo-900/60 py-2 pl-3 pr-9 text-xs font-mono text-white placeholder-indigo-300/70 focus:outline-none focus:ring-2 focus:ring-white/25 transition"
            />
            {scanInput && (
              <button
                type="button"
                onClick={() => setScanInput('')}
                className="absolute right-2.5 top-2 text-indigo-300 hover:text-white transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleScan}
            disabled={!scanInput.trim()}
            className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-bold text-indigo-700 shadow hover:bg-indigo-50 transition disabled:opacity-40 active:scale-95"
          >
            <Zap className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Department Tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 px-3 pt-2 pb-2 overflow-x-auto scrollbar-hide border-b border-slate-200 bg-white">
        {CATALOG_TABS.map((tab) => {
          const count    = tabCounts[tab.key] ?? 0
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchTab(tab.key)}
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition whitespace-nowrap',
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none',
                isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-500'
              )}>
                {count.toLocaleString()}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Brand Drilldown (Apparel only) ──────────────────────────────────── */}
      {activeTab === 'APPAREL BRAND' && (
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide bg-white border-b border-slate-100">
          {APPAREL_BRANDS.map((bKey) => {
            const cnt      = brandCounts[bKey] ?? 0
            if (bKey !== 'All' && cnt === 0) return null
            const isActive = activeBrand === bKey
            return (
              <button
                key={bKey}
                type="button"
                onClick={() => { setActiveBrand(bKey); setActiveSize('All'); setCurrentPage(1) }}
                className={cn(
                  'shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition border',
                  isActive
                    ? 'bg-violet-600 text-white border-violet-700 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-violet-50 hover:border-violet-200'
                )}
              >
                {bKey !== 'All' && <Shirt className="h-3 w-3 opacity-60" />}
                <span>{bKey}</span>
                <span className={cn(
                  'rounded-full px-1 text-[9px] font-bold leading-none',
                  isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                )}>
                  {cnt}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Size Quick Pills ─────────────────────────────────────────────────── */}
      {showSizePills && (
        <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto scrollbar-hide bg-slate-50 border-b border-slate-100">
          <span className="shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Size</span>
          {SIZE_PILLS.map((sz) => {
            const isActive = activeSize === sz
            return (
              <button
                key={sz}
                type="button"
                onClick={() => { setActiveSize(sz); setCurrentPage(1) }}
                className={cn(
                  'shrink-0 rounded-md px-2 py-1 text-[11px] font-bold transition border',
                  isActive
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                )}
              >
                {sz}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Search Bar ──────────────────────────────────────────────────────── */}
      <div className="px-3 py-2 bg-white border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${products.length.toLocaleString()} products by name, SKU, brand…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={handlePosInputFocus}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-8 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Product Grid ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
            <Package className="h-10 w-10 opacity-25" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-500">No products found</p>
              <p className="text-xs text-slate-400 mt-0.5">Try adjusting filters or search term</p>
            </div>
            {(activeTab !== 'All' || activeBrand !== 'All' || activeSize !== 'All' || search) && (
              <button
                type="button"
                onClick={() => { setSearch(''); setActiveTab('All'); setActiveBrand('All'); setActiveSize('All') }}
                className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
            {paginated.map((product) => {
              const inCart     = cartMap[product.id] ?? 0
              const outOfStock = product.stock_quantity <= 0
              const isLowStock = !outOfStock && product.stock_quantity <= (product.reorder_level ?? 10)
              const pBrand     = (product as any).brand as string | undefined
              const sz         = extractSize(product.sku, product.item_name)

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => { if (!outOfStock) onAddToCart(product) }}
                  disabled={outOfStock}
                  className={cn(
                    'relative flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-all duration-150 min-h-[110px] active:scale-95',
                    outOfStock
                      ? 'border-slate-200 bg-slate-50 opacity-45 cursor-not-allowed'
                      : inCart > 0
                      ? 'border-indigo-400 bg-indigo-50 shadow-md hover:shadow-lg'
                      : 'border-slate-200 bg-white shadow-xs hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5'
                  )}
                >
                  {/* Brand + size row */}
                  <div className="flex w-full items-center justify-between gap-1 min-w-0">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 uppercase truncate max-w-[65%]">
                      {pBrand || product.category || '—'}
                    </span>
                    {sz && (
                      <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                        {sz}
                      </span>
                    )}
                  </div>

                  {/* Product name */}
                  <p className="text-[11px] font-semibold text-slate-900 leading-tight line-clamp-2 flex-1 w-full">
                    {product.item_name}
                  </p>

                  {/* SKU */}
                  <p className="text-[9px] text-slate-400 font-mono truncate w-full">{product.sku}</p>

                  {/* Price */}
                  <div className="mt-auto w-full flex items-center justify-between gap-1">
                    <p className="text-sm font-bold text-indigo-700">
                      {product.unit_price > 0
                        ? PHP.format(product.unit_price)
                        : <span className="text-xs text-slate-400 font-normal">Price TBD</span>
                      }
                    </p>
                    {/* Stock badge */}
                    {outOfStock ? (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-rose-600">
                        <AlertTriangle className="h-2.5 w-2.5" /> Depleted
                      </span>
                    ) : isLowStock ? (
                      <span className="text-[9px] font-bold text-amber-600">
                        Low: {product.stock_quantity}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-semibold">
                        {product.stock_quantity} in stock
                      </span>
                    )}
                  </div>

                  {/* Cart badge */}
                  {inCart > 0 && (
                    <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow">
                      {inCart}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Pagination Footer ────────────────────────────────────────────────── */}
      {!isLoading && filtered.length > 0 && (
        <div className="border-t border-slate-200 bg-white px-3 py-2 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-500">
            <span className="font-semibold text-slate-800">{startItem.toLocaleString()}–{endItem.toLocaleString()}</span>
            {' '}of{' '}
            <span className="font-bold text-slate-900">{filtered.length.toLocaleString()}</span>
            {filtered.length !== products.length && (
              <span className="text-slate-400"> (total: {products.length.toLocaleString()})</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-0.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, idx) =>
                  p === '…' ? (
                    <span key={`el-${idx}`} className="px-1 text-[11px] text-slate-400">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p as number)}
                      className={cn(
                        'h-6 min-w-[24px] rounded-md text-[11px] font-semibold transition px-1.5',
                        safePage === p
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {p}
                    </button>
                  )
                )}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
