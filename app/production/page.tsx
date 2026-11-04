import { Suspense } from 'react'
import ProductionView from '@/components/production/production-view'
import DashboardShell from '@/components/dashboard-shell'

export const metadata = {
  title: 'Production Queue & Job Orders',
  description: 'Track manufacturing workflow, job order stages, and printing queues in JAPA Core ERP.',
}

function ProductionFallback() {
  return (
    <DashboardShell>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
        <div className="h-8 w-64 rounded bg-zinc-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-zinc-200" />
          ))}
        </div>
        <div className="h-96 rounded-xl bg-zinc-200" />
      </div>
    </DashboardShell>
  )
}

export default function ProductionPage() {
  return (
    <Suspense fallback={<ProductionFallback />}>
      <ProductionView />
    </Suspense>
  )
}

