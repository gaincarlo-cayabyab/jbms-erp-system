'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  CashAccount,
  CashCategory,
  CashTransaction,
  CashReconciliation,
  CashSummaryStats,
} from '@/types/cash'
import {
  getCashAccounts,
  getCashCategories,
  getCashTransactions,
  getCashSummaryStats,
  getCashReconciliations,
  approveSafeDrop,
  archiveCashContainer,
  updateCashContainer,
  deleteCashContainer,
} from '@/app/actions/cash'
import { useBranch } from '@/lib/branch-context'
import { soundEffects } from '@/lib/sound-effects'
import { toast } from 'sonner'
import DashboardShell from '@/components/dashboard-shell'
import RecordTransactionModal from './record-transaction-modal'
import AccountTransferModal from './account-transfer-modal'
import ShiftReconciliationModal from './shift-reconciliation-modal'
import CreateContainerModal from './create-container-modal'
import EditContainerModal from './edit-container-modal'
import SafeDropModal from './safe-drop-modal'
import ReverseTransactionModal from './reverse-transaction-modal'
import { useConfirm } from '@/components/ui/confirm-dialog'
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Scale,
  RefreshCw,
  Search,
  Filter,
  Download,
  Building2,
  Landmark,
  Receipt,
  Smartphone,
  Coins,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Store,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Plus,
  Lock,
  RotateCcw,
  ShieldAlert,
  Archive,
  AlertOctagon,
  Sparkles,
  Pencil,
  Trash2,
} from 'lucide-react'

