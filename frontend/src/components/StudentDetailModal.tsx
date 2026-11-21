import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Calendar,
  Receipt,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  Phone,
  Mail,
  GraduationCap,
  Printer,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Student, Installment, PlanType } from '../types';
import { formatCurrency, formatDate, getPlanLabel, getStatusBadge } from '../utils';

interface StudentDetailModalProps {
  student: Student | null;
  onClose: () => void;
  onPayInstallment: (student: Student, installment: Installment) => void;
  onWaiveLateFee: (installmentId: number) => Promise<void>;
  onExtendDueDate: (installmentId: number, newDate: string) => Promise<void>;
  onSendReminder: (student: Student, installmentId?: number) => void;
  onViewReceipt: (receiptNo: string) => void;
  onChangePlan: (studentId: number, newPlan: PlanType) => Promise<void>;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  onClose,
  onPayInstallment,
  onWaiveLateFee,
  onExtendDueDate,
  onSendReminder,
  onViewReceipt,
  onChangePlan,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'components' | 'payments' | 'reminders' | 'changePlan'>('schedule');
  const [extendingId, setExtendingId] = useState<number | null>(null);
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [isChangingPlan, setIsChangingPlan] = useState<boolean>(false);
  const [selectedNewPlan, setSelectedNewPlan] = useState<PlanType>('MONTHLY');

  if (!student) return null;

  const summary = student.summary;
  const statusInfo = getStatusBadge(summary.status);

  const handleConfirmExtend = async (instId: number) => {
    if (!newDueDate) return;
    await onExtendDueDate(instId, newDueDate);
    setExtendingId(null);
    setNewDueDate('');
  };

