import DashboardShell from '@/components/dashboard-shell'
import HelpView from '@/components/help/help-view'

export const metadata = {
  title: 'Help & Guide | JAPA Core ERP',
  description: 'Comprehensive user guide, explanations, and workflows for JAPA Core ERP modules.',
}

export default function HelpPage() {
  return (
    <DashboardShell>
      <HelpView />
    </DashboardShell>
  )
}
