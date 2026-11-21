import React, { useState } from 'react';
import {
  GraduationCap,
  CreditCard,
  Receipt,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Printer,
  ChevronRight,
  ShieldCheck,
  Building,
  Smartphone,
  Lock,
  BellRing,
} from 'lucide-react';
import { Student } from '../types';
import { formatCurrency, formatDate, getPlanLabel, getStatusBadge } from '../utils';
import { StudentFeeCalendar } from './StudentFeeCalendar';
import { StudentServiceRequests } from './StudentServiceRequests';

interface StudentPortalViewProps {
  student: Student;
  onViewReceipt: (receiptNo: string) => void;
  onSwitchStudent: () => void;
  onChangePassword: () => void;
  onMarkNotificationRead: (id: number) => void;
  onRefreshProfile: () => Promise<void>;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  student,
  onViewReceipt,
  onSwitchStudent,
  onChangePassword,
  onMarkNotificationRead,
  onRefreshProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'installments' | 'calendar' | 'services' | 'receipts' | 'breakdown' | 'notifications'>('installments');
  const summary = student.summary;
  const statusInfo = getStatusBadge(summary.status);

  // Find next due or overdue installment
  const nextDue = student.installments?.find(
    (i) => i.status === 'OVERDUE' || i.status === 'PENDING' || i.status === 'PARTIAL'
  );

