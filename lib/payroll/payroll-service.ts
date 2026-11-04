import { createClient } from '@/lib/supabase/client';
import type {
  PayrollRecord,
  AttendanceLog,
  PayrollFormData,
  AttendanceFormData,
  PayrollSummary,
} from '@/types/payroll';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_PAYROLL: PayrollRecord[] = [
  {
    id: 'pr-001',
    staff_name: 'Maria Santos',
    role: 'Store_Manager',
    branch: 'Main',
    daily_rate: 850,
    days_worked: 26,
    overtime_hours: 8,
    overtime_rate: 130,
    deductions: 1200,
    total_net_pay: 22140,
    status: 'Paid',
    pay_period_start: '2026-10-01',
    pay_period_end: '2026-10-31',
    payment_date: '2026-10-31',
    payment_method: 'GCash',
    created_at: new Date('2026-10-31').toISOString(),
  },
  {
    id: 'pr-002',
    staff_name: 'Juan dela Cruz',
    role: 'Production_Staff',
    branch: 'Main',
    daily_rate: 610,
    days_worked: 24,
    overtime_hours: 12,
    overtime_rate: 100,
    deductions: 980,
    total_net_pay: 15860,
    status: 'Pending',
    pay_period_start: '2026-10-01',
    pay_period_end: '2026-10-31',
    payment_date: null,
    payment_method: 'Cash',
    created_at: new Date('2026-10-31').toISOString(),
  },
  {
    id: 'pr-003',
    staff_name: 'Ana Reyes',
    role: 'Accountant',
    branch: 'North',
    daily_rate: 750,
    days_worked: 26,
    overtime_hours: 4,
    overtime_rate: 115,
    deductions: 1100,
    total_net_pay: 18960,
    status: 'Pending',
    pay_period_start: '2026-10-01',
    pay_period_end: '2026-10-31',
    payment_date: null,
    payment_method: 'Bank Transfer',
    created_at: new Date('2026-10-31').toISOString(),
  },
  {
    id: 'pr-004',
    staff_name: 'Carlo Lim',
    role: 'Production_Staff',
    branch: 'South',
    daily_rate: 610,
    days_worked: 22,
    overtime_hours: 6,
    overtime_rate: 100,
    deductions: 850,
    total_net_pay: 13570,
    status: 'Processing',
    pay_period_start: '2026-10-01',
    pay_period_end: '2026-10-31',
    payment_date: null,
    payment_method: 'GCash',
    created_at: new Date('2026-10-31').toISOString(),
  },
  {
    id: 'pr-005',
    staff_name: 'Grace Villanueva',
    role: 'Admin',
    branch: 'Main',
    daily_rate: 920,
    days_worked: 26,
    overtime_hours: 2,
    overtime_rate: 145,
    deductions: 1350,
    total_net_pay: 24210,
    status: 'Paid',
    pay_period_start: '2026-10-01',
    pay_period_end: '2026-10-31',
    payment_date: '2026-10-31',
    payment_method: 'Bank Transfer',
    created_at: new Date('2026-10-31').toISOString(),
  },
];

const MOCK_ATTENDANCE: AttendanceLog[] = [
  {
    id: 'at-001',
    staff_name: 'Maria Santos',
    branch: 'Main',
    date: '2026-11-04',
    time_in: '08:02',
    time_out: '17:05',
    status: 'Present',
    overtime_hours: 0,
    notes: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'at-002',
    staff_name: 'Juan dela Cruz',
    branch: 'Main',
    date: '2026-11-04',
    time_in: '08:35',
    time_out: '19:00',
    status: 'Late',
    overtime_hours: 2,
    notes: 'Traffic — EDSA',
    created_at: new Date().toISOString(),
  },
  {
    id: 'at-003',
    staff_name: 'Ana Reyes',
    branch: 'North',
    date: '2026-11-04',
    time_in: '08:00',
    time_out: '17:00',
    status: 'Present',
    overtime_hours: 0,
    notes: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'at-004',
    staff_name: 'Carlo Lim',
    branch: 'South',
    date: '2026-11-03',
    time_in: null,
    time_out: null,
    status: 'Absent',
    overtime_hours: 0,
    notes: 'No notice',
    created_at: new Date('2026-11-03').toISOString(),
  },
  {
    id: 'at-005',
    staff_name: 'Grace Villanueva',
    branch: 'Main',
    date: '2026-11-04',
    time_in: '08:00',
    time_out: '13:00',
    status: 'Half_Day',
    overtime_hours: 0,
    notes: 'Medical appointment',
    created_at: new Date().toISOString(),
  },
];

