import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, Calculator, Layers, GraduationCap } from 'lucide-react';
import { PlanType } from '../types';
import { formatCurrency } from '../utils';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [rollNo, setRollNo] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [department, setDepartment] = useState('Computer Science & Engg');
  const [course, setCourse] = useState('B.Tech');
  const [yearSemester, setYearSemester] = useState('1st Year / Sem 1');
  const [quota, setQuota] = useState('Merit');
  const [totalFee, setTotalFee] = useState<number>(100000);
  const [scholarship, setScholarship] = useState<number>(0);
  const [concession, setConcession] = useState<number>(0);
  const [planType, setPlanType] = useState<PlanType>('SEMESTER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Custom installments state
  const [customInstallments, setCustomInstallments] = useState<
    { title: string; due_date: string; amount: number }[]
  >([
    { title: 'Installment 1', due_date: '2025-01-15', amount: 40000 },
    { title: 'Installment 2', due_date: '2025-04-15', amount: 35000 },
    { title: 'Installment 3', due_date: '2025-08-15', amount: 25000 },
  ]);

  if (!isOpen) return null;

  const netPayable = Math.max(0, totalFee - scholarship - concession);

  const handleAddCustomRow = () => {
    setCustomInstallments([
      ...customInstallments,
      {
        title: `Installment ${customInstallments.length + 1}`,
        due_date: new Date().toISOString().split('T')[0],
        amount: 0,
      },
    ]);
  };

  const handleRemoveCustomRow = (index: number) => {
    setCustomInstallments(customInstallments.filter((_, i) => i !== index));
  };

  const handleUpdateCustomRow = (index: number, field: string, value: any) => {
    const updated = [...customInstallments];
    updated[index] = { ...updated[index], [field]: value };
    setCustomInstallments(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!rollNo.trim() || !name.trim()) {
      setErrorMsg('Roll Number and Student Name are required.');
      return;
    }

    if (planType === 'CUSTOM') {
      const sumCustom = customInstallments.reduce((acc, c) => acc + Number(c.amount || 0), 0);
      if (Math.abs(sumCustom - netPayable) > 1) {
        setErrorMsg(
          `Custom installments sum (${formatCurrency(sumCustom)}) must equal net payable fee (${formatCurrency(netPayable)}).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        roll_no: rollNo.trim().toUpperCase(),
        name: name.trim(),
        email: email.trim() || `${rollNo.toLowerCase()}@college.edu`,
        phone: phone.trim(),
        department,
        course,
        year_semester: yearSemester,
        quota,
        admission_year: 2024,
        total_fee: Number(totalFee),
        scholarship_discount: Number(scholarship),
        fee_concession: Number(concession),
        plan_type: planType,
        custom_installments: planType === 'CUSTOM' ? customInstallments : undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to enroll student');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-navy-900 text-white p-5 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Student Admission & Fee Setup</h2>
              <p className="text-xs text-slate-300">
                Enroll student and configure customized tuition credit / installment structure
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-navy-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium text-xs">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Academic Info */}
          <div>
            <h3 className="font-bold text-navy-900 text-xs uppercase tracking-wider mb-3">
              1. Student & Academic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Roll Number / Admission ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2024CS109"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  className="w-full uppercase font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Student Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ishaan Deshmukh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  placeholder="ishaan.d@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / Branch
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                >
                  <option value="Computer Science & Engg">Computer Science & Engg</option>
                  <option value="AI & Data Science">AI & Data Science</option>
                  <option value="Electronics & Comm Engg">Electronics & Comm Engg</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Management Studies">Management Studies (MBA)</option>
                  <option value="Computer Applications">Computer Applications (MCA)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quota Category
                </label>
                <select
                  value={quota}
                  onChange={(e) => setQuota(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                >
                  <option value="Merit">Merit Quota</option>
                  <option value="Management">Management Quota</option>
                  <option value="Sports">Sports Quota</option>
                  <option value="Scholarship">State / Institutional Scholarship</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fee & Credit Structure */}
          <div className="pt-3 border-t border-slate-200">
            <h3 className="font-bold text-navy-900 text-xs uppercase tracking-wider mb-3">
              2. Annual Fee & Installment Plan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Annual College Fee (₹)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={totalFee}
                  onChange={(e) => setTotalFee(Number(e.target.value))}
                  className="w-full font-bold text-navy-950 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scholarship / Waiver (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={scholarship}
                  onChange={(e) => setScholarship(Number(e.target.value))}
                  className="w-full font-bold text-emerald-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Concession (₹)</label>
                <input type="number" min="0" step="500" value={concession} onChange={(e) => setConcession(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-emerald-700 focus:border-blue-500 focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Net Payable Annual Fee
                </label>
                <div className="px-3 py-2 bg-navy-50 border border-navy-200 text-navy-950 font-black rounded-xl text-xs sm:text-sm">
                  {formatCurrency(netPayable)}
                </div>
              </div>
            </div>

            {/* Plan selection cards */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Choose Installment Credit Structure
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'SEMESTER' as PlanType, name: 'Semester (2x)', sub: '50% - 50%' },
                  { id: 'QUARTERLY' as PlanType, name: 'Quarterly (4x)', sub: '25% each term' },
                  { id: 'MONTHLY' as PlanType, name: 'Monthly (10x)', sub: 'Easy monthly dues' },
                  { id: 'ONE_TIME' as PlanType, name: 'One-Time (1x)', sub: 'Full upfront pay' },
                  { id: 'CUSTOM' as PlanType, name: 'Customized', sub: 'Manual amounts' },
                ].map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPlanType(p.id)}
                    className={`p-3 rounded-xl border text-left transition ${
                      planType === p.id
                        ? 'border-blue-600 bg-blue-50/70 text-navy-950 font-bold shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    <span className="text-xs block font-bold">{p.name}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{p.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* If Custom Plan, show dynamic row builder */}
            {planType === 'CUSTOM' && (
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-navy-900">
                    Custom Installment Rows (Must sum to {formatCurrency(netPayable)})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddCustomRow}
                    className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Term</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {customInstallments.map((row, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) => handleUpdateCustomRow(idx, 'title', e.target.value)}
                        placeholder="Installment Title"
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="date"
                        value={row.due_date}
                        onChange={(e) => handleUpdateCustomRow(idx, 'due_date', e.target.value)}
                        className="w-36 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="number"
                        value={row.amount}
                        onChange={(e) => handleUpdateCustomRow(idx, 'amount', Number(e.target.value))}
                        placeholder="Amount (₹)"
                        className="w-28 font-bold px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      {customInstallments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomRow(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Complete Admission & Generate Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
