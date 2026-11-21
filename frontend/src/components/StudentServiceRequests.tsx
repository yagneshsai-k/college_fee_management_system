import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Download, FileCheck2, Send, ShieldAlert } from 'lucide-react';
import { api } from '../api';
import { FeeExtensionRequest, Installment, NoDuesCertificateRequest, NoDuesEligibility, Student } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface StudentServiceRequestsProps {
  student: Student;
  onRefreshProfile: () => Promise<void>;
}

const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const statusClass = (status: string) => status === 'APPROVED'
  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
  : status === 'REJECTED'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-amber-200 bg-amber-50 text-amber-800';

export const StudentServiceRequests: React.FC<StudentServiceRequestsProps> = ({ student, onRefreshProfile }) => {
  const payableInstallments = useMemo(() => (student.installments || []).filter((item) => item.balance > 0 && item.status !== 'PAID'), [student.installments]);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<number>(payableInstallments[0]?.id || 0);
  const [requestedDate, setRequestedDate] = useState('');
  const [reason, setReason] = useState('');
  const [extensionRequests, setExtensionRequests] = useState<FeeExtensionRequest[]>([]);
  const [certificateRequests, setCertificateRequests] = useState<NoDuesCertificateRequest[]>([]);
  const [eligibility, setEligibility] = useState<NoDuesEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedInstallment: Installment | undefined = payableInstallments.find((item) => item.id === selectedInstallmentId);
  const today = localDateKey(new Date());
  const minRequestedDate = selectedInstallment?.due_date && selectedInstallment.due_date >= today
    ? selectedInstallment.due_date
    : today;
  const minDate = (() => {
    const date = new Date(`${minRequestedDate}T00:00:00`);
    date.setDate(date.getDate() + 1);
    return localDateKey(date);
  })();

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [extensions, noDues] = await Promise.all([
        api.getMyFeeExtensionRequests(),
        api.getMyNoDuesRequests(),
      ]);
      setExtensionRequests(extensions);
      setCertificateRequests(noDues.requests);
      setEligibility(noDues.eligibility);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [student.id]);
  useEffect(() => {
    if (!payableInstallments.some((item) => item.id === selectedInstallmentId)) {
      setSelectedInstallmentId(payableInstallments[0]?.id || 0);
    }
  }, [payableInstallments, selectedInstallmentId]);

  const submitExtension = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedInstallment || reason.trim().length < 10 || !requestedDate) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.requestFeeExtension({ installment_id: selectedInstallment.id, requested_due_date: requestedDate, reason: reason.trim() });
      setReason('');
      setNotice('Fee extension request sent to the accounts team.');
      await Promise.all([refresh(), onRefreshProfile()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the extension request.');
    } finally {
      setBusy(false);
    }
  };

  const submitCertificate = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.requestNoDuesCertificate();
      setNotice('No-dues certificate request sent for accounts verification.');
      await Promise.all([refresh(), onRefreshProfile()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the certificate request.');
    } finally {
      setBusy(false);
    }
  };

  const downloadCertificate = async (requestId: number) => {
    setBusy(true);
    setError('');
    try {
      await api.downloadNoDuesCertificate(requestId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Certificate download failed.');
    } finally {
      setBusy(false);
    }
  };

  const activeCertificateRequest = certificateRequests.some((item) => item.status === 'PENDING' || item.status === 'APPROVED');

  return (
    <div className="grid grid-cols-1 gap-5 p-4 sm:p-6 xl:grid-cols-2">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Send className="h-5 w-5" /></span>
          <div><h3 className="text-sm font-bold text-navy-900">Request Fee Extension</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">Choose an unpaid installment and request a later due date. Accounts staff review every request.</p></div>
        </div>

        {payableInstallments.length === 0 ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">There are no unpaid installments to request an extension for.</div> : <form onSubmit={submitExtension} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">Pending installment
            <select value={selectedInstallmentId} onChange={(event) => setSelectedInstallmentId(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">
              {payableInstallments.map((item) => <option key={item.id} value={item.id}>{item.title} — balance {formatCurrency(item.balance)}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="block text-[10px] font-bold uppercase text-slate-500">Pending amount</span><strong className="mt-1 block text-sm text-navy-900">{formatCurrency(selectedInstallment?.balance || 0)}</strong><span className="mt-1 block text-[10px] text-slate-500">Fetched from your fee ledger</span></div>
            <label className="block text-xs font-semibold text-slate-700">Requested due date
              <input type="date" min={minDate} value={requestedDate} onChange={(event) => setRequestedDate(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block text-xs font-semibold text-slate-700">Reason for extension
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={1000} rows={3} required placeholder="Explain why you need additional time (10–1000 characters)." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-normal" />
          </label>
          <button type="submit" disabled={busy || !selectedInstallment || reason.trim().length < 10} className="w-full rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Submitting…' : 'Submit extension request'}</button>
        </form>}

        <div className="border-t border-slate-100 pt-4"><h4 className="text-xs font-bold text-navy-900">Previous extension requests</h4>
          {loading ? <p className="mt-2 text-xs text-slate-500">Loading request history…</p> : extensionRequests.length === 0 ? <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">No fee extension requests yet.</p> : <div className="mt-2 space-y-2">
            {extensionRequests.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-slate-800">{item.installment_title}</p><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass(item.status)}`}>{item.status}</span></div>
              <p className="mt-1 text-[11px] text-slate-600">{formatCurrency(item.requested_amount)} · current due {formatDate(item.original_due_date)} · requested {formatDate(item.requested_due_date)}</p>
              <p className="mt-1 text-[11px] text-slate-500">{item.reason}</p>
              {item.admin_remarks && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">Accounts note: {item.admin_remarks}</p>}
            </article>)}
          </div>}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><FileCheck2 className="h-5 w-5" /></span>
          <div><h3 className="text-sm font-bold text-navy-900">No-Dues Certificate</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">Eligibility is checked against your saved installments and payment receipts. An approved certificate is available as a PDF.</p></div>
        </div>

        <div className={`rounded-xl border p-4 ${eligibility?.eligible ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-center gap-2">{eligibility?.eligible ? <BadgeCheck className="h-5 w-5 text-emerald-700" /> : <ShieldAlert className="h-5 w-5 text-amber-700" />}<span className={`text-xs font-bold ${eligibility?.eligible ? 'text-emerald-900' : 'text-amber-900'}`}>{eligibility?.eligible ? 'Eligible to request' : 'Not currently eligible'}</span></div>
          <p className={`mt-1 text-xs ${eligibility?.eligible ? 'text-emerald-800' : 'text-amber-800'}`}>{eligibility?.reason || 'Checking your fee records…'}</p>
          {!eligibility?.eligible && <p className="mt-1 text-xs font-semibold text-amber-900">Outstanding balance: {formatCurrency(eligibility?.outstanding_amount || 0)}</p>}
        </div>
        <button onClick={submitCertificate} disabled={busy || loading || !eligibility?.eligible || activeCertificateRequest} className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{activeCertificateRequest ? 'Request already submitted or approved' : busy ? 'Submitting…' : 'Request no-dues certificate'}</button>

        <div className="border-t border-slate-100 pt-4"><h4 className="text-xs font-bold text-navy-900">Certificate request history</h4>
          {loading ? <p className="mt-2 text-xs text-slate-500">Loading certificate history…</p> : certificateRequests.length === 0 ? <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">No certificate requests yet.</p> : <div className="mt-2 space-y-2">
            {certificateRequests.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass(item.status)}`}>{item.status}</span>{item.certificate_id && <span className="font-mono text-[10px] text-slate-600">{item.certificate_id}</span>}</div><p className="mt-1 text-[10px] text-slate-500">Requested {formatDate(item.requested_at)}{item.issued_at ? ` · issued ${formatDate(item.issued_at)}` : ''}</p>{item.admin_remarks && <p className="mt-1 text-[11px] text-slate-600">Accounts note: {item.admin_remarks}</p>}</div>
              {item.status === 'APPROVED' && <button onClick={() => downloadCertificate(item.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-[10px] font-bold text-white hover:bg-navy-800 disabled:opacity-50"><Download className="h-3.5 w-3.5" />Download PDF</button>}
            </article>)}
          </div>}
        </div>
      </section>
      {(error || notice) && <div role={error ? 'alert' : 'status'} className={`rounded-xl border p-3 text-xs xl:col-span-2 ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || notice}</div>}
    </div>
  );
};
