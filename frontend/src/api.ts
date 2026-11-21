import {
  DashboardData,
  Student,
  Payment,
  ReceiptData,
  ReminderLog,
  Installment,
  PlanType,
  FeeExtensionRequest,
  NoDuesCertificateRequest,
  NoDuesEligibility,
} from './types';

const API_BASE = '/api';
let csrfToken = '';
let currentRole: 'ADMIN' | 'STUDENT' | null = null;
export const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const headers = new Headers(init.headers || {});
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes((init.method || 'GET').toUpperCase())) headers.set('X-CSRF-Token', csrfToken);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(input, { ...init, headers, credentials: 'same-origin' });
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const rowDetails = Array.isArray(errorBody.details)
      ? errorBody.details.map((item: any) => `Row ${item.row}: ${item.error}`).join('; ')
      : '';
    throw new Error([errorBody.error || `Request failed with status ${res.status}`, rowDetails].filter(Boolean).join(' — '));
  }
  return res.json();
}

export const api = {
  async getSession(): Promise<{authenticated: boolean; role?: 'ADMIN' | 'STUDENT'; username?: string; csrf_token?: string; student_id?: number}> {
    const res = await apiFetch(`${API_BASE}/auth/session`);
    const data = await handleResponse<{authenticated: boolean; role?: 'ADMIN' | 'STUDENT'; username?: string; csrf_token?: string; student_id?: number}>(res);
    csrfToken = data.csrf_token || '';
    currentRole = data.role || null;
    return data;
  },
  async login(username: string, password: string): Promise<{role: 'ADMIN' | 'STUDENT'; username: string; csrf_token: string}> {
    const res = await fetch(`${API_BASE}/auth/login`, {method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'same-origin', body: JSON.stringify({username, password})});
    const data = await handleResponse<{role: 'ADMIN' | 'STUDENT'; username: string; csrf_token: string}>(res);
    csrfToken = data.csrf_token;
    currentRole = data.role;
    return data;
  },
  async logout(): Promise<void> {
    await handleResponse(await apiFetch(`${API_BASE}/auth/logout`, {method: 'POST'}));
    csrfToken = '';
    currentRole = null;
  },
  async getMe(): Promise<Student> {
    return handleResponse<Student>(await apiFetch(`${API_BASE}/me`));
  },
  async changePassword(current_password: string, new_password: string): Promise<void> {
    await handleResponse(await apiFetch(`${API_BASE}/me/password`, {method: 'POST', body: JSON.stringify({current_password, new_password})}));
  },
  async markNotificationRead(id: number): Promise<void> {
    await handleResponse(await apiFetch(`${API_BASE}/me/notifications/${id}/read`, {method: 'POST'}));
  },
  async resetStudentPassword(id: number): Promise<{temporary_password: string}> {
    return handleResponse(await apiFetch(`${API_BASE}/admin/students/${id}/reset-password`, {method: 'POST'}));
  },
  async setStudentActive(id: number, is_active: boolean): Promise<void> {
    await handleResponse(await apiFetch(`${API_BASE}/admin/students/${id}/status`, {method: 'POST', body: JSON.stringify({is_active})}));
  },
  // Dashboard
  async getDashboardStats(): Promise<DashboardData> {
    const res = await apiFetch(`${API_BASE}/dashboard/stats`);
    return handleResponse<DashboardData>(res);
  },

  // Students
  async getStudents(params?: {
    department?: string;
    plan_type?: string;
    status?: string;
    search?: string;
  }): Promise<Student[]> {
    const query = new URLSearchParams();
    if (params?.department) query.set('department', params.department);
    if (params?.plan_type) query.set('plan_type', params.plan_type);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const res = await apiFetch(`${API_BASE}/students?${query.toString()}`);
    return handleResponse<Student[]>(res);
  },

  async getOverdueStudents(): Promise<Student[]> {
    const res = await apiFetch(`${API_BASE}/overdue/students`);
    return handleResponse<Student[]>(res);
  },

  async getStudent(id: number): Promise<Student> {
    const res = await apiFetch(`${API_BASE}/students/${id}`);
    return handleResponse<Student>(res);
  },

  async createStudent(payload: {
    roll_no: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    course: string;
    year_semester: string;
    quota: string;
    admission_year: number;
    total_fee: number;
    scholarship_discount?: number;
    fee_concession?: number;
    plan_type: PlanType;
    components?: { category: string; amount: number }[];
    custom_installments?: { title: string; due_date: string; amount: number }[];
  }): Promise<Student & {initial_password?: string}> {
    const res = await apiFetch(`${API_BASE}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Student & {initial_password?: string}>(res);
  },

  async updateStudent(id: number, payload: Partial<Student>): Promise<Student> {
    const res = await apiFetch(`${API_BASE}/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Student>(res);
  },

  async deleteStudent(id: number): Promise<{ message: string }> {
    const res = await apiFetch(`${API_BASE}/students/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(res);
  },

  async changePlan(
    id: number,
    payload: {
      plan_type: PlanType;
      custom_installments?: { title: string; due_date: string; amount: number }[];
    }
  ): Promise<Student> {
    const res = await apiFetch(`${API_BASE}/students/${id}/change-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Student>(res);
  },

  // Payments
  async recordPayment(payload: {
    student_id: number;
    amount: number;
    installment_id?: number | null;
    payment_mode: string;
    transaction_ref?: string;
    remarks?: string;
    collected_by?: string;
  }): Promise<{
    success: boolean;
    payment: Payment;
    student: Student;
    sms?: { status: 'queued' | 'not_configured' | 'invalid_phone' | 'failed'; provider_status?: string };
  }> {
    const res = await apiFetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<{
      success: boolean;
      payment: Payment;
      student: Student;
      sms?: { status: 'queued' | 'not_configured' | 'invalid_phone' | 'failed'; provider_status?: string };
    }>(res);
  },

  async getPayments(studentId?: number): Promise<Payment[]> {
    const url = studentId ? `${API_BASE}/payments?student_id=${studentId}` : `${API_BASE}/payments`;
    const res = await apiFetch(studentId ? `${API_BASE}/me/payments` : url);
    return handleResponse<Payment[]>(res);
  },

  async getReceipt(receiptNo: string): Promise<ReceiptData> {
    const res = await apiFetch(`${API_BASE}/${currentRole === 'STUDENT' ? 'me/receipts' : 'payments/receipt'}/${encodeURIComponent(receiptNo)}`);
    return handleResponse<ReceiptData>(res);
  },

  // Reminders
  async sendReminder(payload: {
    student_id: number;
    installment_id?: number | null;
    reminder_type: 'Email' | 'SMS' | 'WhatsApp';
    message?: string;
  }): Promise<{ success: boolean; message: string; reminder: ReminderLog }> {
    const res = await apiFetch(`${API_BASE}/reminders/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; message: string; reminder: ReminderLog }>(res);
  },

  // Installments adjustments
  async waiveLateFee(installmentId: number): Promise<{ success: boolean; installment: Installment }> {
    const res = await apiFetch(`${API_BASE}/installments/${installmentId}/waive-late-fee`, {
      method: 'POST',
    });
    return handleResponse<{ success: boolean; installment: Installment }>(res);
  },

  async extendDueDate(installmentId: number, newDueDate: string): Promise<{ success: boolean; installment: Installment }> {
    const res = await apiFetch(`${API_BASE}/installments/${installmentId}/extend-due-date`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_due_date: newDueDate }),
    });
    return handleResponse<{ success: boolean; installment: Installment }>(res);
  },

  async getMyFeeExtensionRequests(): Promise<FeeExtensionRequest[]> {
    return handleResponse<FeeExtensionRequest[]>(await apiFetch(`${API_BASE}/me/fee-extension-requests`));
  },

  async requestFeeExtension(payload: { installment_id: number; requested_due_date: string; reason: string }): Promise<FeeExtensionRequest> {
    return handleResponse<FeeExtensionRequest>(await apiFetch(`${API_BASE}/me/fee-extension-requests`, {
      method: 'POST', body: JSON.stringify(payload),
    }));
  },

  async getMyNoDuesRequests(): Promise<{ eligibility: NoDuesEligibility; requests: NoDuesCertificateRequest[] }> {
    return handleResponse(await apiFetch(`${API_BASE}/me/no-dues-requests`));
  },

  async requestNoDuesCertificate(): Promise<NoDuesCertificateRequest> {
    return handleResponse<NoDuesCertificateRequest>(await apiFetch(`${API_BASE}/me/no-dues-requests`, {
      method: 'POST', body: JSON.stringify({}),
    }));
  },

  async downloadNoDuesCertificate(requestId: number): Promise<void> {
    const res = await apiFetch(`${API_BASE}/me/no-dues-requests/${requestId}/certificate`);
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || `Request failed with status ${res.status}`);
    }
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `No-Dues-Certificate-${requestId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  async getAdminFeeExtensionRequests(): Promise<FeeExtensionRequest[]> {
    return handleResponse<FeeExtensionRequest[]>(await apiFetch(`${API_BASE}/admin/fee-extension-requests`));
  },

  async reviewFeeExtensionRequest(id: number, decision: 'APPROVED' | 'REJECTED', admin_remarks: string): Promise<void> {
    await handleResponse(await apiFetch(`${API_BASE}/admin/fee-extension-requests/${id}/decision`, {
      method: 'POST', body: JSON.stringify({ decision, admin_remarks }),
    }));
  },

  async getAdminNoDuesRequests(): Promise<NoDuesCertificateRequest[]> {
    return handleResponse<NoDuesCertificateRequest[]>(await apiFetch(`${API_BASE}/admin/no-dues-requests`));
  },

  async reviewNoDuesRequest(id: number, decision: 'APPROVED' | 'REJECTED', admin_remarks: string): Promise<void> {
    await handleResponse(await apiFetch(`${API_BASE}/admin/no-dues-requests/${id}/decision`, {
      method: 'POST', body: JSON.stringify({ decision, admin_remarks }),
    }));
  },

  async getFinanceReport(filters: Record<string, string>) {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)));
    return handleResponse<any>(await apiFetch(`${API_BASE}/admin/reports/finance?${query}`));
  },
  async getFinanceDepartments(): Promise<string[]> {
    return handleResponse<string[]>(await apiFetch(`${API_BASE}/admin/reports/departments`));
  },
  async getAdminActivity(filters: Record<string, string>): Promise<any[]> {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)));
    return handleResponse<any[]>(await apiFetch(`${API_BASE}/admin/activity?${query}`));
  },
  async uploadStudentCsv(file: File, preview = false): Promise<any> {
    const body = new FormData(); body.append('file', file);
    return handleResponse<any>(await apiFetch(`${API_BASE}/admin/students/import${preview ? '/preview' : ''}`, { method: 'POST', body }));
  },
  async downloadAdminFile(path: string, filename: string): Promise<void> {
    const res = await apiFetch(`${API_BASE}${path}`);
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || `Request failed with status ${res.status}`);
    }
    const url = URL.createObjectURL(await res.blob()); const link = document.createElement('a');
    link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  },
  async restoreDatabase(file: File, confirmation: string): Promise<{ success: boolean; message: string }> {
    const body = new FormData(); body.append('file', file); body.append('confirmation', confirmation);
    return handleResponse(await apiFetch(`${API_BASE}/admin/database/restore`, { method: 'POST', body }));
  },
  async runAutomaticReminders(): Promise<{ success: boolean; processed: number; message: string }> {
    return handleResponse(await apiFetch(`${API_BASE}/admin/reminders/run`, { method: 'POST', body: JSON.stringify({}) }));
  },
};
