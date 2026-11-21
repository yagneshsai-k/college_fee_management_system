import React from 'react';
import { GraduationCap, LogOut, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentRole: 'ADMIN' | 'STUDENT';
  username: string;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole, username, onLogout }) => (
  <header className="bg-navy-950 text-white border-b border-navy-800 sticky top-0 z-30 shadow-md">
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg"><GraduationCap className="w-6 h-6" /></div>
        <div>
          <div className="font-extrabold tracking-tight">APEX INSTITUTE <span className="ml-1 text-[10px] rounded bg-blue-500/20 text-blue-200 px-2 py-1">FEE PORTAL</span></div>
          <div className="hidden sm:block text-[11px] text-slate-300">College Fee Credit &amp; Installment Management</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:flex items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-2 text-xs text-slate-200">
          {currentRole === 'ADMIN' ? <ShieldCheck className="w-4 h-4 text-blue-300" /> : <GraduationCap className="w-4 h-4 text-teal-300" />}
          {username} · {currentRole === 'ADMIN' ? 'Administrator' : 'Student'}
        </span>
        <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-lg border border-navy-700 px-3 py-2 text-xs font-semibold hover:bg-navy-800" aria-label="Sign out">
          <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </div>
  </header>
);
