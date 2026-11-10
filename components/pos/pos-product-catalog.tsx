'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  Search,
  Package,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
  Barcode,
  Shirt,
  Sparkles,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { POSProduct, CartItem } from '@/types/pos'
import { handlePosInputFocus } from '@/lib/device-context'
import { playSuccessChime, playErrorBuzz } from '@/lib/sound-effects'
import { parseProductPresentation } from '@/lib/product-presentation'

const PHP = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

// ── Department Cards (replaces horizontal tab strip) ──────────────────────────
const CATALOG_TABS = [
  { key: 'All',                  label: 'All Catalog',          icon: '⚡', color: 'bg-indigo-600' },
  { key: 'APPAREL BRAND',        label: 'Apparel Brands',       icon: '👕', color: 'bg-violet-600' },
  { key: 'DIGITAL CONSUMABLE',   label: 'Digital Consumables',  icon: '🖨️', color: 'bg-blue-600'   },
  { key: 'SILKSCREEN SUPPLIES',  label: 'Silkscreen Supplies',  icon: '🎨', color: 'bg-rose-600'   },
  { key: 'SUBLIMATION APPARELS', label: 'Sublimation',          icon: '🌈', color: 'bg-amber-500'  },
  { key: 'MEDIA SUPPLY',         label: 'Media Supplies',       icon: '📦', color: 'bg-teal-600'   },
]

const APPAREL_BRANDS = [
  'All', 'Smilee', 'Fruit of the Loom', 'Gildan', '3K',
  'AIIZ', 'Blu-Print', 'Winner', 'Simple', 'Tulco', 'Yalex', 'Artix', 'JJ Virgo',
]

