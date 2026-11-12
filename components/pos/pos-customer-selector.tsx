'use client'

import { useState, useEffect, useRef } from 'react'
import {
  User,
  Search,
  UserPlus,
  X,
  Check,
  Star,
  RefreshCw,
  Phone,
  Building2,
  Crown,
  ChevronDown,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Customer, CustomerType, LoyaltyTier } from '@/types/customer'
import { cn } from '@/lib/utils'

const PHP = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

interface Props {
  selectedCustomer: Customer | null
  onSelectCustomer: (customer: Customer | null) => void
  compact?: boolean
}

export function getLoyaltyBadge(tier?: LoyaltyTier | string, type?: CustomerType | string) {
  if (type === 'Corporate' || type === 'Reseller' || type === 'Government') {
    return {
      label: type === 'Corporate' ? 'Corporate' : type === 'Reseller' ? 'Reseller' : 'Govt Account',
      icon: Building2,
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      iconColor: 'text-purple-600',
    }
  }

  switch (tier) {
    case 'VIP Loyal':
      return {
        label: 'VIP Loyal ⭐',
        icon: Crown,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs',
        iconColor: 'text-amber-500',
      }
    case 'Repeat Buyer':
      return {
        label: 'Repeat Buyer 🔁',
        icon: Star,
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        iconColor: 'text-blue-500',
      }
    default:
      return {
        label: 'New Customer',
        icon: User,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        iconColor: 'text-slate-500',
      }
  }
}

