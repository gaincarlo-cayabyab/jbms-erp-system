'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateTransactionPayload {
  branchId: string
  cashAccountId: string
  categoryId: string
  flowType: 'inflow' | 'outflow'
  amount: number
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'ewallet'
  referenceNo?: string
  sourceModule: 'pos' | 'sales' | 'procurement' | 'payroll' | 'opex' | 'transfer' | 'manual'
  payeeOrPayer?: string
  notes?: string
  userId?: string
}

function sanitizeUuid(id?: string | null): string | null {
  if (!id) return null
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id) ? id : null
}

/**
 * Executes a single cash inflow or outflow transaction
 */
export async function recordCashTransaction(payload: CreateTransactionPayload) {
  const supabase = await createClient()

  // Generate transaction number
  const txPrefix = payload.flowType === 'inflow' ? 'CRV' : 'CDV'
  const timestamp = Date.now().toString().slice(-8)
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const transactionNo = `${txPrefix}-${timestamp}-${randomSuffix}`

  // Normalize branch ID to lowercase standard if needed
  let branchId = payload.branchId
  if (branchId === 'DAGUPAN_MAIN') branchId = 'dagupan_main'
  if (branchId === 'MANILA_BRANCH') branchId = 'manila_branch'
  if (!branchId || branchId === 'all') branchId = 'dagupan_main'

  // Determine user id if not provided
  let userId = sanitizeUuid(payload.userId)
  if (!userId) {
    const { data: authData } = await supabase.auth.getUser()
    userId = sanitizeUuid(authData.user?.id)
  }

  const { data, error } = await supabase
    .from('cash_transactions')
    .insert([
      {
        transaction_no: transactionNo,
        branch_id: branchId,
        cash_account_id: payload.cashAccountId,
        category_id: payload.categoryId,
        flow_type: payload.flowType,
        amount: Math.abs(Number(payload.amount)),
        payment_method: payload.paymentMethod,
        reference_no: payload.referenceNo || null,
        source_module: payload.sourceModule,
        payee_or_payer: payload.payeeOrPayer || null,
        notes: payload.notes || null,
        created_by: userId,
        status: 'completed',
      },
    ])
    .select(`
      *,
      cash_accounts (id, account_name, branch_id, account_type),
      cash_categories (id, category_name, flow_type)
    `)
    .single()

  if (error) {
    throw new Error(`Failed to record cash transaction: ${error.message}`)
  }

  try {
    revalidatePath('/cash-management')
    revalidatePath('/financials')
  } catch {
    // Ignore in non-page contexts
  }

  return data
}

/**
 * Transfers funds between accounts (e.g., Vault to Drawer, Branch to Branch)
 */
