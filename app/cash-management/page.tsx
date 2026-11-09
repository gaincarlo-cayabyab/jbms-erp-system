import { Suspense } from 'react'
import CashManagementView from '@/components/cash-management/cash-management-view'
import DashboardShell from '@/components/dashboard-shell'
import { SkeletonModuleView } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Cash Management & Treasury',
  description: 'Enterprise liquid treasury, cash inflow/outflow vouchers, and register drawer reconciliation.',
}

function CashManagementFallback() {
  return (
    <DashboardShell>
      <SkeletonModuleView statCount={4} tableRows={6} tableCols={6} />
    </DashboardShell>
  )
}

export default function CashManagementPage() {
  return (
    <Suspense fallback={<CashManagementFallback />}>
      <CashManagementView />
    </Suspense>
  )
}

