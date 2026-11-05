'use client';

import { useState } from 'react';
import { X, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logAttendance } from '@/lib/payroll/payroll-service';
import type { AttendanceLog, AttendanceFormData, Branch, AttendanceStatus } from '@/types/payroll';

interface Props {
  onClose: () => void;
  onSuccess: (log: AttendanceLog) => void;
}

const BRANCHES: Branch[] = ['Main', 'North', 'South'];
const STATUSES: AttendanceStatus[] = ['Present', 'Late', 'Half_Day', 'Absent', 'On_Leave'];

const today = new Date().toISOString().split('T')[0];

const EMPTY: AttendanceFormData = {
  staff_name: '',
  branch: 'Main',
  date: today,
  time_in: '08:00',
  time_out: '17:00',
  status: 'Present',
  overtime_hours: 0,
  notes: '',
};

export default function AttendanceFormModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState<AttendanceFormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof AttendanceFormData>(key: K, value: AttendanceFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staff_name.trim()) {
      setError('Staff name is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const log = await logAttendance(form);
      onSuccess(log);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log attendance.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <UserCheck className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Log Attendance</h2>
              <p className="text-xs text-zinc-500">Record a daily time entry</p>
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
          <div className="space-y-4 p-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Staff Name */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Staff Name *</label>
              <input
                type="text"
                value={form.staff_name}
                onChange={(e) => set('staff_name', e.target.value)}
                placeholder="e.g. Juan dela Cruz"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Branch & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Branch</label>
                <select
                  value={form.branch}
                  onChange={(e) => set('branch', e.target.value as Branch)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* Time In & Out */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Time In</label>
                <input
                  type="time"
                  value={form.time_in}
                  onChange={(e) => set('time_in', e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Time Out</label>
                <input
                  type="time"
                  value={form.time_out}
                  onChange={(e) => set('time_out', e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* Status & OT Hours */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value as AttendanceStatus)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Overtime Hours</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.overtime_hours}
                  onChange={(e) => set('overtime_hours', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Optional remarks..."
                rows={2}
                className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
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
                loading ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'
              )}
            >
              {loading ? 'Logging…' : 'Log Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

