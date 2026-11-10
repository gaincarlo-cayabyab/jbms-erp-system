'use client'

import { Package, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { ProductItem } from '@/types/inventory'

interface InventorySummaryCardsProps {
  products: ProductItem[]
  isLoading?: boolean
}

export default function InventorySummaryCards({
  products,
  isLoading = false,
}: InventorySummaryCardsProps) {
  const totalProducts = products.length

  // Available Stock
  const totalAvailableUnits = products.reduce((sum, p) => sum + (Number(p.stock_quantity) || 0), 0)

  // Low Stock Items (avail > 0 and avail <= reorder_level)
  const lowStockCount = products.filter((p) => {
    const avail = Number(p.stock_quantity) || 0
    const reorder = Number(p.reorder_level) || 10
    return avail > 0 && avail <= reorder
  }).length

  // Out of Stock Items (avail <= 0)
  const outOfStockCount = products.filter((p) => (Number(p.stock_quantity) || 0) <= 0).length

  const cards = [
    {
      title: 'Total Catalog SKUs',
      value: totalProducts.toLocaleString(),
      subtitle: `${totalProducts.toLocaleString()} items across 6 departments`,
      icon: Package,
      color: 'bg-indigo-600',
    },
    {
      title: 'Total Units on Hand',
      value: totalAvailableUnits.toLocaleString(),
      subtitle: totalAvailableUnits === 0 ? 'Ready for physical inventory count' : 'Available on shelves for immediate sale',
      icon: CheckCircle2,
      color: 'bg-emerald-600',
    },
    {
      title: 'Low Stock Alerts',
      value: lowStockCount.toLocaleString(),
      subtitle: `${lowStockCount} items at or below reorder threshold`,
      icon: AlertTriangle,
      color: 'bg-amber-500',
    },
    {
      title: 'Out of Stock Items',
      value: outOfStockCount.toLocaleString(),
      subtitle: `${outOfStockCount} items awaiting physical stock-in`,
      icon: XCircle,
      color: 'bg-rose-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                  {card.title}
                </p>
                {isLoading ? (
                  <div className="mt-2 h-8 w-24 animate-pulse rounded bg-zinc-200" />
                ) : (
                  <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl truncate">
                    {card.value}
                  </p>
                )}
              </div>
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs ${card.color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3 border-t border-zinc-100 pt-3">
              {isLoading ? (
                <div className="h-3 w-32 animate-pulse rounded bg-zinc-100" />
              ) : (
                <p className="text-xs text-zinc-500 truncate">{card.subtitle}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
