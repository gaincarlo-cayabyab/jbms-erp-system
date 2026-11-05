'use client'

import { useState, useMemo } from 'react'
import { Search, Package, AlertTriangle, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { POSProduct, CartItem } from '@/types/pos'

const PHP = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

const CATEGORIES = ['All', 'Fast Moving', 'Hardware', 'Electronics', 'Promos', 'Others']

interface Props {
  products: POSProduct[]
  isLoading: boolean
  onAddToCart: (product: POSProduct) => void
  cartItems: CartItem[]
}

export default function POSProductCatalog({ products, isLoading, onAddToCart, cartItems }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const cartMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of cartItems) {
      map[item.product.id] = item.quantity
    }
    return map
  }, [cartItems])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.item_name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      const matchCat =
        activeCategory === 'All' ||
        (activeCategory === 'Others' && (!p.category || !['fast moving', 'hardware', 'electronics', 'promos'].includes(p.category.toLowerCase()))) ||
        (p.category?.toLowerCase() === activeCategory.toLowerCase())
      return matchSearch && matchCat
    })
  }, [products, search, activeCategory])

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="px-3 py-3 border-b border-slate-200 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search product name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        {/* Category Tabs */}
        <div className="flex gap-1 mt-2.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                activeCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <Package className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filtered.map((product) => {
              const inCart = cartMap[product.id] ?? 0
              const outOfStock = product.stock_quantity <= 0

              return (
                <button
                  key={product.id}
                  onClick={() => onAddToCart(product)}
                  disabled={outOfStock}
                  className={cn(
                    'relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all duration-150 min-h-[120px] active:scale-95',
                    outOfStock
                      ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                      : inCart > 0
                      ? 'border-indigo-300 bg-indigo-50 shadow-md hover:shadow-lg hover:border-indigo-400'
                      : 'border-slate-200 bg-white shadow-xs hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5'
                  )}
                >
                  {/* Category badge */}
                  {product.category && (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 uppercase">
                      {product.category}
                    </span>
                  )}

                  {/* Product name */}
                  <p className="text-xs font-semibold text-slate-900 leading-tight line-clamp-2 flex-1">
                    {product.item_name}
                  </p>

                  {/* SKU */}
                  <p className="text-[10px] text-slate-400 font-mono">{product.sku}</p>

                  {/* Price */}
                  <p className="text-sm font-bold text-indigo-700">{PHP.format(product.unit_price)}</p>

                  {/* Stock badge */}
                  <div className="flex items-center gap-1">
                    {outOfStock ? (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-rose-600">
                        <AlertTriangle className="h-3 w-3" /> Out of Stock
                      </span>
                    ) : product.stock_quantity <= product.reorder_level ? (
                      <span className="text-[10px] font-semibold text-amber-600">
                        Low: {product.stock_quantity} left
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Stock: {product.stock_quantity}</span>
                    )}
                  </div>

                  {/* Cart indicator */}
                  {inCart > 0 && (
                    <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-sm">
                      {inCart}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer count */}
      <div className="px-3 py-2 border-t border-slate-100 bg-white text-[11px] text-slate-400 flex items-center gap-1.5">
        <ShoppingCart className="h-3.5 w-3.5" />
        <span>{filtered.length} products • {products.filter(p => p.stock_quantity > 0).length} in stock</span>
      </div>
    </div>
  )
}