  const handleConfirmChangePlan = async () => {
    setIsChangingPlan(true);
    try {
      await onChangePlan(student.id, selectedNewPlan);
      setActiveTab('schedule');
    } finally {
      setIsChangingPlan(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="bg-navy-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-navy-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-10">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-navy-700 text-white font-extrabold text-lg flex items-center justify-center shadow-lg border border-white/20">
                {student.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">{student.name}</h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${statusInfo.bg}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1">
                  <span className="font-mono bg-navy-800 px-2 py-0.5 rounded font-bold text-blue-300">
                    {student.roll_no}
                  </span>
                  <span>{student.department}</span>
                  <span>•</span>
                  <span>{student.course} ({student.year_semester})</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">{student.quota} Quota</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-xs text-slate-300">
              <div className="flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>{student.email}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>{student.phone}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-navy-800 text-xs">
            <div className="bg-navy-950/60 p-3 rounded-xl border border-navy-800/80">
              <span className="text-slate-400 block text-[11px]">Net Annual Fee</span>
              <span className="text-base font-extrabold text-white mt-0.5 block">
                {formatCurrency(student.net_payable)}
              </span>
            </div>

            <div className="bg-navy-950/60 p-3 rounded-xl border border-navy-800/80">
              <span className="text-slate-400 block text-[11px]">Total Paid ({summary.paid_percentage}%)</span>
              <span className="text-base font-extrabold text-emerald-400 mt-0.5 block">
                {formatCurrency(summary.total_paid)}
              </span>
            </div>

            <div className="bg-navy-950/60 p-3 rounded-xl border border-navy-800/80">
              <span className="text-slate-400 block text-[11px]">Balance Remaining</span>
              <span className="text-base font-extrabold text-amber-400 mt-0.5 block">
                {formatCurrency(summary.balance_due)}
              </span>
            </div>

            <div className="bg-navy-950/60 p-3 rounded-xl border border-navy-800/80">
              <span className="text-slate-400 block text-[11px]">Overdue Amount</span>
              <span
                className={`text-base font-extrabold mt-0.5 block ${
                  summary.overdue_amount > 0 ? 'text-rose-400 font-black' : 'text-slate-400'
                }`}
              >
                {formatCurrency(summary.overdue_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 pt-3 space-x-4 overflow-x-auto text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`pb-3 px-1 border-b-2 transition whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-navy-900'
            }`}
          >
            Installment Schedule ({student.installments?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('components')}
            className={`pb-3 px-1 border-b-2 transition whitespace-nowrap ${
              activeTab === 'components'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-navy-900'
            }`}
          >
            Fee Structure Components
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 px-1 border-b-2 transition whitespace-nowrap ${
              activeTab === 'payments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-navy-900'
            }`}
          >
            Payment Receipts ({student.payments?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('reminders')}
            className={`pb-3 px-1 border-b-2 transition whitespace-nowrap ${
              activeTab === 'reminders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-navy-900'
            }`}
          >
            Reminder Alerts Log ({student.reminders?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('changePlan')}
            className={`pb-3 px-1 border-b-2 transition whitespace-nowrap ${
              activeTab === 'changePlan'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-navy-900'
            }`}
          >
            Re-Structure Plan
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 max-h-[55vh] overflow-y-auto">
          {/* TAB 1: INSTALLMENT SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-navy-900">
                    Active Plan: {getPlanLabel(student.plan_type)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Detailed installment installments, late fee adjustments, and payment clearance statuses.
                  </p>
                </div>

                {summary.overdue_amount > 0 && (
                  <button
                    onClick={() => onSendReminder(student)}
                    className="flex items-center space-x-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                  >
                    <BellRing className="w-3.5 h-3.5 text-rose-600" />
                    <span>Send Overdue Alert</span>
                  </button>
                )}
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3.5">#</th>
                      <th className="py-3 px-3.5">Installment Title</th>
                      <th className="py-3 px-3.5">Due Date</th>
                      <th className="py-3 px-3.5">Base Fee</th>
                      <th className="py-3 px-3.5">Late Fee</th>
                      <th className="py-3 px-3.5">Paid</th>
                      <th className="py-3 px-3.5">Balance</th>
                      <th className="py-3 px-3.5">Status</th>
                      <th className="py-3 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {student.installments?.map((inst) => {
                      const instStatus = getStatusBadge(inst.status);
                      const isExtending = extendingId === inst.id;

                      return (
                        <tr key={inst.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-3.5 font-bold text-slate-500">{inst.installment_no}</td>
                          <td className="py-3 px-3.5">
                            <span className="font-bold text-navy-900 block">{inst.title}</span>
                            {inst.paid_date && (
                              <span className="text-[10px] text-emerald-600 font-medium">
                                Cleared on {formatDate(inst.paid_date)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className="font-medium text-slate-700">{formatDate(inst.due_date)}</span>
                          </td>
                          <td className="py-3 px-3.5 font-bold text-navy-900">{formatCurrency(inst.amount)}</td>
                          <td className="py-3 px-3.5">
                            {inst.late_fee > 0 ? (
                              <span className="font-bold text-rose-600">+{formatCurrency(inst.late_fee)}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-emerald-600">
                            {formatCurrency(inst.paid_amount)}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-navy-900">
                            {inst.balance > 0 ? formatCurrency(inst.balance) : 'Nil'}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${instStatus.bg}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${instStatus.dot}`} />
                              <span>{instStatus.label}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              {inst.balance > 0 && (
                                <button
                                  onClick={() => onPayInstallment(student, inst)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold transition"
                                >
                                  Pay
                                </button>
                              )}

                              {inst.late_fee > 0 && (
                                <button
                                  onClick={() => onWaiveLateFee(inst.id)}
                                  title="Waive Late Fee Penalty"
                                  className="text-[11px] font-medium text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg transition"
                                >
                                  Waive Late
                                </button>
                              )}

                              {inst.status !== 'PAID' && (
                                <button
                                  onClick={() => {
                                    setExtendingId(isExtending ? null : inst.id);
                                    setNewDueDate(inst.due_date);
                                  }}
                                  title="Extend Due Date"
                                  className="text-[11px] text-slate-500 hover:text-navy-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition"
                                >
                                  Extend
                                </button>
                              )}
                            </div>

                            {/* Inline extend due date picker */}
                            {isExtending && (
                              <div className="mt-2 flex items-center justify-end space-x-2 bg-slate-100 p-2 rounded-xl border border-slate-300">
                                <span className="text-[10px] text-slate-600">New Due Date:</span>
                                <input
                                  type="date"
                                  value={newDueDate}
                                  onChange={(e) => setNewDueDate(e.target.value)}
                                  className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                                />
                                <button
                                  onClick={() => handleConfirmExtend(inst.id)}
                                  className="bg-navy-900 text-white px-2 py-0.5 rounded text-[10px] font-bold"
                                >
                                  Save
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: FEE COMPONENTS */}
          {activeTab === 'components' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-navy-900">Fee Component Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {student.fee_components?.map((fc) => (
                  <div
                    key={fc.id || fc.category}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-navy-900 text-xs block">{fc.category}</span>
                      <span className="text-[11px] text-slate-500">Official Institutional Component</span>
                    </div>
                    <span className="font-black text-navy-950 text-sm">
                      {formatCurrency(fc.amount)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-navy-900">Total Institutional Fee:</span>
                  <span className="text-slate-600 ml-2">{formatCurrency(student.total_fee)}</span>
                  {student.scholarship_discount > 0 && (
                    <span className="text-emerald-700 ml-3">
                      (Scholarship: -{formatCurrency(student.scholarship_discount)})
                    </span>
                  )}
                </div>
                <div className="font-black text-sm text-navy-950">
                  Net Payable: {formatCurrency(student.net_payable)}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENT RECEIPTS */}
          {activeTab === 'payments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-navy-900">Transaction History & Receipts</h3>
                <span className="text-xs text-slate-500">
                  Total Cleared: <strong className="text-emerald-700">{formatCurrency(summary.total_paid)}</strong>
                </span>
              </div>

              {(!student.payments || student.payments.length === 0) ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                  No payment transactions recorded for this student yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3.5">Receipt #</th>
                        <th className="py-3 px-3.5">Date</th>
                        <th className="py-3 px-3.5">Amount Paid</th>
                        <th className="py-3 px-3.5">Payment Mode</th>
                        <th className="py-3 px-3.5">Transaction Ref</th>
                        <th className="py-3 px-3.5 text-right">Receipt Voucher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {student.payments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3.5 font-mono font-bold text-blue-600">{pay.receipt_no}</td>
                          <td className="py-3 px-3.5 text-slate-600">{formatDate(pay.payment_date)}</td>
                          <td className="py-3 px-3.5 font-bold text-emerald-700">
                            {formatCurrency(pay.amount)}
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-slate-700">{pay.payment_mode}</td>
                          <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                            {pay.transaction_ref}
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            <button
                              onClick={() => onViewReceipt(pay.receipt_no)}
                              className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-navy-900 hover:text-white text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REMINDER LOGS */}
          {activeTab === 'reminders' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-navy-900">Communication & Reminder Dispatch History</h3>
              {(!student.reminders || student.reminders.length === 0) ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                  No automated or manual reminders dispatched to this student yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {student.reminders.map((rem) => (
                    <div
                      key={rem.id}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-navy-900">{rem.subject}</span>
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {rem.reminder_type}
                          </span>
                        </div>
                        <p className="text-slate-600">{rem.message}</p>
                        <span className="text-[10px] text-slate-400">
                          Sent to: {rem.sent_to} • Delivered
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatDate(rem.sent_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CHANGE PLAN */}
          {activeTab === 'changePlan' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Re-structure Installment Schedule</h3>
                <p className="text-xs text-slate-500">
                  Switch the student to a different payment credit structure for their remaining balance of{' '}
                  <strong className="text-navy-900">{formatCurrency(summary.balance_due)}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  {
                    type: 'MONTHLY' as PlanType,
                    name: 'Monthly Installments (10x)',
                    desc: 'Spread pending dues across easy 30-day monthly cycles.',
                  },
                  {
                    type: 'QUARTERLY' as PlanType,
                    name: 'Quarterly Installments (4x)',
                    desc: 'Split balance into 4 quarterly term payments.',
                  },
                  {
                    type: 'SEMESTER' as PlanType,
                    name: 'Semester Installments (2x)',
                    desc: 'Two 50-50 payments aligned with semester exam terms.',
                  },
                  {
                    type: 'ONE_TIME' as PlanType,
                    name: 'One-Time Clearance',
                    desc: 'Single full payment clearance.',
                  },
                ].map((item) => (
                  <div
                    key={item.type}
                    onClick={() => setSelectedNewPlan(item.type)}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      selectedNewPlan === item.type
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-navy-900">{item.name}</span>
                        {selectedNewPlan === item.type && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  disabled={isChangingPlan}
                  onClick={handleConfirmChangePlan}
                  className="bg-navy-900 hover:bg-navy-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {isChangingPlan ? 'Updating Schedule...' : 'Apply New Installment Schedule'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-between items-center text-xs">
          <span className="text-slate-500">
            Account ID: <strong className="text-navy-900">{student.id}</strong> • Enrolled in{' '}
            {student.admission_year}
          </span>
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl font-semibold transition"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
};
