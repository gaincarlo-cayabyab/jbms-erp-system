'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import DashboardShell from '@/components/dashboard-shell'
import POSProductCatalog from './pos-product-catalog'
import POSCart from './pos-cart'
import POSCheckoutPanel, { type FulfillmentData } from './pos-checkout-panel'
import POSTransactionModal from './pos-transaction-modal'
import POSReceiptModal from './pos-receipt-modal'
import DrawerCashInOutModal from '@/components/cash-management/drawer-cash-in-out-modal'
import { createClient } from '@/lib/supabase/client'
import type { POSProduct, CartItem, CartDiscount, PaymentMethod, Transaction } from '@/types/pos'
import type { Customer } from '@/types/customer'
import { DEFAULT_POS_PRODUCTS } from '@/types/pos'
import { Package, ShoppingCart, CreditCard, ArrowRight, Plus, Wallet, Coins } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { requestAppFullscreen } from '@/components/ui/auto-fullscreen'

// ─── Currency Formatter (Non-VAT / Gross Pricing) ─────────────────────────────
const PHP = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

function generateInvoiceNo(): string {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const seq = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')
  return `INV-${datePart}-${seq}`
}

export default function POSView() {
  const [products, setProducts] = useState<POSProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartDiscount, setCartDiscount] = useState<CartDiscount | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [activeBranch, setActiveBranch] = useState<'JAPA Dagupan (Main Branch)' | 'JAPA Manila'>('JAPA Dagupan (Main Branch)')

  // Tablet Portrait / Mobile Navigation State (< 1024px)
  const [tabletTab, setTabletTab] = useState<'catalog' | 'cart' | 'checkout'>('catalog')

  // Transaction flow state
  const [processingTransaction, setProcessingTransaction] = useState<Transaction | null>(null)
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [drawerCashModalOpen, setDrawerCashModalOpen] = useState(false)

  // ── Load products from Supabase ───────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const branchId = activeBranch === 'JAPA Dagupan (Main Branch)' ? 'dagupan_main' : 'manila_branch'

      // Fetch all products in 3 parallel batches
      const [b1, b2, b3] = await Promise.all([
        supabase.from('products_and_inventory').select('*').order('sku', { ascending: true }).range(0, 999),
        supabase.from('products_and_inventory').select('*').order('sku', { ascending: true }).range(1000, 1999),
        supabase.from('products_and_inventory').select('*').order('sku', { ascending: true }).range(2000, 2999),
      ])

      let allProds = [...(b1.data || []), ...(b2.data || []), ...(b3.data || [])] as POSProduct[]

      // Fetch branch-specific inventory quantities
      const [sb1, sb2, sb3] = await Promise.all([
        supabase.from('inventory_stock').select('product_id, quantity_on_hand, reorder_level').eq('branch_id', branchId).range(0, 999),
        supabase.from('inventory_stock').select('product_id, quantity_on_hand, reorder_level').eq('branch_id', branchId).range(1000, 1999),
        supabase.from('inventory_stock').select('product_id, quantity_on_hand, reorder_level').eq('branch_id', branchId).range(2000, 2999),
      ])

      const branchStocks = [...(sb1.data || []), ...(sb2.data || []), ...(sb3.data || [])]
      if (branchStocks.length > 0) {
        const stockMap = new Map(branchStocks.map((s) => [s.product_id, s]))
        allProds = allProds.map((p) => {
          const bs = stockMap.get(p.id)
          if (bs) {
            return {
              ...p,
              stock_quantity: bs.quantity_on_hand,
              reorder_level: bs.reorder_level ?? p.reorder_level,
            }
          }
          return p
        })
      }

      if (allProds.length === 0) {
        setProducts(DEFAULT_POS_PRODUCTS)
      } else {
        setProducts(allProds)
      }
    } catch {
      setProducts(DEFAULT_POS_PRODUCTS)
    } finally {
      setIsLoading(false)
    }
  }, [activeBranch])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Automatically request fullscreen mode ASAP when POS mounts or on first interaction
  useEffect(() => {
    requestAppFullscreen()

    const onUserInteraction = () => {
      requestAppFullscreen()
    }

    window.addEventListener('pointerdown', onUserInteraction, { capture: true, passive: true })
    window.addEventListener('touchstart', onUserInteraction, { capture: true, passive: true })
    window.addEventListener('click', onUserInteraction, { capture: true, passive: true })

    return () => {
      window.removeEventListener('pointerdown', onUserInteraction, { capture: true })
      window.removeEventListener('touchstart', onUserInteraction, { capture: true })
      window.removeEventListener('click', onUserInteraction, { capture: true })
    }
  }, [])

  // Realtime sync — refresh POS catalog when inventory or branch stock changes (edits, deletions, stock adjustments, branch sales)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`pos-inventory-realtime-${activeBranch}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products_and_inventory' },
        () => { loadProducts() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_stock' },
        () => { loadProducts() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadProducts, activeBranch])

  // ── Cart Operations ────────────────────────────────────────────────────────
  function addToCart(product: POSProduct) {
    if (product.stock_quantity <= 0) {
      toast.error(`"${product.item_name}" is out of stock.`)
      return
    }
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id)
      if (idx >= 0) {
        const updated = [...prev]
        const existing = updated[idx]
        if (existing.quantity >= product.stock_quantity) {
          toast.error(`Only ${product.stock_quantity} units in stock.`)
          return prev
        }
        updated[idx] = { ...existing, quantity: existing.quantity + 1 }
        return updated
      }
      return [...prev, { product, quantity: 1, unitPrice: product.unit_price, lineDiscount: 0 }]
    })
  }

  function removeFromCart(productId: string) {
    setCartItems((prev) => prev.filter((i) => i.product.id !== productId))
  }

  function updateQuantity(productId: string, qty: number) {
    if (qty < 1) { removeFromCart(productId); return }
    setCartItems((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: Math.min(qty, i.product.stock_quantity) }
          : i
      )
    )
  }

  function overridePrice(productId: string, newPrice: number) {
    setCartItems((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, unitPrice: Math.max(0, newPrice) } : i
      )
    )
  }

  function applyLineDiscount(productId: string, discountAmt: number) {
    setCartItems((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, lineDiscount: Math.max(0, discountAmt) } : i
      )
    )
  }

  function clearCart() {
    setCartItems([])
    setCartDiscount(null)
  }

  // ── Totals Calculation ─────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity - item.lineDiscount,
      0
    )

    let discountAmount = 0
    if (cartDiscount) {
      if (cartDiscount.type === 'percentage') {
        discountAmount = subtotal * (cartDiscount.value / 100)
      } else if (cartDiscount.type === 'fixed') {
        discountAmount = Math.min(cartDiscount.value, subtotal)
      } else if (cartDiscount.type === 'senior_pwd') {
        // Direct 20% discount on subtotal (Non-VAT)
        discountAmount = subtotal * 0.20
      }
    }

    const grandTotal = Math.max(subtotal - discountAmount, 0)
    return { subtotal, discountAmount, vatAmount: 0, grandTotal }
  }, [cartItems, cartDiscount])

  const totalItemCount = useMemo(() => {
    return cartItems.reduce((acc, i) => acc + i.quantity, 0)
  }, [cartItems])

  // ── Checkout ───────────────────────────────────────────────────────────────
  function handleCheckout(paymentMethod: PaymentMethod, amountTendered: number, fulfillmentData: FulfillmentData) {
    if (cartItems.length === 0) { toast.error('Cart is empty.'); return }

    const custName = selectedCustomer?.name || fulfillmentData.customerName || (fulfillmentData.fulfillmentType === 'walk_in' ? 'Walk-in Customer' : undefined)
    const custPhone = selectedCustomer?.contact_number || fulfillmentData.customerPhone || undefined

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      invoiceNo: generateInvoiceNo(),
      branchName: activeBranch,
      cashierName: 'JAPA Cashier',
      items: cartItems,
      subtotal: totals.subtotal,
      totalDiscount: totals.discountAmount,
      vatAmount: totals.vatAmount,
      grandTotal: totals.grandTotal,
      amountTendered,
      changeDue: Math.max(0, amountTendered - totals.grandTotal),
      paymentMethod,
      createdAt: new Date(),
      // Fulfillment
      orderType:         'sale',
      fulfillmentType:   fulfillmentData.fulfillmentType,
      fulfillmentStatus: fulfillmentData.fulfillmentStatus,
      paymentTerms:      fulfillmentData.paymentTerms,
      amountPaid:        fulfillmentData.amountPaid,
      balanceDue:        fulfillmentData.balanceDue,
      pickupDate:        fulfillmentData.pickupDate,
      customerInfo: custName
        ? {
            id: selectedCustomer?.id || fulfillmentData.customerId || undefined,
            name: custName,
            phone: custPhone,
            loyaltyTier: selectedCustomer?.loyalty_tier || fulfillmentData.customerLoyaltyTier,
            customerType: selectedCustomer?.customer_type,
            totalOrders: selectedCustomer?.total_orders,
            totalSpent: selectedCustomer?.total_spent,
          }
        : undefined,
      deliveryDetails: fulfillmentData.deliveryDetails,
    }

    setProcessingTransaction(transaction)
    setShowTransactionModal(true)
  }

  async function handleSaveQuotation(fulfillmentData: FulfillmentData) {
    if (cartItems.length === 0) { toast.error('Cart is empty.'); return }
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const now = new Date()
      const qtNo = `QT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`
      const { error } = await supabase.from('sales_orders').insert({
        order_number:       qtNo,
        total_amount:       totals.grandTotal,
        payment_status:     'Pending',
        order_status:       'Draft',
        branch:             activeBranch,
        order_type:         'quotation',
        fulfillment_type:   fulfillmentData.fulfillmentType,
        fulfillment_status: 'draft',
        payment_terms:      'quotation_unpaid',
        amount_paid:        0,
        balance_due:        totals.grandTotal,
        customer_id:        selectedCustomer?.id || fulfillmentData.customerId || null,
        recipient_name:     selectedCustomer?.name || fulfillmentData.customerName || null,
        recipient_phone:    selectedCustomer?.contact_number || fulfillmentData.customerPhone || null,
      })
      if (error) {
        toast.error('Failed to save quotation. Please try again.')
      } else {
        toast.success(`Quotation saved — ${qtNo}`, { duration: 4000 })
        clearCart()
        setSelectedCustomer(null)
        setTabletTab('catalog')
      }
    } catch {
      toast.error('Could not save quotation.')
    }
  }

  function onTransactionComplete(transaction: Transaction) {
    setShowTransactionModal(false)
    setProcessingTransaction(null)
    setCompletedTransaction(transaction)
    setShowReceiptModal(true)
    clearCart()
    setSelectedCustomer(null)
    setTabletTab('catalog')
    // Refresh products to reflect deducted stock
    loadProducts()
  }

  function onNewSale() {
    setShowReceiptModal(false)
    setCompletedTransaction(null)
    setTabletTab('catalog')
  }

  return (
    <DashboardShell>
      <div className="flex flex-col h-full bg-slate-50 relative select-none">
        {/* POS Subheader Bar */}
        <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 bg-white border-b border-slate-200 shadow-xs shrink-0 gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs sm:text-sm font-bold text-slate-800">POS Terminal</span>
            {/* Branch Selector Pills */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
              {(['JAPA Dagupan (Main Branch)', 'JAPA Manila'] as const).map((branch) => (
                <button
                  key={branch}
                  onClick={() => setActiveBranch(branch)}
                  className={`px-2.5 sm:px-3 py-1 transition ${
                    activeBranch === branch
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {branch === 'JAPA Dagupan (Main Branch)' ? 'Dagupan' : 'Manila'}
                </button>
              ))}
            </div>

            <Link
              href="/cash-management"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
              title="Open Cash Management & Treasury"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>Cash & Safe Drop</span>
            </Link>

            <button
              type="button"
              onClick={() => setDrawerCashModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800 hover:bg-rose-100 transition shadow-2xs active:scale-95"
              title="Disburse cash from drawer (Courier, COD, Supplies) or Cash In float"
            >
              <Coins className="h-3.5 w-3.5 text-rose-600" />
              <span>Paid Out / In</span>
            </button>
          </div>

          {/* Quick Tablet Portrait View Selector (visible below lg: 1024px) */}
          <div className="flex lg:hidden rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setTabletTab('catalog')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 transition',
                tabletTab === 'catalog'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Package className="h-3.5 w-3.5" />
              <span>Catalog</span>
            </button>

            <button
              onClick={() => setTabletTab('cart')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 transition relative',
                tabletTab === 'cart'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Cart</span>
              {totalItemCount > 0 && (
                <span className="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {totalItemCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setTabletTab('checkout')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 transition',
                tabletTab === 'checkout'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Pay</span>
              {totals.grandTotal > 0 && (
                <span className="hidden sm:inline font-mono text-[10px] text-indigo-700 font-extrabold">
                  {PHP.format(totals.grandTotal)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Desktop & Tablet Landscape View (>= 1024px / Samsung Tab A8 Landscape 1280x800) ── */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          {/* Left: Product Catalog */}
          <div className="w-[45%] xl:w-[48%] border-r border-slate-200 overflow-hidden flex flex-col">
            <POSProductCatalog
              products={products}
              isLoading={isLoading}
              onAddToCart={addToCart}
              cartItems={cartItems}
            />
          </div>

          {/* Center: Active Cart */}
          <div className="flex-1 border-r border-slate-200 overflow-hidden flex flex-col min-w-[280px]">
            <POSCart
              items={cartItems}
              cartDiscount={cartDiscount}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              onRemove={removeFromCart}
              onUpdateQuantity={updateQuantity}
              onOverridePrice={overridePrice}
              onApplyLineDiscount={applyLineDiscount}
              onSetCartDiscount={setCartDiscount}
              onClearCart={clearCart}
            />
          </div>

          {/* Right: Order Summary & Checkout */}
          <div className="w-72 xl:w-80 shrink-0 overflow-hidden flex flex-col">
            <POSCheckoutPanel
              totals={totals}
              itemCount={cartItems.length}
              cartDiscount={cartDiscount}
              onSetCartDiscount={setCartDiscount}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              onCheckout={handleCheckout}
              onSaveQuotation={handleSaveQuotation}
            />
          </div>
        </div>

        {/* ── Tablet Portrait & Mobile View (< 1024px / Samsung Tab A8 Portrait 800x1280) ── */}
        <div className="flex-1 lg:hidden overflow-hidden flex flex-col relative">
          {/* Tab 1: Catalog */}
          {tabletTab === 'catalog' && (
            <div className="flex-1 overflow-hidden flex flex-col pb-16">
              <POSProductCatalog
                products={products}
                isLoading={isLoading}
                onAddToCart={addToCart}
                cartItems={cartItems}
              />

              {/* Floating Bottom Action Bar on Catalog when items exist */}
              {cartItems.length > 0 && (
                <div className="absolute bottom-0 inset-x-0 bg-indigo-700 text-white px-4 py-2.5 shadow-lg flex items-center justify-between z-20 border-t border-indigo-500">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-indigo-100">
                        {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in cart
                      </p>
                      <p className="text-sm font-extrabold tabular-nums">
                        {PHP.format(totals.grandTotal)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setTabletTab('cart')}
                    className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-indigo-700 shadow-sm active:scale-95 transition"
                  >
                    <span>View Cart</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Cart */}
          {tabletTab === 'cart' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
                <button
                  onClick={() => setTabletTab('catalog')}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add More Products</span>
                </button>
                <span className="text-xs text-slate-500 font-medium">
                  {cartItems.length} lines • {totalItemCount} units
                </span>
              </div>
              <POSCart
                items={cartItems}
                cartDiscount={cartDiscount}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                onRemove={removeFromCart}
                onUpdateQuantity={updateQuantity}
                onOverridePrice={overridePrice}
                onApplyLineDiscount={applyLineDiscount}
                onSetCartDiscount={setCartDiscount}
                onClearCart={clearCart}
                onProceedToCheckout={() => setTabletTab('checkout')}
                grandTotal={totals.grandTotal}
              />
            </div>
          )}

          {/* Tab 3: Checkout */}
          {tabletTab === 'checkout' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <POSCheckoutPanel
                totals={totals}
                itemCount={cartItems.length}
                cartDiscount={cartDiscount}
                onSetCartDiscount={setCartDiscount}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                onCheckout={handleCheckout}
                onSaveQuotation={handleSaveQuotation}
                onBackToCart={() => setTabletTab('cart')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Transaction Processing Modal */}
      {showTransactionModal && processingTransaction && (
        <POSTransactionModal
          transaction={processingTransaction}
          onComplete={onTransactionComplete}
        />
      )}

      {/* Receipt Modal */}
      {showReceiptModal && completedTransaction && (
        <POSReceiptModal
          transaction={completedTransaction}
          onNewSale={onNewSale}
        />
      )}

      {/* Till Cash In / Paid Out Modal */}
      <DrawerCashInOutModal
        isOpen={drawerCashModalOpen}
        branchId={activeBranch === 'JAPA Dagupan (Main Branch)' ? 'dagupan_main' : 'manila_branch'}
        onClose={() => setDrawerCashModalOpen(false)}
        onSuccess={() => {
          setDrawerCashModalOpen(false)
          toast.success('Till cash transaction recorded successfully.')
        }}
      />
    </DashboardShell>
  )
}
