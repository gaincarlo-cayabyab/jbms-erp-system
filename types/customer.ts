export interface Customer {
  id: string
  name: string
  contact_number: string | null
  email: string | null
  address: string | null
  credit_limit: number
  balance: number
  created_at: string
}

export interface CustomerFormData {
  name: string
  contact_number: string
  email: string
  address: string
  credit_limit: string | number
}

