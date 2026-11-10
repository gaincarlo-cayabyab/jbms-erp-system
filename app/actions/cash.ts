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



/**
 * Creates a new Liquid Cash Container (Admin Workspace - Blueprint 5.3)
 */
export async function createCashContainer(payload: {
  branchId: string
  accountName: string
  accountType: import('@/types/cash').CashAccountType
  accountNumber?: string
  initialBalance?: number
  cashCeiling?: number
  defaultFloat?: number
}) {
  const supabase = await createClient()

  let branchId = payload.branchId
  if (branchId === 'DAGUPAN_MAIN') branchId = 'dagupan_main'
  if (branchId === 'MANILA_BRANCH') branchId = 'manila_branch'
  if (!branchId || branchId === 'all') branchId = 'dagupan_main'

  const { data, error } = await supabase
    .from('cash_accounts')
    .insert([
      {
        branch_id: branchId,
        account_name: payload.accountName.trim(),
        account_type: payload.accountType,
        account_number: payload.accountNumber?.trim() || null,
        current_balance: Math.max(0, Number(payload.initialBalance) || 0),
        cash_ceiling: Math.max(0, Number(payload.cashCeiling) || 15000),
        default_float: Math.max(0, Number(payload.defaultFloat) || 5000),
        is_active: true,
        is_archived: false,
      },
    ])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create cash container: ${error.message}`)
  }

  try {
    revalidatePath('/cash-management')
  } catch {}

  return data
}

/**
 * Archives an existing cash container (Admin Workspace - Blueprint 5.3)
 */
export async function archiveCashContainer(accountId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cash_accounts')
    .update({ is_archived: true, is_active: false })
    .eq('id', accountId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to archive cash container: ${error.message}`)
  }

  try {
    revalidatePath('/cash-management')
  } catch {}

  return data
}

/**
 * Updates container details (name, account number, balance, thresholds, default float)
 */
export async function updateCashContainer(
  accountId: string,
  payload: {
    accountName?: string
    accountNumber?: string
    currentBalance?: number
    cashCeiling?: number
    defaultFloat?: number
  }
) {
  const supabase = await createClient()

  const updateFields: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }
  if (payload.accountName !== undefined) updateFields.account_name = payload.accountName.trim()
  if (payload.accountNumber !== undefined) updateFields.account_number = payload.accountNumber?.trim() || null
  if (payload.currentBalance !== undefined) updateFields.current_balance = Number(payload.currentBalance) || 0
  if (payload.cashCeiling !== undefined) updateFields.cash_ceiling = Number(payload.cashCeiling)
  if (payload.defaultFloat !== undefined) updateFields.default_float = Number(payload.defaultFloat)

  const { data, error } = await supabase
    .from('cash_accounts')
    .update(updateFields)
    .eq('id', accountId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update cash container: ${error.message}`)
  }

  try {
    revalidatePath('/cash-management')
  } catch {}

  return data
}

/**
 * Dual-Key Safe Drop Request (Cashier to Manager Safe - Blueprint 6.1)
 */
export async function requestSafeDrop(params: {
  branchId: string
  posDrawerId: string
  amount: number
  userId?: string
  notes?: string
}) {
  const supabase = await createClient()

  let branchId = params.branchId
  if (branchId === 'DAGUPAN_MAIN') branchId = 'dagupan_main'
  if (branchId === 'MANILA_BRANCH') branchId = 'manila_branch'
  if (!branchId || branchId === 'all') branchId = 'dagupan_main'

  // Fetch or locate Manager Safe Box for this branch
  const { data: safeBoxes } = await supabase
    .from('cash_accounts')
    .select('id')
    .eq('branch_id', branchId)
    .eq('account_type', 'manager_safe')
    .limit(1)

  const managerSafeId = safeBoxes && safeBoxes.length > 0 ? safeBoxes[0].id : null

  // Category for Safe Drop
  const { data: catData } = await supabase
    .from('cash_categories')
    .select('id')
    .eq('category_name', 'Drawer Safe Drop Outflow')
    .limit(1)

  const categoryId = catData && catData.length > 0 ? catData[0].id : null

  const txPrefix = 'SDROP'
  const timestamp = Date.now().toString().slice(-8)
  const transactionNo = `${txPrefix}-${timestamp}`

  const { data, error } = await supabase
    .from('cash_transactions')
    .insert([
      {
        transaction_no: transactionNo,
        branch_id: branchId,
        cash_account_id: params.posDrawerId,
        category_id: categoryId,
        flow_type: 'outflow',
        amount: Math.abs(Number(params.amount)),
        payment_method: 'cash',
        source_module: 'pos',
        is_safe_drop: true,
        status: 'pending', // Pending Manager confirmation
        notes: params.notes || `Cashier Safe Drop pending manager acceptance (Target Safe: ${managerSafeId || 'Manager Safe'})`,
        created_by: sanitizeUuid(params.userId),
      },
    ])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to initiate safe drop: ${error.message}`)
  }

  try {
    revalidatePath('/cash-management')
  } catch {}

  return data
}

/**
 * Manager Approves & Accepts Safe Drop (Blueprint 6.1)
 */
