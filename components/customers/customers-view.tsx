'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import DashboardShell from '@/components/dashboard-shell'
import CustomerSummaryCards from './customer-summary-cards'
import CustomerFormModal from './customer-form-modal'
import { getLoyaltyBadge } from '@/components/pos/pos-customer-selector'
import { createClient } from '@/lib/supabase/client'
import { Customer, LoyaltyTier } from '@/types/customer'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  X,
  Receipt,
  Crown,
  Star,
  Building2,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CustomersView() {
  const searchParams = useSearchParams()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'has_balance' | 'zero_balance'>('all')
  const [tierFilter, setTierFilter] = useState<'all' | 'VIP Loyal' | 'Repeat Buyer' | 'New Customer' | 'Corporate'>('all')
  const [sortBy, setSortBy] = useState<'highest_spend' | 'most_orders' | 'name_asc' | 'balance_desc' | 'newest'>('highest_spend')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Check URL params e.g. /customers?new=true
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true)
    }
  }, [searchParams])

  // Fetch customers from Supabase
  const loadCustomers = async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      setCustomers((data as Customer[]) || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch customer data.'
      setFetchError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  // Realtime subscription for customer profile updates from POS checkouts
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('customers-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        () => { loadCustomers() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Handle successful customer creation
  const handleCustomerCreated = async (newCustomer: Customer) => {
    toast.success(`Customer "${newCustomer.name}" registered successfully.`)
    await loadCustomers()
  }

  // Search & Filter Logic
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      // Search by name or contact number (also email)
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        cust.name?.toLowerCase().includes(q) ||
        cust.contact_number?.toLowerCase().includes(q) ||
        cust.email?.toLowerCase().includes(q)

      if (!matchesSearch) return false

      // Loyalty tier filter
      if (tierFilter !== 'all') {
        if (tierFilter === 'Corporate') {
          const isCorp = cust.customer_type === 'Corporate' || cust.customer_type === 'Reseller' || cust.customer_type === 'Government' || cust.loyalty_tier === 'Corporate'
          if (!isCorp) return false
        } else if (cust.loyalty_tier !== tierFilter) {
          return false
        }
      }

      // Balance status filter
      const balance = Number(cust.balance) || 0
      if (balanceFilter === 'has_balance') {
        return balance > 0
      }
      if (balanceFilter === 'zero_balance') {
        return balance <= 0
      }

      return true
    }).sort((a, b) => {
      if (sortBy === 'highest_spend') return (Number(b.total_spent) || 0) - (Number(a.total_spent) || 0)
      if (sortBy === 'most_orders') return (Number(b.total_orders) || 0) - (Number(a.total_orders) || 0)
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '')
      if (sortBy === 'balance_desc') return (Number(b.balance) || 0) - (Number(a.balance) || 0)
      // default newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [customers, searchQuery, tierFilter, balanceFilter, sortBy])

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(Number(val) || 0)
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <DashboardShell>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                CRM & Customer Management
              </h1>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                Module 5
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Manage client records, repeat buyer loyalty tiers, purchase history, and uncollected order balances.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  loadCustomers()
                })
              }}
              disabled={isLoading || isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition disabled:opacity-50"
              title="Refresh Customer Records"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Direct Link to Cashier POS */}
            <Link
              href="/pos"
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 transition active:scale-95"
              title="Open POS Terminal for retail checkout"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>🛒 Open POS Cashier</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition active:scale-95"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <CustomerSummaryCards customers={customers} isLoading={isLoading} />

        {/* Database Connection Notice if error occurred */}
        {fetchError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to fetch customer records from Supabase</p>
              <p className="mt-0.5 text-xs text-red-700">{fetchError}</p>
            </div>
          </div>
        )}

        {/* Main Content Area: Search, Filters, and Table */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="border-b border-zinc-200 p-4 bg-zinc-50/50 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input (Name or Phone number) */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers by name, phone, or email..."
                className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-9 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filters & Sorting */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Loyalty Tier Filter */}
              <div className="flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as any)}
                  className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-semibold text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All Loyalty Tiers</option>
                  <option value="VIP Loyal">⭐ VIP Loyal (10+ orders / ₱25k+)</option>
                  <option value="Repeat Buyer">🔁 Repeat Buyer (2-9 orders / ₱5k+)</option>
                  <option value="New Customer">🌱 New Customer (1st order)</option>
                  <option value="Corporate">🏢 Corporate & Resellers</option>
                </select>
              </div>

              {/* Balance Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={balanceFilter}
                  onChange={(e) => setBalanceFilter(e.target.value as any)}
                  className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-medium text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All Balance Statuses</option>
                  <option value="has_balance">With Unpaid Balance (&gt; ₱0)</option>
                  <option value="zero_balance">Fully Paid / Settled (₱0)</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-medium text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="highest_spend">Highest Lifetime Spend</option>
                  <option value="most_orders">Most Orders Placed</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="balance_desc">Highest Balance Due</option>
                  <option value="newest">Newest Registered</option>
                </select>
              </div>

              {/* Reset filter button if active */}
              {(searchQuery || tierFilter !== 'all' || balanceFilter !== 'all' || sortBy !== 'highest_spend') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setTierFilter('all')
                    setBalanceFilter('all')
                    setSortBy('highest_spend')
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Customer / Client
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Contact & Type
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Loyalty Standing
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Orders & Lifetime Spend
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Pending Balance
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Last Visit
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {isLoading ? (
                  // Skeleton loader rows
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-36 rounded bg-zinc-200 mb-1.5" />
                        <div className="h-3 w-24 rounded bg-zinc-100" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-28 rounded bg-zinc-200 mb-1.5" />
                        <div className="h-3 w-32 rounded bg-zinc-100" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-24 rounded-full bg-zinc-200" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="h-4 w-20 rounded bg-zinc-200 ml-auto mb-1" />
                        <div className="h-3 w-16 rounded bg-zinc-100 ml-auto" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="h-4 w-16 rounded bg-zinc-200 ml-auto" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="h-3 w-20 rounded bg-zinc-200 ml-auto" />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="h-6 w-16 rounded bg-zinc-200 mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => {
                    const balance = Number(customer.balance) || 0
                    const totalSpent = Number(customer.total_spent) || 0
                    const totalOrders = Number(customer.total_orders) || 0
                    const badgeInfo = getLoyaltyBadge(customer.loyalty_tier, customer.customer_type)

                    return (
                      <tr
                        key={customer.id}
                        className="hover:bg-zinc-50/70 transition-colors"
                      >
                        {/* Name & Email */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-700 shadow-2xs">
                              {customer.name?.charAt(0).toUpperCase() || 'C'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-zinc-900 truncate">
                                {customer.name}
                              </p>
                              {customer.email ? (
                                <a
                                  href={`mailto:${customer.email}`}
                                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-600 truncate mt-0.5"
                                >
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate">{customer.email}</span>
                                </a>
                              ) : (
                                <span className="text-[11px] text-zinc-400">No email registered</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact & Classification */}
                        <td className="px-6 py-4">
                          <div className="text-xs space-y-0.5">
                            <div className="flex items-center gap-2">
                              {customer.contact_number ? (
                                <a
                                  href={`tel:${customer.contact_number}`}
                                  className="flex items-center gap-1 font-mono font-medium text-zinc-800 hover:text-blue-600"
                                >
                                  <Phone className="h-3 w-3 text-zinc-400" />
                                  <span>{customer.contact_number}</span>
                                </a>
                              ) : (
                                <span className="text-zinc-400">No phone</span>
                              )}

                              {customer.customer_type && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                                  {customer.customer_type}
                                </span>
                              )}
                            </div>

                            {customer.address && (
                              <p className="flex items-center gap-1.5 text-zinc-500 truncate max-w-xs text-[11px]">
                                <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                                <span className="truncate">{customer.address}</span>
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Loyalty Tier Badge */}
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border',
                              badgeInfo.badgeClass
                            )}
                          >
                            <badgeInfo.icon className={cn('h-3.5 w-3.5', badgeInfo.iconColor)} />
                            <span>{badgeInfo.label}</span>
                          </span>
                        </td>

                        {/* Orders & Lifetime Spend */}
                        <td className="px-6 py-4 text-right">
                          <p className="font-extrabold text-zinc-900">
                            {formatCurrency(totalSpent)}
                          </p>
                          <p className="text-[11px] text-zinc-500 font-medium">
                            {totalOrders} {totalOrders === 1 ? 'completed order' : 'completed orders'}
                          </p>
                        </td>

                        {/* Outstanding Balance */}
                        <td className="px-6 py-4 text-right">
                          {balance > 0 ? (
                            <div>
                              <span className="font-bold text-rose-600">
                                {formatCurrency(balance)}
                              </span>
                              <p className="text-[10px] text-rose-500 font-semibold">
                                Pending pickup / release
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              Clear / Settled
                            </span>
                          )}
                        </td>

                        {/* Date Registered / Last Visit */}
                        <td className="px-6 py-4 text-right text-xs text-zinc-500">
                          <p className="font-medium text-zinc-700">
                            {customer.last_order_date ? formatDate(customer.last_order_date) : formatDate(customer.created_at)}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            Reg: {formatDate(customer.created_at)}
                          </p>
                        </td>

                        {/* Quick POS Action */}
                        <td className="px-6 py-4 text-center">
                          <Link
                            href="/pos"
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs active:scale-95"
                            title={`Ring up counter sale for ${customer.name}`}
                          >
                            <ShoppingBag className="h-3 w-3" />
                            <span>POS</span>
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  // Empty State
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                        {searchQuery ? (
                          <Search className="h-6 w-6" />
                        ) : (
                          <Users className="h-6 w-6" />
                        )}
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-zinc-900">
                        {searchQuery ? 'No matching customers found' : 'No customers registered yet'}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                        {searchQuery
                          ? `No customer profiles match "${searchQuery}". Try searching with a different name or phone number.`
                          : 'Register clients or ring up counter sales with loyalty tracking in the Cashier POS.'}
                      </p>
                      <div className="mt-4">
                        {searchQuery ? (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Clear search
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition"
                          >
                            <UserPlus className="h-4 w-4" />
                            <span>Add First Customer</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Customer Count */}
          <div className="border-t border-zinc-200 px-6 py-3 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing <span className="font-semibold text-zinc-700">{filteredCustomers.length}</span> of{' '}
              <span className="font-semibold text-zinc-700">{customers.length}</span> client accounts
            </span>
            {filteredCustomers.length > 0 && (
              <span className="text-[11px] text-zinc-400">
                JAPA Core CRM • Real-time POS Loyalty Sync
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Customer Creation Modal */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCustomerCreated}
      />
    </DashboardShell>
  )
}
