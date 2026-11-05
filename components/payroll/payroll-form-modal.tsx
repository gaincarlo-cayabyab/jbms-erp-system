'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { recordPayroll } from '@/lib/payroll/payroll-service';
import type {
  PayrollRecord,
  PayrollFormData,
  Branch,
  StaffRole,
  PayrollStatus,
  PaymentMethod,
} from '@/types/payroll';

interface Props {
  onClose: () => void;
  onSuccess: (record: PayrollRecord) => void;
}

const BRANCHES: Branch[] = ['Main', 'North', 'South'];
const ROLES: StaffRole[] = ['Admin', 'Store_Manager', 'Production_Staff', 'Accountant'];
const STATUSES: PayrollStatus[] = ['Pending', 'Processing', 'Paid', 'Cancelled'];
const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'GCash', 'Maya', 'Bank Transfer', 'Cheque'];

const thisMonth = new Date().toISOString().slice(0, 7);
const startOfMonth = `${thisMonth}-01`;
const endOfMonth = new Date(
  new Date().getFullYear(),
  new Date().getMonth() + 1,
  0
)
  .toISOString()
  .split('T')[0];

const EMPTY: PayrollFormData = {
  staff_name: '',
  role: 'Production_Staff',
  branch: 'Main',
  daily_rate: 610,
  days_worked: 26,
  overtime_hours: 0,
  overtime_rate: 100,
  deductions: 0,
  payment_method: 'Cash',
  pay_period_start: startOfMonth,
  pay_period_end: endOfMonth,
  status: 'Pending',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

export default function PayrollFormModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState<PayrollFormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof PayrollFormData>(key: K, value: PayrollFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const totalNetPay = Math.max(
    0,
    form.daily_rate * form.days_worked +
      form.overtime_hours * form.overtime_rate -
      form.deductions
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staff_name.trim()) {
      setError('Staff name is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const record = await recordPayroll(form);
      onSuccess(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process payroll.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Process Payroll</h2>
              <p className="text-xs text-zinc-500">Issue a new salary disbursement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-[65vh] overflow-y-auto p-6">
            <div className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Staff Name + Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Staff Name *</label>
                  <input
                    type="text"
                    value={form.staff_name}
                    onChange={(e) => set('staff_name', e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => set('role', e.target.value as StaffRole)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Branch */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Branch</label>
                <select
                  value={form.branch}
                  onChange={(e) => set('branch', e.target.value as Branch)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Daily Rate + Days Worked */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Daily Rate (₱)</label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={form.daily_rate}
                    onChange={(e) => set('daily_rate', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Days Worked</label>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    step={0.5}
                    value={form.days_worked}
                    onChange={(e) => set('days_worked', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* Overtime */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Overtime Hours</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.overtime_hours}
                    onChange={(e) => set('overtime_hours', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">OT Rate / hr (₱)</label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={form.overtime_rate}
                    onChange={(e) => set('overtime_rate', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* Deductions */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Total Deductions (₱)
                  <span className="ml-1 text-zinc-400 font-normal">— SSS, PhilHealth, Pag-IBIG, etc.</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={form.deductions}
                  onChange={(e) => set('deductions', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Auto-calculated Net Pay */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-800">Computed Total Net Pay</span>
                  <span className="text-xl font-bold text-emerald-700">{fmt(totalNetPay)}</span>
                </div>
                <p className="mt-1 text-xs text-emerald-600">
                  ({form.daily_rate} × {form.days_worked} days) + ({form.overtime_hours} OT hrs × ₱{form.overtime_rate}) − ₱{form.deductions} deductions
                </p>
              </div>

              {/* Pay Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Pay Period Start</label>
                  <input
                    type="date"
                    value={form.pay_period_start}
                    onChange={(e) => set('pay_period_start', e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Pay Period End</label>
                  <input
                    type="date"
                    value={form.pay_period_end}
                    onChange={(e) => set('pay_period_end', e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* Payment Method + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Payment Method</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => set('payment_method', e.target.value as PaymentMethod)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => set('status', e.target.value as PayrollStatus)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-100 p-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'rounded-lg px-5 py-2 text-sm font-semibold text-white transition',
                loading ? 'bg-emerald-300' : 'bg-emerald-600 hover:bg-emerald-700'
              )}
            >
              {loading ? 'Processing…' : 'Issue Payroll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