export default function POSCustomerSelector({
  selectedCustomer,
  onSelectCustomer,
  compact = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)

  // Quick Add Form State
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newType, setNewType] = useState<CustomerType>('Individual')
  const [isSaving, setIsSaving] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load / search customers
  const fetchCustomers = async (q: string) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      let query = supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true })
        .limit(20)

      if (q.trim()) {
        const clean = q.trim()
        query = query.or(`name.ilike.%${clean}%,contact_number.ilike.%${clean}%`)
      }

      const { data, error } = await query
      if (!error && data) {
        setCustomers(data as Customer[])
      }
    } catch (err) {
      console.warn('Customer search error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchCustomers(searchQuery)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen, searchQuery])

  // Handle Quick Add Customer
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      toast.error('Customer name is required.')
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()
      const newTier: LoyaltyTier =
        newType === 'Corporate' || newType === 'Reseller' || newType === 'Government'
          ? 'Corporate'
          : 'New Customer'

      const payload = {
        name: newName.trim(),
        contact_number: newPhone.trim() || null,
        customer_type: newType,
        loyalty_tier: newTier,
        total_orders: 0,
        total_spent: 0,
        balance: 0,
        credit_limit: 0,
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([payload])
        .select()
        .single()

      if (error) throw new Error(error.message)

      const saved = data as Customer
      toast.success(`Registered & attached "${saved.name}" to cart!`)
      onSelectCustomer(saved)
      setIsQuickAddOpen(false)
      setIsOpen(false)
      setNewName('')
      setNewPhone('')
      setNewType('Individual')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register customer.'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const badgeInfo = selectedCustomer
    ? getLoyaltyBadge(selectedCustomer.loyalty_tier, selectedCustomer.customer_type)
    : null

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* ── Active Customer Card / Trigger ── */}
      <div
        className={cn(
          'flex items-center justify-between border rounded-xl transition bg-white select-none',
          selectedCustomer
            ? 'border-indigo-200 bg-indigo-50/40 px-3 py-2'
            : 'border-slate-200 px-3 py-1.5 hover:border-slate-300'
        )}
      >
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center gap-2.5 text-left min-w-0"
        >
          <div
            className={cn(
              'h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border text-xs font-bold',
              selectedCustomer
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            )}
          >
            {selectedCustomer ? (
              selectedCustomer.name.charAt(0).toUpperCase()
            ) : (
              <User className="h-4 w-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-900 truncate">
                {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
              </span>

              {badgeInfo && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.2 rounded-full border',
                    badgeInfo.badgeClass
                  )}
                >
                  {badgeInfo.label}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 truncate mt-0.2">
              {selectedCustomer ? (
                <>
                  {selectedCustomer.contact_number ? (
                    <span className="font-mono text-slate-600 mr-2">
                      📞 {selectedCustomer.contact_number}
                    </span>
                  ) : null}
                  <span className="text-indigo-600 font-semibold">
                    {selectedCustomer.total_orders || 0} orders •{' '}
                    {PHP.format(Number(selectedCustomer.total_spent) || 0)}
                  </span>
                </>
              ) : (
                'Standard retail counter checkout • Tap to attach loyal client'
              )}
            </p>
          </div>

          <ChevronDown
            className={cn(
              'h-4 w-4 text-slate-400 shrink-0 transition-transform',
              isOpen ? 'rotate-180 text-indigo-600' : ''
            )}
          />
        </button>

        {selectedCustomer ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelectCustomer(null)
              toast.info('Switched back to General Walk-in Customer')
            }}
            className="ml-2 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Clear customer (Revert to Walk-in)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsQuickAddOpen(true)
            }}
            className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-2 py-1 rounded-lg transition shadow-2xs shrink-0"
            title="Register new customer"
          >
            <UserPlus className="h-3 w-3" />
            <span className="hidden sm:inline">+ Quick Add</span>
          </button>
        )}
      </div>

      {/* ── Dropdown Search & Customer List ── */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by client name or phone number..."
                className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                setIsQuickAddOpen(true)
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-xl transition shadow-2xs shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>+ New</span>
            </button>
          </div>

          {/* List Options */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {/* Walk-in Customer Option */}
            <button
              type="button"
              onClick={() => {
                onSelectCustomer(null)
                setIsOpen(false)
              }}
              className={cn(
                'w-full flex items-center justify-between p-2.5 text-left transition hover:bg-slate-50',
                !selectedCustomer ? 'bg-indigo-50/60' : ''
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Walk-in Customer (General)</p>
                  <p className="text-[10px] text-slate-400">Anonymous cash & carry counter sale</p>
                </div>
              </div>
              {!selectedCustomer && <Check className="h-4 w-4 text-indigo-600" />}
            </button>

            {/* Queried Customer Accounts */}
            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                <span>Searching customer database...</span>
              </div>
            ) : customers.length > 0 ? (
              customers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id
                const tierInfo = getLoyaltyBadge(c.loyalty_tier, c.customer_type)

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelectCustomer(c)
                      setIsOpen(false)
                      toast.success(`Attached "${c.name}" to cart (${tierInfo.label})`)
                    }}
                    className={cn(
                      'w-full flex items-center justify-between p-2.5 text-left transition hover:bg-indigo-50/40',
                      isSelected ? 'bg-indigo-50/70' : ''
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="h-7 w-7 rounded-lg bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {c.name}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-bold px-1.5 py-0.2 rounded-full border',
                              tierInfo.badgeClass
                            )}
                          >
                            {tierInfo.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          {c.contact_number && (
                            <span className="font-mono text-slate-600">
                              📞 {c.contact_number}
                            </span>
                          )}
                          <span className="text-indigo-600 font-medium">
                            {c.total_orders || 0} orders
                          </span>
                          <span>•</span>
                          <span>{PHP.format(Number(c.total_spent) || 0)} spent</span>

                          {Number(c.balance) > 0 && (
                            <span className="text-amber-700 font-semibold bg-amber-50 px-1 rounded border border-amber-200">
                              Bal: {PHP.format(Number(c.balance))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && <Check className="h-4 w-4 text-indigo-600 shrink-0 ml-2" />}
                  </button>
                )
              })
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs font-semibold text-slate-700">No matching customers found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Register &quot;{searchQuery}&quot; as a new regular customer in 5 seconds.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewName(searchQuery)
                    setIsOpen(false)
                    setIsQuickAddOpen(true)
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Register &quot;{searchQuery}&quot;</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5-Second Quick Add Customer Modal ── */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Quick Register Customer
                  </h3>
                  <p className="text-[11px] text-slate-500">Auto-link to POS sale & CRM</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Add Form */}
            <form onSubmit={handleQuickAdd} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Customer / Company Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Juan Dela Cruz or Apex Graphics"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile / Contact Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="e.g. 0917-123-4567"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Customer Classification
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Individual', 'Corporate', 'Reseller', 'Government'] as CustomerType[]).map(
                    (t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewType(t)}
                        className={cn(
                          'py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition',
                          newType === t
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        {t}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-2xs disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Save & Attach to Sale</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

