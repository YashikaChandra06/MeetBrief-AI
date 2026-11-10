import React from 'react';
import { PlusCircle, Search, ShieldCheck, Cpu, Calendar } from 'lucide-react';
import { SystemStatus } from '../types';

interface NavbarProps {
  onNewResearch: () => void;
  systemStatus: SystemStatus | null;
}

export const Navbar: React.FC<NavbarProps> = ({ onNewResearch, systemStatus }) => {
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="h-16 bg-white border-b border-sage-border px-8 flex items-center justify-between shrink-0 no-print">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-brand-muted bg-sage-subtle px-3 py-1.5 rounded-full border border-sage-border">
          <Calendar className="w-3.5 h-3.5 text-forest-emerald" />
          <span>{todayStr}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Status Indicators */}
        <div className="hidden md:flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              systemStatus?.tavily?.valid
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-forest-emerald" />
            <span>Tavily {systemStatus?.tavily?.valid ? 'Connected' : 'Missing Key'}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              systemStatus?.ollama?.running
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-forest-emerald" />
            <span>
              {systemStatus?.ollama?.running
                ? `Ollama: ${systemStatus?.ollama?.selectedModel || 'Ready'}`
                : 'Ollama: Offline (Fallback Mode)'}
            </span>
          </div>
        </div>

        {/* New Research CTA */}
        <button
          onClick={onNewResearch}
          className="flex items-center gap-2 px-4 py-2 bg-forest hover:bg-forest-light text-white text-xs font-semibold rounded-xl shadow-soft transition-all duration-150 active:scale-95"
        >
          <PlusCircle className="w-4 h-4 text-emerald-300" />
          <span>New Research</span>
        </button>
      </div>
    </header>
  );
};

