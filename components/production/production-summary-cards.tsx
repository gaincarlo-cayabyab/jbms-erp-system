'use client'

import { Layers, AlertTriangle, Zap, Package } from 'lucide-react'
import { JobOrder } from '@/types/production'
import { cn } from '@/lib/utils'

interface ProductionSummaryCardsProps {
  jobs: JobOrder[]
  isLoading?: boolean
}

export default function ProductionSummaryCards({
  jobs,
  isLoading = false,
}: ProductionSummaryCardsProps) {
  // 1. Active Jobs (all not Done / Cancelled)
  const activeJobs = jobs.filter(
    (j) => j.stage_status !== 'Done' && j.stage_status !== 'Completed' && j.stage_status !== 'Cancelled'
  )

  // In active machine / press / finishing stages
  const inProductionJobs = activeJobs.filter(
    (j) =>
      j.stage_status === 'Printing' ||
      j.stage_status === 'In_Production' ||
      j.stage_status === 'Finishing'
  )

  // 2. Rush / High Priority Jobs (active)
  const rushJobs = activeJobs.filter(
    (j) => j.priority === 'Rush' || j.priority === 'High'
  )

  // 3. Overdue Jobs (deadline past midnight today, still active)
  const todayMidnight = new Date(new Date().setHours(0, 0, 0, 0))
  const overdueJobs = activeJobs.filter((j) => {
    if (!j.deadline) return false
    return new Date(j.deadline) < todayMidnight
  })

  // 4. Ready for Pickup / Released
  const readyJobs = jobs.filter(
    (j) => j.stage_status === 'Ready' || j.stage_status === 'Ready_For_Pickup'
  )

  const cards = [
    {
      title: 'Active in Queue',
      value: activeJobs.length.toString(),
      subtitle: `${inProductionJobs.length} currently printing or in finishing`,
      icon: Layers,
      color: 'bg-blue-600',
      isAlert: false,
    },
    {
      title: '⚡ Rush & High Priority',
      value: rushJobs.length.toString(),
      subtitle:
        rushJobs.length > 0
          ? `${rushJobs.length} expedited orders requiring focus`
          : 'Normal schedule, no expedited jobs',
      icon: Zap,
      color: rushJobs.length > 0 ? 'bg-red-600' : 'bg-emerald-600',
      isAlert: rushJobs.length > 0,
      alertBorder: 'border-red-300 ring-1 ring-red-200 bg-red-50/20',
    },
    {
      title: 'Overdue Deadlines',
      value: overdueJobs.length.toString(),
      subtitle:
        overdueJobs.length > 0
          ? `${overdueJobs.length} orders past scheduled date!`
          : 'All job schedules on track',
      icon: AlertTriangle,
      color: overdueJobs.length > 0 ? 'bg-rose-600' : 'bg-emerald-600',
      isAlert: overdueJobs.length > 0,
      alertBorder: 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/20',
    },
    {
      title: 'Ready for Pickup',
      value: readyJobs.length.toString(),
      subtitle: 'Awaiting customer claim or delivery',
      icon: Package,
      color: 'bg-orange-500',
      isAlert: false,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className={cn(
              'flex flex-col justify-between rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md',
              card.isAlert && card.alertBorder ? card.alertBorder : 'border-zinc-200'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                  {card.title}
                </p>
                {isLoading ? (
                  <div className="mt-2 h-8 w-20 animate-pulse rounded bg-zinc-200" />
                ) : (
                  <p
                    className={cn(
                      'mt-2 text-2xl font-bold tracking-tight sm:text-3xl truncate',
                      card.isAlert ? 'text-red-700' : 'text-zinc-900'
                    )}
                  >
                    {card.value}
                  </p>
                )}
              </div>
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm',
                  card.color
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3 border-t border-zinc-100 pt-3">
              {isLoading ? (
                <div className="h-3 w-32 animate-pulse rounded bg-zinc-100" />
              ) : (
                <p
                  className={cn(
                    'text-xs truncate',
                    card.isAlert ? 'font-semibold text-red-600' : 'text-zinc-500'
                  )}
                >
                  {card.subtitle}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
