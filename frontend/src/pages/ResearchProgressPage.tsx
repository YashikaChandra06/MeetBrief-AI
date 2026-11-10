import React, { useEffect, useState, useRef } from 'react';
import {
  CheckCircle2,
  Loader2,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Terminal,
  Search,
  FileCheck,
  Cpu,
  FileText,
  Building2,
  User,
} from 'lucide-react';
import { api } from '../services/api';
import { ResearchJob } from '../types';

interface ResearchProgressPageProps {
  jobId: string;
  onViewBriefing: (briefingId: string) => void;
  onReturnToDashboard: () => void;
}

export const ResearchProgressPage: React.FC<ResearchProgressPageProps> = ({
  jobId,
  onViewBriefing,
  onReturnToDashboard,
}) => {
  const [job, setJob] = useState<ResearchJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Poll for actual job updates from backend
  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const data = await api.getResearchJob(jobId);
        if (isMounted) {
          setJob(data);

          // If finished and has briefingId, auto-navigate or offer view
          if (data.status === 'completed' && data.briefingId) {
            // Give user 1.2s to see the 100% completion checkmark
            setTimeout(() => {
              if (isMounted) {
                onViewBriefing(data.briefingId!);
              }
            }, 1200);
            return;
          }

          if (data.status === 'failed') {
            setError(data.error || 'Research failed to complete.');
            return;
          }

          // Continue polling if pending or in_progress
          timer = setTimeout(fetchStatus, 1200);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to poll job status');
        }
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [jobId, onViewBriefing]);

  // Scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [job?.logs]);

  const steps = [
    { number: 1, title: 'Understanding meeting context', icon: Clock },
    { number: 2, title: 'Creating research plan', icon: FileCheck },
    { number: 3, title: 'Searching the web', icon: Search },
    { number: 4, title: 'Extracting information', icon: Terminal },
    { number: 5, title: 'Verifying findings', icon: FileCheck },
    { number: 6, title: 'Analyzing developments', icon: Cpu },
    { number: 7, title: 'Generating briefing', icon: FileText },
  ];

  const currentStep = job?.currentStep || 1;
  const progressPercent = job?.progressPercent || 5;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-sage-border shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sage flex items-center justify-center text-forest shrink-0">
            {job?.subjectType === 'company' ? (
              <Building2 className="w-6 h-6" />
            ) : (
              <User className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sage text-forest uppercase">
                {job?.subjectType || 'RESEARCH'}
              </span>
              <span className="text-xs text-brand-muted">
                Meeting: {job?.meetingDate || 'Upcoming'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-brand-text mt-0.5">
              {job?.subjectName || 'Gathering Subject Intelligence...'}
            </h2>
            <p className="text-xs text-brand-muted">
              Research Window: {job?.researchWindow?.startDate} — {job?.researchWindow?.endDate}
            </p>
          </div>
        </div>

        <div>
          {job?.status === 'completed' && job.briefingId ? (
            <button
              onClick={() => onViewBriefing(job.briefingId!)}
              className="flex items-center gap-2 px-5 py-2.5 bg-forest-emerald hover:bg-forest text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>View Briefing Report</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-forest px-3 py-1.5 rounded-full bg-sage">
              <Loader2 className="w-4 h-4 animate-spin text-forest-emerald" />
              <span>Step {currentStep} of 7 in Progress</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-6 rounded-3xl border border-sage-border shadow-soft space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-forest flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-forest-emerald animate-ping" />
            <span>{job?.currentStepName || 'Executing pipeline...'}</span>
          </span>
          <span className="text-forest font-bold">{progressPercent}% Completed</span>
        </div>

        {/* Bar */}
        <div className="w-full bg-sage-subtle h-3 rounded-full overflow-hidden border border-sage-border">
          <div
            className="bg-forest-emerald h-full rounded-full transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-xs text-brand-muted italic">
          {job?.currentActivity || 'Synchronizing with autonomous research engine...'}
        </p>
      </div>

      {/* 7 Workflow Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {steps.map((st) => {
          const isDone = (job?.status === 'completed') || currentStep > st.number;
          const isCurrent = job?.status !== 'completed' && currentStep === st.number;
          const isPending = !isDone && !isCurrent;
          const Icon = st.icon;

          return (
            <div
              key={st.number}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                isDone
                  ? 'bg-white border-emerald-200 text-brand-text'
                  : isCurrent
                  ? 'bg-sage border-forest-emerald ring-2 ring-forest-emerald/20 text-forest'
                  : 'bg-white/60 border-sage-border text-brand-muted/70 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isDone
                      ? 'bg-emerald-100 text-emerald-800'
                      : isCurrent
                      ? 'bg-forest text-white'
                      : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                    Step {st.number}
                  </div>
                  <h4 className="text-xs font-bold">{st.title}</h4>
                </div>
              </div>

              <div>
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 text-forest-emerald animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-zinc-200" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Execution Logs Terminal */}
      <div className="bg-forest-dark text-emerald-100 rounded-3xl p-6 shadow-card border border-white/5 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-white">Live Execution Terminal</span>
          </div>
          <span className="text-[10px] text-emerald-300/60 uppercase">Real-Time Trace</span>
        </div>

        <div className="h-60 overflow-y-auto space-y-2 pr-2 text-[11px] leading-relaxed">
          {job?.logs && job.logs.length > 0 ? (
            job.logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-emerald-500/50 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={
                    log.level === 'error'
                      ? 'text-rose-400 font-bold'
                      : log.level === 'warn'
                      ? 'text-amber-300 font-semibold'
                      : log.level === 'success'
                      ? 'text-emerald-300 font-medium'
                      : 'text-emerald-100/80'
                  }
                >
                  {log.message}
                </span>
              </div>
            ))
          ) : (
            <div className="text-emerald-300/50 italic py-4">
              Connecting to autonomous research task...
            </div>
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Error View if failed */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <h5 className="font-bold text-sm">Execution Interrupted</h5>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={onReturnToDashboard}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

