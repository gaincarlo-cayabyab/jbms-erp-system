import { Suspense } from 'react'
import DashboardShell from '@/components/dashboard-shell'
import ExecutiveDashboard from '@/components/dashboard/executive-dashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Executive Dashboard | JAPA Core ERP',
  description: 'Executive management portal with real-time analytics across all business operations.',
}

function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
      <div className="h-10 w-72 rounded-lg bg-zinc-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-zinc-200" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-zinc-200" />
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
