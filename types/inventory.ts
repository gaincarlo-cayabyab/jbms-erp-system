export type StockStatusTab = 'available' | 'reserved' | 'in_transit' | 'quarantine'

export interface ProductItem {
  id: string
  sku: string
  item_name: string
  barcode?: string | null
  category: string | null
  tab?: string | null
  brand?: string | null
  unit_price: number
  cost_price: number
  stock_quantity: number // Available stock (S_avail)
  reserved_stock: number // S_res
  in_transit_stock: number // S_trans
  quarantine_stock: number // S_audit
  reorder_level: number
  created_at: string
}

export interface ProductFormData {
  sku: string
  item_name: string
  barcode?: string
  category: string
  tab?: string
  brand?: string
  unit_price: number | string
  cost_price: number | string
  stock_quantity: number | string
  reserved_stock?: number | string
  in_transit_stock?: number | string
  quarantine_stock?: number | string
  reorder_level: number | string
}

export interface StockAdjustmentData {
  product_id: string
  adjustment_target: 'available' | 'reserved' | 'in_transit' | 'quarantine'
  adjustment_type: 'add' | 'subtract' | 'set'
  quantity: number
  reason: string
}