// ─── Local Storage Keys ───────────────────────────────────────────────────────

const LS_PAYROLL_KEY = 'japa_payroll_records';
const LS_ATTENDANCE_KEY = 'japa_attendance_logs';

function loadFromStorage<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T[];
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

// ─── Service Functions ────────────────────────────────────────────────────────

export async function getPayrollRecords(): Promise<PayrollRecord[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('payroll_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) return data as PayrollRecord[];
  } catch {
    /* fall through to local storage */
  }
  return loadFromStorage<PayrollRecord>(LS_PAYROLL_KEY, MOCK_PAYROLL);
}

export async function getAttendanceLogs(): Promise<AttendanceLog[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) return data as AttendanceLog[];
  } catch {
    /* fall through to local storage */
  }
  return loadFromStorage<AttendanceLog>(LS_ATTENDANCE_KEY, MOCK_ATTENDANCE);
}

export async function recordPayroll(formData: PayrollFormData): Promise<PayrollRecord> {
  const totalNetPay =
    formData.daily_rate * formData.days_worked +
    formData.overtime_hours * formData.overtime_rate -
    formData.deductions;

  const newRecord: PayrollRecord = {
    id: `pr-${Date.now()}`,
    ...formData,
    total_net_pay: Math.max(0, totalNetPay),
    payment_date: formData.status === 'Paid' ? new Date().toISOString().split('T')[0] : null,
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('payroll_records')
      .insert([{ ...newRecord, id: undefined }])
      .select()
      .single();

    if (error) throw error;
    return data as PayrollRecord;
  } catch {
    const existing = loadFromStorage<PayrollRecord>(LS_PAYROLL_KEY, MOCK_PAYROLL);
    const updated = [newRecord, ...existing];
    saveToStorage(LS_PAYROLL_KEY, updated);
    return newRecord;
  }
}

export async function logAttendance(formData: AttendanceFormData): Promise<AttendanceLog> {
  const newLog: AttendanceLog = {
    id: `at-${Date.now()}`,
    ...formData,
    time_in: formData.time_in || null,
    time_out: formData.time_out || null,
    notes: formData.notes || null,
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('attendance_logs')
      .insert([{ ...newLog, id: undefined }])
      .select()
      .single();

    if (error) throw error;
    return data as AttendanceLog;
  } catch {
    const existing = loadFromStorage<AttendanceLog>(LS_ATTENDANCE_KEY, MOCK_ATTENDANCE);
    const updated = [newLog, ...existing];
    saveToStorage(LS_ATTENDANCE_KEY, updated);
    return newLog;
  }
}

export async function markPayrollAsPaid(id: string): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('payroll_records')
      .update({ status: 'Paid', payment_date: new Date().toISOString().split('T')[0] })
      .eq('id', id);

    if (error) throw error;
    return;
  } catch {
    const existing = loadFromStorage<PayrollRecord>(LS_PAYROLL_KEY, MOCK_PAYROLL);
    const updated = existing.map((r) =>
      r.id === id
        ? { ...r, status: 'Paid' as const, payment_date: new Date().toISOString().split('T')[0] }
        : r
    );
    saveToStorage(LS_PAYROLL_KEY, updated);
  }
}

export function computePayrollSummary(
  payroll: PayrollRecord[],
  attendance: AttendanceLog[]
): PayrollSummary {
  const uniqueStaff = new Set(payroll.map((r) => r.staff_name));
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthlyRecords = payroll.filter((r) => r.pay_period_start.startsWith(thisMonth));
  const monthlyBudget = monthlyRecords.reduce((sum, r) => sum + r.total_net_pay, 0);

  const pending = payroll.filter((r) => r.status === 'Pending');
  const pendingAmount = pending.reduce((sum, r) => sum + r.total_net_pay, 0);

  const totalOT = attendance.reduce((sum, a) => sum + (a.overtime_hours ?? 0), 0);

  return {
    activeStaffCount: uniqueStaff.size,
    monthlyPayrollBudget: monthlyBudget,
    pendingDisbursementsCount: pending.length,
    pendingDisbursementsAmount: pendingAmount,
    totalOvertimeHours: totalOT,
  };
}
