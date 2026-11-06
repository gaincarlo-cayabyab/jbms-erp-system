import { Suspense } from 'react'
import DashboardShell from '@/components/dashboard-shell'
import AuditLogsView from '@/components/audit/audit-logs-view'
import { SkeletonModuleView } from '@/components/ui/skeleton'

export const metadata = {
  title: 'System Audit & Compliance Ledger | JAPA Global',
  description: 'Enterprise security, multi-branch audit logging and immutable operational tracking.',
}

function AuditFallback() {
  return (
    <DashboardShell>
      <SkeletonModuleView statCount={4} tableRows={8} tableCols={6} />
    </DashboardShell>
  )
}

export default function AuditPage() {
  return (
    <Suspense fallback={<AuditFallback />}>
      <DashboardShell>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <AuditLogsView />
        </div>
      </DashboardShell>
    </Suspense>
  )
}
