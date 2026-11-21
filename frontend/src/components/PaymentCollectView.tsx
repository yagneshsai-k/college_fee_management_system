import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Receipt,
  UserCheck,
  Building,
  Smartphone,
  Banknote,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Student, Installment } from '../types';
import { formatCurrency, formatDate, getPlanLabel } from '../utils';

interface PaymentCollectViewProps {
  students: Student[];
  preSelectedStudent: Student | null;
  onPaymentSuccess: (receiptNo: string) => void;
  onRecordPayment: (payload: {
    student_id: number;
    amount: number;
    installment_id?: number | null;
    payment_mode: string;
    transaction_ref?: string;
    remarks?: string;
  }) => Promise<{ receipt_no: string }>;
}

export const PaymentCollectView: React.FC<PaymentCollectViewProps> = ({
  students,
  preSelectedStudent,
  onPaymentSuccess,
  onRecordPayment,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    preSelectedStudent?.id || (students.length > 0 ? students[0].id : null)
  );
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('Term installment clearance at accounts counter');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const requiresTransactionRef = paymentMode === 'UPI';

  const currentStudent = students.find((s) => s.id === selectedStudentId);

  // When student changes, update pre-filled values
  useEffect(() => {
    if (currentStudent && currentStudent.installments) {
      // Find oldest unpaid installment
      const unpaid = currentStudent.installments.find(
        (i) => i.status === 'OVERDUE' || i.status === 'PENDING' || i.status === 'PARTIAL'
      );
      if (unpaid) {
        setSelectedInstallmentId(unpaid.id);
        setAmount(unpaid.balance);
      } else {
        setSelectedInstallmentId(null);
        setAmount(currentStudent.summary.balance_due);
      }
      setTransactionRef('');
    }
  }, [selectedStudentId, currentStudent]);

  const handleInstallmentChange = (instId: number | null) => {
    setSelectedInstallmentId(instId);
    if (instId && currentStudent?.installments) {
      const inst = currentStudent.installments.find((i) => i.id === instId);
      if (inst) setAmount(inst.balance);
    } else if (currentStudent) {
      setAmount(currentStudent.summary.balance_due);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent || amount <= 0) return;
    if (requiresTransactionRef && !transactionRef.trim()) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await onRecordPayment({
        student_id: currentStudent.id,
        amount: Number(amount),
        installment_id: selectedInstallmentId,
        payment_mode: paymentMode,
        transaction_ref: transactionRef || undefined,
        remarks: remarks.trim(),
      });
      onPaymentSuccess(res.receipt_no);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Payment could not be recorded. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight flex items-center space-x-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <span>Accounts Fee Collection Counter</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Record counter payments after accounts staff confirm settlement; issue receipts from the saved ledger entry.
          </p>
        </div>

        {/* Search & Quick Pick Student */}
        <div className="flex items-center space-x-2 w-full sm:w-80">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedStudentId || ''}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-navy-900"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.roll_no}) — Bal: {formatCurrency(s.summary.balance_due)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {currentStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Student Summary Card */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-navy-900 via-navy-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-navy-800">
              <div className="flex items-center space-x-3.5 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-300 font-extrabold text-base flex items-center justify-center border border-blue-400/30">
                  {currentStudent.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{currentStudent.name}</h3>
                  <span className="font-mono text-xs text-blue-300 font-semibold">
                    {currentStudent.roll_no}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 border-t border-navy-800/80 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Department:</span>
                  <span className="font-semibold text-white">{currentStudent.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Course & Sem:</span>
                  <span className="font-semibold text-white">
                    {currentStudent.course} ({currentStudent.year_semester})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Plan:</span>
                  <span className="font-semibold text-blue-300">
                    {getPlanLabel(currentStudent.plan_type)}
                  </span>
                </div>
              </div>

              {/* Progress & Balances */}
              <div className="mt-5 pt-4 border-t border-navy-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Fee Clearance</span>
                  <span className="font-bold text-emerald-400">
                    {currentStudent.summary.paid_percentage}% Paid
                  </span>
                </div>
                <div className="w-full bg-navy-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-emerald-400 h-full rounded-full"
                    style={{ width: `${currentStudent.summary.paid_percentage}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div className="bg-navy-950/70 p-2.5 rounded-xl border border-navy-800/80">
                    <span className="text-slate-400 block text-[10px]">Total Paid</span>
                    <span className="font-extrabold text-emerald-400 text-sm">
                      {formatCurrency(currentStudent.summary.total_paid)}
                    </span>
                  </div>
                  <div className="bg-navy-950/70 p-2.5 rounded-xl border border-navy-800/80">
                    <span className="text-slate-400 block text-[10px]">Net Balance Due</span>
                    <span className="font-extrabold text-amber-400 text-sm">
                      {formatCurrency(currentStudent.summary.balance_due)}
                    </span>
                  </div>
                </div>

                {currentStudent.summary.overdue_amount > 0 && (
                  <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center justify-between">
                    <span>⚠️ Overdue Amount:</span>
                    <span className="font-bold text-rose-200">
                      {formatCurrency(currentStudent.summary.overdue_amount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Installments Checklist */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Installment Schedule Status
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {currentStudent.installments?.map((inst) => (
                  <div
                    key={inst.id}
                    onClick={() => handleInstallmentChange(inst.id)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer text-xs flex items-center justify-between ${
                      selectedInstallmentId === inst.id
                        ? 'border-blue-500 bg-blue-50/70 font-semibold'
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/40'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-navy-900 block">{inst.title}</span>
                      <span className="text-[11px] text-slate-500">
                        Due: {formatDate(inst.due_date)} • Base: {formatCurrency(inst.amount)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-extrabold ${
                          inst.status === 'PAID'
                            ? 'text-emerald-600'
                            : inst.status === 'OVERDUE'
                            ? 'text-rose-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {inst.status === 'PAID' ? 'Cleared' : formatCurrency(inst.balance)}
                      </span>
                      <span className="block text-[10px] text-slate-400 capitalize">
                        {inst.status.toLowerCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Payment Entry Form */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-navy-900">Record Fee Collection Entry</h3>
                  <p className="text-xs text-slate-500">
                    Enter transaction details to update installment ledger and issue immediate receipt voucher.
                  </p>
                </div>
                <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100">
                  Instant Verification
                </span>
              </div>

              {/* Installment selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Allocate Payment Towards
                </label>
                <select
                  value={selectedInstallmentId || ''}
                  onChange={(e) => handleInstallmentChange(e.target.value ? Number(e.target.value) : null)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-navy-900"
                >
                  <option value="">
                    Direct General Clearance (Auto-allocate to oldest dues / full balance)
                  </option>
                  {currentStudent.installments
                    ?.filter((i) => i.status !== 'PAID')
                    .map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.title} — Due: {formatDate(inst.due_date)} (Balance: {formatCurrency(inst.balance)})
                      </option>
                    ))}
                </select>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Amount to Collect (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-900 font-bold text-base">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={currentStudent.summary.balance_due + 5000}
                    step="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full text-lg font-black pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-navy-950"
                  />
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Collection / Payment Mode *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[
                    { id: 'UPI', label: 'UPI (staff verified)', icon: Smartphone },
                    { id: 'Net Banking', label: 'Net Banking', icon: Building },
                    { id: 'Debit/Credit Card', label: 'Card Swipe', icon: CreditCard },
                    { id: 'Cash', label: 'Counter Cash', icon: Banknote },
                    { id: 'Cheque/DD', label: 'Cheque / DD', icon: FileText },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = paymentMode === mode.id;
                    return (
                      <button
                        type="button"
                        key={mode.id}
                        onClick={() => {
                          setPaymentMode(mode.id);
                          setTransactionRef('');
                        }}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition text-xs ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* No client-generated payment QR is presented. */}
              {paymentMode === 'UPI' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Confirm the credit in the institution&apos;s trusted settlement system before recording it. Enter the actual bank UTR below; this form does not initiate or verify a UPI payment.</div>
              )}

              {/* Transaction Ref & Remarks */}
              <div className={`grid grid-cols-1 ${requiresTransactionRef ? 'sm:grid-cols-2' : ''} gap-4`}>
                {requiresTransactionRef && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">Transaction Reference / UTR *</label>
                      <span className="text-[10px] text-rose-600 font-semibold">Actual UTR required</span>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Enter the actual UPI UTR"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      className="w-full font-mono text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Accounts Section Remarks
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              {submitError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">{submitError}</div>}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Receipt will be automatically issued & archived.
                </span>

                <button
                  type="submit"
                  disabled={isSubmitting || amount <= 0 || (requiresTransactionRef && !transactionRef.trim())}
                  className="flex items-center space-x-2 bg-navy-900 hover:bg-navy-800 text-white px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>
                    {isSubmitting ? 'Processing Payment...' : `Collect ${formatCurrency(amount)} & Print Receipt`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
