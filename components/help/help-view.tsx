'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Package,
  ShoppingCart,
  Wallet,
  DollarSign,
  Layers,
  ArrowLeftRight,
  Clock,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info,
  BookOpen,
  Lightbulb,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Receipt,
  Eye,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

interface HelpItem {
  question: string
  answer: string
  example?: string
  tip?: string
}

interface HelpSection {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: 'rose' | 'amber' | 'emerald' | 'teal' | 'indigo' | 'violet' | 'blue' | 'cyan'
  items: HelpItem[]
}

// ── Role-to-Section Mapping ──────────────────────────────────────────────────
// Each role only sees documentation for the modules they have permissions for.
const ROLE_ALLOWED_SECTIONS: Record<string, string[]> = {
  Admin: ['pos', 'inventory', 'cash', 'financials', 'payroll', 'production', 'sales', 'transfers'],
  Manager: ['pos', 'inventory', 'cash', 'production', 'sales', 'transfers'],
  Cashier: ['pos'],
  Inventory: ['inventory', 'transfers', 'production'],
  Staff: ['production', 'inventory'],
}

const ROLE_INFO: Record<string, { label: string; badgeClass: string; desc: string }> = {
  Admin: {
    label: 'Administrator (Executive Access)',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    desc: 'You have full administrative authorization across all system modules, P&L reports, payroll, and compliance.',
  },
  Manager: {
    label: 'Store Manager',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    desc: 'Showing guides for retail POS, inventory control, cash management, production queues, and stock transfers.',
  },
  Cashier: {
    label: 'Cashier / POS Terminal',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    desc: 'Showing guide topics specifically tailored for retail checkout, barcode guns, cart discounts, and cash drawer operations.',
  },
  Inventory: {
    label: 'Inventory Specialist',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    desc: 'Showing guide topics for multi-store catalog management, shelf counts (S_avail), and branch STO transfers.',
  },
  Staff: {
    label: 'Production Staff',
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-300',
    desc: 'Showing guide topics for job orders, 7-stage printing workflows, and raw materials stock consumption.',
  },
}

function normalizeUserRole(rawRole: string | undefined | null): string {
  if (!rawRole) return 'Admin'
  if (rawRole === 'Production_Staff' || rawRole === 'Staff') return 'Staff'
  if (rawRole === 'Store_Manager' || rawRole === 'Manager') return 'Manager'
  if (rawRole === 'Cashier') return 'Cashier'
  if (rawRole === 'Inventory') return 'Inventory'
  if (rawRole === 'Admin' || rawRole === 'Accountant') return 'Admin'
  return 'Admin'
}

