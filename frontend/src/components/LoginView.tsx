import React, { useState } from 'react';
import { GraduationCap, LockKeyhole, UserRound } from 'lucide-react';

export function LoginView({ onLogin }: { onLogin: (username: string, password: string) => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try { await onLogin(username.trim(), password); }
    catch (err) { setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.'); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
    <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
      <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-blue-900 px-8 py-9 text-white">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 shadow-lg"><GraduationCap className="h-7 w-7" /></div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Apex Institute</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">College fee portal</h1>
        <p className="mt-2 text-sm text-slate-300">Sign in to manage fee accounts or view your student ledger.</p>
      </div>
      <form onSubmit={submit} className="space-y-5 p-8">
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        <label className="block text-sm font-semibold text-slate-700">Username or student ID
          <span className="relative mt-2 block"><UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input autoComplete="username" required value={username} onChange={e => setUsername(e.target.value)} className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Your username" /></span>
        </label>
        <label className="block text-sm font-semibold text-slate-700">Password
          <span className="relative mt-2 block"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Enter your password" /></span>
        </label>
        <button disabled={busy} className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in securely'}</button>
        <p className="text-center text-xs text-slate-500">Use the credentials provided by your college administrator.</p>
      </form>
    </div>
  </main>;
}
