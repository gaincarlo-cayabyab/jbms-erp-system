'use client'

import { Layers, AlertTriangle, CheckCircle2, Clock, Calendar } from 'lucide-react'
import { JobOrder } from '@/types/production'

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

  // 2. Jobs Near Deadline (within 48 hours or overdue, and still active)
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const twoDaysLater = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const nearDeadlineJobs = activeJobs.filter((j) => {
    if (!j.deadline) return false
    const d = new Date(j.deadline)
    return d <= twoDaysLater
  })

  // 3. Completed Today (or Completed Total)
  const completedToday = jobs.filter((j) => {
    const isDone = j.stage_status === 'Done' || j.stage_status === 'Completed'
    if (!isDone) return false
    const createdDate = j.created_at ? new Date(j.created_at).toISOString().split('T')[0] : ''
    return createdDate === todayStr || isDone
  })

  // 4. In Active Press / Production
  const inProductionJobs = jobs.filter(
    (j) =>
      j.stage_status === 'Printing' ||
      j.stage_status === 'In_Production' ||
      j.stage_status === 'Finishing'
  )

  const cards = [
    {
      title: 'Active Jobs in Queue',
      value: activeJobs.length.toString(),
      subtitle: `${inProductionJobs.length} currently on machine / assembly`,
      icon: Layers,
      color: 'bg-blue-600',
    },
    {
      title: 'Near Deadline / Urgent',
      value: nearDeadlineJobs.length.toString(),
      subtitle:
        nearDeadlineJobs.length > 0
          ? `${nearDeadlineJobs.length} jobs due within 48h or overdue`
          : 'All jobs on schedule',
      icon: AlertTriangle,
      color: nearDeadlineJobs.length > 0 ? 'bg-rose-600' : 'bg-emerald-600',
    },
    {
      title: 'Completed Jobs',
      value: completedToday.length.toString(),
      subtitle: `${jobs.length - activeJobs.length} finished or released`,
      icon: CheckCircle2,
      color: 'bg-emerald-600',
    },
    {
      title: 'Active Production Areas',
      value: inProductionJobs.length.toString(),
      subtitle: 'Jobs in Printing & Finishing stages',
      icon: Clock,
      color: 'bg-indigo-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                  {card.title}
                </p>
                {isLoading ? (
                  <div className="mt-2 h-8 w-20 animate-pulse rounded bg-zinc-200" />
                ) : (
                  <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl truncate">
                    {card.value}
                  </p>
                )}
              </div>
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${card.color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3 border-t border-zinc-100 pt-3">
              {isLoading ? (
                <div className="h-3 w-32 animate-pulse rounded bg-zinc-100" />
              ) : (
                <p className="text-xs text-zinc-500 truncate">{card.subtitle}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

