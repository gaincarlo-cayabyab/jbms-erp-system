'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, CheckCircle2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SkeletonRow } from '@/components/ui/skeleton';
import {
  getPayrollRecords,
  getAttendanceLogs,
  markPayrollAsPaid,
  computePayrollSummary,
} from '@/lib/payroll/payroll-service';
import PayrollSummaryCards from './payroll-summary-cards';
import PayrollFormModal from './payroll-form-modal';
import AttendanceFormModal from './attendance-form-modal';
import type { PayrollRecord, AttendanceLog, Branch, PayrollStatus, AttendanceStatus } from '@/types/payroll';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

function payrollStatusBadge(status: PayrollStatus) {
  const map: Record<PayrollStatus, string> = {
    Pending: 'bg-amber-100 text-amber-700',
    Processing: 'bg-blue-100 text-blue-700',
    Paid: 'bg-emerald-100 text-emerald-700',
    Cancelled: 'bg-zinc-100 text-zinc-500',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', map[status])}>
      {status}
    </span>
  );
}

function attendanceStatusBadge(status: AttendanceStatus) {
  const map: Record<AttendanceStatus, string> = {
    Present: 'bg-emerald-100 text-emerald-700',
    Late: 'bg-amber-100 text-amber-700',
    Half_Day: 'bg-blue-100 text-blue-700',
    Absent: 'bg-red-100 text-red-700',
    On_Leave: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', map[status])}>
      {status.replace('_', ' ')}
    </span>
  );
}

type Tab = 'attendance' | 'payroll';
const BRANCHES: Branch[] = ['Main', 'North', 'South'];

