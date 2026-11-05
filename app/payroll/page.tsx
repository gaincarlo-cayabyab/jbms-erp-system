import { Suspense } from 'react';
import type { Metadata } from 'next';
import PayrollView from '@/components/payroll/payroll-view';

export const metadata: Metadata = {
  title: 'Attendance & Payroll | JAPA Core ERP',
  description: 'Track staff attendance, daily time records, and process payroll disbursements.',
};

function PayrollSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="h-8 w-64 rounded-lg bg-zinc-200" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-zinc-200" />
        ))}
      </div>
      <div className="h-96 rounded-2xl bg-zinc-200" />
    </div>
  );
}

export default function PayrollPage() {
  return (
    <Suspense fallback={<PayrollSkeleton />}>
      <PayrollView />
    </Suspense>
  );
}

