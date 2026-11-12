export type CustomerType = 'Individual' | 'Corporate' | 'Reseller' | 'Government'
export type LoyaltyTier = 'New Customer' | 'Repeat Buyer' | 'VIP Loyal' | 'Corporate'

export interface Customer {
  id: string
  name: string
  contact_number: string | null
  email: string | null
  address: string | null
  customer_type?: CustomerType
  loyalty_tier?: LoyaltyTier
  total_orders?: number
  total_spent?: number
  last_order_date?: string | null
  allow_credit_terms?: boolean
  credit_limit: number
  balance: number
  created_at: string
}

export interface CustomerFormData {
  name: string
  contact_number: string
  email: string
  address: string
  customer_type?: CustomerType
  allow_credit_terms?: boolean
  credit_limit: string | number
}
