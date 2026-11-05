import { Suspense } from 'react'
import POSView from '@/components/pos/pos-view'
import { SkeletonModuleView } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Cashier / POS',
}

export default function POSPage() {
  return (
    <Suspense fallback={<SkeletonModuleView />}>
      <POSView />
    </Suspense>
  )
}

