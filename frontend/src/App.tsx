import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, AdminTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { StudentsView } from './components/StudentsView';
import { PaymentCollectView } from './components/PaymentCollectView';
import { OverdueView } from './components/OverdueView';
import { PaymentsView } from './components/PaymentsView';
import { FeeCalculatorView } from './components/FeeCalculatorView';
import { StudentPortalView } from './components/StudentPortalView';
import { StudentDetailModal } from './components/StudentDetailModal';
import { AddStudentModal } from './components/AddStudentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { StudentPayModal } from './components/StudentPayModal';
import { ReminderModal } from './components/ReminderModal';
import { LoginView } from './components/LoginView';
import { PasswordChangeModal } from './components/PasswordChangeModal';
import { AdminRequestsView } from './components/AdminRequestsView';
import { AdminToolsView } from './components/AdminToolsView';
import { api } from './api';
import { Student, DashboardData, Payment, ReceiptData, Installment, PlanType } from './types';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  const [role, setRole] = useState<'ADMIN' | 'STUDENT' | null>(null);
  const [username, setUsername] = useState('');
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [overdueStudents, setOverdueStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active student for Student Portal view
  const [activeStudentId, setActiveStudentId] = useState<number | null>(null);

  // Modals & Overlay state
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
  const [preSelectedStudentForPay, setPreSelectedStudentForPay] = useState<Student | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const [payModalState, setPayModalState] = useState<{
    isOpen: boolean;
    student: Student | null;
    installment: Installment | null;
  }>({
    isOpen: false,
    student: null,
    installment: null,
  });

  const [reminderModalState, setReminderModalState] = useState<{
    isOpen: boolean;
    student: Student | null;
    installmentId: number | null;
  }>({
    isOpen: false,
    student: null,
    installmentId: null,
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAllData = async (targetRole: 'ADMIN' | 'STUDENT' | null = role) => {
    if (!targetRole) return;
    try {
      setLoading(true);
      setError(null);
      if (targetRole === 'STUDENT') {
        const profile = await api.getMe();
        setStudentProfile(profile);
        setStudents([profile]);
        setPayments(await api.getPayments(profile.id));
        setActiveStudentId(profile.id);
      } else {
        const [dash, studList, overdueList, payList] = await Promise.all([
          api.getDashboardStats(), api.getStudents(), api.getOverdueStudents(), api.getPayments(),
        ]);
        setDashboardData(dash);
        setStudents(studList);
        setOverdueStudents(overdueList);
        setPayments(payList);
        if (studList.length > 0 && !activeStudentId) setActiveStudentId(studList[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load ERP data:', err);
      setError(err.message || 'Could not connect to backend API server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    api.getSession().then(async current => {
      if (!mounted) return;
      if (current.authenticated && current.role) {
        setRole(current.role);
        setUsername(current.username || '');
        await loadAllData(current.role);
      } else setLoading(false);
    }).catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleLogin = async (user: string, password: string) => {
    const auth = await api.login(user, password);
    setRole(auth.role);
    setUsername(auth.username);
    setAdminTab('dashboard');
    await loadAllData(auth.role);
  };

  const handleLogout = async () => {
    await api.logout();
    setRole(null);
    setUsername('');
    setStudentProfile(null);
    setDashboardData(null);
    setStudents([]);
    setOverdueStudents([]);
    setPayments([]);
    setSelectedStudentForDetail(null);
    setReceiptData(null);
    setLoading(false);
  };

  // Handlers
  const handleOpenStudentDetail = async (student: Student) => {
    try {
      const detailed = await api.getStudent(student.id);
      setSelectedStudentForDetail(detailed);
    } catch {
      setSelectedStudentForDetail(student);
    }
  };

  const handleRecordPaymentForStudent = (student: Student) => {
    setPreSelectedStudentForPay(student);
    setAdminTab('collect');
  };

  const handleProcessPayment = async (payload: {
    student_id: number;
    amount: number;
    installment_id?: number | null;
    payment_mode: string;
    transaction_ref?: string;
    remarks?: string;
  }) => {
    const res = await api.recordPayment(payload);
    await loadAllData();
    const smsMessage = res.sms?.status === 'queued'
      ? 'Confirmation SMS queued for the student.'
      : res.sms?.status === 'invalid_phone'
        ? 'SMS was not sent because the student phone number is invalid.'
        : res.sms?.status === 'failed'
          ? 'SMS could not be sent; check the SMS provider configuration.'
          : 'SMS was not sent because the SMS provider is not configured.';
    showToast(
      `Payment of ₹${payload.amount.toLocaleString('en-IN')} recorded. ${smsMessage}`,
      res.sms?.status === 'queued' ? 'success' : 'error'
    );
    return { receipt_no: res.payment.receipt_no };
  };

  const handleViewReceipt = async (receiptNo: string) => {
    try {
      const data = await api.getReceipt(receiptNo);
      setReceiptData(data);
    } catch (err: any) {
      showToast(err.message || 'Receipt could not be loaded', 'error');
    }
  };

  const handleWaiveLateFee = async (installmentId: number) => {
    try {
      await api.waiveLateFee(installmentId);
      await loadAllData();
      if (selectedStudentForDetail) {
        const updated = await api.getStudent(selectedStudentForDetail.id);
        setSelectedStudentForDetail(updated);
      }
      showToast('Late fee waived successfully.');
    } catch (err: any) {
      showToast(err.message || 'Failed to waive late fee', 'error');
    }
  };

  const handleExtendDueDate = async (installmentId: number, newDate: string) => {
    try {
      await api.extendDueDate(installmentId, newDate);
      await loadAllData();
      if (selectedStudentForDetail) {
        const updated = await api.getStudent(selectedStudentForDetail.id);
        setSelectedStudentForDetail(updated);
      }
      showToast(`Due date extended to ${newDate}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to extend date', 'error');
    }
  };

  const handleChangePlan = async (studentId: number, newPlan: PlanType) => {
    try {
      const updated = await api.changePlan(studentId, { plan_type: newPlan });
      await loadAllData();
      setSelectedStudentForDetail(updated);
      showToast(`Installment schedule restructured to ${newPlan}!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to restructure plan', 'error');
    }
  };

  const handleSendReminder = async (payload: {
    student_id: number;
    installment_id?: number | null;
    reminder_type: 'Email' | 'SMS' | 'WhatsApp';
    message?: string;
  }) => {
    await api.sendReminder(payload);
    await loadAllData();
    if (selectedStudentForDetail) {
      const updated = await api.getStudent(selectedStudentForDetail.id);
      setSelectedStudentForDetail(updated);
    }
    showToast(`Reminder sent via ${payload.reminder_type}`);
  };

  const handleAddStudent = async (payload: any) => {
    const created = await api.createStudent(payload);
    await loadAllData('ADMIN');
    if (created.initial_password) window.alert(`Student login: ${created.roll_no}\nTemporary password: ${created.initial_password}\n\nShare these credentials through a secure channel.`);
    showToast(`Student ${payload.name} enrolled with ${payload.plan_type} plan.`);
  };

  const handleResetStudentPassword = async (student: Student) => {
    const result = await api.resetStudentPassword(student.id);
    window.alert(`Temporary password for ${student.roll_no}:\n\n${result.temporary_password}\n\nShare it with the student through a secure channel.`);
  };

  const handleToggleStudentAccount = async (student: Student) => {
    const activate = student.is_active === false;
    if (!window.confirm(`${activate ? 'Activate' : 'Deactivate'} login for ${student.name}?`)) return;
    await api.setStudentActive(student.id, activate);
    await loadAllData('ADMIN');
    showToast(`${student.name}'s account ${activate ? 'activated' : 'deactivated'}.`);
  };

  const handleChangeMyPassword = async (current: string, next: string) => {
    await api.changePassword(current, next);
    showToast('Password updated successfully.');
  };

  const handleMarkNotificationRead = async (id: number) => {
    await api.markNotificationRead(id);
    setStudentProfile(await api.getMe());
  };

  const currentStudentForPortal = role === 'STUDENT' ? studentProfile : (students.find((s) => s.id === activeStudentId) || students[0]);

  const overdueDefaulterCount = dashboardData?.metrics.overdue_students_count || 0;
  const collectionRate = dashboardData?.metrics.collection_rate || 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100 selection:text-navy-950">
      {role === null ? (loading ? <div className="flex min-h-screen items-center justify-center text-sm font-semibold text-slate-600">Checking secure session…</div> : <LoginView onLogin={handleLogin} />) : <>
      <Navbar currentRole={role} username={username} onLogout={handleLogout} />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center space-x-2 px-4 py-3 rounded-2xl shadow-elevation text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            toast.type === 'success'
              ? 'bg-navy-900 text-white border border-emerald-500/40'
              : 'bg-rose-900 text-white border border-rose-500'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Body */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading College Fee Portal...</p>
        </div>
      ) : error ? (
        <div className="flex-1 max-w-lg mx-auto flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-navy-900">Backend Connection Error</h2>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
          <button
            onClick={() => loadAllData()}
            className="mt-4 px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-bold shadow hover:bg-navy-800 transition"
          >
            Retry Connection
          </button>
        </div>
      ) : role === 'STUDENT' ? (
        // STUDENT SELF-SERVICE VIEW
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {currentStudentForPortal ? (
            <StudentPortalView
              student={currentStudentForPortal}
              onViewReceipt={handleViewReceipt}
              onSwitchStudent={() => {}}
              onChangePassword={() => setPasswordModalOpen(true)}
              onMarkNotificationRead={handleMarkNotificationRead}
              onRefreshProfile={async () => setStudentProfile(await api.getMe())}
            />
          ) : (
            <div className="text-center p-12 text-slate-400">No student profile selected.</div>
          )}
        </main>
      ) : (
        // ADMIN / ACCOUNTS DESK VIEW
        <div className="flex-1 flex flex-col md:flex-row">
          {/* Sidebar */}
          <Sidebar
            activeTab={adminTab}
            onTabChange={setAdminTab}
            overdueCount={overdueDefaulterCount}
            collectionRate={collectionRate}
          />

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden max-w-7xl mx-auto w-full">
            {adminTab === 'dashboard' && dashboardData && (
              <DashboardView
                data={dashboardData}
                recentPayments={payments}
                onOpenCollect={() => setAdminTab('collect')}
                onOpenAddStudent={() => setIsAddModalOpen(true)}
                onOpenOverdue={() => setAdminTab('overdue')}
                onViewReceipt={handleViewReceipt}
              />
            )}

            {adminTab === 'students' && (
              <StudentsView
                students={students}
                onSelectStudent={handleOpenStudentDetail}
                onRecordPaymentForStudent={handleRecordPaymentForStudent}
                onOpenAddModal={() => setIsAddModalOpen(true)}
                onSendReminder={(s) =>
                  setReminderModalState({ isOpen: true, student: s, installmentId: null })
                }
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onResetPassword={handleResetStudentPassword}
                onToggleAccount={handleToggleStudentAccount}
              />
            )}

            {adminTab === 'collect' && (
              <PaymentCollectView
                students={students}
                preSelectedStudent={preSelectedStudentForPay}
                onPaymentSuccess={handleViewReceipt}
                onRecordPayment={handleProcessPayment}
              />
            )}

            {adminTab === 'overdue' && (
              <OverdueView
                students={overdueStudents}
                onSendReminder={(s, instId) =>
                  setReminderModalState({ isOpen: true, student: s, installmentId: instId || null })
                }
                onWaiveLateFee={handleWaiveLateFee}
                onExtendDueDate={handleExtendDueDate}
                onRecordPaymentForStudent={handleRecordPaymentForStudent}
                onViewStudent={handleOpenStudentDetail}
              />
            )}

            {adminTab === 'payments' && (
              <PaymentsView payments={payments} onViewReceipt={handleViewReceipt} />
            )}

            {adminTab === 'requests' && <AdminRequestsView />}

            {adminTab === 'tools' && <AdminToolsView />}

            {adminTab === 'calculator' && <FeeCalculatorView />}
          </main>
        </div>
      )}

      {/* OVERLAY MODALS */}

      {/* 1. Student Detail Ledger Modal */}
      <StudentDetailModal
        student={selectedStudentForDetail}
        onClose={() => setSelectedStudentForDetail(null)}
        onPayInstallment={(s, inst) =>
          setPayModalState({ isOpen: true, student: s, installment: inst })
        }
        onWaiveLateFee={handleWaiveLateFee}
        onExtendDueDate={handleExtendDueDate}
        onSendReminder={(s, instId) =>
          setReminderModalState({ isOpen: true, student: s, installmentId: instId || null })
        }
        onViewReceipt={handleViewReceipt}
        onChangePlan={handleChangePlan}
      />

      {/* 2. Add Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddStudent}
      />

      {/* 3. Official Fee Receipt Voucher Modal */}
      <ReceiptModal receiptData={receiptData} onClose={() => setReceiptData(null)} />

      {/* 4. Student Pay Installment Modal */}
      <StudentPayModal
        isOpen={payModalState.isOpen}
        onClose={() => setPayModalState({ isOpen: false, student: null, installment: null })}
        student={payModalState.student}
        installment={payModalState.installment}
      />

      {/* 5. Reminder Dispatch Modal */}
      <ReminderModal
        isOpen={reminderModalState.isOpen}
        onClose={() =>
          setReminderModalState({ isOpen: false, student: null, installmentId: null })
        }
        student={reminderModalState.student}
        installmentId={reminderModalState.installmentId}
        onSend={handleSendReminder}
      />
      {passwordModalOpen && role === 'STUDENT' && <PasswordChangeModal onClose={() => setPasswordModalOpen(false)} onSubmit={handleChangeMyPassword} />}
      </>}
    </div>
  );
}

export default App;
