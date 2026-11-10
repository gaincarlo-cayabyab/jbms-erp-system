import { Customer } from './customer'

export type OrderType = 'sale' | 'quotation'

export type FulfillmentType = 'walk_in' | 'pickup' | 'delivery'

export type FulfillmentStatus =
  | 'handed_over'       // Over-the-counter walk-in completed
  | 'pending_staging'   // In preparation for pickup
  | 'ready_for_pickup'  // Staged at branch counter ready for client
  | 'picked_up'         // Client picked up & cleared
  | 'pending_dispatch'  // Awaiting courier rider
  | 'out_for_delivery'  // In-transit with rider/carrier
  | 'delivered'         // Confirmed receipt by buyer
  | 'cancelled'         // Order voided
  | 'draft'             // Quotation draft

export type PaymentTerms =
  | 'full_payment'
  | 'downpayment_50'
  | 'custom_deposit'
  | 'pay_on_pickup'
  | 'quotation_unpaid'

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
  sku?: string
  product_id?: string
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

  // Extended Fulfillment & Quotation Attributes
  order_type?: OrderType
  fulfillment_type?: FulfillmentType
  fulfillment_status?: FulfillmentStatus
  payment_terms?: PaymentTerms
  amount_paid?: number
  balance_due?: number
  pickup_date?: string | null
  due_date?: string | null
  recipient_name?: string | null
  recipient_phone?: string | null
  shipping_address?: string | null
  courier_name?: string | null
  tracking_number?: string | null
  shipping_fee?: number
  customer_notes?: string | null
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
  order_type?: OrderType
  fulfillment_type?: FulfillmentType
  fulfillment_status?: FulfillmentStatus
  payment_terms?: PaymentTerms
  amount_paid?: number
  balance_due?: number
  pickup_date?: string
  due_date?: string
  recipient_name?: string
  recipient_phone?: string
  shipping_address?: string
  courier_name?: string
  tracking_number?: string
  shipping_fee?: number
  customer_notes?: string
}
