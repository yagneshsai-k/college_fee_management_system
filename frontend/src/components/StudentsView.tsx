import React, { useState } from 'react';
import {
  Search,
  Filter,
  PlusCircle,
  Download,
  CreditCard,
  Eye,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { Student } from '../types';
import { formatCurrency, getPlanLabel, getStatusBadge, exportToCSV } from '../utils';

interface StudentsViewProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onRecordPaymentForStudent: (student: Student) => void;
  onOpenAddModal: () => void;
  onSendReminder: (student: Student) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onResetPassword: (student: Student) => void;
  onToggleAccount: (student: Student) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onSelectStudent,
  onRecordPaymentForStudent,
  onOpenAddModal,
  onSendReminder,
  searchQuery,
  onSearchChange,
  onResetPassword,
  onToggleAccount,
}) => {
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedPlan, setSelectedPlan] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Extract unique departments and plans
  const departments = ['ALL', ...Array.from(new Set(students.map((s) => s.department)))];
  const planTypes = ['ALL', 'MONTHLY', 'QUARTERLY', 'SEMESTER', 'ONE_TIME', 'CUSTOM'];

  // Filtering
  const filteredStudents = students.filter((s) => {
    const matchesDept = selectedDept === 'ALL' || s.department === selectedDept;
    const matchesPlan = selectedPlan === 'ALL' || s.plan_type === selectedPlan;
    const matchesStatus = selectedStatus === 'ALL' || s.summary.status === selectedStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.roll_no.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q);

    return matchesDept && matchesPlan && matchesStatus && matchesSearch;
  });

  const handleExport = () => {
    const rows = filteredStudents.map((s) => ({
      'Roll Number': s.roll_no,
      Name: s.name,
      Department: s.department,
      Course: s.course,
      'Plan Type': s.plan_type,
      'Total Annual Fee': s.total_fee,
      Scholarship: s.scholarship_discount,
      'Net Payable': s.net_payable,
      'Fee Paid': s.summary.total_paid,
      'Balance Due': s.summary.balance_due,
      'Overdue Amount': s.summary.overdue_amount,
      Status: s.summary.status,
    }));
    exportToCSV('Apex_Students_Fee_Register', rows);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight flex items-center space-x-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            <span>Student Fee Roster & Credit Accounts</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage tuition profiles, installment plans, payment clearance rates, and individual ledgers.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenAddModal}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-md transition hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Admission / Enrollment</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Roster</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, roll number, or department..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Dept:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-xs font-semibold text-navy-900 focus:outline-none"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'All Departments' : d}
                </option>
              ))}
            </select>
          </div>

          {/* Plan Type Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Plan:</span>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="bg-transparent text-xs font-semibold text-navy-900 focus:outline-none"
            >
              <option value="ALL">All Credit Plans</option>
              <option value="MONTHLY">Monthly (10x)</option>
              <option value="QUARTERLY">Quarterly (4x)</option>
              <option value="SEMESTER">Semester (2x)</option>
              <option value="ONE_TIME">One-Time</option>
              <option value="CUSTOM">Customized</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-semibold text-navy-900 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Fully Paid</option>
              <option value="IN_PROGRESS">Payment Pending</option>
              <option value="OVERDUE">Overdue Defaulters</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Student & Roll No</th>
                <th className="py-3.5 px-4">Program & Dept</th>
                <th className="py-3.5 px-4">Installment Plan</th>
                <th className="py-3.5 px-4">Net Annual Fee</th>
                <th className="py-3.5 px-4">Paid Progress</th>
                <th className="py-3.5 px-4">Remaining Balance</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No students match the selected filters or search query.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const statusInfo = getStatusBadge(student.summary.status);
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Name & Roll */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-navy-800 to-navy-950 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {student.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                          <div>
                            <span className="font-bold text-navy-900 group-hover:text-blue-600 transition">
                              {student.name}
                            </span>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono font-medium">{student.roll_no}</span>
                              <span>•</span>
                              <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-semibold text-[10px]">
                                {student.quota} Quota
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Course & Dept */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {student.department}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {student.course} ({student.year_semester})
                        </span>
                      </td>

                      {/* Plan */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-navy-50 text-navy-800 border border-navy-100">
                          {getPlanLabel(student.plan_type)}
                        </span>
                      </td>

                      {/* Net Fee */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-navy-950">
                          {formatCurrency(student.net_payable)}
                        </span>
                        {student.scholarship_discount > 0 && (
                          <span className="block text-[10px] text-emerald-600 font-medium">
                            Incl. {formatCurrency(student.scholarship_discount)} scholarship
                          </span>
                        )}
                      </td>

                      {/* Progress Bar */}
                      <td className="py-3.5 px-4 w-44">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-navy-900">
                              {student.summary.paid_percentage}%
                            </span>
                            <span className="text-slate-500 font-medium">
                              {formatCurrency(student.summary.total_paid)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                student.summary.paid_percentage >= 100
                                  ? 'bg-emerald-500'
                                  : student.summary.overdue_amount > 0
                                  ? 'bg-rose-500'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${Math.min(100, student.summary.paid_percentage)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Balance Due */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold ${
                            student.summary.balance_due > 0 ? 'text-navy-900' : 'text-emerald-600'
                          }`}
                        >
                          {student.summary.balance_due > 0
                            ? formatCurrency(student.summary.balance_due)
                            : 'Nil (Cleared)'}
                        </span>
                        {student.summary.overdue_amount > 0 && (
                          <span className="block text-[11px] font-bold text-rose-600">
                            Overdue: {formatCurrency(student.summary.overdue_amount)}
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onSelectStudent(student)}
                            title="View Full Ledger & Installment Schedule"
                            className="p-1.5 text-slate-500 hover:text-navy-900 hover:bg-slate-200/80 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {student.summary.balance_due > 0 && (
                            <button
                              onClick={() => onRecordPaymentForStudent(student)}
                              title="Collect Payment"
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition font-medium"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}

                          {student.summary.overdue_amount > 0 && (
                            <button
                              onClick={() => onSendReminder(student)}
                              title="Send Overdue Reminder"
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                            >
                              <BellRing className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => onResetPassword(student)} title="Reset student password" className="rounded-lg px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-50">Reset password</button>
                          <button onClick={() => onToggleAccount(student)} title={student.is_active === false ? 'Activate student login' : 'Deactivate student login'} className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${student.is_active === false ? 'text-emerald-700 hover:bg-emerald-50' : 'text-rose-700 hover:bg-rose-50'}`}>
                            {student.is_active === false ? 'Activate' : 'Deactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Showing <strong className="text-navy-900">{filteredStudents.length}</strong> of{' '}
            <strong className="text-navy-900">{students.length}</strong> total registered students
          </span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Full Paid</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>In-Progress</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Overdue Defaulter</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
