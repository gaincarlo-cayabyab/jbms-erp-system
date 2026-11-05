// ─── POS / Cashier Types ──────────────────────────────────────────────────────

export interface POSProduct {
  id: string
  sku: string
  item_name: string
  category: string | null
  unit_price: number
  cost_price: number
  stock_quantity: number
  reorder_level: number
  created_at: string
}

export interface CartItem {
  product: POSProduct
  quantity: number
  unitPrice: number       // may differ from product.unit_price after override
  lineDiscount: number    // fixed-amount discount applied to this line
}

export type DiscountType = 'percentage' | 'fixed' | 'senior_pwd'

export interface CartDiscount {
  type: DiscountType
  value: number          // % for percentage, PHP amount for fixed/senior_pwd
  label: string
}

export type PaymentMethod = 'CASH' | 'GCASH' | 'CARD' | 'BANK_TRANSFER'

export interface Transaction {
  id: string
  invoiceNo: string
  branchName: string
  cashierName: string
  items: CartItem[]
  subtotal: number
  totalDiscount: number
  vatAmount: number
  grandTotal: number
  amountTendered: number
  changeDue: number
  paymentMethod: PaymentMethod
  createdAt: Date
}

