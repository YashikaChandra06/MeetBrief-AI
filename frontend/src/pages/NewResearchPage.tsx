import React, { useState, useMemo } from 'react';
import {
  Building2,
  User,
  Calendar,
  Clock,
  Target,
  FileText,
  Sparkles,
  Info,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { SubjectType, SystemStatus } from '../types';

interface NewResearchPageProps {
  systemStatus: SystemStatus | null;
  onJobStarted: (jobId: string) => void;
  onNavigateSettings: () => void;
}

export const NewResearchPage: React.FC<NewResearchPageProps> = ({
  systemStatus,
  onJobStarted,
  onNavigateSettings,
}) => {
  // Default meeting date to tomorrow
  const defaultMeetingDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [subjectName, setSubjectName] = useState('');
  const [subjectType, setSubjectType] = useState<SubjectType>('company');
  const [meetingDate, setMeetingDate] = useState(defaultMeetingDate);
  const [meetingTime, setMeetingTime] = useState('10:00');
  const [meetingPurpose, setMeetingPurpose] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute 30-day research window preview dynamically
  const windowPreview = useMemo(() => {
    try {
      const d = new Date(meetingDate);
      if (isNaN(d.getTime())) return null;
      const start = new Date(d.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        startDate: start.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        endDate: d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      };
    } catch {
      return null;
    }
  }, [meetingDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      setError('Please provide a company or person name');
      return;
    }

    if (!meetingDate) {
      setError('Please select a valid scheduled meeting date');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.startResearch({
        subjectName: subjectName.trim(),
        subjectType,
        meetingDate,
        meetingTime,
        meetingPurpose: meetingPurpose.trim() || undefined,
        additionalContext: additionalContext.trim() || undefined,
      });

      if (res.job?.id) {
        onJobStarted(res.job.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize research job');
      setLoading(false);
    }
  };

  const sampleSubjects = [
    { name: 'Stripe', type: 'company' as SubjectType },
    { name: 'Anthropic', type: 'company' as SubjectType },
    { name: 'Jensen Huang', type: 'person' as SubjectType },
    { name: 'Satya Nadella', type: 'person' as SubjectType },
    { name: 'Mistral AI', type: 'company' as SubjectType },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Page Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage text-forest font-semibold text-xs mb-2">
          <Sparkles className="w-3.5 h-3.5 text-forest-emerald" />
          <span>Autonomous Pre-Meeting Agent</span>
        </div>
        <h2 className="text-2xl font-bold text-brand-text">New Meeting Research</h2>
        <p className="text-sm text-brand-muted mt-1">
          Provide your upcoming meeting details. MeetBrief AI will autonomously scour the preceding 30 days of real-world developments, verify sources, and synthesize a single-page briefing.
        </p>
      </div>

      {!systemStatus?.tavily?.configured && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-900">Tavily API Key Not Configured</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              To fetch live verified web results, please configure your free Tavily key.
            </p>
          </div>
          <button
            onClick={onNavigateSettings}
            className="px-3 py-1.5 bg-amber-700 text-white text-xs font-semibold rounded-lg hover:bg-amber-800 transition-colors"
          >
            Configure
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-3xl border border-sage-border shadow-soft">
        {/* 1. Subject Type Toggle */}
        <div>
          <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">
            Research Subject Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSubjectType('company')}
              className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border font-semibold text-sm transition-all ${
                subjectType === 'company'
                  ? 'border-forest-emerald bg-sage text-forest ring-2 ring-forest-emerald/20'
                  : 'border-sage-border bg-white text-brand-muted hover:border-forest/40'
              }`}
            >
              <Building2 className={`w-4 h-4 ${subjectType === 'company' ? 'text-forest' : 'text-brand-muted'}`} />
              <span>Company / Organization</span>
            </button>

            <button
              type="button"
              onClick={() => setSubjectType('person')}
              className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border font-semibold text-sm transition-all ${
                subjectType === 'person'
                  ? 'border-forest-emerald bg-sage text-forest ring-2 ring-forest-emerald/20'
                  : 'border-sage-border bg-white text-brand-muted hover:border-forest/40'
              }`}
            >
              <User className={`w-4 h-4 ${subjectType === 'person' ? 'text-forest' : 'text-brand-muted'}`} />
              <span>Individual / Executive</span>
            </button>
          </div>
        </div>

        {/* 2. Subject Name */}
        <div>
          <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">
            {subjectType === 'company' ? 'Company Name' : "Person's Name"} *
          </label>
          <input
            type="text"
            required
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder={
              subjectType === 'company'
                ? 'e.g. OpenAI, Stripe, Snowflake, Palantir'
                : 'e.g. Jensen Huang, Sam Altman, Satya Nadella'
            }
            className="w-full px-4 py-3 bg-white border border-sage-border rounded-xl text-sm text-brand-text placeholder-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-forest-emerald focus:border-forest-emerald transition-all"
          />

          {/* Quick Sample Picks */}
          <div className="mt-2.5 flex items-center gap-2 flex-wrap text-xs text-brand-muted">
            <span className="text-[11px] font-medium">Quick examples:</span>
            {sampleSubjects.map((sample) => (
              <button
                key={sample.name}
                type="button"
                onClick={() => {
                  setSubjectName(sample.name);
                  setSubjectType(sample.type);
                }}
                className="px-2 py-0.5 rounded-md bg-sage-subtle hover:bg-sage text-brand-text border border-sage-border text-[11px] font-medium transition-colors"
              >
                {sample.name}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-forest-emerald" />
              <span>Meeting Date *</span>
            </label>
            <input
              type="date"
              required
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-sage-border rounded-xl text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-forest-emerald focus:border-forest-emerald"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-forest-emerald" />
              <span>Meeting Time</span>
            </label>
            <input
              type="time"
              value={meetingTime}
              onChange={(e) => setMeetingTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-sage-border rounded-xl text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-forest-emerald focus:border-forest-emerald"
            />
          </div>
        </div>

        {/* Dynamic 30-Day Window Banner */}
        {windowPreview && (
          <div className="p-3.5 rounded-xl bg-sage-subtle border border-sage-border flex items-start gap-3 text-xs text-brand-text">
            <Info className="w-4 h-4 text-forest-emerald shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-forest">Autonomous Research Scope: </span>
              <span>
                Calculated strictly 30 days prior to scheduled meeting date:
              </span>
              <span className="font-semibold text-forest-emerald block mt-0.5">
                {windowPreview.startDate} — {windowPreview.endDate}
              </span>
            </div>
          </div>
        )}

        {/* 4. Meeting Purpose */}
        <div>
          <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-forest-emerald" />
            <span>Meeting Purpose (Optional)</span>
          </label>
          <input
            type="text"
            value={meetingPurpose}
            onChange={(e) => setMeetingPurpose(e.target.value)}
            placeholder="e.g. Exploring Series B investment, Strategic API integration, Enterprise pilot"
            className="w-full px-4 py-3 bg-white border border-sage-border rounded-xl text-sm text-brand-text placeholder-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-forest-emerald focus:border-forest-emerald"
          />
        </div>

        {/* 5. Additional Context */}
        <div>
          <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-forest-emerald" />
            <span>Additional Context / Angles of Interest (Optional)</span>
          </label>
          <textarea
            rows={3}
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="Mention any specific competitors, recent rumors, product lines, or internal context you wish to probe."
            className="w-full px-4 py-2.5 bg-white border border-sage-border rounded-xl text-sm text-brand-text placeholder-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-forest-emerald focus:border-forest-emerald"
          />
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 bg-forest hover:bg-forest-light active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-card transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Initializing Autonomous Pipeline...</span>
              </div>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
                <span>START AUTONOMOUS RESEARCH</span>
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

