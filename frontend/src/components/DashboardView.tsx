import React from 'react';
import {
  Wallet,
  CheckCircle2,
  Clock,
  AlertOctagon,
  TrendingUp,
  PlusCircle,
  Receipt,
  Download,
  BellRing,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DashboardData, Payment } from '../types';
import { formatCurrency, formatDate, exportToCSV } from '../utils';

interface DashboardViewProps {
  data: DashboardData;
  recentPayments: Payment[];
  onOpenCollect: () => void;
  onOpenAddStudent: () => void;
  onOpenOverdue: () => void;
  onViewReceipt: (receiptNo: string) => void;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  recentPayments,
  onOpenCollect,
  onOpenAddStudent,
  onOpenOverdue,
  onViewReceipt,
}) => {
  const { metrics, plan_distribution, department_breakdown, payment_modes, collection_trend } = data;

  const handleExportSummary = () => {
    const rows = department_breakdown.map((d) => ({
      Department: d.department,
      'Total Expected Fee': d.total,
      'Fee Collected': d.collected,
      'Pending Balance': d.pending,
      'Total Students': d.students,
    }));
    exportToCSV('Apex_Fee_Collection_Summary_2024_25', rows);
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight">
            Accounts & Fee Credit Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time tracking of tuition installments, credit plans, fee collections & overdue balances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenCollect}
            className="flex items-center space-x-2 bg-navy-900 hover:bg-navy-800 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-md transition hover:-translate-y-0.5"
          >
            <Receipt className="w-4 h-4 text-blue-400" />
            <span>Record Payment</span>
          </button>

          <button
            onClick={onOpenAddStudent}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-md transition hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Student</span>
          </button>

          <button
            onClick={handleExportSummary}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Overdue Warning Callout if any */}
      {metrics.overdue_students_count > 0 && (
        <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent border border-rose-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-rose-900 text-sm">
                  {metrics.overdue_students_count} Students with Overdue Installments
                </span>
                <span className="bg-rose-200 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-rose-700 mt-0.5">
                Total overdue balance across delayed monthly and quarterly plans is{' '}
                <strong className="font-semibold">{formatCurrency(metrics.total_overdue_amount)}</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenOverdue}
            className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow transition whitespace-nowrap"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Review & Send Reminders</span>
          </button>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Expected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card hover:shadow-card-hover transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Expected Fee
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-navy-950 mt-3">
            {formatCurrency(metrics.total_expected_fee)}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Enrolled Students</span>
            <span className="font-bold text-navy-900">{metrics.total_students} Students</span>
          </div>
        </div>

        {/* Card 2: Total Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card hover:shadow-card-hover transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Fee Collected
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 mt-3">
            {formatCurrency(metrics.total_collected)}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">Collection Rate</span>
              <span className="font-bold text-emerald-700">{metrics.collection_rate}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full"
                style={{ width: `${Math.min(100, metrics.collection_rate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Outstanding Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card hover:shadow-card-hover transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Balance
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 mt-3">
            {formatCurrency(metrics.total_balance_due)}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Upcoming Installments</span>
            <span className="font-medium text-amber-700">Scheduled Terms</span>
          </div>
        </div>

        {/* Card 4: Overdue Defaulters */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card hover:shadow-card-hover transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Overdue Amount
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-600 mt-3">
            {formatCurrency(metrics.total_overdue_amount)}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Defaulter Students</span>
            <span className="font-bold text-rose-600">{metrics.overdue_students_count} Accounts</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3"><span className="text-xs font-semibold text-emerald-800">Paid students</span><strong className="text-lg text-emerald-900">{metrics.paid_students}</strong></div>
        <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3"><span className="text-xs font-semibold text-amber-800">Partially paid</span><strong className="text-lg text-amber-900">{metrics.partially_paid_students}</strong></div>
        <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3"><span className="text-xs font-semibold text-blue-800">Fees pending</span><strong className="text-lg text-blue-900">{metrics.pending_students}</strong></div>
      </div>

      {/* Row 2: Charts (Collection Trend & Department Comparison) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly Collection Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-navy-900 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Monthly Fee Collection Velocity</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Target projection vs actual installment collections (in INR)
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={collection_trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(val) => `₹${val / 1000}k`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), '']}
                  contentStyle={{
                    backgroundColor: '#0f2744',
                    color: '#fff',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="Collected Fee"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCollected)"
                />
                <Area
                  type="monotone"
                  dataKey="projected"
                  name="Projected Target"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorProjected)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Department-wise Collection vs Pending */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-navy-900 flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Department-Wise Fee Performance</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparison of collected revenue vs pending installments
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={department_breakdown} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="department"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val) => `₹${val / 1000}k`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), '']}
                  contentStyle={{
                    backgroundColor: '#0f2744',
                    color: '#fff',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Installment Plan Adoption & Payment Mode Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie: Installment Plans Chosen */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
          <h2 className="text-base font-bold text-navy-900 flex items-center space-x-2 mb-1">
            <PieIcon className="w-4 h-4 text-indigo-600" />
            <span>Installment Plan Distribution</span>
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            How students opt to split their annual college fee
          </p>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={plan_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {plan_distribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val} students (${item.payload.name})`,
                    'Count',
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f2744',
                    color: '#fff',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 mt-2">
            {plan_distribution.map((item, index) => (
              <div key={item.plan} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-bold text-navy-900">{item.count} students</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Modes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
          <h2 className="text-base font-bold text-navy-900 flex items-center space-x-2 mb-1">
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>Payment Modes Utilized</span>
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Breakdown of collected fee across digital and offline modes
          </p>

          <div className="space-y-3 pt-2">
            {payment_modes.map((pm, idx) => {
              const totalAmount = payment_modes.reduce((acc, curr) => acc + curr.amount, 0);
              const percentage = totalAmount > 0 ? Math.round((pm.amount / totalAmount) * 100) : 0;
              return (
                <div key={pm.mode} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{pm.mode}</span>
                    <span className="font-bold text-navy-900">
                      {formatCurrency(pm.amount)} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: COLORS[idx % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-800">
            💡 <strong>UPI & Net Banking</strong> account for over 65% of fee clearances, providing instant automated reconciliation.
          </div>
        </div>

        {/* Recent Payment Receipts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-navy-900">Recent Collections</h2>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Live Feed
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-72 pr-1">
              {recentPayments.slice(0, 5).map((pay) => (
                <div
                  key={pay.id}
                  onClick={() => onViewReceipt(pay.receipt_no)}
                  className="p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-blue-50/30 transition cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-xs text-navy-900 truncate">
                        {pay.student_name}
                      </span>
                      <span className="text-[10px] text-slate-400">({pay.student_roll})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {pay.receipt_no} • {pay.payment_mode}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-xs text-emerald-700">
                      +{formatCurrency(pay.amount)}
                    </span>
                    <p className="text-[10px] text-slate-400">{formatDate(pay.payment_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onOpenCollect}
            className="w-full mt-4 flex items-center justify-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-semibold transition"
          >
            <span>Open Fast Fee Counter</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
