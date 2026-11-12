'use client'

import { useState } from 'react'
import { X, User, Phone, Mail, MapPin, Building2, CreditCard, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Customer, CustomerFormData, CustomerType } from '@/types/customer'

interface CustomerFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newCustomer: Customer) => void
}

export default function CustomerFormModal({
  isOpen,
  onClose,
  onSuccess,
}: CustomerFormModalProps) {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    contact_number: '',
    email: '',
    address: '',
    customer_type: 'Individual',
    allow_credit_terms: false,
    credit_limit: '0',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
    if (errorMessage) setErrorMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!formData.name.trim()) {
      setErrorMessage('Customer name is required.')
      return
    }

    const creditLimitNum = formData.allow_credit_terms ? parseFloat(String(formData.credit_limit)) || 0 : 0
    if (creditLimitNum < 0) {
      setErrorMessage('Credit limit cannot be negative.')
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const newType = formData.customer_type || 'Individual'
      const initialTier = (newType === 'Corporate' || newType === 'Reseller' || newType === 'Government')
        ? 'Corporate'
        : 'New Customer'

      const payload = {
        name: formData.name.trim(),
        contact_number: formData.contact_number.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        customer_type: newType,
        loyalty_tier: initialTier,
        allow_credit_terms: Boolean(formData.allow_credit_terms),
        credit_limit: creditLimitNum,
        balance: 0.00,
        total_orders: 0,
        total_spent: 0.00,
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([payload])
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('A customer with this email address already exists.')
        }
        throw new Error(error.message || 'Failed to create customer record.')
      }

      // Success
      onSuccess(data as Customer)
      // Reset form
      setFormData({
        name: '',
        contact_number: '',
        email: '',
        address: '',
        customer_type: 'Individual',
        allow_credit_terms: false,
        credit_limit: '0',
      })
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50/50">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Add New Customer</h2>
            <p className="text-xs text-zinc-500">
              Register a client profile, contact directory, and loyalty tracking.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <p className="font-semibold">Unable to save customer</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Customer / Company Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Juan Dela Cruz or Apex Prints Co."
                className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>

          {/* Customer Classification */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Account Classification
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Individual', 'Corporate', 'Reseller', 'Government'] as CustomerType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, customer_type: type }))}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition ${
                    formData.customer_type === type
                      ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Number & Email */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Contact Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  placeholder="+63 912 345 6789"
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@company.com"
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Billing & Delivery Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <textarea
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                placeholder="Unit, Street, Barangay, City, Province"
                className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition resize-none"
              />
            </div>
          </div>

          {/* Optional B2B Credit Terms Toggle */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-800">
                  Allow B2B Terms / Purchase Order Credit
                </p>
                <p className="text-[11px] text-zinc-500">
                  Optional for verified corporate & government billing terms. Default is standard Downpayment + Pickup.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="allow_credit_terms"
                  checked={Boolean(formData.allow_credit_terms)}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {formData.allow_credit_terms && (
              <div className="pt-2 border-t border-zinc-200/80 animate-in fade-in duration-150">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Credit Limit Ceiling (PHP ₱)
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="number"
                    name="credit_limit"
                    min="0"
                    step="500"
                    value={formData.credit_limit}
                    onChange={handleChange}
                    placeholder="e.g. 50000"
                    className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Customer...
                </>
              ) : (
                'Save Customer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