export async function executeCashTransfer(params: {
  fromAccountId: string
  toAccountId: string
  amount: number
  initiatedBy?: string
  notes?: string
}) {
  const supabase = await createClient()
  const transferNo = `TRF-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`
  const userId = sanitizeUuid(params.initiatedBy)

  // 1. Fetch accounts to derive branch IDs and names
  const { data: accounts, error: accError } = await supabase
    .from('cash_accounts')
    .select('id, branch_id, account_name, current_balance')
    .in('id', [params.fromAccountId, params.toAccountId])

  if (accError || !accounts || accounts.length < 2) {
    throw new Error('Could not find both source and destination cash accounts.')
  }

  const fromAcc = accounts.find((a) => a.id === params.fromAccountId)
  const toAcc = accounts.find((a) => a.id === params.toAccountId)

  if (!fromAcc || !toAcc) {
    throw new Error('Invalid source or destination account selection.')
  }

  if (Number(fromAcc.current_balance) < Number(params.amount)) {
    throw new Error(`Insufficient funds in source account ${fromAcc.account_name}. Available: ₱${Number(fromAcc.current_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`)
  }

  // 2. Fetch transfer categories
  const { data: categories, error: catError } = await supabase
    .from('cash_categories')
    .select('id, category_name')
    .in('category_name', ['Inter-Branch Transfer Out', 'Inter-Branch Transfer In'])

  if (catError || !categories) {
    throw new Error('Transfer categories not found in database.')
  }

  const categoryOut = categories.find((c) => c.category_name === 'Inter-Branch Transfer Out')
  const categoryIn = categories.find((c) => c.category_name === 'Inter-Branch Transfer In')

  if (!categoryOut || !categoryIn) {
    throw new Error('Required transfer categories are missing.')
  }

  // 3. Insert Transfer Record
  const { data: transfer, error: trfError } = await supabase
    .from('cash_transfers')
    .insert([
      {
        transfer_no: transferNo,
        from_account_id: params.fromAccountId,
        to_account_id: params.toAccountId,
        amount: Number(params.amount),
        initiated_by: userId,
        notes: params.notes || `Transfer from ${fromAcc.account_name} to ${toAcc.account_name}`,
        status: 'completed',
      },
    ])
    .select()
    .single()

  if (trfError) {
    throw new Error(`Transfer creation failed: ${trfError.message}`)
  }

  // 4. Record Outflow from source account
  await recordCashTransaction({
    branchId: fromAcc.branch_id,
    cashAccountId: params.fromAccountId,
    categoryId: categoryOut.id,
    flowType: 'outflow',
    amount: params.amount,
    paymentMethod: 'cash',
    referenceNo: transferNo,
    sourceModule: 'transfer',
    payeeOrPayer: `Transfer to ${toAcc.account_name}`,
    notes: params.notes || `Account transfer outflow`,
    userId: userId || undefined,
  })

  // 5. Record Inflow to target account
  await recordCashTransaction({
    branchId: toAcc.branch_id,
    cashAccountId: params.toAccountId,
    categoryId: categoryIn.id,
    flowType: 'inflow',
    amount: params.amount,
    paymentMethod: 'cash',
    referenceNo: transferNo,
    sourceModule: 'transfer',
    payeeOrPayer: `Transfer from ${fromAcc.account_name}`,
    notes: params.notes || `Account transfer inflow`,
    userId: userId || undefined,
  })

  try {
    revalidatePath('/cash-management')
  } catch {
    // Ignore in non-page contexts
  }

  return transfer
}

/**
 * Reconciles drawer balance at end of shift
 */
export async function closeRegisterShift(params: {
  branchId: string
  cashAccountId: string
  shiftOpenedAt: string
  openingBalance: number
  totalInflows: number
  totalOutflows: number
  actualAmount: number
  varianceReason?: string
  userId?: string
}) {
  const supabase = await createClient()

  let branchId = params.branchId
  if (branchId === 'DAGUPAN_MAIN') branchId = 'dagupan_main'
  if (branchId === 'MANILA_BRANCH') branchId = 'manila_branch'
  if (!branchId || branchId === 'all') branchId = 'dagupan_main'

  const expectedAmount = Number(params.openingBalance) + Number(params.totalInflows) - Number(params.totalOutflows)
  const userId = sanitizeUuid(params.userId)

  const { data, error } = await supabase
    .from('cash_reconciliations')
    .insert([
      {
        branch_id: branchId,
        cash_account_id: params.cashAccountId,
        shift_opened_at: params.shiftOpenedAt,
        shift_closed_at: new Date().toISOString(),
        opening_balance: Number(params.openingBalance),
        total_inflows: Number(params.totalInflows),
        total_outflows: Number(params.totalOutflows),
        expected_amount: expectedAmount,
        actual_amount: Number(params.actualAmount),
        variance_reason: params.varianceReason || null,
        reconciled_by: userId,
      },
    ])
    .select(`
      *,
      cash_accounts (id, account_name, branch_id)
    `)
    .single()

  if (error) {
    throw new Error(`Shift reconciliation failed: ${error.message}`)
  }

  try {
    revalidatePath('/cash-management')
  } catch {
    // Ignore in non-page contexts
  }

  return data
}

