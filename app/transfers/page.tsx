import { Suspense } from 'react'
import DashboardShell from '@/components/dashboard-shell'
import StockTransfersView from '@/components/transfers/stock-transfers-view'
import { SkeletonModuleView } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Inter-Branch Stock Transfers (STO) | JAPA Global',
  description: 'Manage 4-stage stock transfer manifests between Dagupan Main Store & Manila Operations Hub.',
}

function TransfersFallback() {
  return (
    <DashboardShell>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <SkeletonModuleView statCount={4} tableRows={6} tableCols={6} />
      </div>
    </DashboardShell>
  )
}

export default function TransfersPage() {
  return (
    <Suspense fallback={<TransfersFallback />}>
      <DashboardShell>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <StockTransfersView />
        </div>
      </DashboardShell>
    </Suspense>
  )
}

