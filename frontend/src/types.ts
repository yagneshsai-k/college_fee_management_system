export type PlanType = 'MONTHLY' | 'QUARTERLY' | 'SEMESTER' | 'ONE_TIME' | 'CUSTOM';

export type InstallmentStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL';

export type StudentStatus = 'COMPLETED' | 'OVERDUE' | 'IN_PROGRESS';

export interface FeeComponent {
  id?: number;
  student_id?: number;
  category: string;
  amount: number;
}

export interface Installment {
  id: number;
  student_id: number;
  installment_no: number;
  title: string;
  due_date: string;
  amount: number;
  late_fee: number;
  total_due: number;
  paid_amount: number;
  balance: number;
  status: InstallmentStatus;
  paid_date?: string | null;
  remarks?: string | null;
}

export interface FeeExtensionRequest {
  id: number;
  student_id: number;
  installment_id: number;
  installment_title?: string;
  requested_amount: number;
  original_due_date: string;
  requested_due_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_at: string;
  reviewed_at?: string | null;
  admin_remarks?: string | null;
  student?: Pick<Student, 'id' | 'name' | 'roll_no' | 'department' | 'phone' | 'email'>;
}

export interface NoDuesEligibility {
  eligible: boolean;
  outstanding_amount: number;
  reason: string;
}

export interface NoDuesCertificateRequest {
  id: number;
  student_id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_at: string;
  reviewed_at?: string | null;
  admin_remarks?: string | null;
  certificate_id?: string | null;
  issued_at?: string | null;
  eligibility?: NoDuesEligibility;
  student?: Pick<Student, 'id' | 'name' | 'roll_no' | 'department' | 'course' | 'year_semester' | 'admission_year' | 'email'>;
}

export interface Payment {
  id: number;
  receipt_no: string;
  student_id: number;
  student_name?: string;
  student_roll?: string;
  installment_id?: number | null;
  installment_title?: string;
  amount: number;
  payment_mode: 'UPI' | 'Net Banking' | 'Debit/Credit Card' | 'Cash' | 'Cheque/DD' | string;
  transaction_ref: string;
  payment_date: string;
  collected_by: string;
  remarks?: string;
}

export interface ReminderLog {
  id: number;
  student_id: number;
  installment_id?: number | null;
  reminder_type: 'Email' | 'SMS' | 'WhatsApp';
  sent_to: string;
  subject: string;
  message: string;
  status: string;
  sent_at: string;
}

export interface StudentNotification {
  id: number;
  student_id: number;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

export interface StudentSummary {
  total_fee: number;
  scholarship_discount: number;
  fee_concession?: number;
  net_payable: number;
  total_paid: number;
  total_late_fee: number;
  balance_due: number;
  overdue_amount: number;
  paid_percentage: number;
  status: StudentStatus;
}

export interface Student {
  id: number;
  roll_no: string;
  is_active?: boolean;
  name: string;
  email: string;
  phone: string;
  department: string;
  course: string;
  year_semester: string;
  quota: string;
  admission_year: number;
  avatar_url?: string | null;
  total_fee: number;
  scholarship_discount: number;
  fee_concession?: number;
  net_payable: number;
  plan_type: PlanType;
  created_at?: string;
  summary: StudentSummary;
  fee_components?: FeeComponent[];
  installments?: Installment[];
  payments?: Payment[];
  reminders?: ReminderLog[];
  notifications?: StudentNotification[];
}

export interface DashboardMetrics {
  total_students: number;
  total_expected_fee: number;
  total_collected: number;
  total_balance_due: number;
  total_overdue_amount: number;
  overdue_students_count: number;
  collection_rate: number;
  paid_students: number;
  partially_paid_students: number;
  pending_students: number;
}

export interface PlanDistribution {
  name: string;
  plan: PlanType;
  count: number;
}

export interface DepartmentBreakdown {
  department: string;
  total: number;
  collected: number;
  pending: number;
  students: number;
}

export interface PaymentModeStat {
  mode: string;
  amount: number;
}

export interface CollectionTrend {
  month: string;
  collected: number;
  projected: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  plan_distribution: PlanDistribution[];
  department_breakdown: DepartmentBreakdown[];
  payment_modes: PaymentModeStat[];
  collection_trend: CollectionTrend[];
}

export interface ReceiptData {
  receipt: Payment;
  total_fee: number;
  previous_balance: number;
  remaining_balance: number;
  academic_year: string;
  student: {
    roll_no: string;
    name: string;
    course: string;
    department: string;
    year_semester: string;
    email: string;
    phone: string;
  };
  college_info: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    tax_id: string;
  };
}
