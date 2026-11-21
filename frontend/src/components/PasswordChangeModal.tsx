import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';

export function PasswordChangeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (current: string, next: string) => Promise<void> }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (next !== confirm) { setError('The new passwords do not match.'); return; }
    setBusy(true);
    try { await onSubmit(current, next); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Password could not be changed.'); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/60 p-4">
    <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-navy-900"><KeyRound className="h-5 w-5 text-blue-600"/><h2 className="font-bold">Change password</h2></div><p className="mt-1 text-xs text-slate-500">Use at least 12 characters with letters and numbers.</p></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4"/></button></div>
      {error && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <label className="block text-xs font-semibold text-slate-700">Current password<input type="password" autoComplete="current-password" required value={current} onChange={e=>setCurrent(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"/></label>
      <label className="block text-xs font-semibold text-slate-700">New password<input type="password" autoComplete="new-password" required minLength={12} value={next} onChange={e=>setNext(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"/></label>
      <label className="block text-xs font-semibold text-slate-700">Confirm new password<input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"/></label>
      <button disabled={busy} className="w-full rounded-lg bg-blue-600 p-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? 'Saving…' : 'Update password'}</button>
    </form>
  </div>;
}
