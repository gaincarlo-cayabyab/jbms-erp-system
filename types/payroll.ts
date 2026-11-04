export type PayrollStatus = 'Pending' | 'Processing' | 'Paid' | 'Cancelled';
export type AttendanceStatus = 'Present' | 'Late' | 'Half_Day' | 'Absent' | 'On_Leave';
export type PaymentMethod = 'Cash' | 'GCash' | 'Maya' | 'Bank Transfer' | 'Cheque';
export type StaffRole = 'Admin' | 'Store_Manager' | 'Production_Staff' | 'Accountant';
export type Branch = 'Main' | 'North' | 'South';

export interface PayrollRecord {
  id: string;
  staff_name: string;
  role: StaffRole;
  branch: Branch;
  daily_rate: number;
  days_worked: number;
  overtime_hours: number;
  overtime_rate: number;
  deductions: number;
  total_net_pay: number;
  status: PayrollStatus;
  pay_period_start: string;
  pay_period_end: string;
  payment_date: string | null;
  payment_method: PaymentMethod;
  created_at: string;
}

export interface AttendanceLog {
  id: string;
  staff_name: string;
  branch: Branch;
  date: string;
  time_in: string | null;
  time_out: string | null;
  status: AttendanceStatus;
  overtime_hours: number;
  notes: string | null;
  created_at: string;
}

export interface PayrollFormData {
  staff_name: string;
  role: StaffRole;
  branch: Branch;
  daily_rate: number;
  days_worked: number;
  overtime_hours: number;
  overtime_rate: number;
  deductions: number;
  payment_method: PaymentMethod;
  pay_period_start: string;
  pay_period_end: string;
  status: PayrollStatus;
}

export interface AttendanceFormData {
  staff_name: string;
  branch: Branch;
  date: string;
  time_in: string;
  time_out: string;
  status: AttendanceStatus;
  overtime_hours: number;
  notes: string;
}

export interface PayrollSummary {
  activeStaffCount: number;
  monthlyPayrollBudget: number;
  pendingDisbursementsCount: number;
  pendingDisbursementsAmount: number;
  totalOvertimeHours: number;
}