/**
 * Get all active cash accounts (optionally filtered by branch)
 */
export async function getCashAccounts(branchId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('cash_accounts')
    .select('*')
    .eq('is_active', true)
    .order('account_name', { ascending: true })

  if (branchId && branchId !== 'all') {
    const normalizedBranch = branchId.toLowerCase().includes('manila') ? 'manila_branch' : 'dagupan_main'
    query = query.eq('branch_id', normalizedBranch)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

/**
 * Get all cash categories
 */
export async function getCashCategories(flowType?: 'inflow' | 'outflow') {
  const supabase = await createClient()
  let query = supabase.from('cash_categories').select('*').order('category_name', { ascending: true })

  if (flowType) {
    query = query.eq('flow_type', flowType)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

/**
 * Get cash transactions with relations
 */
export async function getCashTransactions(options?: {
  branchId?: string
  flowType?: 'inflow' | 'outflow'
  cashAccountId?: string
  limit?: number
}) {
  const supabase = await createClient()
  let query = supabase
    .from('cash_transactions')
    .select(`
      *,
      cash_accounts (id, account_name, branch_id, account_type),
      cash_categories (id, category_name, flow_type)
    `)
    .order('created_at', { ascending: false })
    .limit(options?.limit || 100)

  if (options?.branchId && options.branchId !== 'all') {
    const normalized = options.branchId.toLowerCase().includes('manila') ? 'manila_branch' : 'dagupan_main'
    query = query.eq('branch_id', normalized)
  }

  if (options?.flowType) {
    query = query.eq('flow_type', options.flowType)
  }

  if (options?.cashAccountId) {
    query = query.eq('cash_account_id', options.cashAccountId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

/**
 * Get liquidity summary metrics
 */
export async function getCashSummaryStats(branchId?: string) {
  const supabase = await createClient()
  const normalizedBranch = branchId && branchId !== 'all'
    ? (branchId.toLowerCase().includes('manila') ? 'manila_branch' : 'dagupan_main')
    : null

  // 1. Cash Accounts for Total Balance
  let accountsQuery = supabase.from('cash_accounts').select('current_balance, branch_id').eq('is_active', true)
  if (normalizedBranch) {
    accountsQuery = accountsQuery.eq('branch_id', normalizedBranch)
  }
  const { data: accounts } = await accountsQuery

  const totalCashBalance = (accounts || []).reduce(
    (sum, acc) => sum + (Number(acc.current_balance) || 0),
    0
  )

  // 2. Today's Transactions for daily inflows & outflows
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  let txQuery = supabase
    .from('cash_transactions')
    .select('amount, flow_type, status')
    .eq('status', 'completed')
    .gte('created_at', startOfDay.toISOString())

  if (normalizedBranch) {
    txQuery = txQuery.eq('branch_id', normalizedBranch)
  }
  const { data: todayTxs } = await txQuery

  let dailyInflows = 0
  let dailyOutflows = 0

  if (todayTxs) {
    for (const tx of todayTxs) {
      const amt = Number(tx.amount) || 0
      if (tx.flow_type === 'inflow') {
        dailyInflows += amt
      } else if (tx.flow_type === 'outflow') {
        dailyOutflows += amt
      }
    }
  }

  const netCashFlow = dailyInflows - dailyOutflows

  return {
    totalCashBalance,
    dailyInflows,
    dailyOutflows,
    netCashFlow,
  }
}

/**
 * Get shift reconciliation history
 */
export async function getCashReconciliations(branchId?: string, limit: number = 20) {
  const supabase = await createClient()
  let query = supabase
    .from('cash_reconciliations')
    .select(`
      *,
      cash_accounts (id, account_name, branch_id)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (branchId && branchId !== 'all') {
    const normalized = branchId.toLowerCase().includes('manila') ? 'manila_branch' : 'dagupan_main'
    query = query.eq('branch_id', normalized)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

