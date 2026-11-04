'use client'

import { Package, DollarSign, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'
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

  // Total Inventory Value (Stock Quantity * Cost Price)
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + (Number(p.stock_quantity) || 0) * (Number(p.cost_price) || 0),
    0
  )

  // Low stock items: stock <= reorder_level and stock > 0
  const lowStockItems = products.filter(
    (p) => Number(p.stock_quantity) > 0 && Number(p.stock_quantity) <= Number(p.reorder_level)
  )

  // Out of stock items: stock <= 0
  const outOfStockItems = products.filter((p) => Number(p.stock_quantity) <= 0)

  // Total units across all products
  const totalUnits = products.reduce((sum, p) => sum + (Number(p.stock_quantity) || 0), 0)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(val)
  }

  const cards = [
    {
      title: 'Total Catalog Products',
      value: totalProducts.toString(),
      subtitle: `${totalUnits.toLocaleString()} units stocked across catalog`,
      icon: Package,
      color: 'bg-blue-600',
    },
    {
      title: 'Total Inventory Value',
      value: formatCurrency(totalInventoryValue),
      subtitle: 'Based on unit cost price valuation',
      icon: DollarSign,
      color: 'bg-emerald-600',
    },
    {
      title: 'Low Stock Alerts',
      value: lowStockItems.length.toString(),
      subtitle:
        lowStockItems.length > 0
          ? `${lowStockItems.length} items at or below reorder threshold`
          : 'All stock levels healthy',
      icon: AlertTriangle,
      color: lowStockItems.length > 0 ? 'bg-amber-600' : 'bg-zinc-600',
    },
    {
      title: 'Out of Stock Items',
      value: outOfStockItems.length.toString(),
      subtitle:
        outOfStockItems.length > 0
          ? `${outOfStockItems.length} items depleted, replenishment required`
          : 'Zero depleted products',
      icon: XCircle,
      color: outOfStockItems.length > 0 ? 'bg-rose-600' : 'bg-teal-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md"
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
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${card.color}`}
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
