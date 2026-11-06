'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { useBranch, BRANCH_LIST } from '@/lib/branch-context'
import { StockTransfer, StockTransferItem, TransferStatus } from '@/types/transfers'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ArrowLeftRight,
  Plus,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Send,
  Boxes,
  MapPin,
  FileText,
  X,
  Loader2,
  Trash2,
  ShieldAlert,
} from 'lucide-react'

interface CatalogProduct {
  id: string
  sku: string
  item_name: string
  category: string | null
  stock_quantity: number
}

const STATUS_CONFIG: Record<
  TransferStatus,
  { label: string; badgeClasses: string; icon: React.ComponentType<{ className?: string }> }
> = {
  draft: {
    label: 'Draft',
    badgeClasses: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Clock,
  },
  requested: {
    label: 'Requested',
    badgeClasses: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
  },
  dispatched: {
    label: 'Dispatched',
    badgeClasses: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: Send,
  },
  in_transit: {
    label: 'In-Transit',
    badgeClasses: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
    icon: Truck,
  },
  received: {
    label: 'Received',
    badgeClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  variance_flagged: {
    label: 'Variance Flagged',
    badgeClasses: 'bg-rose-50 text-rose-700 border-rose-300 font-bold',
    icon: AlertTriangle,
  },
  cancelled: {
    label: 'Cancelled',
    badgeClasses: 'bg-slate-100 text-slate-500 border-slate-200 line-through',
    icon: X,
  },
}

export default function StockTransfersView() {
  const { user } = useAuth()
  const { activeBranchId, isSuperAdmin, logAuditEvent } = useBranch()
  const confirm = useConfirm()

  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)

  // Create Form State
  const [sourceBranch, setSourceBranch] = useState(
    activeBranchId !== 'all' ? activeBranchId : 'dagupan_main'
  )
  const [destinationBranch, setDestinationBranch] = useState(
    activeBranchId === 'dagupan_main' ? 'manila_branch' : 'dagupan_main'
  )
  const [transferNotes, setTransferNotes] = useState('')
  const [transferItems, setTransferItems] = useState<
    { product_id: string; quantity_sent: number }[]
  >([{ product_id: '', quantity_sent: 10 }])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Receive Form State
  const [receiveItemInputs, setReceiveItemInputs] = useState<
    Record<string, { quantity_received: number; variance_reason: string }>
  >({})
  const [isReceiving, setIsReceiving] = useState(false)

  // Fetch Transfers and Catalog
  const fetchTransfers = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('stock_transfers')
        .select(`
          *,
          stock_transfer_items (
            *,
            product:products_and_inventory(id, sku, item_name, category)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTransfers((data as unknown as StockTransfer[]) || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch stock transfers'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchCatalog = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('products_and_inventory')
        .select('id, sku, item_name, category, stock_quantity')
        .order('item_name', { ascending: true })
      setCatalogProducts(data || [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchTransfers()
    fetchCatalog()
  }, [fetchTransfers, fetchCatalog])

  // Realtime subscription for live STO tracking
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('stock_transfers_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock_transfers' },
        () => {
          fetchTransfers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTransfers])

  // Filter transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      // Branch filter: if not 'all', user sees transfers involving active branch
      if (activeBranchId !== 'all') {
        if (t.source_branch_id !== activeBranchId && t.destination_branch_id !== activeBranchId) {
          return false
        }
      }

      // Status filter
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchNum = t.transfer_number.toLowerCase().includes(query)
        const matchNotes = t.notes?.toLowerCase().includes(query)
        const matchItems = t.stock_transfer_items?.some((i) =>
          i.product?.item_name.toLowerCase().includes(query) ||
          i.product?.sku.toLowerCase().includes(query)
        )
        return matchNum || matchNotes || matchItems
      }

      return true
    })
  }, [transfers, activeBranchId, statusFilter, searchQuery])

  // Metrics
  const metrics = useMemo(() => {
    const total = transfers.length
    const inTransit = transfers.filter((t) => t.status === 'in_transit').length
    const variance = transfers.filter((t) => t.status === 'variance_flagged').length
    const completed = transfers.filter((t) => t.status === 'received').length
    return { total, inTransit, variance, completed }
  }, [transfers])

  // Handle Add Item Row in Create Modal
  const addItemRow = () => {
    setTransferItems((prev) => [...prev, { product_id: '', quantity_sent: 5 }])
  }

  const removeItemRow = (idx: number) => {
    setTransferItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateItemRow = (
    idx: number,
    field: 'product_id' | 'quantity_sent',
    value: string | number
  ) => {
    setTransferItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    )
  }

  // Submit New STO
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sourceBranch === destinationBranch) {
      toast.error('Source and Destination branches must be different locations.')
      return
    }

    const validItems = transferItems.filter((i) => i.product_id && i.quantity_sent > 0)
    if (validItems.length === 0) {
      toast.error('Please add at least one product with quantity > 0.')
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const transferNumber = `STO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(100 + Math.random() * 900))}`

      const { data: newTransfer, error: transferError } = await supabase
        .from('stock_transfers')
        .insert({
          transfer_number: transferNumber,
          source_branch_id: sourceBranch,
          destination_branch_id: destinationBranch,
          status: 'draft',
          notes: transferNotes || null,
        })
        .select()
        .single()

      if (transferError) throw transferError

      const itemsToInsert = validItems.map((item) => ({
        transfer_id: newTransfer.id,
        product_id: item.product_id,
        quantity_sent: Number(item.quantity_sent),
        quantity_received: 0,
      }))

      const { error: itemsError } = await supabase
        .from('stock_transfer_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      await logAuditEvent(
        'STO_CREATED',
        'stock_transfers',
        newTransfer.id,
        { transfer_number: transferNumber, source: sourceBranch, dest: destinationBranch, items: itemsToInsert.length }
      )

      toast.success(`Transfer Order ${transferNumber} created as Draft!`)
      setIsCreateModalOpen(false)
      setTransferNotes('')
      setTransferItems([{ product_id: '', quantity_sent: 10 }])
      fetchTransfers()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create stock transfer order'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Dispatch Action
  const handleDispatch = async (transfer: StockTransfer) => {
    const ok = await confirm({
      title: `Dispatch Transfer ${transfer.transfer_number}?`,
      message: `This will deduct the dispatched quantities from ${transfer.source_branch_id === 'dagupan_main' ? 'Dagupan Main' : 'Manila'} inventory and set status to In-Transit.`,
      confirmText: 'Dispatch Order',
      variant: 'info',
    })
    if (!ok) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('dispatch_stock_transfer', {
        p_transfer_id: transfer.id,
        p_user_id: user?.id,
      })

      if (error) throw error
      const res = data as { success?: boolean; message?: string }
      if (res && res.success) {
        toast.success(`Transfer ${transfer.transfer_number} dispatched into transit!`)
        fetchTransfers()
      } else {
        toast.error(res?.message || 'Dispatch failed')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Dispatch failed'
      toast.error(msg)
    }
  }

  // Open Receive Modal
  const openReceiveModal = (transfer: StockTransfer) => {
    setSelectedTransfer(transfer)
    const initialInputs: Record<string, { quantity_received: number; variance_reason: string }> = {}
    transfer.stock_transfer_items?.forEach((item) => {
      initialInputs[item.id] = {
        quantity_received: item.quantity_sent,
        variance_reason: '',
      }
    })
    setReceiveItemInputs(initialInputs)
    setIsReceiveModalOpen(true)
  }

  // Submit Receive
  const handleReceiveTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTransfer) return

    // Verify all items have valid inputs
    const payloadItems = Object.entries(receiveItemInputs).map(([itemId, val]) => ({
      item_id: itemId,
      quantity_received: Number(val.quantity_received),
      variance_reason: val.variance_reason || null,
    }))

    // Check if any has variance without reason
    for (const item of selectedTransfer.stock_transfer_items || []) {
      const input = receiveItemInputs[item.id]
      if (input && input.quantity_received !== item.quantity_sent && !input.variance_reason?.trim()) {
        toast.error(`Please provide a reason for the quantity difference on ${item.product?.item_name || 'an item'}.`)
        return
      }
    }

    setIsReceiving(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('receive_stock_transfer', {
        p_transfer_id: selectedTransfer.id,
        p_user_id: user?.id,
        p_items: payloadItems,
      })

      if (error) throw error
      const res = data as { success?: boolean; status?: string; message?: string }
      if (res && res.success) {
        if (res.status === 'variance_flagged') {
          toast.warning(`Transfer received with variance flagged! Alert dispatched to Branch Manager.`)
        } else {
          toast.success(`Transfer verified and added to ${selectedTransfer.destination_branch_id === 'dagupan_main' ? 'Dagupan Main' : 'Manila'} stock!`)
        }
        setIsReceiveModalOpen(false)
        fetchTransfers()
      } else {
        toast.error(res?.message || 'Failed to receive transfer')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Receive failed'
      toast.error(msg)
    } finally {
      setIsReceiving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <ArrowLeftRight className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Inter-Branch Stock Transfers (STO)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage multi-branch stock movements between Dagupan Main Store &amp; Manila Operations Hub.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTransfers}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition shadow-2xs"
            title="Refresh Stock Transfers"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-95 transition shadow-md shadow-indigo-200"
          >
            <Plus className="h-4 w-4" />
            <span>New Stock Transfer</span>
          </button>
        </div>
      </div>

      {/* ── Metric Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total STO Orders</span>
            <FileText className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{metrics.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Cross-branch manifests</p>
        </div>

        <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700 text-xs font-bold">
            <span>In-Transit Active</span>
            <Truck className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-900 mt-2">{metrics.inTransit}</p>
          <p className="text-[11px] text-blue-600 font-medium mt-0.5">Dispatched &amp; en-route</p>
        </div>

        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
            <span>Variance Discrepancies</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-900 mt-2">{metrics.variance}</p>
          <p className="text-[11px] text-rose-600 font-medium mt-0.5">Requires manager review</p>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>Received &amp; Stocked</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-2">{metrics.completed}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Reconciled transfers</p>
        </div>
      </div>

      {/* ── Filters & Search Bar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transfer #, product name, SKU, or notes…"
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none cursor-pointer hover:border-slate-300 transition"
          >
            <option value="all">All Statuses</option>
            <option value="in_transit">In-Transit</option>
            <option value="variance_flagged">Variance Flagged</option>
            <option value="draft">Draft</option>
            <option value="requested">Requested</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* ── Transfer Manifests Table ──────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-xs font-semibold text-slate-600">Loading stock transfer orders…</p>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Boxes className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No stock transfers found</p>
            <p className="text-xs text-slate-400">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters or search query.'
                : 'Create your first inter-branch transfer order to begin.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Transfer #</th>
                  <th className="py-3 px-4">Route (Origin → Dest)</th>
                  <th className="py-3 px-4">Items &amp; Units</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransfers.map((t) => {
                  const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.draft
                  const StatusIcon = cfg.icon
                  const totalUnitsSent =
                    t.stock_transfer_items?.reduce((acc, i) => acc + i.quantity_sent, 0) || 0
                  const totalUnitsReceived =
                    t.stock_transfer_items?.reduce((acc, i) => acc + (i.quantity_received || 0), 0) || 0

                  const isSourceUser =
                    isSuperAdmin || activeBranchId === t.source_branch_id
                  const isDestUser =
                    isSuperAdmin || activeBranchId === t.destination_branch_id

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition group">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                          {t.transfer_number}
                        </div>
                        {t.notes && (
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">{t.notes}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-extrabold border border-slate-200">
                            {t.source_branch_id === 'dagupan_main' ? 'DAG' : 'MNL'}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 text-[10px] font-extrabold border border-indigo-200">
                            {t.destination_branch_id === 'dagupan_main' ? 'DAG' : 'MNL'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {t.source_branch_id === 'dagupan_main' ? 'Dagupan Main' : 'Manila'} to{' '}
                          {t.destination_branch_id === 'dagupan_main' ? 'Dagupan Main' : 'Manila'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {t.stock_transfer_items?.length || 0} product(s)
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {totalUnitsSent} units dispatched
                          {t.status === 'received' || t.status === 'variance_flagged'
                            ? ` • ${totalUnitsReceived} received`
                            : ''}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs',
                            cfg.badgeClasses
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(t.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransfer(t)
                              setIsDetailModalOpen(true)
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95 transition"
                            title="View Manifest Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Dispatch Button (Origin) */}
                          {(t.status === 'draft' || t.status === 'requested') && isSourceUser && (
                            <button
                              type="button"
                              onClick={() => handleDispatch(t)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 active:scale-95 transition shadow-2xs"
                              title="Dispatch Stock to Transit"
                            >
                              <Send className="h-3 w-3" />
                              <span>Dispatch</span>
                            </button>
                          )}

                          {/* Receive Button (Destination) */}
                          {t.status === 'in_transit' && isDestUser && (
                            <button
                              type="button"
                              onClick={() => openReceiveModal(t)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 active:scale-95 transition shadow-2xs"
                              title="Verify and Stock Items"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Receive</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: Create New Stock Transfer ──────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                  <ArrowLeftRight className="h-4 w-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  Create Inter-Branch Stock Transfer (STO)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Branch Route */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Origin / Source Branch
                  </label>
                  <select
                    value={sourceBranch}
                    onChange={(e) => setSourceBranch(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold"
                  >
                    {BRANCH_LIST.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.shortCode} — {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Destination Branch
                  </label>
                  <select
                    value={destinationBranch}
                    onChange={(e) => setDestinationBranch(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold"
                  >
                    {BRANCH_LIST.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.shortCode} — {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Manifest */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">
                    Manifest Items to Transfer
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Product</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {transferItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white shadow-2xs"
                    >
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItemRow(idx, 'product_id', e.target.value)}
                        required
                        className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold"
                      >
                        <option value="">Select product to transfer…</option>
                        {catalogProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.sku}] {p.item_name}
                          </option>
                        ))}
                      </select>

                      <div className="w-28 flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity_sent}
                          onChange={(e) =>
                            updateItemRow(idx, 'quantity_sent', Number(e.target.value))
                          }
                          required
                          placeholder="Qty"
                          className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-center font-bold outline-none focus:border-indigo-500"
                        />
                        <span className="text-[10px] text-slate-400 font-semibold">pcs</span>
                      </div>

                      {transferItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Transfer Notes / Waybill Reference
                </label>
                <textarea
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Courier tracking # or replenishment notes…"
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Create Transfer Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Receive & Verify STO ───────────────────────────────── */}
      {isReceiveModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-emerald-50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-200 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-bold text-emerald-950 text-sm">
                    Receive &amp; Verify: {selectedTransfer.transfer_number}
                  </h3>
                  <p className="text-[11px] text-emerald-700">
                    Verify physical quantities arrived at destination branch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleReceiveTransfer} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-3">
                {selectedTransfer.stock_transfer_items?.map((item) => {
                  const input = receiveItemInputs[item.id] || {
                    quantity_received: item.quantity_sent,
                    variance_reason: '',
                  }
                  const hasDiscrepancy = input.quantity_received !== item.quantity_sent

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'p-3.5 rounded-xl border transition',
                        hasDiscrepancy
                          ? 'border-rose-300 bg-rose-50/40'
                          : 'border-slate-200 bg-slate-50/60'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {item.product?.item_name || 'Item'}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            SKU: {item.product?.sku} • Sent:{' '}
                            <span className="font-bold text-indigo-700">
                              {item.quantity_sent} units
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-bold text-slate-700">Received:</label>
                          <input
                            type="number"
                            min={0}
                            value={input.quantity_received}
                            onChange={(e) =>
                              setReceiveItemInputs((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  quantity_received: Number(e.target.value),
                                },
                              }))
                            }
                            required
                            className="w-20 px-2.5 py-1.5 text-xs text-center font-bold bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Variance Reason field if quantities differ */}
                      {hasDiscrepancy && (
                        <div className="mt-2.5 pt-2 border-t border-rose-200 animate-in fade-in">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700 mb-1">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            <span>
                              Discrepancy Detected ({input.quantity_received - item.quantity_sent}{' '}
                              units). Provide Reason:
                            </span>
                          </div>
                          <input
                            type="text"
                            placeholder="e.g. 2 damaged in transit, box crushed, missing packaging…"
                            value={input.variance_reason}
                            onChange={(e) =>
                              setReceiveItemInputs((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  variance_reason: e.target.value,
                                },
                              }))
                            }
                            required
                            className="w-full px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-lg outline-none focus:border-rose-500 text-rose-900 placeholder:text-rose-300"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReceiving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isReceiving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Confirm Receipt &amp; Reconcile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Detail View ────────────────────────────────────────── */}
      {isDetailModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Transfer Manifest: {selectedTransfer.transfer_number}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Created {new Date(selectedTransfer.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Origin</span>
                  <span className="font-bold text-slate-800">
                    {selectedTransfer.source_branch_id === 'dagupan_main'
                      ? 'Dagupan Main Store (DAG)'
                      : 'Manila Operations (MNL)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Destination</span>
                  <span className="font-bold text-slate-800">
                    {selectedTransfer.destination_branch_id === 'dagupan_main'
                      ? 'Dagupan Main Store (DAG)'
                      : 'Manila Operations (MNL)'}
                  </span>
                </div>
              </div>

              {selectedTransfer.notes && (
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Notes
                  </span>
                  <p className="text-slate-700">{selectedTransfer.notes}</p>
                </div>
              )}

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                  Shipment Item Details
                </span>
                <div className="space-y-2">
                  {selectedTransfer.stock_transfer_items?.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{item.product?.item_name || 'Product'}</p>
                        <p className="text-[11px] text-slate-400">SKU: {item.product?.sku}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-800">{item.quantity_sent} sent</span>
                        {item.quantity_received !== null && (
                          <span className="block text-[11px] text-emerald-600 font-semibold">
                            {item.quantity_received} received
                          </span>
                        )}
                        {item.variance_reason && (
                          <span className="block text-[10px] text-rose-600 font-medium">
                            Variance: {item.variance_reason}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