  return (
    <div className="space-y-6">
      {/* Student Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-navy-700/60 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4 sm:space-x-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-600 text-white font-black text-xl flex items-center justify-center shadow-lg border border-white/20 shrink-0">
              {student.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{student.name}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${statusInfo.bg}`}
                >
                  {statusInfo.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 mt-1.5">
                <span className="font-mono bg-navy-800 text-blue-300 font-bold px-2 py-0.5 rounded">
                  {student.roll_no}
                </span>
                <span>{student.department}</span>
                <span>•</span>
                <span>{student.course} ({student.year_semester})</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">{student.quota} Quota</span>
              </div>
            </div>
          </div>

          <button onClick={onChangePassword} className="self-start rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15">Change password</button>

          {/* Quick Pay CTA for next due */}
          {nextDue && (
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold block">
                  {nextDue.status === 'OVERDUE' ? '⚠️ Overdue Installment' : 'Upcoming Next Installment'}
                </span>
                <div className="flex items-baseline space-x-2 mt-0.5">
                  <span className="text-lg font-black text-white">
                    {formatCurrency(nextDue.balance)}
                  </span>
                  <span className="text-xs text-slate-300">due by {formatDate(nextDue.due_date)}</span>
                </div>
              </div>

              <button
                type="button"
                disabled
                title="Online payment gateway is not configured. Pay at the accounts counter."
                className="bg-slate-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg opacity-80 shrink-0 flex items-center space-x-1.5 cursor-not-allowed"
              >
                <CreditCard className="w-4 h-4" />
                <span>Accounts Counter</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 Cards Grid inside Hero */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-navy-800 text-xs">
          <div className="bg-navy-950/70 p-3.5 rounded-2xl border border-navy-800/80">
            <span className="text-slate-400 block text-[11px]">Net Annual Tuition</span>
            <span className="text-base sm:text-lg font-black text-white mt-1 block">
              {formatCurrency(student.net_payable)}
            </span>
          </div>

          <div className="bg-navy-950/70 p-3.5 rounded-2xl border border-navy-800/80">
            <span className="text-slate-400 block text-[11px]">Total Paid ({summary.paid_percentage}%)</span>
            <span className="text-base sm:text-lg font-black text-emerald-400 mt-1 block">
              {formatCurrency(summary.total_paid)}
            </span>
          </div>

          <div className="bg-navy-950/70 p-3.5 rounded-2xl border border-navy-800/80">
            <span className="text-slate-400 block text-[11px]">Outstanding Dues</span>
            <span className="text-base sm:text-lg font-black text-amber-400 mt-1 block">
              {formatCurrency(summary.balance_due)}
            </span>
          </div>

          <div className="bg-navy-950/70 p-3.5 rounded-2xl border border-navy-800/80">
            <span className="text-slate-400 block text-[11px]">Active Payment Model</span>
            <span className="text-xs sm:text-sm font-bold text-blue-300 mt-1 block">
              {getPlanLabel(student.plan_type)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/70 px-4 pt-3 text-xs font-bold sm:px-6 sm:text-sm">
          <button
            onClick={() => setActiveTab('installments')}
            className={`mr-5 shrink-0 whitespace-nowrap pb-3 px-1 border-b-2 transition ${
              activeTab === 'installments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-navy-900'
            }`}
          >
            My Installment Schedule ({student.installments?.length || 0})
          </button>

          <button
            onClick={async () => { await onRefreshProfile(); setActiveTab('calendar'); }}
            className={`mr-5 shrink-0 whitespace-nowrap pb-3 px-1 border-b-2 transition ${activeTab === 'calendar' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-navy-900'}`}
          >
            Fee Calendar
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`mr-5 shrink-0 whitespace-nowrap pb-3 px-1 border-b-2 transition ${activeTab === 'services' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-navy-900'}`}
          >
            Requests &amp; Certificates
          </button>

          <button
            onClick={() => setActiveTab('receipts')}
            className={`mr-5 shrink-0 whitespace-nowrap pb-3 px-1 border-b-2 transition ${
              activeTab === 'receipts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-navy-900'
            }`}
          >
            Payment Receipts ({student.payments?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('breakdown')}
            className={`mr-5 shrink-0 whitespace-nowrap pb-3 px-1 border-b-2 transition ${
              activeTab === 'breakdown'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-navy-900'
            }`}
          >
            Annual Fee Structure Breakdown
          </button>
          <button onClick={async () => { await onRefreshProfile(); setActiveTab('notifications'); }} className={`mr-5 flex shrink-0 items-center gap-1.5 whitespace-nowrap pb-3 px-1 border-b-2 transition ${activeTab === 'notifications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-navy-900'}`}>
            <BellRing className="h-3.5 w-3.5"/> Notifications ({student.notifications?.filter(n => !n.is_read).length || 0})
          </button>
        </div>

        {/* Tab 1: Installments Timeline & Cards */}
        {activeTab === 'installments' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-navy-900">
                  Credit Plan: {getPlanLabel(student.plan_type)}
                </h3>
                <p className="text-xs text-slate-500">
                  Online payment is unavailable until a gateway is configured. Pay at the accounts counter; issued receipts appear here.
                </p>
              </div>

              {summary.paid_percentage >= 100 && (
                <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>All Annual Dues Fully Cleared!</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {student.installments?.map((inst) => {
                const instStatus = getStatusBadge(inst.status);
                const isPaid = inst.status === 'PAID';

                return (
                  <div
                    key={inst.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isPaid
                        ? 'border-slate-200 bg-slate-50/60'
                        : inst.status === 'OVERDUE'
                        ? 'border-rose-300 bg-rose-50/30 shadow-sm'
                        : 'border-blue-200 bg-blue-50/20 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-navy-950">
                            {inst.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${instStatus.bg}`}
                          >
                            {instStatus.label}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 block mt-1">
                          Due Date: <strong className="text-slate-700">{formatDate(inst.due_date)}</strong>
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-navy-950 block">
                          {formatCurrency(inst.amount)}
                        </span>
                        {inst.late_fee > 0 && (
                          <span className="text-[11px] font-bold text-rose-600 block">
                            +{formatCurrency(inst.late_fee)} late fee
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      {isPaid ? (
                        <div className="flex items-center space-x-1.5 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Cleared on {formatDate(inst.paid_date)}</span>
                        </div>
                      ) : (
                        <div className="text-slate-600">
                          Balance Due:{' '}
                          <strong className="text-navy-900 font-bold">
                            {formatCurrency(inst.balance)}
                          </strong>
                        </div>
                      )}

                      {!isPaid && <span className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-600">Pay at accounts counter</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && <StudentFeeCalendar installments={student.installments || []} onRefresh={onRefreshProfile} />}

        {activeTab === 'services' && <StudentServiceRequests student={student} onRefreshProfile={onRefreshProfile} />}

        {/* Tab 2: Receipts */}
        {activeTab === 'receipts' && (
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-bold text-navy-900">Official Payment Receipts</h3>
            {(!student.payments || student.payments.length === 0) ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                No payment receipts found. Payments made online or at accounts desk will appear here.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Receipt Number</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Term Title</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Payment Mode</th>
                      <th className="py-3 px-4">UTR Ref</th>
                      <th className="py-3 px-4 text-right">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {student.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                          {p.receipt_no}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{formatDate(p.payment_date)}</td>
                        <td className="py-3.5 px-4 text-slate-800 font-medium">
                          {p.installment_title}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-700">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">{p.payment_mode}</td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {p.transaction_ref}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => onViewReceipt(p.receipt_no)}
                            className="inline-flex items-center space-x-1.5 bg-navy-900 hover:bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>View / Print</span>
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

        {/* Tab 3: Breakdown */}
        {activeTab === 'breakdown' && (
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-navy-900">Institutional Fee Components Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {student.fee_components?.map((fc) => (
                <div
                  key={fc.id || fc.category}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-800">{fc.category}</span>
                  <span className="font-bold text-navy-950 text-sm">{formatCurrency(fc.amount)}</span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>
                  Tuition fees are regulated under college academic council guidelines with zero hidden interest on installment payments.
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-bold text-navy-900">Notifications &amp; Announcements</h3>
            {student.notifications?.length ? student.notifications.map(item => (
              <div key={item.id} className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${item.is_read ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/60'}`}>
                <div><span className="text-[10px] font-bold uppercase tracking-wide text-blue-700">{item.notification_type}</span><p className="mt-1 text-sm text-slate-700">{item.message}</p><time className="mt-1 block text-[10px] text-slate-500">{new Date(item.created_at).toLocaleString()}</time></div>
                {!item.is_read && <button onClick={() => onMarkNotificationRead(item.id)} className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-2 text-[10px] font-bold text-blue-700 hover:bg-blue-50">Mark read</button>}
              </div>
            )) : <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No notifications yet.</div>}
          </div>
        )}
      </div>
    </div>
  );
};
