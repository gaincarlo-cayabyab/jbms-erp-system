'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CashAccount,
  CashCategory,
  CashTransaction,
  CashReconciliation,
  CashSummaryStats,
  CashFlowType,
} from '@/types/cash'
import {
  getCashAccounts,
  getCashCategories,
  getCashTransactions,
  getCashSummaryStats,
  getCashReconciliations,
} from '@/app/actions/cash'
import { useBranch } from '@/lib/branch-context'
import { soundEffects } from '@/lib/sound-effects'
import { toast } from 'sonner'
import RecordTransactionModal from './record-transaction-modal'
import AccountTransferModal from './account-transfer-modal'
import ShiftReconciliationModal from './shift-reconciliation-modal'
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
} from 'lucide-react'

export default function CashManagementView() {
  const { activeBranchId, setActiveBranchId } = useBranch()

  // Local filter branch override (allows toggling 'all', 'dagupan_main', 'manila_branch')
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

  // Tabs: 'accounts' | 'journal' | 'reconciliations' | 'analytics'
  const [activeTab, setActiveTab] = useState<'accounts' | 'journal' | 'reconciliations' | 'analytics'>('accounts')

  // Modals
  const [inflowModalOpen, setInflowModalOpen] = useState(false)
  const [outflowModalOpen, setOutflowModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [reconciliationModalOpen, setReconciliationModalOpen] = useState(false)

  // Journal Filters
  const [journalSearch, setJournalSearch] = useState('')
  const [journalFlowFilter, setJournalFlowFilter] = useState<'all' | 'inflow' | 'outflow'>('all')
  const [journalCategoryFilter, setJournalCategoryFilter] = useState<string>('all')
  const [journalMethodFilter, setJournalMethodFilter] = useState<string>('all')
  const [journalModuleFilter, setJournalModuleFilter] = useState<string>('all')

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)

    try {
      const [accs, cats, txs, stats, recs] = await Promise.all([
        getCashAccounts(selectedBranch),
        getCashCategories(),
        getCashTransactions({ branchId: selectedBranch, limit: 150 }),
        getCashSummaryStats(selectedBranch),
        getCashReconciliations(selectedBranch, 30),
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

  function handleBranchSwitch(bId: string) {
    soundEffects.keyClick()
    setSelectedBranch(bId)
    setActiveBranchId(bId)
  }

  // Filtered transactions for journal
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Flow type filter
      if (journalFlowFilter !== 'all' && tx.flow_type !== journalFlowFilter) return false

      // Category filter
      if (journalCategoryFilter !== 'all' && tx.category_id !== journalCategoryFilter) return false

      // Method filter
      if (journalMethodFilter !== 'all' && tx.payment_method !== journalMethodFilter) return false

      // Module filter
      if (journalModuleFilter !== 'all' && tx.source_module !== journalModuleFilter) return false

      // Search term
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
  }, [transactions, journalFlowFilter, journalCategoryFilter, journalMethodFilter, journalModuleFilter, journalSearch])

  // Account Type Icon Helper
  function getAccountIcon(type: string) {
    switch (type) {
      case 'vault':
        return <Landmark className="h-5 w-5 text-amber-600" />
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

  // Export transactions to CSV
  function exportJournalCSV() {
    soundEffects.keyClick()
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to export.')
      return
    }

    const headers = ['Transaction No', 'Date', 'Branch', 'Account', 'Category', 'Flow Type', 'Amount (PHP)', 'Method', 'Source Module', 'Payee/Payer', 'Reference No', 'Notes']
    const rows = filteredTransactions.map((tx) => [
      `"${tx.transaction_no}"`,
      `"${new Date(tx.created_at).toLocaleString()}"`,
      `"${tx.branch_id === 'dagupan_main' ? 'Dagupan Main' : 'Manila Branch'}"`,
      `"${tx.cash_accounts?.account_name || ''}"`,
      `"${tx.cash_categories?.category_name || ''}"`,
      `"${tx.flow_type.toUpperCase()}"`,
      tx.amount,
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
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ── Top Header & Branch Switcher ────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Cash & Liquidity Engine
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">Multi-Branch Treasury Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Cash Management & Liquidity
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Track real-time cash inflows, disbursements, vault reserves, and register drawer balancing.
          </p>
        </div>

        {/* Branch Filter & Refresh Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={() => handleBranchSwitch('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedBranch === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Consolidated (All)
            </button>
            <button
              onClick={() => handleBranchSwitch('dagupan_main')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedBranch === 'dagupan_main'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Dagupan Main
            </button>
            <button
              onClick={() => handleBranchSwitch('manila_branch')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedBranch === 'manila_branch'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Manila Hub
            </button>
          </div>

          <button
            onClick={() => {
              soundEffects.keyClick()
              loadData(true)
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
            title="Refresh treasury balances"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* ── Top Liquidity Banner (4 High-End KPI Cards) ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cash Balance */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-xs border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Liquid Cash
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ₱{summary.totalCashBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Across {accounts.length} active accounts</span>
            <span className="font-semibold text-indigo-600">
              {selectedBranch === 'all' ? 'All Branches' : selectedBranch === 'dagupan_main' ? 'Dagupan' : 'Manila'}
            </span>
          </div>
        </div>

        {/* Daily Cash Inflow Total */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-xs border border-emerald-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Today Inflows (Money In)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
              +₱{summary.dailyInflows.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-emerald-600/80 pt-2 border-t border-emerald-50">
            <span>Sales & collections</span>
            <span className="font-semibold text-emerald-700">Cash Receipts (CRV)</span>
          </div>
        </div>

        {/* Daily Cash Outflow Total */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-xs border border-rose-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Today Outflows (Money Out)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">
              -₱{summary.dailyOutflows.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-rose-600/80 pt-2 border-t border-rose-50">
            <span>Procurement & OpEx</span>
            <span className="font-semibold text-rose-700">Disbursements (CDV)</span>
          </div>
        </div>

        {/* Net Daily Cash Flow */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-xs border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Net Daily Cash Flow
            </span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                summary.netCashFlow >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {summary.netCashFlow >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                summary.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {summary.netCashFlow >= 0 ? '+' : ''}₱
              {summary.netCashFlow.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Inflows minus Outflows</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                summary.netCashFlow >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {summary.netCashFlow >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Express Action Toolbar ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Record Inflow (CRV) */}
          <button
            onClick={() => {
              soundEffects.keyClick()
              setInflowModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-all active:scale-95"
          >
            <ArrowDownLeft className="h-4 w-4" />
            + Cash Inflow (CRV)
          </button>

          {/* Record Outflow (CDV) */}
          <button
            onClick={() => {
              soundEffects.keyClick()
              setOutflowModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-rose-700 transition-all active:scale-95"
          >
            <ArrowUpRight className="h-4 w-4" />
            - Cash Outflow (CDV)
          </button>

          {/* Account Transfer */}
          <button
            onClick={() => {
              soundEffects.keyClick()
              setTransferModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition-all active:scale-95"
          >
            <ArrowRightLeft className="h-4 w-4" />
            ⇄ Account Transfer
          </button>

          {/* Shift Balancing */}
          <button
            onClick={() => {
              soundEffects.keyClick()
              setReconciliationModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-amber-700 transition-all active:scale-95"
          >
            <Scale className="h-4 w-4" />
            ⚖ End of Shift Balancing
          </button>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs font-semibold text-slate-600">
          <button
            onClick={() => {
              soundEffects.keyClick()
              setActiveTab('accounts')
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'accounts' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Accounts Registry ({accounts.length})
          </button>
          <button
            onClick={() => {
              soundEffects.keyClick()
              setActiveTab('journal')
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'journal' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Transaction Journal
          </button>
          <button
            onClick={() => {
              soundEffects.keyClick()
              setActiveTab('reconciliations')
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'reconciliations' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Shift Balancing Log
          </button>
        </div>
      </div>

      {/* ── TAB 1: ACCOUNTS REGISTRY GRID ───────────────────────────────────── */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Liquid Cash Containers & Vaults
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Real-time balance updated via PostgreSQL trigger
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => {
              const isDagupan = account.branch_id === 'dagupan_main'
              return (
                <div
                  key={account.id}
                  className="rounded-2xl bg-white p-5 shadow-xs border border-slate-200/80 hover:shadow-md transition-shadow relative group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
                        {getAccountIcon(account.account_type)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                          {account.account_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isDagupan
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {isDagupan ? 'Dagupan Main' : 'Manila Hub'}
                          </span>
                          <span className="text-[11px] text-slate-500 capitalize">
                            {account.account_type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Current Balance
                      </span>
                      <div className="text-xl font-black text-slate-900">
                        ₱{Number(account.current_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                      {account.account_number && (
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          Acct: {account.account_number}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          soundEffects.keyClick()
                          setTransferModalOpen(true)
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                        title="Transfer from/to this account"
                      >
                        Transfer
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: CASH TRANSACTION JOURNAL ─────────────────────────────────── */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={journalSearch}
                  onChange={(e) => setJournalSearch(e.target.value)}
                  placeholder="Search voucher #, payee, reference..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Flow filter pills */}
              <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs font-semibold text-slate-600">
                <button
                  onClick={() => setJournalFlowFilter('all')}
                  className={`px-2.5 py-1 rounded-lg ${journalFlowFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : ''}`}
                >
                  All Flows
                </button>
                <button
                  onClick={() => setJournalFlowFilter('inflow')}
                  className={`px-2.5 py-1 rounded-lg text-emerald-700 ${journalFlowFilter === 'inflow' ? 'bg-white shadow-xs font-bold' : ''}`}
                >
                  Inflows
                </button>
                <button
                  onClick={() => setJournalFlowFilter('outflow')}
                  className={`px-2.5 py-1 rounded-lg text-rose-700 ${journalFlowFilter === 'outflow' ? 'bg-white shadow-xs font-bold' : ''}`}
                >
                  Outflows
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category filter */}
              <select
                value={journalCategoryFilter}
                onChange={(e) => setJournalCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-hidden"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.category_name}
                  </option>
                ))}
              </select>

              {/* Payment Method filter */}
              <select
                value={journalMethodFilter}
                onChange={(e) => setJournalMethodFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-hidden"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="ewallet">E-Wallet</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
              </select>

              {/* Export CSV button */}
              <button
                onClick={exportJournalCSV}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Voucher #</th>
                    <th className="px-4 py-3">Date / Time</th>
                    <th className="px-4 py-3">Account & Branch</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Payee / Payer</th>
                    <th className="px-4 py-3">Ref & Notes</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3 text-right">Amount (PHP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        No transactions recorded matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isInflow = tx.flow_type === 'inflow'
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                isInflow ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
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
                          <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                            {tx.reference_no && (
                              <span className="font-mono text-slate-700 mr-1.5 font-semibold">
                                #{tx.reference_no}
                              </span>
                            )}
                            {tx.notes || ''}
                          </td>
                          <td className="px-4 py-3 capitalize text-slate-600 whitespace-nowrap">
                            <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                              {tx.payment_method.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap font-black">
                            <span className={isInflow ? 'text-emerald-700' : 'text-rose-700'}>
                              {isInflow ? '+' : '-'}₱
                              {Number(tx.amount).toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: SHIFT RECONCILIATIONS LOG ─────────────────────────────────── */}
      {activeTab === 'reconciliations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Register Shift Closing & Reconciliation Audit</h2>
              <p className="text-xs text-slate-500">
                End-of-day cash drawer balancing records with overage and shortage tracking.
              </p>
            </div>
            <button
              onClick={() => {
                soundEffects.keyClick()
                setReconciliationModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-all active:scale-95"
            >
              <Scale className="h-4 w-4" />
              Reconcile New Shift
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
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
                <tbody className="divide-y divide-slate-100">
                  {reconciliations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        No shift reconciliations recorded yet. Use the End of Shift Balancing action to balance a drawer.
                      </td>
                    </tr>
                  ) : (
                    reconciliations.map((rec) => {
                      const v = Number(rec.variance)
                      const isZero = Math.abs(v) < 0.01
                      const isOverage = v > 0.01
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {new Date(rec.shift_closed_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-900">
                              {rec.cash_accounts?.account_name || 'Register Drawer'}
                            </span>
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">
                              {rec.branch_id === 'dagupan_main' ? 'Dagupan Main' : 'Manila Hub'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600 font-mono whitespace-nowrap">
                            ₱{Number(rec.opening_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-mono whitespace-nowrap">
                            +₱{Number(rec.total_inflows).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-rose-600 font-mono whitespace-nowrap">
                            -₱{Number(rec.total_outflows).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-indigo-900 font-bold font-mono whitespace-nowrap">
                            ₱{Number(rec.expected_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-900 font-mono whitespace-nowrap">
                            ₱{Number(rec.actual_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isZero
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isOverage
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {isZero ? 'Balanced' : isOverage ? `+₱${v.toFixed(2)} Over` : `-₱${Math.abs(v).toFixed(2)} Short`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
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
        </div>
      )}

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}
      <RecordTransactionModal
        isOpen={inflowModalOpen}
        flowType="inflow"
        accounts={accounts}
        categories={categories}
        activeBranchId={selectedBranch}
        onClose={() => setInflowModalOpen(false)}
        onSuccess={() => loadData(true)}
      />

      <RecordTransactionModal
        isOpen={outflowModalOpen}
        flowType="outflow"
        accounts={accounts}
        categories={categories}
        activeBranchId={selectedBranch}
        onClose={() => setOutflowModalOpen(false)}
        onSuccess={() => loadData(true)}
      />

      <AccountTransferModal
        isOpen={transferModalOpen}
        accounts={accounts}
        onClose={() => setTransferModalOpen(false)}
        onSuccess={() => loadData(true)}
      />

      <ShiftReconciliationModal
        isOpen={reconciliationModalOpen}
        accounts={accounts}
        activeBranchId={selectedBranch}
        onClose={() => setReconciliationModalOpen(false)}
        onSuccess={() => loadData(true)}
      />
    </div>
  )
}
