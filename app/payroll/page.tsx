import { Suspense } from 'react'
import type { Metadata } from 'next'
import PayrollView from '@/components/payroll/payroll-view'
import DashboardShell from '@/components/dashboard-shell'
import { SkeletonModuleView } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Attendance & Payroll | JAPA Global',
  description: 'Track staff attendance, daily time records, and process payroll disbursements.',
}

function PayrollSkeleton() {
  return (
    <DashboardShell>
      <SkeletonModuleView statCount={4} tableRows={6} tableCols={9} />
    </DashboardShell>
  )
}

export default function PayrollPage() {
  return (
    <Suspense fallback={<PayrollSkeleton />}>
      <DashboardShell>
        <PayrollView />
      </DashboardShell>
    </Suspense>
  )
}