const helpSections: HelpSection[] = [
  {
    id: 'pos',
    title: 'POS / Cashier Terminal',
    description: 'How to process walk-in retail sales, receive payments, and print receipts.',
    icon: ShoppingCart,
    color: 'rose',
    items: [
      {
        question: 'Where does the money go when a cashier processes a sale?',
        answer: 'Every completed POS transaction automatically credits the active branch’s primary Cash Drawer container. In the database, a transaction record is created with flow_type="inflow", source_module="pos", and payment_method="cash" (or "gcash", etc.). At the end of the shift, the cash in the drawer is reconciled against these records.',
        example: 'A customer buys 2 Caps for ₱500 total cash. The POS creates a cash_transactions row for +₱500 tied to "Main Register Drawer (Dagupan)" and updates the drawer balance.',
        tip: 'Cashiers do not touch the main store vault directly. All drawer cash over the float ceiling is moved via a Safe Drop.',
      },
      {
        question: 'What is a "Safe Drop" in the POS?',
        answer: 'A Safe Drop is an operational transfer of excess physical cash from the front cashier drawer to the store manager safe. It reduces cash risk at the front desk.',
        example: 'The cashier drawer has ₱18,500. The ceiling is ₱5,000. The cashier clicks "Safe Drop", enters ₱13,000, and hands the envelope to the Manager. The manager accepts the drop in Cash Management.',
        tip: 'Pending safe drops will show in the Cash Management dashboard until approved by a Manager.',
      },
      {
        question: 'How do I use a Barcode Scanner with the POS?',
        answer: 'Ensure your barcode scanner is plugged in and recognized as a USB Keyboard (HID). On the POS screen, simply point the scanner at the item tag and pull the trigger. The POS automatically detects the barcode string, looks up the SKU, and increments the cart quantity by 1 with an audio chime.',
        tip: 'If scanning fails, type the SKU or product name directly into the search bar at the top of the POS window.',
      },
      {
        question: 'Why does an item show "Price TBD" on the POS?',
        answer: 'Items with a retail_price of ₱0.00 or NULL in the catalog display "Price TBD" (Price To Be Determined). When added to the cart, the cashier will be prompted to enter the approved selling price before checkout can proceed.',
        example: 'A custom sublimation jersey without fixed price is scanned. The cashier enters ₱350 as instructed by the job quotation.',
      },
      {
        question: 'How do I apply Senior Citizen or PWD discounts?',
        answer: 'In the POS cart footer, click the "Discount" selector. Choose "Senior/PWD (20%)" or "Special Promo". The system recalculates VAT exemption and deducts 20% from eligible retail items. The customer OSCA/PWD ID number should be entered in the receipt note.',
      },
      {
        question: 'What happens if the register is short or over at the end of the day?',
        answer: 'At shift close, the cashier performs a Drawer Reconciliation. They count all physical bills and coins. If the physical count does not match the system expected balance, a discrepancy is logged as "Cash Shortage" or "Cash Overage" for manager audit review.',
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Multi-Store Inventory & Stock',
    description: 'Understanding stock levels (S_avail, S_res, S_audit), reorder levels, and categories.',
    icon: Package,
    color: 'emerald',
    items: [
      {
        question: 'What is S_avail, S_res, and S_audit?',
        answer: 'These are the three fundamental inventory metrics in JAPA Core ERP:\n• S_avail (Available on Shelves): Physical units present and available for immediate walk-in sale or new production.\n• S_res (Reserved Stock): Units already allocated to an active Job Order or unfulfilled customer quotation.\n• S_audit (Physical Audit Discrepancy): Variance between ERP recorded count and the actual physical stock count.',
        example: 'If you have 100 Black Shirts on shelf and 30 are reserved for a confirmed printing job order, S_avail is 70 and S_res is 30.',
        tip: 'Never sell items when S_avail is 0, even if the total physical box has shirts inside—those may be reserved for a printing client!',
      },
      {
        question: 'What is the difference between Product and SKU?',
        answer: '• Product: The overarching merchandise concept or style (e.g., "Acid Wash Bucket Hat").\n• SKU (Stock-Keeping Unit): The specific unique barcode/identifier for a particular variant, color, and size (e.g., "CAP-BUCKET-ACID-BLK-MD").\nEach SKU has its own individual stock count, cost price, and barcode.',
      },
      {
        question: 'How do Reorder Levels and Low Stock Alerts work?',
        answer: 'Each SKU has a minimum threshold called "Reorder Level" (default is 10 units). Whenever S_avail falls to or below this threshold, the item is automatically flagged with an amber "Low Stock" warning and surfaced on the Executive Dashboard.',
        tip: 'You can adjust the reorder level per item by clicking the Pencil (Edit) icon in the Multi-Store Inventory catalog.',
      },
      {
        question: 'Why does Multi-Store Inventory show 0 stock after resetting demo data?',
        answer: 'Demo stock balances were cleared so you can conduct an accurate initial physical count. To input your real stock, click "+ Add New Record" or click "Adjust" on any SKU to enter the verified shelf count.',
      },
      {
        question: 'How do multi-store branches handle stock?',
        answer: 'Each branch (Dagupan Main and Manila Branch) maintains its own independent shelf count in the `inventory_stock` table. Use the Store Switcher dropdown in the top header to view branch-specific stock or select "All Stores - Consolidated" for enterprise totals.',
      },
    ],
  },
  {
    id: 'cash',
    title: 'Cash Management & Liquidity',
    description: 'Vault hierarchy, Safe Drops, CRV/CDV vouchers, and shift reconciliations.',
    icon: Wallet,
    color: 'amber',
    items: [
      {
        question: 'What is the Vault & Container Hierarchy?',
        answer: 'JAPA Core ERP organizes cash into a 4-tier security hierarchy:\n• Level 1: Cash Drawer / Register Till (at the front counter, low cash ceiling).\n• Level 2: Manager Safe (intermediate drop safe inside the branch back office).\n• Level 3: Store Vault (primary secure branch safe for large cash reserves).\n• Level 4: Bank Account / Petty Cash / In-Transit (treasury accounts for deposits and payouts).',
        tip: 'You can add, edit, or delete containers anytime using the Pencil and Trash icons on each container card.',
      },
      {
        question: 'What are CRV and CDV vouchers?',
        answer: '• CRV (Cash Receipt Voucher): Formal accounting record for all cash received from non-POS sources (e.g., customer downpayments, supplier refunds, owner equity injection).\n• CDV (Cash Disbursement Voucher): Formal accounting record for money spent (e.g., delivery driver gas, office snacks, store utilities, equipment repair).',
      },
      {
        question: 'Can I delete a cash container with existing transactions?',
        answer: 'To protect accounting integrity, containers with historical financial records are safely "Archived" instead of permanently deleted. Archived containers no longer appear in active dropdowns, but their historical audit trail remains intact.',
      },
      {
        question: 'How do I add a new Cash Account (e.g. Maya or BDO Checking)?',
        answer: 'In Cash Management, click the "+ New Cash Account" button at the top right. Select the Account Type (e.g. Bank Account or E-Wallet), assign it to a branch, enter the Account Name, and set the initial balance.',
      },
      {
        question: 'Why did cash balances show demo values previously?',
        answer: 'The system initially loaded simulated sample figures for demonstration. These have been reset to ₱0.00 so your actual store counts can be entered cleanly.',
      },
    ],
  },
  {
    id: 'financials',
    title: 'Financials, Profit & P&L Reports',
    description: 'Understanding your Gross Revenue, Net Profit, Operating Margin, and Business Health.',
    icon: DollarSign,
    color: 'teal',
    items: [
      {
        question: 'Where can I see the profit I earned?',
        answer: 'Open the "Financials & P&L Reports" module from the sidebar. You will see:\n1. Total Gross Revenue: All sales invoices + walk-in POS receipts.\n2. Cost of Goods Sold (COGS): Wholesale cost of blank apparel and materials sold.\n3. Operating Expenses (OpEx): Rent, utilities, payroll, delivery, and miscellaneous disbursements.\n4. Net Operating Profit: Gross Revenue minus (COGS + OpEx).',
      },
      {
        question: 'What is the AI Business Health Rating and how is it scored?',
        answer: 'The AI Health Rating (visible at the top of the Financials module and Executive Dashboard) analyzes your store financial vital signs on a 0–100 scale:\n• 75–100 (Green): Excellent Health — Strong profit margins and healthy liquidity.\n• 50–74 (Yellow): Stable / Break-Even — Revenues cover overhead, but monitor discretionary spending.\n• 0–49 (Red): Needs Attention — Operating at a net deficit or expenses exceed income.',
      },
      {
        question: 'Are walk-in POS sales included in the P&L reports?',
        answer: 'Yes! The financial calculation engine unifies both Sales Quotations/Invoices and POS cash/e-wallet transactions to give a complete 360-degree picture of store revenue without double counting.',
      },
      {
        question: 'How can I filter financials by branch or date range?',
        answer: 'At the top of the Financials page, use the Date Range selector (e.g., "This Month", "Last 30 Days", "Year to Date") and the Store Branch dropdown to view branch-specific profitability.',
      },
    ],
  },
  {
    id: 'production',
    title: 'Production Queue & Job Orders',
    description: '7-stage tracking for sublimation, silkscreen, embroidery, UV flatbed, and signage jobs.',
    icon: Layers,
    color: 'violet',
    items: [
      {
        question: 'What are the 7 stages of a Production Job Order?',
        answer: 'Every custom printing job progresses through 7 standardized operational milestones:\n1. Artwork Approval: Graphic artist finalizes client mockups and vector separations.\n2. Film / Pre-Press: Film output, silkscreen burning, or RIP file rasterization.\n3. Blank Prep: Blank garments pulled from inventory and staged in the print room.\n4. Printing / Pressing: Active production (screen printing, heat press, or embroidery run).\n5. QC / Curing: Inspection for print flaws, tunnel dryer curing, and count verification.\n6. Folding & Packing: Garments tagged, polybagged, and packed with job traveler.\n7. Ready for Dispatch: Staged at dispatch dock awaiting client pickup or delivery rider.',
      },
      {
        question: 'How does starting a Job Order affect Inventory?',
        answer: 'When a Job Order is confirmed, the required blank apparel and print consumables are moved from S_avail (Available) to S_res (Reserved). Once production completes, the reserved stock is consumed permanently from the branch inventory.',
      },
    ],
  },
  {
    id: 'transfers',
    title: 'Stock Transfers (STO)',
    description: 'Inter-branch merchandise shipments between Dagupan and Manila branches.',
    icon: ArrowLeftRight,
    color: 'blue',
    items: [
      {
        question: 'How do I transfer stock between Dagupan and Manila?',
        answer: 'Go to Stock Transfers (STO) → click "+ New Transfer Request" → choose Source Branch and Destination Branch → select products and quantities → Dispatch. The items enter "In-Transit" status. When received at the destination branch, click "Confirm Receipt" to add the stock to the destination inventory.',
      },
      {
        question: 'What is In-Transit stock?',
        answer: 'Stock that has left the originating warehouse but has not yet arrived or been verified at the receiving store. It prevents items from being sold while on a delivery truck.',
      },
    ],
  },
  {
    id: 'payroll',
    title: 'Attendance & Payroll (DTR)',
    description: 'Daily time records, biometric clock-in logs, and salary disbursements.',
    icon: Clock,
    color: 'indigo',
    items: [
      {
        question: 'What is DTR?',
        answer: 'DTR stands for Daily Time Record. It tracks employee clock-in and clock-out times, overtime hours, and tardiness for automatic payroll computation.',
      },
      {
        question: 'Where do payroll disbursements record in the financials?',
        answer: 'Approved payroll payouts automatically generate Cash Disbursement Vouchers (CDVs) in Cash Management categorized under "Payroll & Salaries", directly impacting operating expenses in P&L.',
      },
    ],
  },
]

function HelpSectionCard({
  section,
  searchQuery,
  isDetailedView,
}: {
  section: HelpSection
  searchQuery: string
  isDetailedView: boolean
}) {
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

  const isSectionExpanded = isDetailedView || (searchQuery.trim() ? true : isOpen)

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden transition hover:border-zinc-300">
      {/* Section Header */}
      <button
        type="button"
        onClick={() => !isDetailedView && !searchQuery.trim() && setIsOpen(!isOpen)}
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
          <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 px-2.5 py-0.5 rounded-md">
            {filteredItems.length} topics
          </span>
          {!isDetailedView && !searchQuery.trim() && (
            isSectionExpanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            )
          )}
        </div>
      </button>

      {/* FAQ Items */}
      {isSectionExpanded && (
        <div className="border-t border-zinc-100 divide-y divide-zinc-100 bg-zinc-50/30">
          {filteredItems.map((item, idx) => {
            const isItemOpen = isDetailedView || openItem === idx
            return (
              <div key={idx} className="px-5 transition hover:bg-white">
                <button
                  type="button"
                  onClick={() => !isDetailedView && setOpenItem(openItem === idx ? null : idx)}
                  className="w-full flex items-center justify-between gap-3 py-3.5 text-left"
                >
                  <span className="text-sm font-bold text-zinc-900">{item.question}</span>
                  {!isDetailedView && (
                    isItemOpen ? (
                      <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                    )
                  )}
                </button>

                {isItemOpen && (
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
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function HelpView() {
  const { user } = useAuth()
  const currentActualRole = normalizeUserRole(user?.role)
  const [selectedRoleView, setSelectedRoleView] = useState<string>(currentActualRole)
  const [activeCatalogTab, setActiveCatalogTab] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDetailedView, setIsDetailedView] = useState(false)

  // Sync state if user loads late
  useEffect(() => {
    if (user?.role) {
      setSelectedRoleView(normalizeUserRole(user.role))
    }
  }, [user])

  const isAdmin = currentActualRole === 'Admin'
  const activeRoleInfo = ROLE_INFO[selectedRoleView] || ROLE_INFO['Admin']

  // Filter sections allowed for this role
  const allowedSectionIds = useMemo(() => {
    return ROLE_ALLOWED_SECTIONS[selectedRoleView] || ROLE_ALLOWED_SECTIONS['Admin']
  }, [selectedRoleView])

  const roleSections = useMemo(() => {
    return helpSections.filter((section) => allowedSectionIds.includes(section.id))
  }, [allowedSectionIds])

  // Further filter by active module catalog tab
  const displayedSections = useMemo(() => {
    if (activeCatalogTab === 'ALL') return roleSections
    return roleSections.filter((s) => s.id === activeCatalogTab)
  }, [roleSections, activeCatalogTab])

  const totalTopics = useMemo(() => roleSections.reduce((sum, s) => sum + s.items.length, 0), [roleSections])

  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) {
      return displayedSections.reduce((sum, s) => sum + s.items.length, 0)
    }
    return displayedSections.reduce((sum, s) => {
      return (
        sum +
        s.items.filter(
          (item) =>
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ).length
      )
    }, 0)
  }, [searchQuery, displayedSections])

  // Contextual popular search pills based on user's active role
  const popularPills = useMemo(() => {
    const list: { text: string; sectionId: string }[] = [
      { text: 'Where does POS cash go?', sectionId: 'pos' },
      { text: 'What is Price TBD?', sectionId: 'pos' },
      { text: 'How do I apply discounts?', sectionId: 'pos' },
      { text: 'What is S_avail?', sectionId: 'inventory' },
      { text: 'What is a Safe Drop?', sectionId: 'cash' },
      { text: 'What is CRV and CDV?', sectionId: 'cash' },
      { text: 'How is profit calculated?', sectionId: 'financials' },
      { text: 'What are the 7 job stages?', sectionId: 'production' },
      { text: 'What is DTR?', sectionId: 'payroll' },
      { text: 'How do stock transfers work?', sectionId: 'transfers' },
    ]
    return list.filter((p) => allowedSectionIds.includes(p.sectionId)).slice(0, 5)
  }, [allowedSectionIds])

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── 1. Page Header (Matching Multi-Store Inventory & Executive Dashboard) ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              System Help & Knowledge Base
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              Module 11 · Knowledge Base
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${activeRoleInfo.badgeClass}`}>
              {activeRoleInfo.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Role-tailored operational workflows, step-by-step procedures, business calculations, and terminal guides.
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle: Standard View vs Detailed View (identical to Inventory) */}
          <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsDetailedView(false)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                !isDetailedView
                  ? 'bg-zinc-900 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Standard View</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDetailedView(true)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                isDetailedView
                  ? 'bg-zinc-900 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Detailed View</span>
            </button>
          </div>

          {/* Quick link to POS */}
          <Link
            href="/pos"
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 transition active:scale-95"
            title="Launch Cashier POS"
          >
            <Receipt className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">🛒 Cashier POS</span>
          </Link>

          {/* Reset Filters */}
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setActiveCatalogTab('ALL')
              setIsDetailedView(false)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition"
            title="Reset Filters"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* ── 2. Stat Cards Row (Exact 4-Card layout matching Multi-Store Inventory) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Guides */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                AVAILABLE GUIDES
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl truncate">
                {totalTopics}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs bg-indigo-600">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 border-t border-zinc-100 pt-3">
            <p className="text-xs text-zinc-500 truncate">Tailored for {activeRoleInfo.label}</p>
          </div>
        </div>

        {/* Card 2: Modules Covered */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                AUTHORIZED MODULES
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl truncate">
                {roleSections.length}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs bg-emerald-600">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 border-t border-zinc-100 pt-3">
            <p className="text-xs text-zinc-500 truncate">Operational workflows in your sidebar</p>
          </div>
        </div>

        {/* Card 3: Security Permission */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                SECURITY ROLE
              </p>
              <p className="mt-2 text-lg font-bold tracking-tight text-zinc-900 sm:text-2xl truncate">
                {selectedRoleView}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs bg-amber-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 border-t border-zinc-100 pt-3">
            <p className="text-xs text-zinc-500 truncate">Role-Based Access Control Active</p>
          </div>
        </div>

        {/* Card 4: Search Matches */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                MATCHING TOPICS
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl truncate">
                {matchCount}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs bg-rose-600">
              <HelpCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 border-t border-zinc-100 pt-3">
            <p className="text-xs text-zinc-500 truncate">
              {searchQuery ? `Filtered by "${searchQuery}"` : 'All topics accessible'}
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Active Workspace Scope & Role Preview Banner (Matching Dashboard Advisor) ── */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-blue-50/90 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-zinc-900">Active Workspace Scope:</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${activeRoleInfo.badgeClass}`}>
                {activeRoleInfo.label}
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-0.5">{activeRoleInfo.desc}</p>
          </div>
        </div>

        {/* Admin Role Selector Preview */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 bg-white border border-indigo-200 p-1 rounded-xl text-xs font-semibold shadow-2xs self-start lg:self-auto shrink-0">
            <span className="px-2 text-[10px] text-zinc-400 font-bold uppercase">Role View:</span>
            {(['Admin', 'Manager', 'Cashier', 'Inventory', 'Staff'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setSelectedRoleView(r)
                  setActiveCatalogTab('ALL')
                }}
                className={`rounded-lg px-2.5 py-1 transition ${
                  selectedRoleView === r
                    ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Category Tabs Bar (Matching Multi-Store Inventory CATALOG_TABS) ── */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => setActiveCatalogTab('ALL')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-2xs',
            activeCatalogTab === 'ALL'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          )}
        >
          ALL <span className="opacity-75">({totalTopics})</span>
        </button>
        {roleSections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveCatalogTab(s.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-2xs flex items-center gap-1.5',
              activeCatalogTab === s.id
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            )}
          >
            <span>{s.title.split('/')[0].split('&')[0].trim().toUpperCase()}</span>
            <span className="opacity-75">({s.items.length})</span>
          </button>
        ))}
      </div>

      {/* ── 5. Search Bar & Popular Suggestion Pills ── */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeRoleInfo.label} topics... (e.g., 'Safe Drop', 'stock', 'barcode', 'discounts')`}
            className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-10 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Popular Suggestion Pills */}
        {!searchQuery && popularPills.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400">Popular:</span>
            {popularPills.map((pill) => (
              <button
                key={pill.text}
                type="button"
                onClick={() => setSearchQuery(pill.text.replace(/^What is |^How is |^Where does |^How do /i, '').replace('?', '').trim())}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-800 transition shadow-2xs"
              >
                {pill.text}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 6. Help Sections Accordions Grid ── */}
      <div className="space-y-4">
        {matchCount === 0 && searchQuery && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-xs">
            <HelpCircle className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-zinc-700">No results found for &ldquo;{searchQuery}&rdquo;</p>
            <p className="text-xs text-zinc-400 mt-1">Try keywords matching your role: &ldquo;barcode&rdquo;, &ldquo;stock&rdquo;, or &ldquo;cash&rdquo;</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 transition"
            >
              Reset Search
            </button>
          </div>
        )}

        {displayedSections.map((section) => (
          <HelpSectionCard
            key={section.id}
            section={section}
            searchQuery={searchQuery}
            isDetailedView={isDetailedView}
          />
        ))}
      </div>
    </div>
  )
}
