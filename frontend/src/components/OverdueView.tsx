import React, { useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Mail,
  Smartphone,
  CheckCircle2,
  Calendar,
  CreditCard,
  Download,
  ShieldAlert,
  Search,
} from 'lucide-react';
import { Student, Installment } from '../types';
import { formatCurrency, formatDate, exportToCSV } from '../utils';

interface OverdueViewProps {
  students: Student[];
  onSendReminder: (student: Student, installmentId?: number) => void;
  onWaiveLateFee: (installmentId: number) => Promise<void>;
  onExtendDueDate: (installmentId: number, newDate: string) => Promise<void>;
  onRecordPaymentForStudent: (student: Student) => void;
  onViewStudent: (student: Student) => void;
}

export const OverdueView: React.FC<OverdueViewProps> = ({
  students,
  onSendReminder,
  onWaiveLateFee,
  onExtendDueDate,
  onRecordPaymentForStudent,
  onViewStudent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [extendingId, setExtendingId] = useState<number | null>(null);
  const [newDueDate, setNewDueDate] = useState('');

  // Collect all overdue installments across students
  const overdueItems: { student: Student; installment: Installment; daysOverdue: number }[] = [];
  const today = new Date();

  students.forEach((s) => {
    s.installments?.forEach((inst) => {
      if (inst.status === 'OVERDUE' || (inst.balance > 0 && new Date(inst.due_date) < today)) {
        const dueDateObj = new Date(inst.due_date);
        const diffTime = Math.abs(today.getTime() - dueDateObj.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        overdueItems.push({
          student: s,
          installment: inst,
          daysOverdue: diffDays,
        });
      }
    });
  });

  const filteredItems = overdueItems.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.student.name.toLowerCase().includes(q) ||
      item.student.roll_no.toLowerCase().includes(q) ||
      item.student.department.toLowerCase().includes(q)
    );
  });

  const totalOverduePool = overdueItems.reduce(
    (acc, curr) => acc + curr.installment.balance,
    0
  );

  const totalLateFees = overdueItems.reduce((acc, curr) => acc + curr.installment.late_fee, 0);

  const handleExportOverdue = () => {
    const rows = filteredItems.map((item) => ({
      'Roll Number': item.student.roll_no,
      'Student Name': item.student.name,
      Department: item.student.department,
      Phone: item.student.phone,
      Email: item.student.email,
      'Overdue Installment': item.installment.title,
      'Due Date': item.installment.due_date,
      'Days Overdue': item.daysOverdue,
      'Base Amount': item.installment.amount,
      'Late Fee': item.installment.late_fee,
      'Total Balance Due': item.installment.balance,
    }));
    exportToCSV('Apex_Overdue_Defaulters_Register', rows);
  };

  const handleConfirmExtend = async (instId: number) => {
    if (!newDueDate) return;
    await onExtendDueDate(instId, newDueDate);
    setExtendingId(null);
    setNewDueDate('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-rose-950 tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            <span>Overdue Fee & Defaulters Tracker</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor delayed installment dues, trigger automated SMS/Email reminders, and manage fee extensions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportOverdue}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Defaulters CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-card">
          <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider block">
            Total Overdue Balance
          </span>
          <p className="text-2xl font-black text-rose-700 mt-2">
            {formatCurrency(totalOverduePool)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            Pending across {overdueItems.length} overdue installments
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-card">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">
            Total Late Penalty Fees
          </span>
          <p className="text-2xl font-black text-amber-700 mt-2">
            {formatCurrency(totalLateFees)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            Can be selectively waived by authorized accounts staff
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
          <span className="text-xs font-semibold text-navy-800 uppercase tracking-wider block">
            Defaulter Students
          </span>
          <p className="text-2xl font-black text-navy-950 mt-2">
            {new Set(overdueItems.map((i) => i.student.id)).size} Students
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            SMS & Email notices dispatched
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search overdue by student name or roll no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Overdue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-rose-50/60 border-b border-rose-100 text-[11px] font-bold uppercase tracking-wider text-rose-900">
                <th className="py-3.5 px-4">Student & Roll No</th>
                <th className="py-3.5 px-4">Overdue Term</th>
                <th className="py-3.5 px-4">Original Due Date</th>
                <th className="py-3.5 px-4">Aging / Delay</th>
                <th className="py-3.5 px-4">Base Fee</th>
                <th className="py-3.5 px-4">Late Penalty</th>
                <th className="py-3.5 px-4">Total Overdue</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    🎉 Excellent! No overdue installments found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map(({ student, installment, daysOverdue }) => {
                  const isExtending = extendingId === installment.id;

                  return (
                    <tr key={`${student.id}-${installment.id}`} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onViewStudent(student)}
                          className="font-bold text-navy-900 hover:text-blue-600 text-left block"
                        >
                          {student.name}
                        </button>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono font-semibold">{student.roll_no}</span>
                          <span>•</span>
                          <span>{student.phone}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {installment.title}
                        </span>
                        <span className="text-[11px] text-slate-500">{student.department}</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {formatDate(installment.due_date)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            daysOverdue > 30
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {daysOverdue} days overdue
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-navy-900">
                        {formatCurrency(installment.amount)}
                      </td>

                      <td className="py-3.5 px-4">
                        {installment.late_fee > 0 ? (
                          <span className="font-bold text-rose-600">
                            +{formatCurrency(installment.late_fee)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-black text-rose-700 whitespace-nowrap">
                        {formatCurrency(installment.balance)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Send Reminder button */}
                          <button
                            onClick={() => onSendReminder(student, installment.id)}
                            title="Send SMS & Email Notice"
                            className="flex items-center space-x-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-semibold transition"
                          >
                            <BellRing className="w-3.5 h-3.5 text-rose-600" />
                            <span>Remind</span>
                          </button>

                          {/* Waive Late Fee */}
                          {installment.late_fee > 0 && (
                            <button
                              onClick={() => onWaiveLateFee(installment.id)}
                              title="Waive Late Fee"
                              className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 rounded-lg text-xs font-medium transition"
                            >
                              Waive Late
                            </button>
                          )}

                          {/* Extend Due Date */}
                          <button
                            onClick={() => {
                              setExtendingId(isExtending ? null : installment.id);
                              setNewDueDate(installment.due_date);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg text-xs font-medium transition"
                          >
                            Extend
                          </button>

                          {/* Pay Now */}
                          <button
                            onClick={() => onRecordPaymentForStudent(student)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition"
                          >
                            Collect
                          </button>
                        </div>

                        {/* Inline date picker if extending */}
                        {isExtending && (
                          <div className="mt-2 flex items-center justify-end space-x-2 bg-slate-100 p-2 rounded-xl border border-slate-300">
                            <input
                              type="date"
                              value={newDueDate}
                              onChange={(e) => setNewDueDate(e.target.value)}
                              className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                            />
                            <button
                              onClick={() => handleConfirmExtend(installment.id)}
                              className="bg-navy-900 text-white px-2 py-0.5 rounded text-[10px] font-bold"
                            >
                              Confirm
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
