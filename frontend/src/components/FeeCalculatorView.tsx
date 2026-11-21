import React, { useState } from 'react';
import {
  Calculator,
  Calendar,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Layers,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency } from '../utils';

export const FeeCalculatorView: React.FC = () => {
  const [tuitionFee, setTuitionFee] = useState<number>(100000);
  const [scholarship, setScholarship] = useState<number>(10000);
  const [includeHostel, setIncludeHostel] = useState<boolean>(false);
  const [includeBus, setIncludeBus] = useState<boolean>(false);

  const hostelFee = includeHostel ? 60000 : 0;
  const busFee = includeBus ? 20000 : 0;

  const totalBaseFee = tuitionFee + hostelFee + busFee;
  const netPayable = Math.max(0, totalBaseFee - scholarship);

  // Plans calculations
  // 1. One Time: 5% early payment waiver
  const oneTimeDiscount = Math.round(netPayable * 0.05);
  const oneTimeTotal = netPayable - oneTimeDiscount;

  // 2. Semester (2 installments)
  const semesterInstallment = Math.round(netPayable / 2);

  // 3. Quarterly (4 installments)
  const quarterlyInstallment = Math.round(netPayable / 4);

  // 4. Monthly (10 installments)
  const monthlyInstallment = Math.round(netPayable / 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight flex items-center space-x-2">
            <Calculator className="w-6 h-6 text-purple-600" />
            <span>Installment Credit & Fee Simulator</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Model flexible payment plans: simulate monthly, quarterly, and semester installments tailored to student affordability.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-purple-50 text-purple-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-purple-200">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>Transparent Institutional Pricing</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Parameters Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-5">
          <h3 className="font-bold text-sm text-navy-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Fee & Add-on Parameters
          </h3>

          {/* Annual Tuition Fee */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <label className="font-semibold text-slate-700">Annual College Tuition</label>
              <span className="font-bold text-navy-900">{formatCurrency(tuitionFee)}</span>
            </div>
            <input
              type="range"
              min="50000"
              max="250000"
              step="5000"
              value={tuitionFee}
              onChange={(e) => setTuitionFee(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>₹50,000</span>
              <span>₹1,50,000</span>
              <span>₹2,50,000</span>
            </div>
          </div>

          {/* Scholarship Discount */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <label className="font-semibold text-slate-700">Merit / Category Scholarship</label>
              <span className="font-bold text-emerald-600">-{formatCurrency(scholarship)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="50000"
              step="2500"
              value={scholarship}
              onChange={(e) => setScholarship(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>₹0</span>
              <span>₹25,000</span>
              <span>₹50,000</span>
            </div>
          </div>

          {/* Optional Add-ons */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold text-slate-700">Campus Facilities (Optional)</label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer text-xs">
              <div className="flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  checked={includeHostel}
                  onChange={(e) => setIncludeHostel(e.target.checked)}
                  className="rounded text-blue-600 w-4 h-4 focus:ring-0"
                />
                <span className="font-medium text-slate-800">Campus Hostel & Mess</span>
              </div>
              <span className="font-bold text-navy-900">+₹60,000/yr</span>
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer text-xs">
              <div className="flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  checked={includeBus}
                  onChange={(e) => setIncludeBus(e.target.checked)}
                  className="rounded text-blue-600 w-4 h-4 focus:ring-0"
                />
                <span className="font-medium text-slate-800">College AC Bus Commute</span>
              </div>
              <span className="font-bold text-navy-900">+₹20,000/yr</span>
            </label>
          </div>

          {/* Total Net Calculation */}
          <div className="pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-2xl">
            <span className="text-xs text-slate-500 block">Total Net Payable</span>
            <span className="text-2xl font-black text-navy-950 block mt-0.5">
              {formatCurrency(netPayable)}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Can be divided across installment plans with zero hidden interest fees.
            </p>
          </div>
        </div>

        {/* Right Column: Comparative Installment Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Monthly Plan (Highlighting Problem Statement Solution!) */}
            <div className="p-5 rounded-2xl border-2 border-blue-600 bg-gradient-to-br from-blue-50/50 to-white shadow-md relative overflow-hidden flex flex-col justify-between">
              <span className="absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                Most Flexible
              </span>

              <div>
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                  Monthly Installment Plan
                </span>
                <div className="flex items-baseline space-x-1.5 mt-2">
                  <span className="text-3xl font-black text-navy-950">
                    {formatCurrency(monthlyInstallment)}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">/ month</span>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Spread over <strong>10 monthly payments</strong>. Allows working parents and students to comfortably pay ₹8k–₹12k monthly instead of a lump-sum burden.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-between text-xs text-slate-600">
                <span>10 Installments</span>
                <span className="font-bold text-blue-700">Zero Processing Fee</span>
              </div>
            </div>

            {/* 2. Quarterly Plan */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-card flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Quarterly Installment Plan
                </span>
                <div className="flex items-baseline space-x-1.5 mt-2">
                  <span className="text-3xl font-black text-navy-950">
                    {formatCurrency(quarterlyInstallment)}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">/ quarter</span>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Divided into <strong>4 equal quarterly payments</strong> due every 75–90 days throughout the academic calendar.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>4 Installments</span>
                <span className="font-bold text-navy-900">Term-Based</span>
              </div>
            </div>

            {/* 3. Semester Plan */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-card flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Semester Plan (50% - 50%)
                </span>
                <div className="flex items-baseline space-x-1.5 mt-2">
                  <span className="text-3xl font-black text-navy-950">
                    {formatCurrency(semesterInstallment)}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">/ semester</span>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Two equal payments aligned with the start of Odd Semester and Even Semester exams.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>2 Installments</span>
                <span className="font-bold text-navy-900">Standard ERP</span>
              </div>
            </div>

            {/* 4. One-Time Full Clearance */}
            <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                    One-Time Upfront Clearance
                  </span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.2 rounded-full">
                    5% Discount
                  </span>
                </div>
                <div className="flex items-baseline space-x-1.5 mt-2">
                  <span className="text-3xl font-black text-emerald-700">
                    {formatCurrency(oneTimeTotal)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Pay full annual fee at admission and save{' '}
                  <strong className="text-emerald-700 font-bold">
                    {formatCurrency(oneTimeDiscount)}
                  </strong>{' '}
                  with institutional early-clearance waiver.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-800 font-semibold">
                <span>Single Payment</span>
                <span>Immediate Receipt</span>
              </div>
            </div>
          </div>

          {/* Timeline Simulation Visualizer */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Simulated Payment Schedule for Monthly Plan</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
              {[
                { term: 'M1 (Aug)', due: '15 Aug' },
                { term: 'M2 (Sep)', due: '15 Sep' },
                { term: 'M3 (Oct)', due: '15 Oct' },
                { term: 'M4 (Nov)', due: '15 Nov' },
                { term: 'M5 (Dec)', due: '15 Dec' },
                { term: 'M6 (Jan)', due: '15 Jan' },
                { term: 'M7 (Feb)', due: '15 Feb' },
                { term: 'M8 (Mar)', due: '15 Mar' },
                { term: 'M9 (Apr)', due: '15 Apr' },
                { term: 'M10 (May)', due: '15 May' },
              ].map((item, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-navy-900 block">{item.term}</span>
                  <span className="text-[11px] text-slate-400 block">{item.due}</span>
                  <span className="font-black text-blue-700 text-xs block mt-1">
                    {formatCurrency(monthlyInstallment)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
