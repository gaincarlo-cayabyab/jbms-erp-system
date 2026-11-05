'use client'

import { cn } from '@/lib/utils'
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: { value: string; positive?: boolean; neutral?: boolean }
  colorClass?: string
  badge?: string
  isLoading?: boolean
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorClass = 'bg-indigo-50 text-indigo-600 border border-indigo-200/80',
  badge,
  isLoading = false,
}: StatCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-slate-300">
      {/* ── Top Header Row: Title & Symmetrical Icon Badge ────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
          {title}
        </p>

        {/* Icon Container — Touch & tablet optimized */}
        <div
          className={cn(
            'flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl shadow-2xs transition-transform group-hover:scale-105',
            colorClass
          )}
        >
          <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
        </div>
      </div>

      {/* ── Middle Row: Full-Width Dynamic Numeric Value ─────────────────── */}
      <div className="mt-3 min-w-0">
        {isLoading ? (
          <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <p
            className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums truncate"
            title={String(value)}
          >
            {value}
          </p>
        )}
      </div>

      {/* ── Bottom Row: Subtitle & Dynamic Trend Pill ───────────────────── */}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100/80 pt-2.5 text-xs">
        {subtitle && (
          <p className="truncate text-[11px] sm:text-xs font-medium text-slate-500 flex-1">
            {subtitle}
          </p>
        )}

        {trend && (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-bold tabular-nums',
              trend.neutral
                ? 'bg-slate-100 text-slate-700'
                : trend.positive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                : 'bg-rose-50 text-rose-700 border border-rose-200/80'
            )}
          >
            {trend.neutral ? (
              <Minus className="h-3 w-3" />
            ) : trend.positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            <span className="truncate max-w-[110px]">{trend.value}</span>
          </span>
        )}

        {badge && !trend && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}
