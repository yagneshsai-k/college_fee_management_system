import React, { useState } from 'react';
import { X, BellRing, Mail, Smartphone, Send, CheckCircle2 } from 'lucide-react';
import { Student, Installment } from '../types';
import { formatCurrency } from '../utils';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  installmentId?: number | null;
  onSend: (payload: {
    student_id: number;
    installment_id?: number | null;
    reminder_type: 'Email' | 'SMS' | 'WhatsApp';
    message?: string;
  }) => Promise<void>;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  student,
  installmentId,
  onSend,
}) => {
  const [reminderType, setReminderType] = useState<'Email' | 'SMS' | 'WhatsApp'>('SMS');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !student) return null;

  const targetInst = installmentId
    ? student.installments?.find((i) => i.id === installmentId)
    : student.installments?.find((i) => i.status === 'OVERDUE' || i.status === 'PENDING');

  const defaultMsg = `Dear ${student.name}, gentle reminder from Apex Accounts Section: Your college fee installment of ${
    targetInst ? formatCurrency(targetInst.balance) : formatCurrency(student.summary.balance_due)
  } is pending payment. Kindly settle via the student portal to avoid examination clearance hold.`;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await onSend({
        student_id: student.id,
        installment_id: installmentId,
        reminder_type: reminderType,
        message: message.trim() || defaultMsg,
      });
      setSuccessMsg(`Official reminder dispatched via ${reminderType} to ${student.name}!`);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-navy-900 text-white p-5 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Dispatch Fee Due Reminder</h2>
              <p className="text-xs text-slate-300">
                Official institutional notice to student / parent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-navy-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-6 space-y-4 text-xs sm:text-sm">
          {successMsg ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center space-x-2 font-bold text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          ) : (
            <>
              {/* Recipient Details */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student:</span>
                  <span className="font-bold text-navy-900">{student.name} ({student.roll_no})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Contact Phone:</span>
                  <span className="font-semibold text-slate-800">{student.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Official Email:</span>
                  <span className="font-semibold text-slate-800">{student.email}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold pt-1 border-t border-slate-200">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(targetInst ? targetInst.balance : student.summary.balance_due)}</span>
                </div>
              </div>

              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notification Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'SMS' as const, label: 'SMS Alert' },
                    { id: 'WhatsApp' as const, label: 'WhatsApp' },
                    { id: 'Email' as const, label: 'Official Email' },
                  ].map((ch) => (
                    <button
                      type="button"
                      key={ch.id}
                      onClick={() => setReminderType(ch.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                        reminderType === ch.id
                          ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message preview / edit */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notice Message Preview
                </label>
                <textarea
                  rows={4}
                  value={message || defaultMsg}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-medium resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                  <span>{isSending ? 'Sending Alert...' : `Dispatch ${reminderType} Alert`}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
