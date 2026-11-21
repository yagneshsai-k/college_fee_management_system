import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, RefreshCw } from 'lucide-react';
import { Installment } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface StudentFeeCalendarProps {
  installments: Installment[];
  onRefresh: () => Promise<void>;
}

const dateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (value: string) => new Date(`${value}T00:00:00`);

const feeStatus = (installment: Installment, today: string): 'PAID' | 'PENDING' | 'OVERDUE' => {
  if (installment.status === 'PAID' || installment.balance <= 0) return 'PAID';
  return installment.status === 'OVERDUE' || installment.due_date < today ? 'OVERDUE' : 'PENDING';
};

const statusStyle = {
  PAID: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Paid' },
  PENDING: { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Pending' },
  OVERDUE: { dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Overdue' },
};

export const StudentFeeCalendar: React.FC<StudentFeeCalendarProps> = ({ installments, onRefresh }) => {
  const now = new Date();
  const todayKey = dateKey(now);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const installmentsByDate = useMemo(() => {
    const result = new Map<string, Installment[]>();
    installments.forEach((item) => {
      const items = result.get(item.due_date) || [];
      items.push(item);
      result.set(item.due_date, items);
    });
    return result;
  }, [installments]);

  const calendarDays = useMemo(() => {
    const start = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [visibleMonth]);

  const selectedItems = installmentsByDate.get(selectedDate) || [];
  const upcoming = [...installments]
    .filter((item) => item.balance > 0 && item.due_date >= todayKey)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const overdue = installments.filter((item) => feeStatus(item, todayKey) === 'OVERDUE');

  const moveMonth = (amount: number) => {
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)] gap-5 p-4 sm:p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><CalendarDays className="h-5 w-5" /></span>
            <div>
              <h3 className="text-sm font-bold text-navy-900">Installment Calendar</h3>
              <p className="text-[11px] text-slate-500">Select a date to view its fee details.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void onRefresh()} aria-label="Refresh installment schedule" title="Refresh schedule" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /></button>
            <button onClick={() => moveMonth(-1)} aria-label="Previous month" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
            <span className="min-w-28 text-center text-sm font-bold text-navy-900">{visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => moveMonth(1)} aria-label="Next month" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 pb-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1 pt-2">
          {calendarDays.map((day) => {
            const key = dateKey(day);
            const items = installmentsByDate.get(key) || [];
            const inMonth = day.getMonth() === visibleMonth.getMonth();
            const isSelected = selectedDate === key;
            const paid = items.some((item) => feeStatus(item, todayKey) === 'PAID');
            const pastDue = items.some((item) => feeStatus(item, todayKey) === 'OVERDUE');
            const pending = items.some((item) => feeStatus(item, todayKey) === 'PENDING');
            return (
              <button
                key={key}
                onClick={() => setSelectedDate(key)}
                className={`min-h-[56px] rounded-xl border p-1.5 text-left transition sm:min-h-[68px] sm:p-2 ${isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'} ${inMonth ? 'text-slate-800' : 'text-slate-300'}`}
              >
                <span className={`text-xs font-semibold ${key === todayKey ? 'flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-white' : ''}`}>{day.getDate()}</span>
                {items.length > 0 && <span className="mt-1 flex items-center gap-1.5" aria-label={`${items.length} fee item(s)`}>
                  {pastDue && <i className={`h-1.5 w-1.5 rounded-full ${statusStyle.OVERDUE.dot}`} />}
                  {pending && <i className={`h-1.5 w-1.5 rounded-full ${statusStyle.PENDING.dot}`} />}
                  {paid && <i className={`h-1.5 w-1.5 rounded-full ${statusStyle.PAID.dot}`} />}
                  <span className="truncate text-[9px] font-semibold text-slate-500">{items.length} fee{items.length > 1 ? 's' : ''}</span>
                </span>}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-[10px] font-medium text-slate-600">
          {(['PAID', 'PENDING', 'OVERDUE'] as const).map((status) => <span key={status} className="inline-flex items-center gap-1.5"><i className={`h-2 w-2 rounded-full ${statusStyle[status].dot}`} />{statusStyle[status].label}</span>)}
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <h4 className="text-xs font-bold text-navy-900">{formatDate(selectedDate)}</h4>
          {selectedItems.length === 0 ? <p className="mt-1 text-xs text-slate-500">No installment is due on this date.</p> : <div className="mt-3 space-y-2">
            {selectedItems.map((item) => {
              const status = feeStatus(item, todayKey);
              return <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
                <div><p className="text-xs font-semibold text-slate-800">{item.title}</p><p className="mt-0.5 text-[10px] text-slate-500">Remaining {formatCurrency(item.balance)}</p></div>
                <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusStyle[status].badge}`}>{statusStyle[status].label}</span>
              </div>;
            })}
          </div>}
        </div>
      </section>

      <aside className="space-y-4">
        {overdue.length > 0 && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-bold text-rose-800">Overdue payment reminder</p>
          <p className="mt-1 text-[11px] leading-relaxed text-rose-700">You have {overdue.length} overdue installment{overdue.length > 1 ? 's' : ''} totalling {formatCurrency(overdue.reduce((sum, item) => sum + item.balance, 0))}. Please contact the accounts counter.</p>
        </div>}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-blue-600" /><h3 className="text-sm font-bold text-navy-900">Upcoming Fee Payments</h3></div>
          <p className="mt-1 text-[11px] text-slate-500">Upcoming deadlines from your saved installment schedule.</p>
          {upcoming.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">No upcoming installments.</p> : <div className="mt-3 space-y-2">
            {upcoming.slice(0, 6).map((item) => {
              const daysLeft = Math.ceil((parseDate(item.due_date).getTime() - parseDate(todayKey).getTime()) / 86400000);
              const isSoon = daysLeft <= 7;
              return <div key={item.id} className={`rounded-xl border p-3 ${isSoon ? 'border-amber-200 bg-amber-50/70' : 'border-slate-100 bg-slate-50'}`}>
                <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-[10px] text-slate-500">Due {formatDate(item.due_date)}</p></div><span className="text-xs font-bold text-navy-900">{formatCurrency(item.balance)}</span></div>
                {isSoon && <p className="mt-2 text-[10px] font-bold text-amber-800">Reminder: due {daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}</p>}
              </div>;
            })}
          </div>}
        </div>
      </aside>
    </div>
  );
};
