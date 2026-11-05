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

export const DEFAULT_POS_PRODUCTS: POSProduct[] = [
  {
    id: 'prod-001',
    sku: 'DRL-001',
    item_name: 'Industrial Power Drill',
    category: 'Hardware',
    unit_price: 4500,
    cost_price: 3200,
    stock_quantity: 18,
    reorder_level: 5,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prod-002',
    sku: 'SD-002',
    item_name: 'Heavy Duty Screwdriver Set',
    category: 'Hardware',
    unit_price: 450,
    cost_price: 280,
    stock_quantity: 35,
    reorder_level: 10,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prod-003',
    sku: 'APP-001',
    item_name: 'Sublimation Dry-Fit Jersey',
    category: 'Fast Moving',
    unit_price: 650,
    cost_price: 350,
    stock_quantity: 140,
    reorder_level: 25,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prod-004',
    sku: 'ELC-001',
    item_name: 'High-Speed POS Router Node',
    category: 'Electronics',
    unit_price: 2800,
    cost_price: 2100,
    stock_quantity: 12,
    reorder_level: 3,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prod-005',
    sku: 'MAT-001',
    item_name: 'Glossy Printable Vinyl Roll (50m)',
    category: 'Promos',
    unit_price: 3200,
    cost_price: 2400,
    stock_quantity: 26,
    reorder_level: 8,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prod-006',
    sku: 'INK-001',
    item_name: 'Eco-Solvent CMYK Ink 1L',
    category: 'Hardware',
    unit_price: 1250,
    cost_price: 900,
    stock_quantity: 40,
    reorder_level: 10,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prod-007',
    sku: 'APP-002',
    item_name: 'Sublimated ID Lanyard 1-Inch',
    category: 'Fast Moving',
    unit_price: 45,
    cost_price: 20,
    stock_quantity: 450,
    reorder_level: 50,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prod-008',
    sku: 'EQP-001',
    item_name: 'Commercial Heat Press Machine 16x24',
    category: 'Hardware',
    unit_price: 18500,
    cost_price: 14500,
    stock_quantity: 6,
    reorder_level: 2,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prod-009',
    sku: 'ELC-002',
    item_name: 'Wireless Barcode Scanner 2D',
    category: 'Electronics',
    unit_price: 1850,
    cost_price: 1200,
    stock_quantity: 15,
    reorder_level: 4,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prod-010',
    sku: 'MAT-002',
    item_name: 'Cotton Spun Yarn T-Shirt Blanks',
    category: 'Fast Moving',
    unit_price: 180,
    cost_price: 110,
    stock_quantity: 320,
    reorder_level: 60,
    created_at: '2026-01-01T00:00:00Z',
  },
]