export async function approveSafeDrop(params: {
  transactionNo: string
  approvedBy?: string
}) {
  const supabase = await createClient()

  // 1. Fetch pending safe drop transaction
  const { data: tx, error: txErr } = await supabase
    .from('cash_transactions')
    .select('*')
    .eq('transaction_no', params.transactionNo)
    .single()

  if (txErr || !tx) {
    throw new Error('Safe drop transaction not found.')
  }

  if (tx.status !== 'pending') {
    throw new Error(`Transaction is already ${tx.status}.`)
  }

  // 2. Locate manager safe box
  const { data: safeBoxes } = await supabase
    .from('cash_accounts')
    .select('id, account_name')
    .eq('branch_id', tx.branch_id)
    .eq('account_type', 'manager_safe')
    .limit(1)

  const safeBox = safeBoxes && safeBoxes.length > 0 ? safeBoxes[0] : null
  if (!safeBox) {
    throw new Error('Manager Safe Box not found for this branch.')
  }

  // 3. Mark Outflow completed
  const approvedUserId = sanitizeUuid(params.approvedBy)
  await supabase
    .from('cash_transactions')
    .update({
      status: 'completed',
      approved_by: approvedUserId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', tx.id)

  // 4. Record corresponding Inflow to Manager Safe Box
  const { data: catData } = await supabase
    .from('cash_categories')
    .select('id')
    .eq('category_name', 'POS Drawer Safe Drop')
    .limit(1)

  const inflowCategoryId = catData && catData.length > 0 ? catData[0].id : tx.category_id

  await recordCashTransaction({
    branchId: tx.branch_id,
    cashAccountId: safeBox.id,
    categoryId: inflowCategoryId,
    flowType: 'inflow',
    amount: tx.amount,
    paymentMethod: 'cash',
    referenceNo: tx.transaction_no,
    sourceModule: 'transfer',
    payeeOrPayer: 'POS Cashier Safe Drop',
    notes: `Accepted safe drop from drawer. Authorizing Manager: ${approvedUserId || 'Manager'}`,
    userId: approvedUserId || undefined,
  })

  try {
    revalidatePath('/cash-management')
  } catch {}

  return { success: true }
}

/**
 * Immutable Audit Reversal (Blueprint 4.1 & 6.2)
 * Voids a transaction by marking original as 'reversed' and creating opposite balancing entry
 */
export async function reverseCashTransaction(params: {
  transactionId: string
  reason: string
  approvedBy?: string
}) {
  const supabase = await createClient()

  if (!params.reason.trim()) {
    throw new Error('A mandatory audit reason is required to reverse a cash transaction.')
  }

  // 1. Fetch original transaction
  const { data: origTx, error: origErr } = await supabase
    .from('cash_transactions')
    .select('*')
    .eq('id', params.transactionId)
    .single()

  if (origErr || !origTx) {
    throw new Error('Transaction to reverse was not found.')
  }

  if (origTx.status === 'reversed') {
    throw new Error('This transaction has already been reversed.')
  }

  const userId = sanitizeUuid(params.approvedBy)

  // 2. Mark original transaction as reversed
  await supabase
    .from('cash_transactions')
    .update({
      status: 'reversed',
      reversal_reason: params.reason.trim(),
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', origTx.id)

  // 3. Create compensating balancing transaction (opposite flow)
  const compensatingFlow = origTx.flow_type === 'inflow' ? 'outflow' : 'inflow'
  const revTxNo = `REV-${origTx.transaction_no}-${Math.floor(100 + Math.random() * 900)}`

  const { data: revTx, error: revErr } = await supabase
    .from('cash_transactions')
    .insert([
      {
        transaction_no: revTxNo,
        branch_id: origTx.branch_id,
        cash_account_id: origTx.cash_account_id,
        category_id: origTx.category_id,
        flow_type: compensatingFlow,
        amount: origTx.amount,
        payment_method: origTx.payment_method,
        reference_no: origTx.transaction_no,
        source_module: 'manual',
        status: 'completed',
        reversal_of: origTx.id,
        reversal_reason: params.reason.trim(),
        payee_or_payer: `Reversal: ${origTx.payee_or_payer || 'Original Entry'}`,
        notes: `Compensating reversal for ${origTx.transaction_no}. Reason: ${params.reason.trim()}`,
        created_by: userId,
      },
    ])
    .select()
    .single()

  if (revErr) {
    throw new Error(`Failed to create balancing reversal entry: ${revErr.message}`)
  }

  try {
    revalidatePath('/cash-management')
  } catch {}

  return revTx
}

/**
 * Permanently delete a cash container
 */
export async function deleteCashContainer(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('cash_accounts')
    .delete()
    .eq('id', id)

  if (error) {
    // If foreign key constraint blocks deletion due to past transactions, archive it cleanly
    if (error.code === '23503') {
      const { error: archErr } = await supabase
        .from('cash_accounts')
        .update({ is_archived: true, is_active: false })
        .eq('id', id)
      if (archErr) throw new Error(archErr.message)
      return { archived: true }
    }
    throw new Error(`Failed to delete container: ${error.message}`)
  }

  try { revalidatePath('/cash-management') } catch {}
  return { deleted: true }
}