export default function CashManagementView() {
  const { activeBranchId, setActiveBranchId } = useBranch()
  const confirm = useConfirm()

  const [selectedBranch, setSelectedBranch] = useState<string>(activeBranchId || 'all')

  useEffect(() => {
    if (activeBranchId) {
      setSelectedBranch(activeBranchId)
    }
  }, [activeBranchId])

  // Data states
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  const [categories, setCategories] = useState<CashCategory[]>([])
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [reconciliations, setReconciliations] = useState<CashReconciliation[]>([])
  const [summary, setSummary] = useState<CashSummaryStats>({
    totalCashBalance: 0,
    dailyInflows: 0,
    dailyOutflows: 0,
    netCashFlow: 0,
  })

  // Tabs: 'accounts' | 'journal' | 'safedrops' | 'reconciliations'
  const [activeTab, setActiveTab] = useState<'accounts' | 'journal' | 'safedrops' | 'reconciliations'>('accounts')

  // Modals
  const [inflowModalOpen, setInflowModalOpen] = useState(false)
  const [outflowModalOpen, setOutflowModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [reconciliationModalOpen, setReconciliationModalOpen] = useState(false)
  const [createContainerOpen, setCreateContainerOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<CashAccount | null>(null)
  const [editContainerOpen, setEditContainerOpen] = useState(false)
  const [safeDropModalOpen, setSafeDropModalOpen] = useState(false)
  const [safeDropDrawerId, setSafeDropDrawerId] = useState<string | undefined>()
  const [reversingTx, setReversingTx] = useState<CashTransaction | null>(null)
  const [approvingSafeDrop, setApprovingSafeDrop] = useState<string | null>(null)

  // Journal Filters
  const [journalSearch, setJournalSearch] = useState('')
  const [journalFlowFilter, setJournalFlowFilter] = useState<'all' | 'inflow' | 'outflow'>('all')
  const [journalCategoryFilter, setJournalCategoryFilter] = useState<string>('all')
  const [journalMethodFilter, setJournalMethodFilter] = useState<string>('all')

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)

    try {
      const [accs, cats, txs, stats, recs] = await Promise.all([
        getCashAccounts(selectedBranch),
        getCashCategories(),
        getCashTransactions({ branchId: selectedBranch, limit: 200 }),
        getCashSummaryStats(selectedBranch),
        getCashReconciliations(selectedBranch, 50),
      ])

      setAccounts(accs as CashAccount[])
      setCategories(cats as CashCategory[])
      setTransactions(txs as CashTransaction[])
      setSummary(stats)
      setReconciliations(recs as CashReconciliation[])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed loading cash data.'
      toast.error(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedBranch])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Pending Safe Drops
  const pendingSafeDrops = useMemo(() => {
    return transactions.filter((tx) => tx.is_safe_drop && tx.status === 'pending')
  }, [transactions])

  // Handle Accept Safe Drop
  const handleApproveSafeDrop = async (transactionNo: string) => {
    setApprovingSafeDrop(transactionNo)
    try {
      await approveSafeDrop({ transactionNo })
      soundEffects.success()
      toast.success(`Safe drop ${transactionNo} approved and credited to Manager Safe Box!`)
      loadData(true)
    } catch (err: unknown) {
      soundEffects.error()
      const msg = err instanceof Error ? err.message : 'Failed to approve safe drop.'
      toast.error(msg)
    } finally {
      setApprovingSafeDrop(null)
    }
  }

  // Handle Archive Container
  const handleArchiveContainer = async (account: CashAccount) => {
    const ok = await confirm({
      title: `Archive "${account.account_name}"?`,
      message: `Are you sure you want to archive this cash container? Current balance: ₱${Number(account.current_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`,
      confirmText: 'Archive Container',
      variant: 'warning',
    })
    if (!ok) return

    try {
      await archiveCashContainer(account.id)
      soundEffects.success()
      toast.success(`Container "${account.account_name}" archived.`)
      loadData(true)
    } catch (err: unknown) {
      soundEffects.error()
      const msg = err instanceof Error ? err.message : 'Failed to archive container.'
      toast.error(msg)
    }
  }

  // Handle Delete Container (Permanent)
  const handleDeleteContainer = async (account: CashAccount) => {
    const ok = await confirm({
      title: `Permanently Delete "${account.account_name}"?`,
      message: `Are you sure you want to permanently delete "${account.account_name}"? This action cannot be undone.`,
      confirmText: 'Delete Permanently',
      variant: 'danger',
    })
    if (!ok) return

    try {
      const res = await deleteCashContainer(account.id)
      soundEffects.success()
      if (res.archived) {
        toast.info(`Container has past activity, so it was archived and hidden from view.`)
      } else {
        toast.success(`Container "${account.account_name}" permanently deleted.`)
      }
      loadData(true)
    } catch (err: unknown) {
      soundEffects.error()
      const msg = err instanceof Error ? err.message : 'Failed to delete container.'
      toast.error(msg)
    }
  }

  // Filtered transactions for journal
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (journalFlowFilter !== 'all' && tx.flow_type !== journalFlowFilter) return false
      if (journalCategoryFilter !== 'all' && tx.category_id !== journalCategoryFilter) return false
      if (journalMethodFilter !== 'all' && tx.payment_method !== journalMethodFilter) return false

      if (journalSearch.trim()) {
        const q = journalSearch.toLowerCase()
        const matchesNo = tx.transaction_no?.toLowerCase().includes(q)
        const matchesRef = tx.reference_no?.toLowerCase().includes(q)
        const matchesPayee = tx.payee_or_payer?.toLowerCase().includes(q)
        const matchesNotes = tx.notes?.toLowerCase().includes(q)
        const matchesAccount = tx.cash_accounts?.account_name?.toLowerCase().includes(q)
        if (!matchesNo && !matchesRef && !matchesPayee && !matchesNotes && !matchesAccount) return false
      }

      return true
    })
  }, [transactions, journalFlowFilter, journalCategoryFilter, journalMethodFilter, journalSearch])

  // Account Type Icon Helper
  function getAccountIcon(type: string) {
    switch (type) {
      case 'vault':
        return <Landmark className="h-5 w-5 text-amber-600" />
      case 'manager_safe':
        return <Lock className="h-5 w-5 text-indigo-600" />
      case 'cash_drawer':
        return <Receipt className="h-5 w-5 text-rose-600" />
      case 'bank_checking':
      case 'bank_savings':
        return <Building2 className="h-5 w-5 text-blue-600" />
      case 'ewallet':
        return <Smartphone className="h-5 w-5 text-teal-600" />
      case 'petty_cash':
        return <Coins className="h-5 w-5 text-emerald-600" />
      default:
        return <Wallet className="h-5 w-5 text-indigo-600" />
    }
  }

  // Get Hierarchy Level
  function getLevelLabel(type: string) {
    switch (type) {
      case 'cash_drawer':
        return { label: 'Level 1: Till', color: 'bg-rose-50 text-rose-700 border-rose-200' }
      case 'manager_safe':
        return { label: 'Level 2: Manager Safe', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
      case 'vault':
        return { label: 'Level 3: Store Vault', color: 'bg-amber-50 text-amber-700 border-amber-200' }
      case 'in_transit':
        return { label: 'Level 4: In-Transit', color: 'bg-blue-50 text-blue-700 border-blue-200' }
      default:
        return { label: 'Commercial Reserve', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' }
    }
  }

  // Export transactions to CSV
  function exportJournalCSV() {
    soundEffects.keyClick()
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to export.')
      return
    }

    const headers = ['Transaction No', 'Date', 'Branch', 'Account', 'Category', 'Flow Type', 'Amount (PHP)', 'Status', 'Method', 'Source Module', 'Payee/Payer', 'Reference No', 'Notes']
    const rows = filteredTransactions.map((tx) => [
      `"${tx.transaction_no}"`,
      `"${new Date(tx.created_at).toLocaleString()}"`,
      `"${tx.branch_id === 'dagupan_main' ? 'Dagupan Main' : 'Manila Branch'}"`,
      `"${tx.cash_accounts?.account_name || ''}"`,
      `"${tx.cash_categories?.category_name || ''}"`,
      `"${tx.flow_type.toUpperCase()}"`,
      tx.amount,
      `"${tx.status}"`,
      `"${tx.payment_method}"`,
      `"${tx.source_module}"`,
      `"${tx.payee_or_payer || ''}"`,
      `"${tx.reference_no || ''}"`,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `japa_cash_journal_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Cash journal exported to CSV.')
  }

  return (
    <DashboardShell>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ── Page Header ────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Cash Management & Liquidity
              </h1>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Live Treasury Monitor
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Manage your cash containers, track daily inflows and outflows, and control the safe drop workflow.
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEffects.keyClick()
                loadData(true)
              }}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition disabled:opacity-50"
              title="Refresh Treasury Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Direct Link to POS */}
            <Link
              href="/pos"
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 transition active:scale-95"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>🛒 Cashier POS</span>
            </Link>

            {/* + Create Cash Container (Admin Control - Blueprint 5.3) */}
            <button
              type="button"
              onClick={() => {
                soundEffects.keyClick()
                setCreateContainerOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>+ Create Container</span>
            </button>

            {/* Safe Drop Action (Blueprint 3.1) */}
            <button
              type="button"
              onClick={() => {
                soundEffects.keyClick()
                setSafeDropDrawerId(undefined)
                setSafeDropModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-amber-700 transition active:scale-95"
            >
              <Lock className="h-4 w-4" />
              <span>Safe Drop</span>
            </button>

            {/* + Inflow */}
            <button
              type="button"
              onClick={() => {
                soundEffects.keyClick()
                setInflowModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition active:scale-95"
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>+ Inflow (CRV)</span>
            </button>

            {/* - Outflow */}
            <button
              type="button"
              onClick={() => {
                soundEffects.keyClick()
                setOutflowModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 transition active:scale-95"
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>- Outflow (CDV)</span>
            </button>

            {/* Inter-Account Transfer */}
            <button
              type="button"
              onClick={() => {
                soundEffects.keyClick()
                setTransferModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-bold text-zinc-800 shadow-2xs hover:bg-zinc-50 transition active:scale-95"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>Transfer</span>
            </button>
          </div>
        </div>

        {/* ── 4 Metric Summary Cards ─────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Liquid Cash */}
          <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                  Total Liquid Cash
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl truncate">
                  ₱{summary.totalCashBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-2xs">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500">
              <span>Across {accounts.length} active containers</span>
              <span className="font-semibold text-indigo-700">All Branches</span>
            </div>
          </div>

          {/* Card 2: Today Inflows */}
          <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 truncate">
                  Today Inflows (Money In)
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700 sm:text-3xl truncate">
                  +₱{summary.dailyInflows.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-2xs">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500">
              <span>Sales & collections</span>
              <span className="font-semibold text-emerald-700">CRV Vouchers</span>
            </div>
          </div>

          {/* Card 3: Today Outflows */}
          <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 truncate">
                  Today Outflows (Money Out)
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-rose-700 sm:text-3xl truncate">
                  -₱{summary.dailyOutflows.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shadow-2xs">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500">
              <span>Disbursements & Safe Drops</span>
              <span className="font-semibold text-rose-700">CDV Vouchers</span>
            </div>
          </div>

          {/* Card 4: Net Daily Cash Flow */}
          <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                  Net Daily Cash Flow
                </p>
                <p className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl truncate ${summary.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {summary.netCashFlow >= 0 ? '+' : ''}₱{summary.netCashFlow.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-2xs ${summary.netCashFlow >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {summary.netCashFlow >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500">
              <span>Inflows minus Outflows</span>
              <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${summary.netCashFlow >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                {summary.netCashFlow >= 0 ? 'Surplus' : 'Deficit'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Main Tabbed Container ─────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-zinc-200 bg-zinc-50/50">
            <div className="flex border-b border-zinc-200 px-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  soundEffects.keyClick()
                  setActiveTab('accounts')
                }}
                className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                  activeTab === 'accounts'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Wallet className="h-4 w-4 text-indigo-600" />
                <span>Liquid Accounts & Vaults ({accounts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.keyClick()
                  setActiveTab('safedrops')
                }}
                className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                  activeTab === 'safedrops'
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Lock className="h-4 w-4 text-amber-600" />
                <span>Pending Safe Drops</span>
                {pendingSafeDrops.length > 0 && (
                  <span className="rounded-full bg-amber-600 px-2 py-0.2 text-[10px] font-bold text-white">
                    {pendingSafeDrops.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.keyClick()
                  setActiveTab('journal')
                }}
                className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                  activeTab === 'journal'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Receipt className="h-4 w-4 text-emerald-600" />
                <span>Transaction Journal (CRV / CDV)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.keyClick()
                  setActiveTab('reconciliations')
                }}
                className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                  activeTab === 'reconciliations'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Scale className="h-4 w-4 text-blue-600" />
                <span>Shift Balancing Logs</span>
              </button>
            </div>
          </div>

          {/* ── TAB 1: ACCOUNTS & VAULTS REGISTRY ───────────────────────────── */}
          {activeTab === 'accounts' && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
                    Cash Containers & Vault Hierarchy
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Cash flows upward: POS Drawer (Level 1) → Manager Safe (Level 2) → Main Vault (Level 3) → Bank (Level 4).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateContainerOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ New Container</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((account) => {
                  const isDagupan = account.branch_id === 'dagupan_main'
                  const levelInfo = getLevelLabel(account.account_type)
                  const ceiling = account.cash_ceiling || 15000
                  const isOverCeiling = account.account_type === 'cash_drawer' && account.current_balance >= ceiling

                  return (
                    <div
                      key={account.id}
                      className={`rounded-xl bg-white p-5 shadow-xs border transition-shadow relative group ${
                        isOverCeiling ? 'border-amber-300 ring-2 ring-amber-200/50' : 'border-zinc-200 hover:shadow-md'
                      }`}
                    >
                      {/* Ceiling Warning Banner */}
                      {isOverCeiling && (
                        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <span className="font-bold">Safe Drop Required (≥ ₱{ceiling.toLocaleString()})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSafeDropDrawerId(account.id)
                              setSafeDropModalOpen(true)
                            }}
                            className="rounded bg-amber-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-amber-700 shadow-2xs"
                          >
                            Drop Now
                          </button>
                        </div>
                      )}

                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-700">
                            {getAccountIcon(account.account_type)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-zinc-900 line-clamp-1">
                              {account.account_name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span
                                className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider ${
                                  isDagupan
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}
                              >
                                {isDagupan ? 'Dagupan Main' : 'Manila Hub'}
                              </span>
                              <span className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[10px] font-bold border ${levelInfo.color}`}>
                                {levelInfo.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-end justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Current Balance
                          </span>
                          <div className="text-xl font-bold text-zinc-900">
                            ₱{Number(account.current_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </div>
                          {account.account_number && (
                            <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                              Acct: {account.account_number}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                          {account.account_type === 'cash_drawer' && (
                            <button
                              onClick={() => {
                                setSafeDropDrawerId(account.id)
                                setSafeDropModalOpen(true)
                              }}
                              className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                              title="Initiate Safe Drop to Manager Safe"
                            >
                              Safe Drop
                            </button>
                          )}

                          <button
                            onClick={() => {
                              soundEffects.keyClick()
                              setTransferModalOpen(true)
                            }}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
                            title="Transfer funds"
                          >
                            Transfer
                          </button>

                          <button
                            onClick={() => {
                              soundEffects.keyClick()
                              setEditingAccount(account)
                              setEditContainerOpen(true)
                            }}
                            className="rounded-lg p-1 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="Edit Container Details & Balance"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleArchiveContainer(account)}
                            className="rounded-lg p-1 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition"
                            title="Archive Container (Hide)"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteContainer(account)}
                            className="rounded-lg p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Permanently Delete Container"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── TAB 2: PENDING SAFE DROP APPROVALS (Blueprint 5.2 & 6.1) ──── */}
          {activeTab === 'safedrops' && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
                    Dual-Key Safe Drop Approvals (Manager Workspace)
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Review and confirm cash physically received from POS Cashiers into the Manager Safe Box.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSafeDropDrawerId(undefined)
                    setSafeDropModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Initiate New Drop</span>
                </button>
              </div>

              {pendingSafeDrops.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-12 text-center">
                  <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600" />
                  <h3 className="mt-2 text-sm font-bold text-zinc-900">All Safe Drops Cleared</h3>
                  <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                    No pending cash drop requests from POS registers at this time. All drawer transfers are reconciled.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  {pendingSafeDrops.map((tx) => (
                    <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/50 transition">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                          <Lock className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-zinc-900">
                              {tx.transaction_no}
                            </span>
                            <span className="rounded-full bg-amber-100 px-2 py-0.2 text-[10px] font-bold text-amber-800">
                              Pending Manager Confirmation
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 mt-1">
                            From: <span className="font-semibold">{tx.cash_accounts?.account_name}</span> · Branch: <span className="capitalize">{tx.branch_id.replace('_', ' ')}</span>
                          </p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            Requested: {new Date(tx.created_at).toLocaleString()} · {tx.notes || 'Routine drop'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:flex-row justify-between sm:justify-end">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-zinc-400">Amount Dropped</span>
                          <div className="text-lg font-bold text-amber-700">
                            ₱{Number(tx.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApproveSafeDrop(tx.transaction_no)}
                          disabled={approvingSafeDrop === tx.transaction_no}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{approvingSafeDrop === tx.transaction_no ? 'Crediting Safe...' : 'Accept & Credit Safe Box'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: TRANSACTION JOURNAL (With Immutable Reversals) ───── */}
          {activeTab === 'journal' && (
            <div>
              {/* Controls Bar */}
              <div className="border-b border-zinc-200 p-4 bg-zinc-50/50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      value={journalSearch}
                      onChange={(e) => setJournalSearch(e.target.value)}
                      placeholder="Search voucher #, payee, reference..."
                      className="w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3.5 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center bg-zinc-100 rounded-lg p-1 text-xs font-semibold text-zinc-600 border border-zinc-200">
                    <button
                      onClick={() => setJournalFlowFilter('all')}
                      className={`px-2.5 py-1 rounded-md transition ${journalFlowFilter === 'all' ? 'bg-white text-zinc-900 shadow-2xs' : ''}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setJournalFlowFilter('inflow')}
                      className={`px-2.5 py-1 rounded-md text-emerald-700 transition ${journalFlowFilter === 'inflow' ? 'bg-white shadow-2xs font-bold' : ''}`}
                    >
                      Inflows
                    </button>
                    <button
                      onClick={() => setJournalFlowFilter('outflow')}
                      className={`px-2.5 py-1 rounded-md text-rose-700 transition ${journalFlowFilter === 'outflow' ? 'bg-white shadow-2xs font-bold' : ''}`}
                    >
                      Outflows
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={journalCategoryFilter}
                    onChange={(e) => setJournalCategoryFilter(e.target.value)}
                    className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-700 focus:border-indigo-500 focus:outline-hidden"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={journalMethodFilter}
                    onChange={(e) => setJournalMethodFilter(e.target.value)}
                    className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-700 focus:border-indigo-500 focus:outline-hidden"
                  >
                    <option value="all">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="ewallet">E-Wallet</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                  </select>

                  <button
                    onClick={exportJournalCSV}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5 text-zinc-500" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Voucher #</th>
                      <th className="px-4 py-3">Date / Time</th>
                      <th className="px-4 py-3">Account & Branch</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Payee / Payer</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Amount (PHP)</th>
                      <th className="px-4 py-3 text-center">Audit Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                          No transactions recorded matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => {
                        const isInflow = tx.flow_type === 'inflow'
                        const isReversed = tx.status === 'reversed'
                        const isPendingDrop = tx.status === 'pending'

                        return (
                          <tr key={tx.id} className={`transition-colors ${isReversed ? 'bg-zinc-100/60 opacity-70' : 'hover:bg-slate-50/70'}`}>
                            <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                  isReversed
                                    ? 'bg-zinc-200 text-zinc-600 line-through'
                                    : isInflow
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {tx.transaction_no}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                              {new Date(tx.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-semibold text-slate-900">
                                {tx.cash_accounts?.account_name || 'Account'}
                              </div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                {tx.branch_id === 'dagupan_main' ? 'Dagupan Main' : 'Manila Hub'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                              {tx.cash_categories?.category_name || 'Category'}
                            </td>
                            <td className="px-4 py-3 text-slate-800 whitespace-nowrap">
                              {tx.payee_or_payer || '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {isReversed ? (
                                <span className="inline-flex rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                                  Reversed
                                </span>
                              ) : isPendingDrop ? (
                                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                  Pending Drop
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                  Completed
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap font-black">
                              <span className={isReversed ? 'text-zinc-500 line-through' : isInflow ? 'text-emerald-700' : 'text-rose-700'}>
                                {isInflow ? '+' : '-'}₱
                                {Number(tx.amount).toLocaleString('en-PH', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {isReversed ? (
                                <span className="text-[10px] text-zinc-400 italic">
                                  Voided: {tx.reversal_reason || 'Reversed'}
                                </span>
                              ) : isPendingDrop ? (
                                <button
                                  type="button"
                                  onClick={() => handleApproveSafeDrop(tx.transaction_no)}
                                  className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
                                >
                                  Accept Drop
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setReversingTx(tx)}
                                  className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100 transition"
                                  title="Audit Reversal / Void entry"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Void/Reverse</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB 4: SHIFT RECONCILIATIONS ───────────────────────────── */}
          {activeTab === 'reconciliations' && (
            <div>
              <div className="border-b border-zinc-200 p-4 bg-zinc-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">Register Shift Closing & Reconciliation Audit</h2>
                  <p className="text-xs text-zinc-500">
                    Blind count records, variance analysis, and manager sign-off logs.
                  </p>
                </div>
                <button
                  onClick={() => {
                    soundEffects.keyClick()
                    setReconciliationModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700 transition"
                >
                  <Scale className="h-3.5 w-3.5" />
                  Reconcile New Shift
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Closing Time</th>
                      <th className="px-4 py-3">Branch & Drawer</th>
                      <th className="px-4 py-3 text-right">Opening Float</th>
                      <th className="px-4 py-3 text-right">Shift Inflows</th>
                      <th className="px-4 py-3 text-right">Shift Outflows</th>
                      <th className="px-4 py-3 text-right">Expected</th>
                      <th className="px-4 py-3 text-right">Actual Count</th>
                      <th className="px-4 py-3 text-center">Variance Status</th>
                      <th className="px-4 py-3">Audit Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {reconciliations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                          No shift balancing logs found.
                        </td>
                      </tr>
                    ) : (
                      reconciliations.map((rec) => {
                        const variance = Number(rec.variance) || 0
                        const isBalanced = Math.abs(variance) < 0.01
                        const isOverage = variance > 0.01

                        return (
                          <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                              {new Date(rec.shift_closed_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="font-semibold text-slate-900">
                                {rec.cash_accounts?.account_name || 'Cash Drawer'}
                              </span>
                              <p className="text-[10px] text-slate-400 capitalize">
                                {rec.branch_id.replace('_', ' ')}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-600">
                              ₱{Number(rec.opening_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-700">
                              +₱{Number(rec.total_inflows).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-rose-700">
                              -₱{Number(rec.total_outflows).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                              ₱{Number(rec.expected_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                              ₱{Number(rec.actual_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {isBalanced ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                  <CheckCircle2 className="h-3 w-3" /> Balanced
                                </span>
                              ) : isOverage ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                                  +₱{variance.toFixed(2)} Overage
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                                  -₱{Math.abs(variance).toFixed(2)} Shortage
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                              {rec.variance_reason || '—'}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Inflow Modal */}
      <RecordTransactionModal
        isOpen={inflowModalOpen}
        flowType="inflow"
        accounts={accounts}
        categories={categories}
        activeBranchId={selectedBranch}
        onClose={() => setInflowModalOpen(false)}
        onSuccess={() => loadData(true)}
      />

      {/* Record Outflow Modal */}
      <RecordTransactionModal
        isOpen={outflowModalOpen}
        flowType="outflow"
        accounts={accounts}
        categories={categories}
        activeBranchId={selectedBranch}
        onClose={() => setOutflowModalOpen(false)}
        onSuccess={() => loadData(true)}
      />

      {/* Account Transfer Modal */}
      <AccountTransferModal
        isOpen={transferModalOpen}
        accounts={accounts}
        onClose={() => setTransferModalOpen(false)}
        onSuccess={() => loadData(true)}
      />

      {/* Shift Reconciliation Modal */}
      <ShiftReconciliationModal
        isOpen={reconciliationModalOpen}
        accounts={accounts}
        activeBranchId={selectedBranch}
        onClose={() => setReconciliationModalOpen(false)}
        onSuccess={() => loadData(true)}
      />

      {/* Create Container Modal */}
      <CreateContainerModal
        isOpen={createContainerOpen}
        onClose={() => setCreateContainerOpen(false)}
        onSuccess={() => loadData(true)}
        defaultBranch={selectedBranch}
      />

      {/* Edit Container Modal */}
      <EditContainerModal
        isOpen={editContainerOpen}
        account={editingAccount}
        onClose={() => {
          setEditContainerOpen(false)
          setEditingAccount(null)
        }}
        onSuccess={() => {
          loadData(true)
          setEditContainerOpen(false)
          setEditingAccount(null)
        }}
      />

      {/* Safe Drop Modal (Blueprint 3.1 & 6.1) */}
      <SafeDropModal
        isOpen={safeDropModalOpen}
        onClose={() => setSafeDropModalOpen(false)}
        onSuccess={() => loadData(true)}
        accounts={accounts}
        defaultDrawerId={safeDropDrawerId}
      />

      {/* Immutable Reverse Modal (Blueprint 4.1 & 6.2) */}
      <ReverseTransactionModal
        transaction={reversingTx}
        onClose={() => setReversingTx(null)}
        onSuccess={() => loadData(true)}
      />
    </DashboardShell>
  )
}
