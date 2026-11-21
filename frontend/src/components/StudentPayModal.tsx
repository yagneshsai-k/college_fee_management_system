import React from 'react';
import { X } from 'lucide-react';
import { Student, Installment } from '../types';
import { formatCurrency } from '../utils';

interface StudentPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  installment: Installment | null;
}

export const StudentPayModal: React.FC<StudentPayModalProps> = ({ isOpen, onClose, student, installment }) => {
  if (!isOpen || !student || !installment) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/75 p-4">
    <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="text-lg font-black text-navy-950">Online checkout unavailable</h2><p className="mt-2 text-sm text-slate-600">No payment provider is configured for this portal.</p></div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5"/></button>
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
        <p className="font-bold">{student.name} · {student.roll_no}</p>
        <p className="mt-1">{installment.title}</p>
        <p className="mt-2 text-base font-black text-navy-950">{formatCurrency(installment.balance)}</p>
      </div>
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">This screen will not collect card data or treat a client-side message as proof of payment. Please pay at the accounts counter; the balance updates after staff records settlement.</div>
      <button onClick={onClose} className="mt-5 w-full rounded-xl bg-navy-900 p-3 text-sm font-bold text-white hover:bg-navy-800">Close</button>
    </div>
  </div>;
};
