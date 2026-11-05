// components/ui/skeleton.tsx
// Reusable shimmer skeleton components for async loading states

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

/** Generic block skeleton with shimmer animation */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton-shimmer rounded-lg bg-zinc-100',
        className
      )}
    />
  )
}

/** Row skeleton — matches a standard table row */
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-zinc-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={cn('h-4', i === 0 ? 'w-32' : 'w-20')} />
        </td>
      ))}
    </tr>
  )
}

/** Full table skeleton — header + N rows */
export function SkeletonTable({
  rows = 5,
  cols = 6,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Grid of stat cards skeleton */
export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-11 w-11 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Full module loading state: stat cards + filter bar + table */
export function SkeletonModuleView({
  statCount = 4,
  tableRows = 6,
  tableCols = 6,
}: {
  statCount?: number
  tableRows?: number
  tableCols?: number
}) {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Stat Cards */}
      <SkeletonStatCards count={statCount} />

      {/* Table Panel */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* Filter Bar */}
        <div className="flex gap-3 border-b border-zinc-100 p-4">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <SkeletonTable rows={tableRows} cols={tableCols} />
      </div>
    </div>
  )
}

