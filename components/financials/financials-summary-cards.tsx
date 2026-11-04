'use client'

import { TrendingUp, TrendingDown, DollarSign, Receipt, CreditCard, AlertCircle } from 'lucide-react'

interface FinancialsSummaryCardsProps {
  grossRevenue: number
  totalExpenses: number
  accountsReceivable: number
  paidOrdersCount: number
  unpaidOrdersCount: number
  isLoading?: boolean
}

export default function FinancialsSummaryCards({
  grossRevenue,
  totalExpenses,
  accountsReceivable,
  paidOrdersCount,
  unpaidOrdersCount,
  isLoading = false,
}: FinancialsSummaryCardsProps) {
  const netProfit = grossRevenue - totalExpenses
  const isProfitable = netProfit >= 0

  const profitMargin =
    grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(val)
  }

  const cards = [
    {
      title: 'Gross Revenue',
      value: formatCurrency(grossRevenue),
      subtitle: `${paidOrdersCount} collected sales orders`,
      icon: TrendingUp,
      color: 'bg-emerald-600',
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(totalExpenses),
      subtitle: 'Materials, utilities, logistics & operations',
      icon: Receipt,
      color: 'bg-rose-600',
    },
    {
      title: 'Net Profit',
      value: formatCurrency(netProfit),
      subtitle: isProfitable
        ? `${profitMargin}% operating margin (Profitable)`
        : 'Net loss recorded for current period',
      icon: isProfitable ? DollarSign : TrendingDown,
      color: isProfitable ? 'bg-blue-600' : 'bg-red-600',
      highlightProfit: true,
    },
    {
      title: 'Pending Accounts Receivable',
      value: formatCurrency(accountsReceivable),
      subtitle: `${unpaidOrdersCount} pending / partial client invoices`,
      icon: AlertCircle,
      color: accountsReceivable > 0 ? 'bg-amber-600' : 'bg-zinc-600',
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
                  <p
                    className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl truncate ${
                      card.highlightProfit
                        ? isProfitable
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                        : 'text-zinc-900'
                    }`}
                  >
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
