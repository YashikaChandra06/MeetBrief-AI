import React, { useState } from 'react';
import {
  FileText,
  Search,
  Calendar,
  Building2,
  User,
  Trash2,
  Download,
  ChevronRight,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { BriefingReport } from '../types';

interface BriefingsListPageProps {
  briefings: BriefingReport[];
  onSelectBriefing: (id: string) => void;
  onNewResearch: () => void;
  onRefresh: () => void;
}

export const BriefingsListPage: React.FC<BriefingsListPageProps> = ({
  briefings,
  onSelectBriefing,
  onNewResearch,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'company' | 'person'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = briefings.filter((b) => {
    const matchesSearch =
      b.subjectName.toLowerCase().includes(search.toLowerCase()) ||
      (b.meetingPurpose && b.meetingPurpose.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === 'all' || b.subjectType === filterType;
    return matchesSearch && matchesType;
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this briefing?')) return;
    setDeletingId(id);
    try {
      await api.deleteBriefing(id);
      onRefresh();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadPdf = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(api.getPdfUrl(id), '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-text">My Briefings</h2>
          <p className="text-sm text-brand-muted mt-0.5">
            Access, print, and export your generated pre-meeting intelligence dossiers.
          </p>
        </div>

        <button
          onClick={onNewResearch}
          className="flex items-center gap-2 px-4 py-2.5 bg-forest hover:bg-forest-light text-white text-xs font-semibold rounded-xl shadow-soft transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 text-emerald-300" />
          <span>New Research</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-sage-border shadow-soft flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject or purpose..."
            className="w-full pl-9 pr-4 py-2 bg-sage-subtle border border-sage-border rounded-xl text-xs text-brand-text focus:outline-none focus:ring-2 focus:ring-forest-emerald"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(['all', 'company', 'person'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                filterType === t
                  ? 'bg-forest text-white shadow-xs'
                  : 'bg-sage-subtle text-brand-muted hover:text-brand-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Briefings */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-sage-border p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-sage rounded-2xl flex items-center justify-center text-forest mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-brand-text">No briefings found</h3>
          <p className="text-xs text-brand-muted max-w-sm mx-auto">
            {search
              ? 'No briefings match your search criteria. Try a different query.'
              : 'Start your first meeting research to generate source-verified intelligence reports.'}
          </p>
          <button
            onClick={onNewResearch}
            className="px-4 py-2 bg-forest text-white text-xs font-semibold rounded-xl hover:bg-forest-light transition-all"
          >
            Create Briefing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((b) => (
            <div
              key={b.id}
              onClick={() => onSelectBriefing(b.id)}
              className="bg-white p-6 rounded-3xl border border-sage-border hover:border-forest-emerald hover:shadow-card transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center text-forest shrink-0">
                    {b.subjectType === 'company' ? (
                      <Building2 className="w-5 h-5" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sage text-forest uppercase">
                    {b.subjectType}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-brand-text group-hover:text-forest-emerald transition-colors line-clamp-1">
                    {b.subjectName}
                  </h3>
                  <p className="text-xs text-brand-muted flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-forest-emerald" />
                    <span>
                      {b.meetingDate} ({b.meetingTime})
                    </span>
                  </p>
                </div>

                <p className="text-xs text-brand-text/80 line-clamp-2 leading-relaxed">
                  {b.executiveSummary}
                </p>

                <div className="pt-1 flex items-center gap-2 flex-wrap text-[11px] font-medium text-forest-emerald">
                  <span className="bg-sage-subtle px-2 py-0.5 rounded border border-sage-border">
                    {b.recentDevelopments.length} key insights
                  </span>
                  <span className="bg-sage-subtle px-2 py-0.5 rounded border border-sage-border">
                    {b.sources.length} sources
                  </span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-sage-border flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleDownloadPdf(b.id, e)}
                    title="Download PDF"
                    className="p-2 text-brand-muted hover:text-forest hover:bg-sage rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(b.id, e)}
                    disabled={deletingId === b.id}
                    title="Delete Briefing"
                    className="p-2 text-brand-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <span className="text-xs font-bold text-forest group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  <span>Open Dossier</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

