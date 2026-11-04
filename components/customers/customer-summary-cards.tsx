'use client'

import { Users, UserCheck, AlertCircle, CreditCard } from 'lucide-react'
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

  // Active accounts: customers with active credit line or balance
  const activeAccounts = customers.filter(
    (c) => Number(c.credit_limit) > 0 || Number(c.balance) > 0
  ).length

  // Total outstanding balance across all customers
  const totalOutstandingBalance = customers.reduce(
    (sum, c) => sum + (Number(c.balance) || 0),
    0
  )

  // Total credit extended
  const totalCreditLimit = customers.reduce(
    (sum, c) => sum + (Number(c.credit_limit) || 0),
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
      title: 'Total Customers',
      value: totalCustomers.toString(),
      subtitle: `${activeAccounts} actively transacting`,
      icon: Users,
      color: 'bg-blue-600',
      badgeColor: 'text-blue-700 bg-blue-50',
    },
    {
      title: 'Active Accounts',
      value: activeAccounts.toString(),
      subtitle: `${totalCustomers - activeAccounts} inactive / standard accounts`,
      icon: UserCheck,
      color: 'bg-emerald-600',
      badgeColor: 'text-emerald-700 bg-emerald-50',
    },
    {
      title: 'Total Outstanding Balance',
      value: formatCurrency(totalOutstandingBalance),
      subtitle: 'Pending receivables across customers',
      icon: AlertCircle,
      color: totalOutstandingBalance > 0 ? 'bg-amber-600' : 'bg-zinc-600',
      badgeColor: totalOutstandingBalance > 0 ? 'text-amber-700 bg-amber-50' : 'text-zinc-700 bg-zinc-50',
    },
    {
      title: 'Total Credit Extended',
      value: formatCurrency(totalCreditLimit),
      subtitle: 'Cumulative approved credit limit',
      icon: CreditCard,
      color: 'bg-indigo-600',
      badgeColor: 'text-indigo-700 bg-indigo-50',
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

