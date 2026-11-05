import { Suspense } from 'react'
import ProductionView from '@/components/production/production-view'
import DashboardShell from '@/components/dashboard-shell'
import { SkeletonModuleView } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Production Queue & Job Orders',
  description: 'Track manufacturing workflow, job order stages, and printing queues in JAPA Global — Enterprise Operations.',
}

function ProductionFallback() {
  return (
    <DashboardShell>
      <SkeletonModuleView statCount={3} tableRows={6} tableCols={7} />
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
