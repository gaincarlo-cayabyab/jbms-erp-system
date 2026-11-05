'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import DashboardShell from '@/components/dashboard-shell'
import POSProductCatalog from './pos-product-catalog'
import POSCart from './pos-cart'
import POSCheckoutPanel from './pos-checkout-panel'
import POSTransactionModal from './pos-transaction-modal'
import POSReceiptModal from './pos-receipt-modal'
import { createClient } from '@/lib/supabase/client'
import type { POSProduct, CartItem, CartDiscount, PaymentMethod, Transaction } from '@/types/pos'
import { Maximize2, Minimize2 } from 'lucide-react'

// ─── VAT Rate ─────────────────────────────────────────────────────────────────
const VAT_RATE = 0.12

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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeBranch, setActiveBranch] = useState<'JAPA Dagupan (Main Branch)' | 'JAPA Manila'>('JAPA Dagupan (Main Branch)')

  // Transaction flow state
  const [processingTransaction, setProcessingTransaction] = useState<Transaction | null>(null)
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  // ── Load products from Supabase ───────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('item_name', { ascending: true })
      if (error) throw error
      setProducts((data as POSProduct[]) ?? [])
    } catch {
      toast.error('Failed to load product catalog. Check Supabase connection.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // ── Fullscreen API ─────────────────────────────────────────────────────────
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  useEffect(() => {
    function onFSChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFSChange)
    return () => document.removeEventListener('fullscreenchange', onFSChange)
  }, [])

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
        // Remove VAT first, then apply 20%
        const vatExclusive = subtotal / (1 + VAT_RATE)
        discountAmount = vatExclusive * 0.20
      }
    }

    const discountedSubtotal = Math.max(subtotal - discountAmount, 0)
    const vatAmount = discountedSubtotal * VAT_RATE / (1 + VAT_RATE)  // VAT-inclusive breakdown
    const grandTotal = discountedSubtotal

    return { subtotal, discountAmount, vatAmount, grandTotal }
  }, [cartItems, cartDiscount])

  // ── Checkout ───────────────────────────────────────────────────────────────
  function handleCheckout(paymentMethod: PaymentMethod, amountTendered: number) {
    if (cartItems.length === 0) { toast.error('Cart is empty.'); return }
    if (amountTendered < totals.grandTotal) { toast.error('Insufficient tendered amount.'); return }

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
      changeDue: amountTendered - totals.grandTotal,
      paymentMethod,
      createdAt: new Date(),
    }

    setProcessingTransaction(transaction)
    setShowTransactionModal(true)
  }

  function onTransactionComplete(transaction: Transaction) {
    setShowTransactionModal(false)
    setProcessingTransaction(null)
    setCompletedTransaction(transaction)
    setShowReceiptModal(true)
    clearCart()
    // Refresh products to reflect deducted stock
    loadProducts()
  }

  function onNewSale() {
    setShowReceiptModal(false)
    setCompletedTransaction(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardShell>
      <div
        ref={containerRef}
        className="flex flex-col h-full bg-slate-50 relative"
      >
        {/* POS Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-800">Cashier / POS Terminal</span>
            {/* Branch Toggle */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
              {(['JAPA Dagupan (Main Branch)', 'JAPA Manila'] as const).map((branch) => (
                <button
                  key={branch}
                  onClick={() => setActiveBranch(branch)}
                  className={`px-3 py-1.5 transition ${
                    activeBranch === branch
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {branch === 'JAPA Dagupan (Main Branch)' ? 'Dagupan' : 'Manila'}
                </button>
              ))}
            </div>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (Kiosk Mode)'}
          >
            {isFullscreen ? (
              <><Minimize2 className="h-3.5 w-3.5" /> Exit Fullscreen</>
            ) : (
              <><Maximize2 className="h-3.5 w-3.5" /> Fullscreen</>
            )}
          </button>
        </div>

        {/* Three-Panel POS Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Product Catalog */}
          <div className="w-[42%] border-r border-slate-200 overflow-hidden flex flex-col">
            <POSProductCatalog
              products={products}
              isLoading={isLoading}
              onAddToCart={addToCart}
              cartItems={cartItems}
            />
          </div>

          {/* Center: Cart */}
          <div className="flex-1 border-r border-slate-200 overflow-hidden flex flex-col">
            <POSCart
              items={cartItems}
              cartDiscount={cartDiscount}
              onRemove={removeFromCart}
              onUpdateQuantity={updateQuantity}
              onOverridePrice={overridePrice}
              onApplyLineDiscount={applyLineDiscount}
              onSetCartDiscount={setCartDiscount}
              onClearCart={clearCart}
            />
          </div>

          {/* Right: Order Summary & Checkout */}
          <div className="w-72 shrink-0 overflow-hidden flex flex-col">
            <POSCheckoutPanel
              totals={totals}
              itemCount={cartItems.length}
              cartDiscount={cartDiscount}
              onCheckout={handleCheckout}
            />
          </div>
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
    </DashboardShell>
  )
}

