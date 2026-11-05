import { Suspense } from 'react'
import SalesView from '@/components/sales/sales-view'
import DashboardShell from '@/components/dashboard-shell'
import { SkeletonModuleView } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Sales & Quotations',
  description: 'Manage sales orders, quotations, itemized pricing, and billing in JAPA Global — Enterprise Operations.',
}

function SalesFallback() {
  return (
    <DashboardShell>
      <SkeletonModuleView statCount={4} tableRows={6} tableCols={8} />
    </DashboardShell>
  )
}

export default function SalesPage() {
  return (
    <Suspense fallback={<SalesFallback />}>
      <SalesView />
    </Suspense>
  )
}
