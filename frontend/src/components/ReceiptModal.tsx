import React from 'react';
import { X, Printer, GraduationCap, CheckCircle2 } from 'lucide-react';
import { ReceiptData } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface ReceiptModalProps {
  receiptData: ReceiptData | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receiptData, onClose }) => {
  if (!receiptData) return null;

  const { receipt, student, college_info } = receiptData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Control Bar (hidden in print) */}
        <div className="no-print bg-navy-900 text-white p-4 px-6 flex items-center justify-between border-b border-navy-800">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm tracking-tight">Official Fee Voucher & Receipt</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-navy-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE RECEIPT CONTAINER */}
        <div id="printable-receipt" className="p-8 sm:p-10 bg-white text-slate-900 space-y-6">
          {/* College Header */}
          <div className="text-center pb-5 border-b-2 border-navy-900/20">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-xl bg-navy-900 text-white flex items-center justify-center shadow-md">
                <GraduationCap className="w-7 h-7 text-blue-400" />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-navy-950 uppercase tracking-tight">
              {college_info.name}
            </h1>
            <p className="text-xs text-slate-600 font-medium mt-0.5">{college_info.tagline}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {college_info.address} • Ph: {college_info.phone} • {college_info.email}
            </p>
            <span className="inline-block mt-1 text-[10px] font-mono text-slate-600 font-semibold bg-slate-100 px-2.5 py-0.5 rounded">
              {college_info.tax_id} • Academic Session {receiptData.academic_year}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
            <div><span className="block text-[10px] text-slate-500">Total annual fee</span><strong>{formatCurrency(receiptData.total_fee)}</strong></div>
            <div><span className="block text-[10px] text-slate-500">Previous balance</span><strong>{formatCurrency(receiptData.previous_balance)}</strong></div>
            <div><span className="block text-[10px] text-slate-500">Balance after receipt</span><strong>{formatCurrency(receiptData.remaining_balance)}</strong></div>
          </div>

          {/* Receipt Info Title & Meta */}
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                Fee Receipt Number
              </span>
              <span className="font-mono font-black text-base text-navy-950 block">
                {receipt.receipt_no}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                Date & Time of Payment
              </span>
              <span className="font-bold text-navy-900 block">{receipt.payment_date}</span>
            </div>
          </div>

          {/* Student Dossier Table */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
            <div className="grid grid-cols-2 gap-y-2">
              <div>
                <span className="text-slate-500 block text-[11px]">Student Name:</span>
                <span className="font-extrabold text-navy-950 text-sm">{student.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Roll / Admission No:</span>
                <span className="font-mono font-bold text-navy-950 text-sm">{student.roll_no}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Program & Department:</span>
                <span className="font-semibold text-slate-800">{student.department}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Course & Semester:</span>
                <span className="font-semibold text-slate-800">
                  {student.course} ({student.year_semester})
                </span>
              </div>
            </div>
          </div>

          {/* Payment Particulars Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-900 text-white text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Description / Term Particulars</th>
                  <th className="py-2.5 px-3">Payment Mode</th>
                  <th className="py-2.5 px-3">Transaction / UTR ID</th>
                  <th className="py-2.5 px-3 text-right">Amount Cleared</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-3 px-3">
                    <span className="font-bold text-navy-900 block">
                      {receipt.installment_title || 'General Fee Clearance'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {receipt.remarks || 'College tuition installment payment'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-700">{receipt.payment_mode}</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                    {receipt.transaction_ref}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-navy-950 text-sm">
                    {formatCurrency(receipt.amount)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 font-bold text-slate-700 text-right uppercase text-xs">
                    Total Amount Received:
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-emerald-700 text-base">
                    {formatCurrency(receipt.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Receipt issuance and authorized signature */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[10px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 block">Receipt issued by Finance &amp; Accounts</span>
              <span>Receipt number: {receipt.receipt_no}</span>
              <span className="block text-emerald-700 font-semibold">Status: Recorded</span>
            </div>

            <div className="text-right space-y-1">
              <div className="w-36 border-b border-slate-400 mb-1" />
              <span className="text-[11px] font-bold text-navy-900 block">
                {receipt.collected_by}
              </span>
              <span className="text-[10px] text-slate-500 block">Finance & Accounts Section</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-100">
            Computer-generated fee receipt. Retain this receipt number for payment enquiries.
          </div>
        </div>

        {/* Modal Bottom Action Bar (hidden in print) */}
        <div className="no-print bg-slate-50 p-4 px-6 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Tip: Press <strong>Ctrl + P</strong> or click Print to save as PDF.
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold shadow-md transition"
            >
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
