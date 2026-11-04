'use client';

import { Users, Wallet, Clock, AlertCircle } from 'lucide-react';
import StatCard from '@/components/stat-card';
import type { PayrollSummary } from '@/types/payroll';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

interface Props {
  summary: PayrollSummary;
}

export default function PayrollSummaryCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Active Staff"
        value={String(summary.activeStaffCount)}
        subtitle="Unique employees on record"
        icon={Users}
        colorClass="bg-blue-500"
      />
      <StatCard
        title="Monthly Payroll Budget"
        value={fmt(summary.monthlyPayrollBudget)}
        subtitle="Total net pay this period"
        icon={Wallet}
        colorClass="bg-emerald-500"
      />
      <StatCard
        title="Pending Disbursements"
        value={String(summary.pendingDisbursementsCount)}
        subtitle={fmt(summary.pendingDisbursementsAmount) + ' outstanding'}
        icon={AlertCircle}
        colorClass="bg-amber-500"
      />
      <StatCard
        title="Total Overtime Hours"
        value={`${summary.totalOvertimeHours} hrs`}
        subtitle="Logged across all staff"
        icon={Clock}
        colorClass="bg-purple-500"
      />
    </div>
  );
}
