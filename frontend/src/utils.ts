import { InstallmentStatus, PlanType, StudentStatus } from './types';

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function getStatusBadge(status: InstallmentStatus | StudentStatus | string) {
  switch (status) {
    case 'PAID':
    case 'COMPLETED':
      return {
        label: 'Paid in Full',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'OVERDUE':
      return {
        label: 'Overdue Dues',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      };
    case 'PENDING':
    case 'IN_PROGRESS':
      return {
        label: 'Payment Pending',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'PARTIAL':
      return {
        label: 'Partially Cleared',
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500',
      };
    default:
      return {
        label: status,
        bg: 'bg-slate-50 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
      };
  }
}

export function getPlanLabel(plan: PlanType): string {
  switch (plan) {
    case 'MONTHLY':
      return 'Monthly (10 Months)';
    case 'QUARTERLY':
      return 'Quarterly (4 Terms)';
    case 'SEMESTER':
      return 'Semester (2 Terms)';
    case 'ONE_TIME':
      return 'One-Time (Full Fee)';
    case 'CUSTOM':
      return 'Customized Schedule';
    default:
      return plan;
  }
}

export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map(row => {
        return keys
          .map(k => {
            let val = row[k] === null || row[k] === undefined ? '' : row[k];
            if (typeof val === 'string') {
              val = `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
