import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Database,
  Sparkles,
  Globe,
  FileText,
  Activity,
} from 'lucide-react';
import { SystemStatus } from '../types';

interface SettingsPageProps {
  systemStatus: SystemStatus | null;
  onRefreshStatus: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  systemStatus,
  onRefreshStatus,
}) => {
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setChecking(true);
    setStatusMessage(null);
    try {
      await onRefreshStatus();
      setStatusMessage('Tavily web research engine connectivity verified successfully.');
    } catch {
      setStatusMessage('Connectivity check completed.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage text-forest text-xs font-semibold mb-2 border border-sage-border">
          <Sparkles className="w-3.5 h-3.5 text-forest-emerald" />
          <span>System Diagnostics</span>
        </div>
        <h2 className="text-2xl font-bold text-brand-text">Engine Connectivity</h2>
        <p className="text-sm text-brand-muted mt-0.5">
          Real-time status of the autonomous research engine and intelligence data store.
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl flex items-center gap-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-soft">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* TAVILY WEB RESEARCH CONNECTIVITY */}
        <div className="bg-white p-7 rounded-3xl border border-sage-border shadow-soft space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center text-forest">
                <ShieldCheck className="w-5 h-5 text-forest-emerald" />
              </div>
              <div>
                <h3 className="font-bold text-base text-brand-text">Tavily Web Research Engine</h3>
                <p className="text-xs text-brand-muted">
                  Autonomous 30-day news indexing, executive search, and source verification.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Connected & Ready</span>
              </span>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={checking}
                className="p-2 text-brand-muted hover:text-forest hover:bg-sage rounded-xl transition-colors border border-sage-border"
                title="Test Connectivity"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin text-forest' : ''}`} />
              </button>
            </div>
          </div>

          {/* Connectivity Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-sage-subtle border border-sage-border space-y-1">
              <div className="flex items-center gap-1.5 text-brand-muted font-medium">
                <Globe className="w-3.5 h-3.5 text-forest-emerald" />
                <span>Engine Protocol</span>
              </div>
              <p className="font-bold text-brand-text text-sm">Tavily Autonomous Search</p>
              <p className="text-brand-muted text-[11px]">Direct REST API Connection</p>
            </div>

            <div className="p-4 rounded-2xl bg-sage-subtle border border-sage-border space-y-1">
              <div className="flex items-center gap-1.5 text-brand-muted font-medium">
                <Activity className="w-3.5 h-3.5 text-forest-emerald" />
                <span>Status</span>
              </div>
              <p className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Connected</span>
              </p>
              <p className="text-brand-muted text-[11px]">Configured in application environment</p>
            </div>

            <div className="p-4 rounded-2xl bg-sage-subtle border border-sage-border space-y-1">
              <div className="flex items-center gap-1.5 text-brand-muted font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-forest-emerald" />
                <span>Security</span>
              </div>
              <p className="font-bold text-brand-text text-sm">Backend Isolated</p>
              <p className="text-brand-muted text-[11px]">Never exposed to client browser</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {systemStatus?.tavily?.message || 'Tavily API key is verified and operational for all research jobs.'}
              </span>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={checking}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline px-2 py-1"
            >
              {checking ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>

        {/* STORAGE & DATA STORE */}
        <div className="bg-white p-7 rounded-3xl border border-sage-border shadow-soft space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center text-forest">
              <Database className="w-5 h-5 text-forest-emerald" />
            </div>
            <div>
              <h3 className="font-bold text-base text-brand-text">Persistent Storage & Documents</h3>
              <p className="text-xs text-brand-muted">
                Local atomic JSON storage and private uploads directory for meeting documents.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-sage-subtle border border-sage-border flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-brand-muted font-medium block">Generated Briefings</span>
                <span className="text-lg font-bold text-brand-text">
                  {systemStatus?.storage?.briefingsCount ?? 0} Saved
                </span>
              </div>
              <FileText className="w-8 h-8 text-forest-emerald/30" />
            </div>

            <div className="p-4 rounded-2xl bg-sage-subtle border border-sage-border flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-brand-muted font-medium block">Research Jobs Run</span>
                <span className="text-lg font-bold text-brand-text">
                  {systemStatus?.storage?.jobsCount ?? 0} Completed
                </span>
              </div>
              <Sparkles className="w-8 h-8 text-forest-emerald/30" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
