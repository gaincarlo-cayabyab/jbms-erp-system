export interface ProductItem {
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

export interface ProductFormData {
  sku: string
  item_name: string
  category: string
  unit_price: number | string
  cost_price: number | string
  stock_quantity: number | string
  reorder_level: number | string
}

export interface StockAdjustmentData {
  product_id: string
  adjustment_type: 'add' | 'subtract' | 'set'
  quantity: number
  reason: string
}

