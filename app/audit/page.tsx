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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <SkeletonModuleView statCount={4} tableRows={8} tableCols={6} />
      </div>
    </DashboardShell>
  )
}

export default function AuditPage() {
  return (
    <Suspense fallback={<AuditFallback />}>
      <DashboardShell>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <AuditLogsView />
        </div>
      </DashboardShell>
    </Suspense>
  )
}