// ─── Skeletons ────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonRow key={i} cols={8} />
      ))}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function PayrollView() {
  const [tab, setTab] = useState<Tab>('attendance');
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<Branch | 'All'>('All');
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<PayrollStatus | 'All'>('All');
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, a] = await Promise.all([getPayrollRecords(), getAttendanceLogs()]);
    setPayroll(p);
    setAttendance(a);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const summary = computePayrollSummary(payroll, attendance);

  // ── Filtered lists ──
  const filteredPayroll = payroll.filter((r) => {
    const matchSearch = r.staff_name.toLowerCase().includes(search.toLowerCase());
    const matchBranch = branchFilter === 'All' || r.branch === branchFilter;
    const matchStatus = payrollStatusFilter === 'All' || r.status === payrollStatusFilter;
    return matchSearch && matchBranch && matchStatus;
  });

  const filteredAttendance = attendance.filter((a) => {
    const matchSearch = a.staff_name.toLowerCase().includes(search.toLowerCase());
    const matchBranch = branchFilter === 'All' || a.branch === branchFilter;
    return matchSearch && matchBranch;
  });

  async function handleMarkPaid(id: string) {
    await markPayrollAsPaid(id);
    setPayroll((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: 'Paid', payment_date: new Date().toISOString().split('T')[0] }
          : r
      )
    );
    toast.success('Payroll marked as Paid.');
  }

  const totalNetPayFiltered = filteredPayroll.reduce((s, r) => s + r.total_net_pay, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              Module 6
            </span>
            <Briefcase className="h-4 w-4 text-zinc-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Attendance & Payroll</h1>
          <p className="text-sm text-zinc-500">Track staff DTR and process salary disbursements</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAttendanceModal(true)}
            className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            <Plus className="h-4 w-4" />
            Log Attendance
          </button>
          <button
            onClick={() => setShowPayrollModal(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Process Payroll
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <PayrollSummaryCards summary={summary} />

      {/* Tabs */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* Tab Bar */}
        <div className="flex border-b border-zinc-100">
          {(['attendance', 'payroll'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-6 py-3.5 text-sm font-semibold capitalize transition',
                tab === t
                  ? 'border-b-2 border-indigo-600 text-indigo-700'
                  : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              {t === 'attendance' ? 'Staff & Attendance Log' : 'Payroll Disbursement'}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by staff name…"
              className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value as Branch | 'All')}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          >
            <option value="All">All Branches</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {tab === 'payroll' && (
            <select
              value={payrollStatusFilter}
              onChange={(e) => setPayrollStatusFilter(e.target.value as PayrollStatus | 'All')}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="All">All Statuses</option>
              {(['Pending', 'Processing', 'Paid', 'Cancelled'] as PayrollStatus[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>

        {/* Table Content */}
        {loading ? (
          <TableSkeleton />
        ) : tab === 'attendance' ? (
          /* ── Attendance Tab ── */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Staff Name</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time In</th>
                  <th className="px-4 py-3">Time Out</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">OT Hrs</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-zinc-400">
                      {attendance.length === 0
                        ? 'No attendance logs yet. Click "Log Attendance" to start.'
                        : 'No entries match your search/filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((a) => (
                    <tr key={a.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{a.staff_name}</td>
                      <td className="px-4 py-3 text-zinc-600">{a.branch}</td>
                      <td className="px-4 py-3 text-zinc-600">{a.date}</td>
                      <td className="px-4 py-3 text-zinc-600">{a.time_in ?? '—'}</td>
                      <td className="px-4 py-3 text-zinc-600">{a.time_out ?? '—'}</td>
                      <td className="px-4 py-3">{attendanceStatusBadge(a.status)}</td>
                      <td className="px-4 py-3 text-zinc-600">{a.overtime_hours}h</td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-zinc-500">
                        {a.notes ?? '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Payroll Tab ── */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Staff Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">OT Hrs</th>
                  <th className="px-4 py-3">Deductions</th>
                  <th className="px-4 py-3">Net Pay</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredPayroll.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-sm text-zinc-400">
                      {payroll.length === 0
                        ? 'No payroll records yet. Click "Process Payroll" to issue the first.'
                        : 'No records match your search/filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredPayroll.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{r.staff_name}</td>
                      <td className="px-4 py-3 text-zinc-600">{r.role.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-zinc-600">{r.branch}</td>
                      <td className="px-4 py-3 text-zinc-600">{r.days_worked}d</td>
                      <td className="px-4 py-3 text-zinc-600">{r.overtime_hours}h</td>
                      <td className="px-4 py-3 text-zinc-600">{fmt(r.deductions)}</td>
                      <td className="px-4 py-3 font-semibold text-zinc-900">{fmt(r.total_net_pay)}</td>
                      <td className="px-4 py-3 text-zinc-600">{r.payment_method}</td>
                      <td className="px-4 py-3">{payrollStatusBadge(r.status)}</td>
                      <td className="px-4 py-3">
                        {(r.status === 'Pending' || r.status === 'Processing') && (
                          <button
                            onClick={() => handleMarkPaid(r.id)}
                            className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredPayroll.length > 0 && (
                <tfoot>
                  <tr className="border-t border-zinc-200 bg-zinc-50 font-semibold text-zinc-700">
                    <td colSpan={6} className="px-4 py-3 text-right text-xs uppercase tracking-wider">
                      Total Net Pay ({filteredPayroll.length} records)
                    </td>
                    <td className="px-4 py-3 text-zinc-900">{fmt(totalNetPayFiltered)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showPayrollModal && (
        <PayrollFormModal
          onClose={() => setShowPayrollModal(false)}
          onSuccess={(record) => {
            setPayroll((prev) => [record, ...prev]);
            setShowPayrollModal(false);
            toast.success(`Payroll for ${record.staff_name} issued successfully.`);
          }}
        />
      )}
      {showAttendanceModal && (
        <AttendanceFormModal
          onClose={() => setShowAttendanceModal(false)}
          onSuccess={(log) => {
            setAttendance((prev) => [log, ...prev]);
            setShowAttendanceModal(false);
            toast.success(`Attendance for ${log.staff_name} logged on ${log.date}.`);
          }}
        />
      )}
    </div>
  );
}

