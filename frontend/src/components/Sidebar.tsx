import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  History,
  Settings,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { SystemStatus } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  systemStatus: SystemStatus | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  systemStatus,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'new-research', label: 'New Research', icon: PlusCircle },
    { id: 'briefings', label: 'My Briefings', icon: FileText },
    { id: 'history', label: 'Research History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-forest text-white flex flex-col justify-between shrink-0 min-h-screen border-r border-[#194738] select-none no-print">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-[#194738]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-emerald flex items-center justify-center text-white shadow-md shadow-forest-dark/40 ring-2 ring-emerald-400/20">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                MeetBrief <span className="text-emerald-400 font-semibold text-xs px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">AI</span>
              </h1>
              <p className="text-[11px] text-emerald-200/60 font-medium">Pre-Meeting Intelligence</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-forest-light text-white shadow-sm ring-1 ring-white/10 font-semibold'
                    : 'text-emerald-100/75 hover:bg-forest-hover hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-emerald-300' : 'text-emerald-200/60'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Status Pill / Footer */}
      <div className="p-4 m-3 rounded-2xl bg-forest-dark/70 border border-white/5 space-y-2.5">
        <div className="text-[11px] font-semibold tracking-wider text-emerald-300/70 uppercase px-1">
          Engine Connectivity
        </div>

        {/* Tavily Status */}
        <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-white/5 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span className="text-emerald-100/90 font-medium">Tavily Web</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
            Connected
          </span>
        </div>

        <div className="pt-1">
          <button
            onClick={() => onSelectTab('settings')}
            className="w-full text-center text-[11px] text-emerald-300/80 hover:text-white flex items-center justify-center gap-1 font-medium transition-colors"
          >
            <span>Engine Status</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};

