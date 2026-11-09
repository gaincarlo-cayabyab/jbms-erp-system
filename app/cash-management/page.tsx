import { Suspense } from 'react'
import CashManagementView from '@/components/cash-management/cash-management-view'
import { SkeletonModuleView } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Cash Management & Treasury',
  description: 'Enterprise liquid treasury, cash inflow/outflow vouchers, and register drawer reconciliation.',
}

export default function CashManagementPage() {
  return (
    <Suspense fallback={<SkeletonModuleView />}>
      <CashManagementView />
    </Suspense>
  )
}
