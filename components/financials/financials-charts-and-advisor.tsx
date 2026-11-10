'use client'

import { useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Percent,
} from 'lucide-react'
import { Expense } from '@/types/financials'
import { SalesOrder } from '@/types/sales'

interface Props {
  grossRevenue: number
  totalExpenses: number
  accountsReceivable: number
  salesOrders: SalesOrder[]
  expenses: Expense[]
  posSalesTotal?: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(n)

export default function FinancialsChartsAndAdvisor({
  grossRevenue,
  totalExpenses,
  accountsReceivable,
  salesOrders,
  expenses,
  posSalesTotal = 0,
}: Props) {
  const netProfit = grossRevenue - totalExpenses
  const isProfitable = netProfit >= 0
  const profitMargin = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0

  // ── 1. Calculate Business Health Score (0 - 100) ───────────────────────────
  const healthAssessment = useMemo(() => {
    let score = 50 // Base score

    // Profit Margin component (up to +30 or -30)
    if (profitMargin >= 35) score += 30
    else if (profitMargin >= 20) score += 20
    else if (profitMargin > 0) score += 10
    else if (grossRevenue === 0 && totalExpenses === 0) score = 50 // fresh system
    else if (profitMargin < 0) score -= Math.min(30, Math.abs(profitMargin))

    // Revenue presence (+15)
    if (grossRevenue > 50000) score += 15
    else if (grossRevenue > 0) score += 8

    // Receivables risk (-15 if AR > 40% of revenue)
    if (grossRevenue > 0) {
      const arRatio = accountsReceivable / grossRevenue
      if (arRatio > 0.4) score -= 15
      else if (arRatio > 0.2) score -= 5
      else score += 5
    }

    score = Math.max(10, Math.min(99, score))

    let rating = 'Stable & Profitable'
    let ratingColor = 'text-emerald-700 bg-emerald-50 border-emerald-200'
    let badge = '🟢 Excellent'

    if (score >= 80) {
      rating = 'Excellent Operational Health'
      ratingColor = 'text-emerald-800 bg-emerald-100 border-emerald-300'
      badge = '🟢 Excellent'
    } else if (score >= 65) {
      rating = 'Solid & Profitable'
      ratingColor = 'text-indigo-800 bg-indigo-50 border-indigo-200'
      badge = '🔵 Good'
    } else if (score >= 50) {
      rating = 'Break-Even / Moderate'
      ratingColor = 'text-amber-800 bg-amber-50 border-amber-200'
      badge = '🟡 Moderate'
    } else {
      rating = 'High Spending Burn'
      ratingColor = 'text-rose-800 bg-rose-50 border-rose-200'
      badge = '🔴 Needs Attention'
    }

    return { score, rating, ratingColor, badge }
  }, [grossRevenue, totalExpenses, profitMargin, accountsReceivable])

  // ── 2. Expense Category Breakdown ──────────────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    expenses.forEach((e) => {
      const cat = e.category || 'General Operations'
      const amt = Number(e.amount) || 0
      map.set(cat, (map.get(cat) || 0) + amt)
    })

    const list = Array.from(map.entries())
      .map(([cat, total]) => ({
        category: cat,
        total,
        pct: totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)

    return list
  }, [expenses, totalExpenses])

  // ── 3. AI Plain-Language Observations ──────────────────────────────────────
  const aiInsights = useMemo(() => {
    const insights: { title: string; desc: string; type: 'success' | 'warning' | 'info' }[] = []

    if (isProfitable && grossRevenue > 0) {
      insights.push({
        title: `Operating at a ${profitMargin}% Net Margin`,
        desc: `You are earning ₱${Math.round(netProfit).toLocaleString()} clean profit over expenses. For every ₱100 earned, you keep ₱${profitMargin} after all disbursements.`,
        type: 'success',
      })
    } else if (grossRevenue > 0 && !isProfitable) {
      insights.push({
        title: 'Expenses Exceed Collected Revenue',
        desc: `Your current operating expenses (₱${totalExpenses.toLocaleString()}) are higher than realized revenue. Review your top expense categories below to trim overhead.`,
        type: 'warning',
      })
    } else {
      insights.push({
        title: 'Awaiting Live Sales Records',
        desc: 'Start processing sales in the POS Cashier Terminal or recording B2B Sales Orders to activate real-time profit tracking.',
        type: 'info',
      })
    }

    if (accountsReceivable > 0) {
      insights.push({
        title: `${fmt(accountsReceivable)} Awaiting Collection`,
        desc: 'Unpaid client balances tie up liquid cash. Follow up on pending customer invoices before releasing new job orders.',
        type: 'warning',
      })
    } else {
      insights.push({
        title: 'Zero Overdue Receivables',
        desc: 'All recorded orders have been fully paid. Liquid cash collection rate is at 100%.',
        type: 'success',
      })
    }

    if (categoryBreakdown.length > 0) {
      const top = categoryBreakdown[0]
      insights.push({
        title: `Highest Spending: ${top.category} (${top.pct}%)`,
        desc: `${fmt(top.total)} spent on ${top.category}. Monitoring bulk supplier discounts can directly increase your net profit margin.`,
        type: 'info',
      })
    }

    return insights
  }, [isProfitable, grossRevenue, totalExpenses, netProfit, profitMargin, accountsReceivable, categoryBreakdown])

  return (
    <div className="space-y-6">
      {/* ── Top AI Executive Advisor Banner ─────────────────────────────────── */}
      <div className="rounded-2xl border border-indigo-200 bg-linear-to-r from-indigo-50/80 via-white to-blue-50/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-zinc-900">AI Business Health & Profit Advisor</h2>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${healthAssessment.ratingColor}`}>
                  {healthAssessment.badge} · {healthAssessment.rating}
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-1 max-w-xl">
                Automated business intelligence analyzing your margins, revenue momentum, cash burn, and collection efficiency.
              </p>
            </div>
          </div>

          {/* Health Score Gauge */}
          <div className="flex items-center gap-3 bg-white border border-zinc-200 rounded-2xl px-5 py-3 shadow-2xs self-start sm:self-auto">
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Health Score</span>
              <span className="text-3xl font-extrabold text-indigo-700 tracking-tight">{healthAssessment.score}</span>
              <span className="text-xs font-semibold text-zinc-400"> / 100</span>
            </div>
          </div>
        </div>

        {/* 3 AI Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-5 pt-5 border-t border-indigo-100/80">
          {aiInsights.map((insight, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-white/90 border border-zinc-200/80 p-3.5 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {insight.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                  {insight.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />}
                  {insight.type === 'info' && <Lightbulb className="h-4 w-4 text-indigo-600 shrink-0" />}
                  <h4 className="text-xs font-bold text-zinc-900 line-clamp-1">{insight.title}</h4>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">{insight.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Visual Charts & Ratio Breakdown ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Revenue vs Expense Bar Comparison */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  <span>Income vs. Expenditure Flow</span>
                </h3>
                <p className="text-xs text-zinc-500">Realized inflows against total recorded overhead</p>
              </div>
              <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">
                Live Ratio
              </span>
            </div>

            {/* Visual Bars */}
            <div className="space-y-4 pt-2">
              {/* Revenue Bar */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-700 flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Gross Revenue
                  </span>
                  <span className="font-bold text-emerald-700">{fmt(grossRevenue)}</span>
                </div>
                <div className="h-4 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, grossRevenue > 0 ? (grossRevenue / (grossRevenue + totalExpenses || 1)) * 100 : 0)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Expense Bar */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-700 flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    Operating Expenses
                  </span>
                  <span className="font-bold text-rose-700">{fmt(totalExpenses)}</span>
                </div>
                <div className="h-4 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, totalExpenses > 0 ? (totalExpenses / (grossRevenue + totalExpenses || 1)) * 100 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Profit Summary Strip */}
          <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Net Take-Home Profit</span>
              <p className={`text-xl font-extrabold ${isProfitable ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isProfitable ? '+' : ''}{fmt(netProfit)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Margin</span>
              <p className={`text-base font-bold ${isProfitable ? 'text-emerald-700' : 'text-rose-700'}`}>
                {profitMargin}%
              </p>
            </div>
          </div>
        </div>

        {/* Chart 2: Expense Category Distribution */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-rose-600" />
                  <span>Spending by Category</span>
                </h3>
                <p className="text-xs text-zinc-500">Breakdown of disbursements and vendor costs</p>
              </div>
              <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">
                {categoryBreakdown.length} Categories
              </span>
            </div>

            {categoryBreakdown.length > 0 ? (
              <div className="space-y-3 pt-1">
                {categoryBreakdown.slice(0, 4).map((item) => (
                  <div key={item.category}>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="text-zinc-700 truncate">{item.category}</span>
                      <span className="text-zinc-900 font-bold ml-2">
                        {fmt(item.total)} ({item.pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500/80 rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(4, item.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-zinc-400">
                No expense entries recorded yet. Click &ldquo;+ Record Expense&rdquo; to add operational costs.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>Total Operational Burn</span>
            <span className="font-bold text-zinc-900">{fmt(totalExpenses)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
