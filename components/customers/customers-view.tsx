'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import DashboardShell from '@/components/dashboard-shell'
import CustomerSummaryCards from './customer-summary-cards'
import CustomerFormModal from './customer-form-modal'
import { createClient } from '@/lib/supabase/client'
import { Customer } from '@/types/customer'
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
  FileSpreadsheet,
} from 'lucide-react'

export default function CustomersView() {
  const searchParams = useSearchParams()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'has_balance' | 'zero_balance' | 'over_limit'>('all')
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'balance_desc' | 'newest'>('newest')
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

  // Handle successful customer creation
  const handleCustomerCreated = (newCustomer: Customer) => {
    setCustomers((prev) => [newCustomer, ...prev])
    toast.success(`Customer "${newCustomer.name}" registered successfully.`)
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

      // Balance status filter
      const balance = Number(cust.balance) || 0
      const limit = Number(cust.credit_limit) || 0

      if (balanceFilter === 'has_balance') {
        return balance > 0
      }
      if (balanceFilter === 'zero_balance') {
        return balance <= 0
      }
      if (balanceFilter === 'over_limit') {
        return limit > 0 && balance > limit
      }

      return true
    }).sort((a, b) => {
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '')
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '')
      if (sortBy === 'balance_desc') return (Number(b.balance) || 0) - (Number(a.balance) || 0)
      // default newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [customers, searchQuery, balanceFilter, sortBy])

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(Number(val) || 0)
  }

  const formatDate = (dateStr: string) => {
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
                Module 1
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Manage client records, contact directories, credit limits, and outstanding account balances.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  loadCustomers()
                })
              }}
              disabled={isLoading || isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 transition disabled:opacity-50"
              title="Refresh Customer Records"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
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
              <p className="mt-2 text-xs text-red-600">
                Make sure you have run the initial schema migration in your Supabase SQL editor.
              </p>
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
              {/* Balance Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={balanceFilter}
                  onChange={(e) => setBalanceFilter(e.target.value as any)}
                  className="rounded-lg border border-zinc-300 bg-white py-1.5 px-2.5 text-xs font-medium text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All Accounts</option>
                  <option value="has_balance">With Balance (&gt; ₱0)</option>
                  <option value="zero_balance">Zero Balance</option>
                  <option value="over_limit">Over Credit Limit</option>
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
                  <option value="newest">Newest First</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="balance_desc">Highest Balance</option>
                </select>
              </div>

              {/* Reset filter button if active */}
              {(searchQuery || balanceFilter !== 'all' || sortBy !== 'newest') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setBalanceFilter('all')
                    setSortBy('newest')
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
                    Contact & Location
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Credit Limit
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Outstanding Balance
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Account Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Registered
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
                      <td className="px-6 py-4 text-right">
                        <div className="h-4 w-16 rounded bg-zinc-200 ml-auto" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="h-4 w-16 rounded bg-zinc-200 ml-auto" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-20 rounded-full bg-zinc-200" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="h-3 w-20 rounded bg-zinc-200 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => {
                    const balance = Number(customer.balance) || 0
                    const creditLimit = Number(customer.credit_limit) || 0
                    const isOverLimit = creditLimit > 0 && balance > creditLimit

                    return (
                      <tr
                        key={customer.id}
                        className="hover:bg-zinc-50/70 transition-colors"
                      >
                        {/* Name & Email */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                              {customer.name?.charAt(0).toUpperCase() || 'C'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-zinc-900 truncate">
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
                                <span className="text-[11px] text-zinc-400">No email</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact & Address */}
                        <td className="px-6 py-4">
                          <div className="text-xs">
                            {customer.contact_number ? (
                              <a
                                href={`tel:${customer.contact_number}`}
                                className="flex items-center gap-1.5 font-medium text-zinc-800 hover:text-blue-600"
                              >
                                <Phone className="h-3 w-3 text-zinc-400" />
                                <span>{customer.contact_number}</span>
                              </a>
                            ) : (
                              <span className="text-zinc-400">No phone</span>
                            )}
                            {customer.address && (
                              <p className="flex items-center gap-1.5 text-zinc-500 truncate max-w-xs mt-0.5">
                                <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                                <span className="truncate">{customer.address}</span>
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Credit Limit */}
                        <td className="px-6 py-4 text-right font-medium text-zinc-700">
                          {formatCurrency(creditLimit)}
                        </td>

                        {/* Outstanding Balance */}
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`font-semibold ${
                              isOverLimit
                                ? 'text-red-600'
                                : balance > 0
                                ? 'text-amber-700'
                                : 'text-zinc-700'
                            }`}
                          >
                            {formatCurrency(balance)}
                          </span>
                        </td>

                        {/* Account Status Badge */}
                        <td className="px-6 py-4">
                          {isOverLimit ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                              <AlertTriangle className="h-3 w-3" />
                              Over Limit
                            </span>
                          ) : balance > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                              With Balance
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              Clear / Paid
                            </span>
                          )}
                        </td>

                        {/* Date Registered */}
                        <td className="px-6 py-4 text-right text-xs text-zinc-500">
                          {formatDate(customer.created_at)}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  // Empty State
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
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
                          : 'Get started by creating your first client record with contact information and credit terms.'}
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
              <span className="font-semibold text-zinc-700">{customers.length}</span> customer accounts
            </span>
            {filteredCustomers.length > 0 && (
              <span className="text-[11px] text-zinc-400">
                JAPA Core CRM • Real-time Supabase sync
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

