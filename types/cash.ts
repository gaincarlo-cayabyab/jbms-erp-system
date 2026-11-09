export type CashAccountType =
  | 'cash_drawer'
  | 'vault'
  | 'bank_checking'
  | 'bank_savings'
  | 'petty_cash'
  | 'ewallet'

export type CashFlowType = 'inflow' | 'outflow'

export type CashPaymentMethod = 'cash' | 'check' | 'bank_transfer' | 'ewallet'

export type CashSourceModule =
  | 'pos'
  | 'sales'
  | 'procurement'
  | 'payroll'
  | 'opex'
  | 'transfer'
  | 'manual'

export interface CashAccount {
  id: string
  branch_id: string
  account_name: string
  account_type: CashAccountType
  account_number: string | null
  currency: string
  current_balance: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CashCategory {
  id: string
  category_name: string
  flow_type: CashFlowType
  description: string | null
  created_at: string
}

export interface CashTransaction {
  id: string
  transaction_no: string
  branch_id: string
  cash_account_id: string
  category_id: string
  flow_type: CashFlowType
  amount: number
  payment_method: CashPaymentMethod
  reference_no: string | null
  source_module: CashSourceModule
  status: 'pending' | 'completed' | 'cancelled'
  payee_or_payer: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  cash_accounts?: {
    id: string
    account_name: string
    branch_id: string
    account_type: CashAccountType
  }
  cash_categories?: {
    id: string
    category_name: string
    flow_type: CashFlowType
  }
}

export interface CashReconciliation {
  id: string
  branch_id: string
  cash_account_id: string
  shift_opened_at: string
  shift_closed_at: string
  opening_balance: number
  total_inflows: number
  total_outflows: number
  expected_amount: number
  actual_amount: number
  variance: number
  variance_reason: string | null
  reconciled_by: string | null
  created_at: string
  cash_accounts?: {
    id: string
    account_name: string
    branch_id: string
  }
}

export interface CashTransfer {
  id: string
  transfer_no: string
  from_account_id: string
  to_account_id: string
  amount: number
  transfer_date: string
  initiated_by: string | null
  status: 'pending' | 'completed' | 'rejected'
  notes: string | null
  created_at: string
}

export interface CashSummaryStats {
  totalCashBalance: number
  dailyInflows: number
  dailyOutflows: number
  netCashFlow: number
}

