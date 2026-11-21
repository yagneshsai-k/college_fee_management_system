import React from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  AlertTriangle,
  Receipt,
  Calculator,
  ChevronRight,
  TrendingUp,
  ClipboardCheck,
  BarChart3,
} from 'lucide-react';

export type AdminTab = 'dashboard' | 'students' | 'collect' | 'overdue' | 'payments' | 'calculator' | 'requests' | 'tools';

interface SidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  overdueCount: number;
  collectionRate: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  overdueCount,
  collectionRate,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as AdminTab,
      label: 'ERP Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'students' as AdminTab,
      label: 'Student Fee Plans',
      icon: Users,
      badge: null,
    },
    {
      id: 'collect' as AdminTab,
      label: 'Fee Collection Counter',
      icon: CreditCard,
      badge: 'Quick Pay',
      badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'overdue' as AdminTab,
      label: 'Overdue & Defaulters',
      icon: AlertTriangle,
      badge: overdueCount > 0 ? `${overdueCount}` : null,
      badgeColor: 'bg-rose-100 text-rose-700 font-bold',
    },
    {
      id: 'payments' as AdminTab,
      label: 'Receipts & Transactions',
      icon: Receipt,
      badge: null,
    },
    {
      id: 'requests' as AdminTab,
      label: 'Student Requests',
      icon: ClipboardCheck,
      badge: 'Review',
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'calculator' as AdminTab,
      label: 'Installment Calculator',
      icon: Calculator,
      badge: 'Simulator',
      badgeColor: 'bg-purple-100 text-purple-700',
    },
    {
      id: 'tools' as AdminTab,
      label: 'Finance & Data Tools',
      icon: BarChart3,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4 shadow-sm">
      <div className="space-y-6">
        {/* Navigation Category Label */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Main Management
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-navy-900 text-white shadow-md shadow-navy-950/10'
                      : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 transition ${
                        isActive ? 'text-blue-400' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {item.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-blue-500/30 text-blue-200 border border-blue-400/40'
                            : item.badgeColor
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Progress Card */}
      <div className="mt-auto pt-4 border-t border-slate-100">
        <div className="bg-gradient-to-br from-navy-900 to-navy-950 rounded-xl p-3.5 text-white shadow-md">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-300">Annual Fee Target</span>
            <div className="flex items-center space-x-1 text-emerald-400 text-xs font-bold">
              <TrendingUp className="w-3 h-3" />
              <span>{collectionRate}%</span>
            </div>
          </div>
          <div className="w-full bg-navy-800 rounded-full h-2 overflow-hidden mb-2">
            <div
              className="bg-gradient-to-r from-blue-400 to-emerald-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, collectionRate)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Real-time collection rate tracked across all semester & installment plans.
          </p>
        </div>
      </div>
    </aside>
  );
};
