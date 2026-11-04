export type ExpensePaymentMethod =
  | 'Cash'
  | 'GCash'
  | 'Maya'
  | 'Bank Transfer'
  | 'Cheque'
  | 'Credit Card'

export interface Expense {
  id: string
  category: string
  description: string
  amount: number
  payment_method: ExpensePaymentMethod
  date: string
  reference_no: string | null
  branch: string | null
  created_at: string
}

export interface ExpenseFormData {
  category: string
  description: string
  amount: string | number
  payment_method: ExpensePaymentMethod
  date: string
  reference_no: string
  branch: string
}

export interface FinancialMetrics {
  grossRevenue: number
  totalExpenses: number
  netProfit: number
  accountsReceivable: number
  paidOrdersCount: number
  pendingOrdersCount: number
}

