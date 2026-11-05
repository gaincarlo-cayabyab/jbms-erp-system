import { Suspense } from 'react'
import FinancialsView from '@/components/financials/financials-view'
import DashboardShell from '@/components/dashboard-shell'
import { SkeletonModuleView } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Financials & Expense Management',
  description: 'Track realized revenue, business expenses, cash flow, and operating profit in JAPA Global — Enterprise Operations.',
}

function FinancialsFallback() {
  return (
    <DashboardShell>
      <SkeletonModuleView statCount={4} tableRows={6} tableCols={6} />
    </DashboardShell>
  )
}

export default function FinancialsPage() {
  return (
    <Suspense fallback={<FinancialsFallback />}>
      <FinancialsView />
    </Suspense>
  )
}
