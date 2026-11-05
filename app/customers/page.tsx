import { Suspense } from 'react'
import CustomersView from '@/components/customers/customers-view'
import DashboardShell from '@/components/dashboard-shell'
import { SkeletonModuleView } from '@/components/ui/skeleton'

export const metadata = {
  title: 'CRM & Customer Management',
  description: 'Manage customers, contact information, credit limits, and balances in JAPA Global — Enterprise Operations.',
}

function CustomersFallback() {
  return (
    <DashboardShell>
      <SkeletonModuleView statCount={3} tableRows={6} tableCols={6} />
    </DashboardShell>
  )
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<CustomersFallback />}>
      <CustomersView />
    </Suspense>
  )
}
