import { createClient } from '@/lib/supabase/client'
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

