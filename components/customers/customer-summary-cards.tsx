'use client'

import { Users, Crown, Wallet, AlertCircle, ShoppingBag } from 'lucide-react'
import { Customer } from '@/types/customer'

interface CustomerSummaryCardsProps {
  customers: Customer[]
  isLoading?: boolean
}

export default function CustomerSummaryCards({
  customers,
  isLoading = false,
}: CustomerSummaryCardsProps) {
  const totalCustomers = customers.length

  // Repeat & Loyal accounts: 2+ orders or VIP / Repeat tier
  const repeatLoyalAccounts = customers.filter(
    (c) =>
      c.loyalty_tier === 'VIP Loyal' ||
      c.loyalty_tier === 'Repeat Buyer' ||
      (Number(c.total_orders) || 0) >= 2
  ).length

  // Total customer lifetime spend (real accumulated revenue)
  const totalLifetimeSpend = customers.reduce(
    (sum, c) => sum + (Number(c.total_spent) || 0),
    0
  )

  // Total outstanding balance across all customer job orders
  const totalOutstandingBalance = customers.reduce(
    (sum, c) => sum + (Number(c.balance) || 0),
    0
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const cards = [
    {
      title: 'Total Client Directory',
      value: totalCustomers.toString(),
      subtitle: `${repeatLoyalAccounts} repeat & loyal regular buyers`,
      icon: Users,
      color: 'bg-blue-600',
    },
    {
      title: 'Repeat & VIP Buyers',
      value: repeatLoyalAccounts.toString(),
      subtitle: totalCustomers > 0
        ? `${Math.round((repeatLoyalAccounts / totalCustomers) * 100)}% retention rate`
        : 'Recognized at POS counter',
      icon: Crown,
      color: 'bg-amber-500',
    },
    {
      title: 'Client Lifetime Spend',
      value: formatCurrency(totalLifetimeSpend),
      subtitle: 'Accumulated revenue from client profiles',
      icon: Wallet,
      color: 'bg-emerald-600',
    },
    {
      title: 'Uncollected Order Balances',
      value: formatCurrency(totalOutstandingBalance),
      subtitle: totalOutstandingBalance > 0
        ? 'Pending balance on downpayments & pickups'
        : 'All customer balances fully settled',
      icon: AlertCircle,
      color: totalOutstandingBalance > 0 ? 'bg-rose-600' : 'bg-slate-600',
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
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {card.title}
                </p>
                {isLoading ? (
                  <div className="mt-2 h-8 w-24 animate-pulse rounded bg-zinc-200" />
                ) : (
                  <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
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
            <div className="mt-4 border-t border-zinc-100 pt-3">
              {isLoading ? (
                <div className="h-3 w-32 animate-pulse rounded bg-zinc-100" />
              ) : (
                <p className="text-xs text-zinc-500">{card.subtitle}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
