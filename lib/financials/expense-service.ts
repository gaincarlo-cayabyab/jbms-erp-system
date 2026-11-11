import { createClient } from '@/lib/supabase/client'
import { recordCashTransaction } from '@/app/actions/cash'
import { Expense, ExpenseFormData } from '@/types/financials'

const LOCAL_STORAGE_KEY = 'japa_core_erp_expenses'

// Default mock expenses to populate when database table is first initialized or offline
const DEFAULT_MOCK_EXPENSES: Expense[] = [
  {
    id: 'exp-001',
    category: 'Raw Materials',
    description: 'Bulk purchase: Glossy & Matte Vinyl Rolls (50 rolls)',
    amount: 45000.0,
    payment_method: 'Bank Transfer',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference_no: 'BDO-TRX-882194',
    branch: 'Main Branch',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'exp-002',
    category: 'Utilities & Power',
    description: 'Monthly electricity bill - Main Printing Hub (Meralco)',
    amount: 18450.75,
    payment_method: 'GCash',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference_no: 'GC-9931048',
    branch: 'Main Branch',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'exp-003',
    category: 'Logistics & Fuel',
    description: 'Fleet delivery van diesel refueling & expressway toll fees',
    amount: 4200.0,
    payment_method: 'Cash',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference_no: 'PETRON-OR-7721',
    branch: 'Branch 1 - North',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'exp-004',
    category: 'Machine Maintenance',
    description: 'Large-format printhead ultrasonic cleaning & calibration kit',
    amount: 8500.0,
    payment_method: 'Maya',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference_no: 'MY-482019',
    branch: 'Main Branch',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'exp-005',
    category: 'Supplies & Packaging',
    description: 'Heavy duty bubble wrap rolls, corrugated boxes, and packing tape',
    amount: 3200.0,
    payment_method: 'Cash',
    date: new Date().toISOString().split('T')[0],
    reference_no: 'INV-55219',
    branch: 'Branch 2 - South',
    created_at: new Date().toISOString(),
  },
]

function getLocalExpenses(): Expense[] {
  if (typeof window === 'undefined') return DEFAULT_MOCK_EXPENSES
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_MOCK_EXPENSES))
      return DEFAULT_MOCK_EXPENSES
    }
    return JSON.parse(raw)
  } catch {
    return DEFAULT_MOCK_EXPENSES
  }
}

function saveLocalExpenses(list: Expense[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.error('Failed saving to localStorage', e)
  }
}

/**
 * Fetch expenses: attempts Supabase query first; if table doesn't exist yet
 * (PGRST205 or 404), gracefully falls back to local storage store.
 */
export async function getExpenses(): Promise<{
  data: Expense[]
  isUsingMock: boolean
  error?: string
}> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      // Table does not exist in schema cache yet or permissions issue
      const local = getLocalExpenses()
      return {
        data: local,
        isUsingMock: true,
        error: error.code === 'PGRST205'
          ? 'Notice: "expenses" table not yet created in Supabase. Using local expense store. Run "supabase/migrations/06_financials_policies.sql" to persist to cloud.'
          : error.message,
      }
    }

    return {
      data: (data as Expense[]) || [],
      isUsingMock: false,
    }
  } catch (err: unknown) {
    const local = getLocalExpenses()
    return {
      data: local,
      isUsingMock: true,
      error: err instanceof Error ? err.message : 'Fallback to local store',
    }
  }
}

/**
 * Log a new expense to Supabase or fallback store
 */
export async function recordExpense(
  formData: ExpenseFormData
): Promise<{ data: Expense; isUsingMock: boolean }> {
  const numericAmount = parseFloat(String(formData.amount)) || 0

  const payload = {
    category: formData.category,
    description: formData.description.trim(),
    amount: numericAmount,
    payment_method: formData.payment_method,
    date: formData.date || new Date().toISOString().split('T')[0],
    reference_no: formData.reference_no.trim() || null,
    branch: formData.branch || 'Main Branch',
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('expenses')
      .insert([payload])
      .select()
      .single()

    if (!error && data) {
      // Cash Management Hook: Record Outflow Voucher (CDV)
      if (numericAmount > 0) {
        try {
          const branchId = payload.branch?.toLowerCase().includes('manila')
            ? 'manila_branch'
            : 'dagupan_main'
          const isPetty = payload.payment_method === 'Cash' && numericAmount <= 5000
          const preferredType = isPetty
            ? 'petty_cash'
            : payload.payment_method === 'GCash' || payload.payment_method === 'Maya'
            ? 'ewallet'
            : 'bank_checking'

          const { data: targetAccount } = await supabase
            .from('cash_accounts')
            .select('id')
            .eq('branch_id', branchId)
            .eq('account_type', preferredType)
            .limit(1)
            .maybeSingle()

          const catName = isPetty ? 'Petty Cash Expenditure' : 'Utilities & OpEx'
          const { data: cat } = await supabase
            .from('cash_categories')
            .select('id')
            .eq('category_name', catName)
            .maybeSingle()

          if (targetAccount?.id && cat?.id) {
            const methodMap: Record<string, 'cash' | 'check' | 'bank_transfer' | 'ewallet'> = {
              Cash: 'cash',
              GCash: 'ewallet',
              Maya: 'ewallet',
              'Bank Transfer': 'bank_transfer',
              Cheque: 'check',
              'Credit Card': 'bank_transfer',
            }

            await recordCashTransaction({
              branchId,
              cashAccountId: targetAccount.id,
              categoryId: cat.id,
              flowType: 'outflow',
              amount: numericAmount,
              paymentMethod: methodMap[payload.payment_method] || 'cash',
              referenceNo: payload.reference_no || undefined,
              sourceModule: 'opex',
              payeeOrPayer: payload.description || 'Expense Payee',
              notes: `${payload.category} — ${payload.description}`,
            })
          }
        } catch (cashErr) {
          console.warn('Could not record cash disbursement for expense:', cashErr)
        }
      }

      return { data: data as Expense, isUsingMock: false }
    }
  } catch {
    // proceed to local fallback
  }

  // Fallback to local store
  const newLocalItem: Expense = {
    id: `exp-${Date.now()}`,
    ...payload,
    created_at: new Date().toISOString(),
  }

  const existing = getLocalExpenses()
  const updated = [newLocalItem, ...existing]
  saveLocalExpenses(updated)

  return { data: newLocalItem, isUsingMock: true }
}

/**
 * Delete expense
 */
export async function removeExpense(id: string): Promise<boolean> {
  try {
    const supabase = createClient()
    // Fetch expense first to find linked cash transactions
    const { data: exp } = await supabase
      .from('expenses')
      .select('reference_no, description')
      .eq('id', id)
      .maybeSingle()

    if (exp) {
      if (exp.reference_no) {
        await supabase.from('cash_transactions').delete().eq('reference_no', exp.reference_no)
      }
      if (exp.description) {
        await supabase.from('cash_transactions').delete().eq('payee_or_payer', exp.description)
      }
    }

    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (!error) return true
  } catch {
    // proceed to local
  }

  const existing = getLocalExpenses()
  const updated = existing.filter((e) => e.id !== id)
  saveLocalExpenses(updated)
  return true
}

