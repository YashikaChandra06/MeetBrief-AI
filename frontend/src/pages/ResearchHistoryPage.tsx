import React, { useState } from 'react';
import {
  History,
  Building2,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  Search,
} from 'lucide-react';
import { ResearchJob } from '../types';

interface ResearchHistoryPageProps {
  jobs: ResearchJob[];
  onViewBriefing: (briefingId: string) => void;
  onTrackJob: (jobId: string) => void;
}

export const ResearchHistoryPage: React.FC<ResearchHistoryPageProps> = ({
  jobs,
  onViewBriefing,
  onTrackJob,
}) => {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedJobId(expandedJobId === id ? null : id);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div>
        <h2 className="text-2xl font-bold text-brand-text">Research History</h2>
        <p className="text-sm text-brand-muted mt-0.5">
          Auditable log of all autonomous research executions, targeted queries, and pipeline steps.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-sage-border p-12 text-center space-y-3">
          <History className="w-10 h-10 text-brand-muted mx-auto" />
          <h3 className="font-bold text-base text-brand-text">No research runs logged yet</h3>
          <p className="text-xs text-brand-muted">
            Launch your first research run to inspect its query breakdown and verification trace.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const isExpanded = expandedJobId === job.id;
            const isCompleted = job.status === 'completed';
            const isFailed = job.status === 'failed';

            return (
              <div
                key={job.id}
                className="bg-white rounded-3xl border border-sage-border shadow-soft overflow-hidden transition-all"
              >
                <div
                  onClick={() => toggleExpand(job.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-sage-subtle/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center text-forest shrink-0">
                      {job.subjectType === 'company' ? (
                        <Building2 className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-brand-text">{job.subjectName}</h4>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sage text-forest">
                          {job.subjectType}
                        </span>
                      </div>
                      <p className="text-xs text-brand-muted flex items-center gap-2 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-forest-emerald" />
                        <span>Meeting: {job.meetingDate}</span>
                        <span>•</span>
                        <span>
                          Window: {job.researchWindow.startDate} to {job.researchWindow.endDate}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </span>
                      ) : isFailed ? (
                        <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Step {job.currentStep} of 7</span>
                        </span>
                      )}
                    </div>

                    {job.briefingId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewBriefing(job.briefingId!);
                        }}
                        className="px-3 py-1.5 bg-forest hover:bg-forest-light text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
                      >
                        Briefing
                      </button>
                    )}

                    {!isCompleted && !isFailed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTrackJob(job.id);
                        }}
                        className="px-3 py-1.5 bg-sage hover:bg-sage-border text-forest text-xs font-semibold rounded-xl transition-all"
                      >
                        Track Live
                      </button>
                    )}

                    <div className="text-brand-muted p-1">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-6 bg-sage-subtle/50 border-t border-sage-border space-y-4">
                    {/* Research Plan Queries */}
                    {job.plan && job.plan.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-brand-text uppercase tracking-wider">
                          Autonomous Search Plan Queries
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {job.plan.map((p, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-white border border-sage-border space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-forest uppercase text-[10px]">
                                  {p.category}
                                </span>
                                <Search className="w-3 h-3 text-forest-emerald" />
                              </div>
                              <p className="font-mono text-[11px] text-brand-text">{p.query}</p>
                              <p className="text-[10px] text-brand-muted">{p.rationale}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step Execution Logs */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-brand-text uppercase tracking-wider">
                        Execution Audit Logs
                      </h5>
                      <div className="bg-forest-dark text-emerald-100 rounded-2xl p-4 font-mono text-[11px] space-y-1 max-h-52 overflow-y-auto">
                        {job.logs.map((log, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-500/60">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span
                              className={
                                log.level === 'error'
                                  ? 'text-rose-400 font-bold'
                                  : log.level === 'warn'
                                  ? 'text-amber-300'
                                  : log.level === 'success'
                                  ? 'text-emerald-300 font-medium'
                                  : 'text-emerald-100/80'
                              }
                            >
                              {log.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

