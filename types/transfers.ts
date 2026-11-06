export type TransferStatus =
  | 'draft'
  | 'requested'
  | 'dispatched'
  | 'in_transit'
  | 'received'
  | 'variance_flagged'
  | 'cancelled'

export interface StockTransferItem {
  id: string
  transfer_id: string
  product_id: string
  quantity_sent: number
  quantity_received: number
  variance_reason?: string | null
  product?: {
    id: string
    sku: string
    item_name: string
    category?: string | null
  }
}

export interface StockTransfer {
  id: string
  transfer_number: string
  source_branch_id: string
  destination_branch_id: string
  status: TransferStatus
  dispatched_by?: string | null
  received_by?: string | null
  dispatched_at?: string | null
  received_at?: string | null
  notes?: string | null
  created_at: string
  stock_transfer_items?: StockTransferItem[]
}

export interface CreateTransferPayload {
  source_branch_id: string
  destination_branch_id: string
  notes?: string
  items: {
    product_id: string
    quantity_sent: number
  }[]
}

