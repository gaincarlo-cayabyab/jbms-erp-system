'use client'

import { TrendingUp, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { SalesOrder } from '@/types/sales'

interface SalesSummaryCardsProps {
  orders: SalesOrder[]
  isLoading?: boolean
}

export default function SalesSummaryCards({
  orders,
  isLoading = false,
}: SalesSummaryCardsProps) {
  // 1. Total Revenue (Paid orders)
  const paidOrders = orders.filter((o) => o.payment_status === 'Paid')
  const totalRevenue = paidOrders.reduce(
    (sum, o) => sum + (Number(o.total_amount) || 0),
    0
  )

  // 2. Pending Quotes / Orders (Draft or Pending)
  const pendingQuotes = orders.filter(
    (o) => o.order_status === 'Draft' || o.order_status === 'Pending'
  )
  const pendingQuotesValue = pendingQuotes.reduce(
    (sum, o) => sum + (Number(o.total_amount) || 0),
    0
  )

  // 3. Paid vs Unpaid Orders
  const unpaidOrders = orders.filter((o) => o.payment_status !== 'Paid')
  const totalCount = orders.length
  const paidPercentage = totalCount > 0 ? Math.round((paidOrders.length / totalCount) * 100) : 0

  // 4. Total Pipeline Value (All orders)
  const totalPipelineValue = orders.reduce(
    (sum, o) => sum + (Number(o.total_amount) || 0),
    0
  )

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(val)
  }

  const cards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      subtitle: `${paidOrders.length} settled & paid orders`,
      icon: TrendingUp,
      color: 'bg-emerald-600',
    },
    {
      title: 'Pending Quotes',
      value: pendingQuotes.length.toString(),
      subtitle: `${formatCurrency(pendingQuotesValue)} in pipeline`,
      icon: FileText,
      color: 'bg-amber-500',
    },
    {
      title: 'Paid vs. Unpaid Orders',
      value: `${paidOrders.length} Paid / ${unpaidOrders.length} Unpaid`,
      subtitle: `${paidPercentage}% collection rate (${unpaidOrders.length} pending collection)`,
      icon: CheckCircle2,
      color: 'bg-blue-600',
      showProgress: true,
      progressPercent: paidPercentage,
    },
    {
      title: 'Total Pipeline Value',
      value: formatCurrency(totalPipelineValue),
      subtitle: `${totalCount} total orders & quotations`,
      icon: Clock,
      color: 'bg-indigo-600',
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
                  <div className="mt-2 h-8 w-28 animate-pulse rounded bg-zinc-200" />
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

            {/* Progress bar for Paid vs Unpaid */}
            {card.showProgress && !isLoading && totalCount > 0 && (
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${card.progressPercent}%` }}
                  />
                </div>
              </div>
            )}

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

