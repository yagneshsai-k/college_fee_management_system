import React, { useEffect, useState } from 'react';
import { BadgeCheck, CalendarClock, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { api } from '../api';
import { FeeExtensionRequest, NoDuesCertificateRequest } from '../types';
import { formatCurrency, formatDate } from '../utils';

type RequestTab = 'extensions' | 'certificates';
const badgeClass = (status: string) => status === 'APPROVED'
  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
  : status === 'REJECTED'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-amber-200 bg-amber-50 text-amber-800';

export const AdminRequestsView: React.FC = () => {
  const [tab, setTab] = useState<RequestTab>('extensions');
  const [extensions, setExtensions] = useState<FeeExtensionRequest[]>([]);
  const [certificates, setCertificates] = useState<NoDuesCertificateRequest[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [extensionRows, certificateRows] = await Promise.all([
        api.getAdminFeeExtensionRequests(),
        api.getAdminNoDuesRequests(),
      ]);
      setExtensions(extensionRows);
      setCertificates(certificateRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load student requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const reviewExtension = async (item: FeeExtensionRequest, decision: 'APPROVED' | 'REJECTED') => {
    const key = `extension-${item.id}`;
    setBusyKey(key);
    setError('');
    setNotice('');
    try {
      await api.reviewFeeExtensionRequest(item.id, decision, remarks[key] || '');
      setNotice(decision === 'APPROVED' ? 'Extension approved; installment due date was updated.' : 'Extension request rejected.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not review extension request.');
    } finally {
      setBusyKey('');
    }
  };

  const reviewCertificate = async (item: NoDuesCertificateRequest, decision: 'APPROVED' | 'REJECTED') => {
    const key = `certificate-${item.id}`;
    setBusyKey(key);
    setError('');
    setNotice('');
    try {
      await api.reviewNoDuesRequest(item.id, decision, remarks[key] || '');
      setNotice(decision === 'APPROVED' ? 'No-dues certificate approved and issued.' : 'Certificate request rejected.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not review certificate request.');
    } finally {
      setBusyKey('');
    }
  };

  const pendingExtensions = extensions.filter((item) => item.status === 'PENDING').length;
  const pendingCertificates = certificates.filter((item) => item.status === 'PENDING').length;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-xl font-black tracking-tight text-navy-900">Student Requests</h1><p className="mt-1 text-xs text-slate-500">Review fee extensions and verify no-dues certificate eligibility.</p></div>
        <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
      </header>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab('extensions')} className={`rounded-xl px-4 py-2.5 text-xs font-bold ${tab === 'extensions' ? 'bg-navy-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>Fee Extensions <span className="ml-1 rounded-full bg-white/15 px-1.5 py-0.5">{pendingExtensions}</span></button>
        <button onClick={() => setTab('certificates')} className={`rounded-xl px-4 py-2.5 text-xs font-bold ${tab === 'certificates' ? 'bg-navy-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>No-Dues Certificates <span className="ml-1 rounded-full bg-white/15 px-1.5 py-0.5">{pendingCertificates}</span></button>
      </div>

      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">Loading requests…</div> : tab === 'extensions' ? (
        <section className="space-y-3">
          {extensions.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500">No fee extension requests have been submitted.</div> : extensions.map((item) => {
            const key = `extension-${item.id}`;
            return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-bold text-navy-900">{item.student?.name || 'Student'} <span className="font-mono text-xs text-slate-500">({item.student?.roll_no})</span></h2><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeClass(item.status)}`}>{item.status}</span></div>
                  <p className="mt-1 text-[11px] text-slate-500">{item.student?.department} · {item.student?.phone} · requested {formatDate(item.requested_at)}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-3">
                    <div><span className="block text-[10px] font-bold uppercase text-slate-400">Installment</span><strong className="mt-1 block text-slate-800">{item.installment_title}</strong></div>
                    <div><span className="block text-[10px] font-bold uppercase text-slate-400">Pending amount</span><strong className="mt-1 block text-slate-800">{formatCurrency(item.requested_amount)}</strong></div>
                    <div><span className="block text-[10px] font-bold uppercase text-slate-400">Due date change</span><strong className="mt-1 block text-slate-800">{formatDate(item.original_due_date)} → {formatDate(item.requested_due_date)}</strong></div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{item.reason}</p>
                  {item.admin_remarks && <p className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-[11px] text-slate-600">Admin remarks: {item.admin_remarks}</p>}
                </div>
                {item.status === 'PENDING' && <div className="w-full space-y-2 lg:max-w-xs">
                  <textarea value={remarks[key] || ''} onChange={(event) => setRemarks((previous) => ({ ...previous, [key]: event.target.value }))} maxLength={2000} rows={2} placeholder="Optional remarks to the student" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => void reviewExtension(item, 'APPROVED')} disabled={busyKey === key} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2.5 text-[11px] font-bold text-white hover:bg-emerald-800 disabled:opacity-50"><BadgeCheck className="h-4 w-4" />Approve</button>
                    <button onClick={() => void reviewExtension(item, 'REJECTED')} disabled={busyKey === key} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"><XCircle className="h-4 w-4" />Reject</button>
                  </div>
                </div>}
              </div>
            </article>;
          })}
        </section>
      ) : (
        <section className="space-y-3">
          {certificates.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500">No certificate requests have been submitted.</div> : certificates.map((item) => {
            const key = `certificate-${item.id}`;
            const eligible = item.eligibility?.eligible === true;
            return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-bold text-navy-900">{item.student?.name || 'Student'} <span className="font-mono text-xs text-slate-500">({item.student?.roll_no})</span></h2><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeClass(item.status)}`}>{item.status}</span></div>
                  <p className="mt-1 text-[11px] text-slate-500">{item.student?.department} · {item.student?.course} · requested {formatDate(item.requested_at)}</p>
                  <div className={`mt-3 flex items-start gap-2 rounded-xl border p-3 text-xs ${eligible ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                    {eligible ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />}
                    <span>{item.eligibility?.reason} {item.eligibility && !eligible && `Outstanding: ${formatCurrency(item.eligibility.outstanding_amount)}.`}</span>
                  </div>
                  {item.certificate_id && <p className="mt-2 font-mono text-[11px] text-slate-600">Certificate ID: {item.certificate_id}</p>}
                  {item.admin_remarks && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">Admin remarks: {item.admin_remarks}</p>}
                </div>
                {item.status === 'PENDING' && <div className="w-full space-y-2 lg:max-w-xs">
                  <textarea value={remarks[key] || ''} onChange={(event) => setRemarks((previous) => ({ ...previous, [key]: event.target.value }))} maxLength={2000} rows={2} placeholder="Optional remarks to the student" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => void reviewCertificate(item, 'APPROVED')} disabled={busyKey === key || !eligible} title={!eligible ? 'The backend will not issue a certificate until all recorded fees are cleared.' : ''} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2.5 text-[11px] font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"><BadgeCheck className="h-4 w-4" />Approve</button>
                    <button onClick={() => void reviewCertificate(item, 'REJECTED')} disabled={busyKey === key} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"><XCircle className="h-4 w-4" />Reject</button>
                  </div>
                </div>}
              </div>
            </article>;
          })}
        </section>
      )}

      {(error || notice) && <div role={error ? 'alert' : 'status'} className={`rounded-xl border p-3 text-xs ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || notice}</div>}
    </div>
  );
};
