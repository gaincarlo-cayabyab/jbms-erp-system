import { Suspense } from 'react'
import DashboardShell from '@/components/dashboard-shell'
import ExecutiveDashboard from '@/components/dashboard/executive-dashboard'
import { SkeletonStatCards, Skeleton } from '@/components/ui/skeleton'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Executive Dashboard | JAPA Global',
  description: 'Executive management portal with real-time analytics across all business operations in JAPA Global — Enterprise Operations.',
}

function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <Skeleton className="h-10 w-72 rounded-lg" />
      <SkeletonStatCards count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<DashboardSkeleton />}>
        <ExecutiveDashboard />
      </Suspense>
    </DashboardShell>
  )
}
