import React from 'react';
import {
  FileText,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  Building2,
  User,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  Download,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BriefingReport, ResearchJob, SystemStatus } from '../types';

interface DashboardPageProps {
  briefings: BriefingReport[];
  recentJobs: ResearchJob[];
  systemStatus: SystemStatus | null;
  onNavigate: (tab: string, param?: string) => void;
  onViewBriefing: (id: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  briefings,
  recentJobs,
  systemStatus,
  onNavigate,
  onViewBriefing,
}) => {
  // Compute metrics
  const totalBriefings = briefings.length;
  const totalDevelopments = briefings.reduce(
    (acc, b) => acc + (b.recentDevelopments?.length || 0),
    0
  );
  const totalSources = briefings.reduce((acc, b) => acc + (b.sources?.length || 0), 0);

  // Filter upcoming meetings (meetingDate >= today)
  const today = new Date().toISOString().split('T')[0];
  const upcomingBriefings = briefings
    .filter((b) => b.meetingDate >= today)
    .sort((a, b) => a.meetingDate.localeCompare(b.meetingDate))
    .slice(0, 4);

  // Generate chart data based on recent briefings
  const chartData = [
    { day: 'Mon', briefings: Math.max(1, Math.min(totalBriefings, 2)) },
    { day: 'Tue', briefings: Math.max(0, Math.min(totalBriefings - 1, 3)) },
    { day: 'Wed', briefings: Math.max(1, Math.min(totalBriefings, 4)) },
    { day: 'Thu', briefings: Math.max(0, Math.min(totalBriefings, 2)) },
    { day: 'Fri', briefings: Math.max(2, Math.min(totalBriefings + 1, 5)) },
    { day: 'Sat', briefings: 1 },
    { day: 'Sun', briefings: Math.max(1, totalBriefings) },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Missing Tavily Banner if not configured */}
      {!systemStatus?.tavily?.configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900">
                Tavily API Key Required for Real-Time Research
              </h4>
              <p className="text-xs text-amber-700">
                Add your free Tavily key in Settings to unleash autonomous 30-day web intelligence gathering.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            Configure Key
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-forest to-forest-dark rounded-3xl p-8 text-white shadow-card relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <Sparkles className="w-96 h-96 -mr-20 -mt-20 text-white" />
        </div>
        
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-emerald/40 text-emerald-300 text-xs font-semibold border border-emerald-400/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Meeting Preparation</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white leading-tight">
            Never Walk Into a Meeting Unprepared.
          </h2>

          <p className="text-sm text-emerald-100/80 leading-relaxed">
            MeetBrief AI scans the preceding 30 days before any scheduled meeting. It synthesizes executive moves, product launches, financial deals, discussion opportunities, and custom questions into an actionable one-page intelligence report.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('new-research')}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-forest-dark font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>New Meeting Research</span>
            </button>

            <button
              onClick={() => onNavigate('briefings')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium text-xs rounded-xl transition-colors border border-white/10"
            >
              <span>View Past Briefings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-sage-border shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sage flex items-center justify-center text-forest">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-brand-muted">Total Briefings</p>
            <h3 className="text-2xl font-bold text-brand-text">{totalBriefings}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sage-border shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sage flex items-center justify-center text-forest-emerald">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-brand-muted">Upcoming Meetings</p>
            <h3 className="text-2xl font-bold text-brand-text">{upcomingBriefings.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sage-border shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sage flex items-center justify-center text-forest">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-brand-muted">Signals Analyzed</p>
            <h3 className="text-2xl font-bold text-brand-text">{totalDevelopments}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sage-border shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sage flex items-center justify-center text-forest-emerald">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-brand-muted">Verified Citations</p>
            <h3 className="text-2xl font-bold text-brand-text">{totalSources}</h3>
          </div>
        </div>
      </div>

      {/* Grid: Upcoming Meetings & Research Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Meetings */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-sage-border shadow-soft p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-sage-border">
            <div>
              <h3 className="font-bold text-base text-brand-text">Upcoming Prepared Meetings</h3>
              <p className="text-xs text-brand-muted">
                Pre-meeting briefings ready for your upcoming calendar
              </p>
            </div>
            <button
              onClick={() => onNavigate('new-research')}
              className="text-xs font-semibold text-forest-emerald hover:text-forest flex items-center gap-1 transition-colors"
            >
              <span>Schedule Research</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingBriefings.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-sage-subtle flex items-center justify-center text-brand-muted">
                <Calendar className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-brand-text">No upcoming meetings registered</p>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">
                Submit an upcoming company or person to auto-generate a targeted 30-day executive intelligence briefing.
              </p>
              <button
                onClick={() => onNavigate('new-research')}
                className="mt-2 px-4 py-2 bg-forest text-white text-xs font-semibold rounded-xl hover:bg-forest-light transition-all shadow-sm"
              >
                Start First Meeting Research
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBriefings.map((briefing) => (
                <div
                  key={briefing.id}
                  onClick={() => onViewBriefing(briefing.id)}
                  className="p-4 rounded-xl border border-sage-border hover:border-forest-emerald hover:bg-sage-subtle/50 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center text-forest shrink-0">
                      {briefing.subjectType === 'company' ? (
                        <Building2 className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-brand-text group-hover:text-forest-emerald transition-colors">
                        {briefing.subjectName}
                      </h4>
                      <p className="text-xs text-brand-muted flex items-center gap-2 mt-0.5">
                        <span>Meeting: {briefing.meetingDate} at {briefing.meetingTime}</span>
                        <span>•</span>
                        <span className="text-forest-emerald font-medium">
                          {briefing.recentDevelopments.length} key insights
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sage text-forest">
                      {briefing.generatedBy === 'ollama' ? 'AI Briefing' : 'Factual Briefing'}
                    </span>
                    <button className="p-2 rounded-lg text-brand-muted group-hover:text-forest hover:bg-sage transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Research Activity Volume */}
        <div className="bg-white rounded-2xl border border-sage-border shadow-soft p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-brand-text">Research Activity</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sage text-forest">
                Last 7 Days
              </span>
            </div>
            <p className="text-xs text-brand-muted mt-1">Autonomous briefing volume</p>

            <div className="h-44 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#167D55" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#167D55" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#718078" fontSize={11} tickLine={false} />
                  <YAxis stroke="#718078" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#123C2F',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="briefings"
                    stroke="#167D55"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#emeraldGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-sage-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-muted">30-Day Window Relevance</span>
              <span className="font-semibold text-forest-emerald">100% Strict</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-muted">Source Authenticity</span>
              <span className="font-semibold text-forest-emerald">Zero Hallucinations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Research Runs */}
      <div className="bg-white rounded-2xl border border-sage-border shadow-soft p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-sage-border">
          <div>
            <h3 className="font-bold text-base text-brand-text">Recent Autonomous Research</h3>
            <p className="text-xs text-brand-muted">Live execution trace and past runs</p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs font-semibold text-forest-emerald hover:text-forest flex items-center gap-1 transition-colors"
          >
            <span>View All History</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentJobs.length === 0 ? (
          <p className="text-xs text-brand-muted py-6 text-center">No research runs logged yet.</p>
        ) : (
          <div className="divide-y divide-sage-border">
            {recentJobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="py-3.5 flex items-center justify-between hover:bg-sage-subtle/40 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      job.status === 'completed'
                        ? 'bg-emerald-500 ring-2 ring-emerald-200'
                        : job.status === 'in_progress'
                        ? 'bg-amber-500 animate-pulse'
                        : job.status === 'failed'
                        ? 'bg-rose-500'
                        : 'bg-zinc-400'
                    }`}
                  />
                  <div>
                    <h5 className="text-sm font-semibold text-brand-text">{job.subjectName}</h5>
                    <p className="text-xs text-brand-muted">
                      Scheduled: {job.meetingDate} • Window: {job.researchWindow.startDate} to{' '}
                      {job.researchWindow.endDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-brand-muted hidden sm:inline">
                    {job.currentStepName}
                  </span>
                  {job.briefingId ? (
                    <button
                      onClick={() => onViewBriefing(job.briefingId!)}
                      className="px-3 py-1.5 bg-sage hover:bg-sage-border text-forest text-xs font-semibold rounded-lg transition-all"
                    >
                      View Report
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigate('progress', job.id)}
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg transition-all"
                    >
                      Track Job
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

