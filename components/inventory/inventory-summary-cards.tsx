'use client'

import { Package, CheckCircle2, Clock, Truck, AlertOctagon } from 'lucide-react'
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

  // Available Stock (S_avail)
  const totalAvailableUnits = products.reduce((sum, p) => sum + (Number(p.stock_quantity) || 0), 0)

  // Reserved Stock (S_res)
  const totalReservedUnits = products.reduce((sum, p) => sum + (Number(p.reserved_stock) || 0), 0)

  // In-Transit Stock (S_trans)
  const totalInTransitUnits = products.reduce((sum, p) => sum + (Number(p.in_transit_stock) || 0), 0)

  // Quarantine / Audit Stock (S_audit)
  const totalQuarantineUnits = products.reduce((sum, p) => sum + (Number(p.quarantine_stock) || 0), 0)

  const cards = [
    {
      title: 'Total Catalog SKUs',
      value: totalProducts.toLocaleString(),
      subtitle: `${totalAvailableUnits.toLocaleString()} units available on shelves`,
      icon: Package,
      color: 'bg-indigo-600',
    },
    {
      title: 'Available Stock (S_avail)',
      value: totalAvailableUnits.toLocaleString(),
      subtitle: 'Ready for immediate POS checkout',
      icon: CheckCircle2,
      color: 'bg-emerald-600',
    },
    {
      title: 'Reserved Stock (S_res)',
      value: totalReservedUnits.toLocaleString(),
      subtitle: 'Allocated to pending job orders & layaways',
      icon: Clock,
      color: 'bg-amber-600',
    },
    {
      title: 'In-Transit & Audit (S_audit)',
      value: (totalInTransitUnits + totalQuarantineUnits).toLocaleString(),
      subtitle: `${totalInTransitUnits.toLocaleString()} in transit · ${totalQuarantineUnits.toLocaleString()} audit review`,
      icon: AlertOctagon,
      color: totalQuarantineUnits > 0 ? 'bg-rose-600' : 'bg-blue-600',
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
