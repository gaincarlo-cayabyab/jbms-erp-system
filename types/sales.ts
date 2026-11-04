import { Customer } from './customer'

export type OrderStatus =
  | 'Draft'
  | 'Pending'
  | 'Approved'
  | 'Invoiced'
  | 'Confirmed'
  | 'In_Production'
  | 'Ready'
  | 'Delivered'
  | 'Cancelled'

export type PaymentStatus = 'Pending' | 'Partial' | 'Paid' | 'Overdue'

export interface OrderLineItem {
  id: string
  item_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface SalesOrder {
  id: string
  order_number: string
  customer_id: string | null
  total_amount: number
  payment_status: PaymentStatus
  order_status: OrderStatus
  branch: string | null
  created_at: string
  customers?: Customer | null
  // Optional client-side or persisted line items
  items?: OrderLineItem[]
}

export interface OrderFormData {
  order_number: string
  customer_id: string
  order_status: OrderStatus
  payment_status: PaymentStatus
  branch: string
  line_items: Array<{
    item_name: string
    quantity: number
    unit_price: number
  }>
}