const BRAND_COLORS: Record<string, string> = {
  'Smilee': 'bg-blue-50 text-blue-700 border-blue-200',
  'Gildan': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Fruit of the Loom': 'bg-rose-50 text-rose-700 border-rose-200',
  '3K': 'bg-violet-50 text-violet-700 border-violet-200',
  'AIIZ': 'bg-amber-50 text-amber-700 border-amber-200',
  'Blu-Print': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Winner': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Simple': 'bg-teal-50 text-teal-700 border-teal-200',
  'Tulco': 'bg-orange-50 text-orange-700 border-orange-200',
}

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
        const parsed = parseProductPresentation(p)
        const hay = `${parsed.title} ${parsed.variantDetails} ${p.item_name} ${p.sku} ${p.category || ''} ${pBrand || ''}`.toLowerCase()
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
      onAddToCart(hit)
      playSuccessChime()
    } else {
      playErrorBuzz()
    }
    setScanInput('')
  }, [scanInput, products, onAddToCart])

  const startItem = (safePage - 1) * PAGE_SIZE + 1
  const endItem   = Math.min(safePage * PAGE_SIZE, filtered.length)
  const showSizePills = activeTab === 'All' || activeTab === 'APPAREL BRAND'

  return (
    <div className="flex flex-col h-full bg-slate-50 select-none">

      {/* ── Modern High-Contrast Barcode & SKU Scan Dock ─────────────────────── */}
      <div className="px-3.5 py-2.5 bg-white border-b border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg text-slate-700 text-xs font-bold shrink-0">
            <Barcode className="h-4 w-4 text-slate-600" />
            <span className="hidden sm:inline">Scan / SKU</span>
          </div>

          <div className="relative flex-1">
            <input
              ref={scanRef}
              type="text"
              placeholder="Scan barcode gun or type SKU + press Enter (instant add to cart)…"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleScan() }}
              onFocus={handlePosInputFocus}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-3 pr-9 text-xs font-mono font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition"
            />
            {scanInput && (
              <button
                type="button"
                onClick={() => setScanInput('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleScan}
            disabled={!scanInput.trim()}
            className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-40 active:scale-95"
            title="Auto-add scanned product to cart"
          >
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Quick Add</span>
          </button>
        </div>
      </div>

      {/* ── Department Cards ──────────────────────────────────────────────────── */}
      <div className="px-3 py-2.5 bg-white border-b border-slate-200">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {CATALOG_TABS.map((tab) => {
            const count    = tabCounts[tab.key] ?? 0
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => switchTab(tab.key)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-xl border p-2 text-center transition active:scale-95 shadow-2xs',
                  isActive
                    ? `${tab.color} text-white border-transparent`
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                )}
              >
                <span className="text-base leading-none">{tab.icon}</span>
                <span className="text-[9px] font-bold leading-tight mt-0.5 line-clamp-1">{tab.label}</span>
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[8px] font-bold leading-none mt-0.5',
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                )}>
                  {count.toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Brand Drilldown (Apparel only) ──────────────────────────────────── */}
      {activeTab === 'APPAREL BRAND' && (
        <div className="flex gap-1.5 px-3.5 py-2 overflow-x-auto scrollbar-hide bg-slate-50/70 border-b border-slate-200">
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
                  'shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition border shadow-2xs',
                  isActive
                    ? 'bg-violet-600 text-white border-violet-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-violet-50 hover:border-violet-200'
                )}
              >
                {bKey !== 'All' && <Shirt className="h-3 w-3 opacity-70" />}
                <span>{bKey}</span>
                <span className={cn(
                  'rounded-full px-1.5 py-0.2 text-[9px] font-bold leading-none',
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
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 overflow-x-auto scrollbar-hide bg-white border-b border-slate-200">
          <span className="shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Apparel Size:</span>
          {SIZE_PILLS.map((sz) => {
            const isActive = activeSize === sz
            return (
              <button
                key={sz}
                type="button"
                onClick={() => { setActiveSize(sz); setCurrentPage(1) }}
                className={cn(
                  'shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition border shadow-2xs',
                  isActive
                    ? 'bg-amber-500 text-white border-amber-600 shadow-amber-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                )}
              >
                {sz}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Search Bar ──────────────────────────────────────────────────────── */}
      <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={`Filter ${filtered.length.toLocaleString()} items by name, model, color…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={handlePosInputFocus}
            className="w-full rounded-xl border border-slate-300 bg-white py-1.5 pl-8 pr-8 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
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

      {/* ── Product Grid (High Contrast & Deduplicated) ──────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-slate-400 gap-3">
            <Package className="h-12 w-12 opacity-30 text-slate-400" />
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700">No matching catalog items</p>
              <p className="text-xs text-slate-400 mt-0.5">Try selecting another brand or size filter</p>
            </div>
            {(activeTab !== 'All' || activeBrand !== 'All' || activeSize !== 'All' || search) && (
              <button
                type="button"
                onClick={() => { setSearch(''); setActiveTab('All'); setActiveBrand('All'); setActiveSize('All') }}
                className="text-xs text-indigo-600 font-bold hover:text-indigo-800 underline"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {paginated.map((product) => {
              const inCart     = cartMap[product.id] ?? 0
              const availStock = Number(product.stock_quantity) || 0
              const pBrand     = (product as any).brand as string | undefined
              const parsed     = parseProductPresentation(product)
              const sz         = parsed.size || extractSize(product.sku, product.item_name)
              const brandColor = (pBrand && BRAND_COLORS[pBrand]) ? BRAND_COLORS[pBrand] : 'bg-slate-100 text-slate-700 border-slate-200'

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onAddToCart(product)}
                  className={cn(
                    'relative flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all duration-150 min-h-[128px] shadow-xs active:scale-95 group',
                    inCart > 0
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5'
                  )}
                >
                  {/* Top Bar: Brand Pill + Size Pill */}
                  <div className="flex w-full items-center justify-between gap-1 min-w-0">
                    <span className={cn('rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase truncate max-w-[65%] border', brandColor)}>
                      {pBrand || product.category || 'General'}
                    </span>
                    {sz ? (
                      <span className="shrink-0 rounded-md bg-amber-500 text-white px-1.5 py-0.5 text-[9px] font-extrabold shadow-2xs">
                        {sz}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-bold text-slate-400">
                        {(product as any).tab ? (product as any).tab.split(' ')[0] : ''}
                      </span>
                    )}
                  </div>

                  {/* 1. Clean Human-Readable Product Name */}
                  <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2 flex-1 w-full mt-0.5 group-hover:text-indigo-600 transition">
                    {parsed.title}
                  </p>

                  {/* 2. Distinct Variant Details (Color / Specs) */}
                  {parsed.variantDetails ? (
                    <p className="text-[10px] font-semibold text-amber-800 bg-amber-50/80 border border-amber-200/50 px-1.5 py-0.5 rounded truncate max-w-full">
                      {parsed.variantDetails}
                    </p>
                  ) : null}

                  {/* 3. Internal Tracking SKU */}
                  <p className="text-[9px] text-slate-400 font-mono truncate w-full" title={parsed.sku}>
                    SKU: {parsed.sku}
                  </p>

                  {/* Price & Stock Row */}
                  <div className="mt-auto pt-1 w-full flex items-center justify-between gap-1 border-t border-slate-100">
                    <div>
                      {product.unit_price > 0 ? (
                        <p className="text-sm font-extrabold text-indigo-700 tabular-nums">
                          {PHP.format(product.unit_price)}
                        </p>
                      ) : (
                        <span className="inline-block text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          ₱0.00 <span className="font-normal text-slate-400 text-[9px]">(Set)</span>
                        </span>
                      )}
                    </div>

                    {/* Stock readout */}
                    <div>
                      {availStock > 0 ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          ● {availStock} in stock
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          0 Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cart Indicator Badge */}
                  {inCart > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white shadow-md ring-2 ring-white">
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
        <div className="border-t border-slate-200 bg-white px-3.5 py-2 flex items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-slate-600">
            Showing <span className="font-bold text-slate-900">{startItem.toLocaleString()}–{endItem.toLocaleString()}</span>
            {' '}of{' '}
            <span className="font-extrabold text-slate-900">{filtered.length.toLocaleString()}</span> products
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition shadow-2xs"
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
                    <span key={`el-${idx}`} className="px-1 text-xs text-slate-400">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p as number)}
                      className={cn(
                        'h-7 min-w-[28px] rounded-lg text-xs font-bold transition px-1.5',
                        safePage === p
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition shadow-2xs"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
