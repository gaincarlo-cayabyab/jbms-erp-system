import { Suspense } from 'react'
import InventoryView from '@/components/inventory/inventory-view'
import DashboardShell from '@/components/dashboard-shell'
import { SkeletonModuleView } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Multi-Store Inventory & Stock',
  description: 'Track materials, media rolls, product catalogs, live stock levels, and automated reorder alerts in JAPA Global — Enterprise Operations.',
}

function InventoryFallback() {
  return (
    <DashboardShell>
      <SkeletonModuleView statCount={3} tableRows={6} tableCols={8} />
    </DashboardShell>
  )
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<InventoryFallback />}>
      <InventoryView />
    </Suspense>
  )
}
