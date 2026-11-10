'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  Package,
  ShoppingCart,
  Wallet,
  DollarSign,
  Clock,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Receipt,
  ArrowRightLeft,
  BookOpen,
  Info,
  Lightbulb,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'

interface HelpItem {
  question: string
  answer: string
  example?: string
  tip?: string
}

interface HelpSection {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  description: string
  items: HelpItem[]
}

const helpSections: HelpSection[] = [
  {
    id: 'pos',
    title: 'POS / Cashier Terminal',
    icon: Receipt,
    color: 'rose',
    description: 'How to process walk-in retail sales, receive payments, and print receipts.',
    items: [
      {
        question: 'What is the POS Terminal and how does it work?',
        answer: 'The POS (Point of Sale) terminal is your digital cashier register for retail walk-in customers. You search or scan items, add them to the Active Cart, select the payment method (Cash, GCash, Card, Bank Transfer), and click "Complete Sale." The sale is recorded, inventory is deducted immediately, and money is credited to your POS Cash Drawer.',
        example: 'A customer buys 2 Gildan 76000 Black XL shirts at ₱350 each. Total is ₱700. Customer tenders ₱1,000 cash. Change calculated is ₱300. Click "Complete Sale" → receipt prints → 2 shirts are deducted from inventory → ₱700 cash is added to your Cash Drawer.',
      },
      {
        question: 'Where does the money go after a sale is completed?',
        answer: 'When a cashier completes a cash sale, the money immediately lands in the "POS Cash Drawer" container in the Cash Management module (Level 1 Till). If paid via GCash, it goes to your GCash Merchant account. You can view this live in Cash Management → Liquid Accounts & Vaults.',
      },
      {
        question: 'What does "Price TBD" mean on a product card?',
        answer: '"Price TBD" means "Price To Be Determined." This appears when a product has not yet been assigned a retail price. To set a price, go to Multi-Store Inventory → find the item → click the edit (pencil) icon → enter the retail price. Once saved, the POS card will display the price.',
        tip: 'Managers can batch update retail prices in Multi-Store Inventory using the Quick Batch Edit tool.',
      },
      {
        question: 'What does "Depleted" (red status) mean?',
        answer: '"Depleted" means zero available items on shelf (S_avail = 0). The item cannot be added to the cart until it is restocked. Once physical stock is counted or restocked via Multi-Store Inventory, the status will automatically change to In Stock.',
      },
      {
        question: 'How do I apply discounts (Senior / PWD / Promo)?',
        answer: 'In the Active Cart column, click the discount button. You can apply a Percentage discount (e.g. 10%), a Fixed amount discount (e.g. ₱50 off), or Senior/PWD 20% statutory discount. The discount amount is clearly displayed on the receipt.',
      },
      {
        question: 'How do barcode scanners work with the POS?',
        answer: 'Any standard USB or Bluetooth 1D/2D barcode gun works out of the box. Simply focus on the POS search bar and scan any barcode or SKU. The item is automatically located and added to the cart.',
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Multi-Store Inventory & Stock',
    icon: Package,
    color: 'emerald',
    description: 'Understanding stock levels (S_avail, S_res, S_audit), reorder levels, and categories.',
    items: [
      {
        question: 'What is Available Stock (S_avail)?',
        answer: '"Available Stock" (S_avail) is the actual physical inventory on your shelves ready for immediate sale or dispatch. Only available items can be sold in the POS.',
      },
      {
        question: 'What is Reserved Stock (S_res)?',
        answer: '"Reserved Stock" (S_res) represents units that have been committed to pending B2B sales orders or job orders that have not yet been picked up or delivered. These units are protected so they cannot be accidentally sold to walk-in customers.',
        example: 'You have 100 Gildan shirts. A client orders 40 shirts for next Monday. S_avail becomes 60, and S_res becomes 40. Walk-in cashiers can only sell up to 60.',
      },
      {
        question: 'What is Audit / Quarantine Stock (S_audit)?',
        answer: '"Audit Stock" (S_audit) is stock temporarily set aside for physical cycle counting, quality inspection, damaged items review, or warranty replacement. Items in S_audit are excluded from sale until cleared.',
      },
      {
        question: 'What is Reorder Level and Minimum Stock?',
        answer: 'The Reorder Level is your low-stock threshold (default is 10 or 24 units depending on item). When available units fall at or below this number, the system triggers a "Low Stock" alert warning you to reorder from suppliers before running out.',
      },
      {
        question: 'How are product names, variant details, and SKUs structured?',
        answer: 'Each product has 3 distinct levels:\n1. Product Name: Clean human title (e.g. Gildan 76000 Premium Adult T-Shirt)\n2. Variant Details: Structured specs badge (e.g. Color: Black • Size: 2XL • Fit: Oversized)\n3. SKU: Unique internal alphanumeric barcode code for physical tracking and scanning.',
      },
    ],
  },
  {
    id: 'cash',
    title: 'Cash Management & Liquidity',
    icon: Wallet,
    color: 'indigo',
    description: 'Vault hierarchy, Safe Drops, CRV/CDV vouchers, and shift reconciliations.',
    items: [
      {
        question: 'What is the Cash Container Hierarchy (Level 1 to Level 4)?',
        answer: 'To ensure financial security and auditability, cash flows upward through distinct tiers:\n• Level 1: POS Cash Drawer (Till at counter for daily retail sales)\n• Level 2: Manager Back-Office Safe (Secure drop container inside the office)\n• Level 3: Main Store Vault (Central branch depository)\n• Level 4: Commercial Banks (BDO, BPI, Metrobank accounts & GCash Merchants)\n\nThis separation prevents excess physical cash from accumulating at the front desk.',
      },
      {
        question: 'What is a "Safe Drop"?',
        answer: 'A Safe Drop is the procedure of transferring excess cash from the POS Cash Drawer (Level 1) to the Manager\'s Safe (Level 2). When a drawer accumulates cash above its ceiling (default ₱15,000), the system shows a "Safe Drop Required" alert. The cashier drops the cash envelope, and the manager approves it in Cash Management.',
        example: 'Your cash drawer has ₱22,000. Cashier drops ₱15,000 into the safe drop slot. Cashier keeps ₱7,000 in drawer. Manager clicks "Approve Safe Drop" in Cash Management → ₱15,000 is credited to Manager Safe.',
      },
      {
        question: 'What are CRV and CDV vouchers?',
        answer: '• CRV (Cash Receipt Voucher): Standard voucher for any incoming money (customer payment, owner capital deposit, bank withdrawal to till).\n• CDV (Cash Disbursement Voucher): Standard voucher for any outgoing money (supplier payment, utility bill, petty expense, store supplies).',
      },
      {
        question: 'How do I add, edit, or delete a Cash Container?',
        answer: 'In the "Liquid Accounts & Vaults" tab:\n• Click "+ Create Container" to add a new bank, till, or petty fund with its initial balance.\n• Click the Pencil icon on any container card to update its name, reference number, or current balance.\n• Click the Trash icon to delete a container permanently.',
      },
      {
        question: 'What is Shift Balancing / Reconciliation?',
        answer: 'At the end of every cashier shift, the cashier performs a blind cash count (counting ₱1,000, ₱500, ₱100 bills, etc.). The system compares the physical cash against expected POS sales and registers any overage or shortage for manager sign-off.',
      },
    ],
  },
  {
    id: 'financials',
    title: 'Financials, Profit & P&L Reports',
    icon: DollarSign,
    color: 'teal',
    description: 'Understanding your Gross Revenue, Net Profit, Operating Margin, and Business Health.',
    items: [
      {
        question: 'Where can I see the profit I earned?',
        answer: 'Go to Financials & P&L Reports (`/financials`). The top KPI cards display:\n• Gross Revenue: Total sales collected across both B2B orders and POS retail sales.\n• Total Expenses: All materials, utilities, rent, and operational costs.\n• Net Profit: Revenue minus Expenses. If positive, you are operating profitably!\n• Operating Margin: Net Profit divided by Gross Revenue (e.g. 35%).',
      },
      {
        question: 'How do I know if my business is earning great (AI Health Rating)?',
        answer: 'The system computes an Executive Business Health Score (0 to 100) based on your profit margin, cash flow trend, inventory turnover, and accounts receivable collection rate. It gives you a color-coded rating (Excellent 🟢, Good 🟡, Needs Attention 🟠) and plain-English recommendations.',
      },
      {
        question: 'What is Accounts Receivable?',
        answer: 'Accounts Receivable is money that customers currently owe you for completed or in-progress jobs that have not been fully paid. Keep this number low by collecting balances before delivering goods.',
      },
      {
        question: 'How do I log a business expense?',
        answer: 'In Financials, click the "+ Record Expense" button. Select the category (Materials, Logistics, Utilities, Rent, Maintenance, etc.), enter the amount, payment method, vendor name, and upload or note the receipt number.',
      },
    ],
  },
  {
    id: 'production',
    title: 'Production Queue & Job Orders',
    icon: Layers,
    color: 'violet',
    description: '7-stage tracking for sublimation, silkscreen, embroidery, UV flatbed, and signage jobs.',
    items: [
      {
        question: 'What are the 7 stages of a Job Order?',
        answer: 'Every custom printing order progresses through 7 transparent stages:\n1. Received (Job created and queued)\n2. Art Approval (Graphic artist proofing client design)\n3. Pre-Press (Film output, screens burnt, or sublimation paper ripped)\n4. In Production (Printing, pressing, or sewing on machine)\n5. Quality Check (Inspector verifies stitching, color alignment, counts)\n6. Ready for Pickup (Packed and waiting for client)\n7. Delivered / Completed (Client picked up or courier dispatched)',
      },
      {
        question: 'How does a job order link to inventory?',
        answer: 'When a job order is created for 100 shirts, the system reserves 100 blank shirts from Multi-Store Inventory (increasing S_res and decreasing S_avail). When completed, the reserved stock is consumed.',
      },
    ],
  },
  {
    id: 'sales',
    title: 'Sales Orders & Quotations',
    icon: ShoppingCart,
    color: 'blue',
    description: 'B2B commercial contracts, corporate invoices, and credit terms.',
    items: [
      {
        question: 'How is a Sales Order different from a POS sale?',
        answer: 'POS is for instant retail counter checkout. Sales Orders are for commercial clients (schools, corporations, brands) who require formal quotations, down payments (e.g. 50% deposit), job production queues, and terms before delivery.',
      },
      {
        question: 'How do down payments work?',
        answer: 'You can record an initial deposit (e.g. 50%) when confirming a Sales Order. The order status updates to "Partial Payment," and the remaining amount stays in Accounts Receivable until the client pays the balance upon final turnover.',
      },
    ],
  },
  {
    id: 'payroll',
    title: 'Attendance & Payroll (DTR)',
    icon: Clock,
    color: 'cyan',
    description: 'Daily Time Record (DTR), salary calculation, PhilHealth/SSS deductions, and disbursement.',
    items: [
      {
        question: 'What is DTR?',
        answer: 'DTR stands for Daily Time Record. It tracks employee clock-in and clock-out timestamps, overtime hours, tardiness, and absences.',
      },
      {
        question: 'How is Net Pay computed?',
        answer: 'Net Pay = (Basic Salary + Overtime Pay + Allowances) - (Late Deductions + SSS + PhilHealth + Pag-IBIG + Cash Advance). You can disburse payroll via Cash, GCash, or Bank Transfer.',
      },
    ],
  },
  {
    id: 'transfers',
    title: 'Stock Transfers (STO)',
    icon: ArrowRightLeft,
    color: 'amber',
    description: 'Inter-branch stock movements between Dagupan and Manila.',
    items: [
      {
        question: 'How do I transfer stock between Dagupan and Manila?',
        answer: 'Go to Stock Transfers (STO) → click "+ New Transfer Request" → choose Source Branch and Destination Branch → select products and quantities → Dispatch. The items enter "In-Transit" status. When received at the destination branch, click "Confirm Receipt" to add the stock to the destination inventory.',
      },
    ],
  },
]

function HelpSectionCard({ section, searchQuery }: { section: HelpSection; searchQuery: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [openItem, setOpenItem] = useState<number | null>(null)
  const Icon = section.icon

  const colorMap: Record<string, string> = {
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  }

  const iconColorMap: Record<string, string> = {
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    teal: 'text-teal-600',
    indigo: 'text-indigo-600',
    violet: 'text-violet-600',
    blue: 'text-blue-600',
    cyan: 'text-cyan-600',
  }

  const filteredItems = searchQuery.trim()
    ? section.items.filter(
        (item) =>
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : section.items

  if (searchQuery.trim() && filteredItems.length === 0) return null

  const shouldBeOpen = searchQuery.trim() ? true : isOpen

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden transition hover:border-zinc-300">
      {/* Section Header */}
      <button
        type="button"
        onClick={() => !searchQuery.trim() && setIsOpen(!isOpen)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-zinc-50/70 transition"
      >
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${colorMap[section.color]} shadow-2xs`}>
          <Icon className={`h-5 w-5 ${iconColorMap[section.color]}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-zinc-900">{section.title}</h3>
          <p className="text-xs text-zinc-500 truncate">{section.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">
            {filteredItems.length} topics
          </span>
          {!searchQuery.trim() && (
            shouldBeOpen ? (
              <ChevronUp className="h-4 w-4 text-zinc-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            )
          )}
        </div>
      </button>

      {/* FAQ Items */}
      {shouldBeOpen && (
        <div className="border-t border-zinc-100 divide-y divide-zinc-100 bg-zinc-50/30">
          {filteredItems.map((item, idx) => (
            <div key={idx} className="px-5 transition hover:bg-white">
              <button
                type="button"
                onClick={() => setOpenItem(openItem === idx ? null : idx)}
                className="w-full flex items-center justify-between gap-3 py-3.5 text-left"
              >
                <span className="text-sm font-bold text-zinc-900">{item.question}</span>
                {openItem === idx ? (
                  <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                )}
              </button>

              {openItem === idx && (
                <div className="pb-4 space-y-3 animate-in fade-in duration-150">
                  {/* Answer */}
                  <div className="flex gap-2.5">
                    <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">{item.answer}</p>
                  </div>

                  {/* Example */}
                  {item.example && (
                    <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-3.5 flex gap-2.5">
                      <BookOpen className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800 mb-0.5">Real Example</p>
                        <p className="text-xs text-blue-900 leading-relaxed">{item.example}</p>
                      </div>
                    </div>
                  )}

                  {/* Tip */}
                  {item.tip && (
                    <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3.5 flex gap-2.5">
                      <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-0.5">Pro Tip</p>
                        <p className="text-xs text-amber-900 leading-relaxed">{item.tip}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function HelpView() {
  const [searchQuery, setSearchQuery] = useState('')

  const totalTopics = useMemo(() => helpSections.reduce((sum, s) => sum + s.items.length, 0), [])

  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return totalTopics
    return helpSections.reduce((sum, s) => {
      return (
        sum +
        s.items.filter(
          (item) =>
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ).length
      )
    }, 0)
  }, [searchQuery, totalTopics])

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 border border-sky-200 text-sky-700 shadow-2xs">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">System Help & Knowledge Base</h1>
              <p className="text-xs text-zinc-500">
                Clear definitions, workflows, and step-by-step guidance for every JAPA Core ERP module.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-sky-50 border border-sky-200 px-3.5 py-1.5 text-xs font-bold text-sky-800">
          <CheckCircle2 className="h-4 w-4 text-sky-600" />
          <span>{totalTopics} Guides Available</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search topics... (e.g., 'Safe Drop', 'profit', 'S_avail', 'reorder level', 'barcode', 'DTR')"
          className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 shadow-sm"
        />
        {searchQuery && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
            {matchCount} match{matchCount !== 1 ? 'es' : ''}
          </div>
        )}
      </div>

      {/* Quick Suggestion Pills */}
      {!searchQuery && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400">Popular:</span>
          {[
            'What is S_avail?',
            'What is a Safe Drop?',
            'Where does POS cash go?',
            'How is profit calculated?',
            'What is CRV and CDV?',
          ].map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => setSearchQuery(pill.replace(/^What is |^How is |^Where does /i, '').replace('?', '').trim())}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-800 transition"
            >
              {pill}
            </button>
          ))}
        </div>
      )}

      {/* Help Sections Accordions */}
      <div className="space-y-3">
        {matchCount === 0 && searchQuery && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
            <HelpCircle className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-zinc-700">No results found for &ldquo;{searchQuery}&rdquo;</p>
            <p className="text-xs text-zinc-400 mt-1">Try keywords like &ldquo;cash&rdquo;, &ldquo;stock&rdquo;, &ldquo;profit&rdquo;, or &ldquo;payroll&rdquo;</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 transition"
            >
              Reset Search
            </button>
          </div>
        )}

        {helpSections.map((section) => (
          <HelpSectionCard key={section.id} section={section} searchQuery={searchQuery} />
        ))}
      </div>
    </div>
  )
}
