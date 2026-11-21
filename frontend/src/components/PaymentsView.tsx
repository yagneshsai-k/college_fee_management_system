import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Download,
  Printer,
  CreditCard,
  Building,
  Smartphone,
  Banknote,
  FileText,
  Calendar,
} from 'lucide-react';
import { Payment } from '../types';
import { formatCurrency, formatDate, exportToCSV } from '../utils';

interface PaymentsViewProps {
  payments: Payment[];
  onViewReceipt: (receiptNo: string) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ payments, onViewReceipt }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMode, setSelectedMode] = useState('ALL');

  const paymentModes = ['ALL', 'UPI', 'Net Banking', 'Debit/Credit Card', 'Cash', 'Cheque/DD'];

  const filteredPayments = payments.filter((p) => {
    const matchesMode = selectedMode === 'ALL' || p.payment_mode === selectedMode;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      p.receipt_no.toLowerCase().includes(q) ||
      (p.student_name && p.student_name.toLowerCase().includes(q)) ||
      (p.student_roll && p.student_roll.toLowerCase().includes(q)) ||
      p.transaction_ref.toLowerCase().includes(q);

    return matchesMode && matchesSearch;
  });

  const totalCollectedInView = filteredPayments.reduce((acc, curr) => acc + curr.amount, 0);

  const handleExport = () => {
    const rows = filteredPayments.map((p) => ({
      'Receipt Number': p.receipt_no,
      'Student Roll': p.student_roll || '',
      'Student Name': p.student_name || '',
      'Amount (INR)': p.amount,
      'Payment Mode': p.payment_mode,
      'Transaction Ref': p.transaction_ref,
      Date: p.payment_date,
      'Collected By': p.collected_by,
      Remarks: p.remarks || '',
    }));
    exportToCSV('Apex_Fee_Receipts_Audit', rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            <span>Fee Transactions & Verified Receipts Audit</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete audit trail of all tuition and installment payments with instant printable vouchers.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export Receipts CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by receipt number, student name, roll number, or UTR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Mode:</span>
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-navy-900 focus:outline-none"
          >
            {paymentModes.map((m) => (
              <option key={m} value={m}>
                {m === 'ALL' ? 'All Payment Modes' : m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs text-blue-900">
        <span>
          Showing <strong>{filteredPayments.length}</strong> transactions
        </span>
        <span className="font-bold text-sm text-navy-950">
          Total Filtered Revenue: {formatCurrency(totalCollectedInView)}
        </span>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Receipt #</th>
                <th className="py-3.5 px-4">Student & Roll No</th>
                <th className="py-3.5 px-4">Allocated Term</th>
                <th className="py-3.5 px-4">Amount Cleared</th>
                <th className="py-3.5 px-4">Payment Mode</th>
                <th className="py-3.5 px-4">Transaction UTR</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4 text-right">Receipt Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No payment records found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      {p.receipt_no}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-navy-900 block">{p.student_name}</span>
                      <span className="font-mono text-[11px] text-slate-500">{p.student_roll}</span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="font-medium">{p.installment_title || 'General Clearance'}</span>
                    </td>

                    <td className="py-3.5 px-4 font-black text-emerald-700 whitespace-nowrap">
                      {formatCurrency(p.amount)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 font-semibold text-slate-700 text-xs">
                        {p.payment_mode}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {p.transaction_ref}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {p.payment_date}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onViewReceipt(p.receipt_no)}
                        className="inline-flex items-center space-x-1.5 bg-navy-900 hover:bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
