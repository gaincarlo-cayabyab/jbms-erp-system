'use client'

import { useState } from 'react'
import { X, User, Phone, Mail, MapPin, CreditCard, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Customer, CustomerFormData } from '@/types/customer'

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
    credit_limit: '0',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errorMessage) setErrorMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!formData.name.trim()) {
      setErrorMessage('Customer name is required.')
      return
    }

    const creditLimitNum = parseFloat(String(formData.credit_limit)) || 0
    if (creditLimitNum < 0) {
      setErrorMessage('Credit limit cannot be negative.')
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()

      const payload = {
        name: formData.name.trim(),
        contact_number: formData.contact_number.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        credit_limit: creditLimitNum,
        balance: 0.00,
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([payload])
        .select()
        .single()

      if (error) {
        if (error.code === '42501') {
          throw new Error(
            'Supabase Row-Level Security policy blocked this insert. If testing in development without auth, run the script "supabase/migrations/02_crm_dev_policies.sql" in your Supabase SQL Editor.'
          )
        }
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
              Register a client profile, credit terms, and contact details.
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
                placeholder="e.g. Apex Prints & Graphics Co."
                className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              />
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
                  className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
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

          {/* Credit Limit */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Credit Limit (PHP ₱)
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
                placeholder="0.00"
                className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Set max credit allowed before orders require full advance payment. Default is 0.00.
            </p>
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

