import React, { useState, useEffect } from 'react';
import {
  Download,
  Copy,
  Check,
  RefreshCw,
  ArrowLeft,
  Calendar,
  ExternalLink,
  Sparkles,
  Building2,
  User,
  ShieldCheck,
  HelpCircle,
  Lightbulb,
  TrendingUp,
  Printer,
  AlertTriangle,
  FileText,
  FileCheck2,
  FileSearch,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { BriefingReport } from '../types';

interface BriefingViewPageProps {
  briefingId: string;
  onBack: () => void;
}

export const BriefingViewPage: React.FC<BriefingViewPageProps> = ({
  briefingId,
  onBack,
}) => {
  const [briefing, setBriefing] = useState<BriefingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBriefing();
  }, [briefingId]);

  const loadBriefing = async () => {
    setLoading(true);
    try {
      const data = await api.getBriefing(briefingId);
      setBriefing(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load briefing');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!briefing) return;
    setRegenerating(true);
    try {
      const updated = await api.regenerateBriefing(briefing.id);
      setBriefing(updated);
    } catch (err: any) {
      alert(`Regeneration failed: ${err.message}`);
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!briefing) return;

    let md = `# MEETBRIEF AI: ${briefing.subjectName}
**Scheduled Meeting:** ${briefing.meetingDate} ${briefing.meetingTime}
**Research Window:** ${briefing.researchWindow.startDate} to ${briefing.researchWindow.endDate} (Preceding 30 Days)
${briefing.meetingPurpose ? `**Meeting Focus:** ${briefing.meetingPurpose}\n` : ''}

## A. EXECUTIVE SUMMARY
${briefing.executiveSummary}

## B. RECENT DEVELOPMENTS
${briefing.recentDevelopments
  .map(
    (d, i) => `### ${i + 1}. ${d.headline}
- **Date:** ${d.publishedDate}
- **Source:** [${d.sourceTitle}](${d.sourceUrl})
- **Summary:** ${d.description}
- **Why It Matters:** ${d.whyItMatters}`
  )
  .join('\n\n')}
`;

    if (briefing.documentContext && briefing.documentContext.documentsCount > 0) {
      md += `\n## DOCUMENT INTELLIGENCE & CONTEXT
Uploaded Documents: ${briefing.documentContext.documents.map((d) => d.fileName).join(', ')}

${briefing.documentContext.documents
  .map(
    (d) => `### Document: ${d.fileName}
- **Summary:** ${d.summary}
- **Objectives:** ${d.objectives.join('; ') || 'N/A'}
- **Products:** ${d.products.join(', ') || 'N/A'}
- **Stakeholders:** ${d.stakeholders.join(', ') || 'N/A'}`
  )
  .join('\n\n')}

### DOCUMENT-TO-WEB INSIGHTS
${briefing.documentContext.insights
  .map(
    (ins) => `* **${ins.title}** (${ins.category})
  - **Doc Evidence:** ${ins.documentEvidence.fileName} (Page/Slide ${ins.documentEvidence.pageOrSlide}): "${ins.documentEvidence.quote}"
  - **Analysis:** ${ins.explanation}`
  )
  .join('\n')}

### DOCUMENT-BASED QUESTIONS
${briefing.documentContext.documentQuestions
  .map((dq, i) => `${i + 1}. ${dq.question} (Ref: ${dq.documentName})`)
  .join('\n')}
`;
    }

    md += `\n## C. WHAT THIS MEANS FOR THE MEETING
${briefing.whatThisMeans.map((w) => `- ${w}`).join('\n')}

## D. DISCUSSION OPPORTUNITIES
${briefing.discussionOpportunities.map((o) => `- ${o}`).join('\n')}

## E. QUESTIONS TO ASK
${briefing.questionsToAsk.map((q, i) => `${i + 1}. ${q}`).join('\n')}

## F. OPEN QUESTIONS & GAPS
${briefing.openQuestions.map((g) => `- ${g}`).join('\n')}

## G. SOURCES CITED
${briefing.sources.map((s) => `- [${s.title}](${s.url}) (${s.domain})`).join('\n')}
`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = () => {
    if (!briefing) return;
    window.open(api.getPdfUrl(briefing.id), '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-forest-emerald border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-brand-text">Loading intelligence briefing...</p>
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-lg text-brand-text">Unable to load briefing</h3>
        <p className="text-xs text-brand-muted">{error || 'Briefing document not found'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-forest text-white text-xs font-semibold rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Top Action Toolbar (Hidden in Print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-sage-border shadow-soft">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-brand-text hover:text-forest hover:bg-sage rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-2.5 flex-wrap">
          {briefing.isFallback && (
            <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <span>Factual Web Intelligence (AI Offline)</span>
            </div>
          )}

          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sage hover:bg-sage-border text-forest text-xs font-semibold rounded-xl transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Markdown</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sage hover:bg-sage-border text-forest text-xs font-semibold rounded-xl transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print A4</span>
          </button>

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sage hover:bg-sage-border text-forest text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            <span>{regenerating ? 'Regenerating...' : 'Regenerate'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-4 py-2 bg-forest hover:bg-forest-light text-white text-xs font-bold rounded-xl shadow-soft transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Printable A4 Styled Briefing Document */}
      <div className="print-page bg-white rounded-3xl border border-sage-border shadow-card p-8 sm:p-12 space-y-8">
        {/* Document Header Bar */}
        <div className="border-b-2 border-forest pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm tracking-wider text-forest uppercase">
                MeetBrief AI
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sage text-forest">
                Intelligence Briefing
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                {briefing.subjectType}
              </span>
              {briefing.documentContext && briefing.documentContext.documentsCount > 0 && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-forest text-white">
                  {briefing.documentContext.documentsCount} Document(s) Synthesized
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold text-forest mt-1.5 tracking-tight">
              {briefing.subjectName}
            </h1>

            {briefing.meetingPurpose && (
              <p className="text-xs font-medium text-brand-muted mt-1 italic">
                Meeting Focus: "{briefing.meetingPurpose}"
              </p>
            )}
          </div>

          <div className="sm:text-right space-y-1 text-xs">
            <div className="inline-flex sm:flex items-center gap-1.5 font-bold text-forest">
              <Calendar className="w-3.5 h-3.5 text-forest-emerald" />
              <span>
                Meeting: {briefing.meetingDate} ({briefing.meetingTime})
              </span>
            </div>
            <div className="text-brand-muted text-[11px]">
              Pre-Meeting Research Window (30 Days):
              <span className="font-semibold text-brand-text block sm:inline sm:ml-1">
                {briefing.researchWindow.startDate} — {briefing.researchWindow.endDate}
              </span>
            </div>
            <div className="text-[10px] text-brand-muted">
              Engine:{' '}
              {briefing.generatedBy === 'ollama'
                ? `Ollama AI (${briefing.ollamaModel || 'Local Model'})`
                : 'Tavily Verified Algorithmic Synthesis'}
            </div>
          </div>
        </div>

        {/* SECTION A: EXECUTIVE SUMMARY */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sage flex items-center justify-center text-forest text-xs font-bold">
              A
            </div>
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-forest-emerald">
              Executive Summary
            </h3>
          </div>

          <div className="bg-sage/70 rounded-2xl p-5 border border-sage-border text-sm leading-relaxed text-brand-text">
            {briefing.executiveSummary}
          </div>
        </div>

        {/* SECTION: DOCUMENT INTELLIGENCE (IF DOCUMENTS WERE UPLOADED) */}
        {briefing.documentContext && briefing.documentContext.documentsCount > 0 && (
          <div className="space-y-6 pt-2 border-t border-sage-border">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-forest text-white flex items-center justify-center text-xs font-bold">
                  ★
                </div>
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-forest">
                  Document Context & Internal Evidence
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-forest-emerald bg-sage px-2 py-0.5 rounded-full">
                {briefing.documentContext.documentsCount} File(s) Analyzed
              </span>
            </div>

            {/* Document Summaries */}
            <div className="grid grid-cols-1 gap-3">
              {briefing.documentContext.documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-sage-subtle border border-sage-border space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-forest-emerald" />
                      <h4 className="text-xs font-bold text-forest">{doc.fileName}</h4>
                    </div>
                    {doc.isScannedPdf && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        Scanned PDF (OCR Required)
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-brand-text leading-relaxed">{doc.summary}</p>

                  <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                    {doc.objectives.length > 0 && (
                      <div className="bg-white px-2.5 py-1 rounded-lg border border-sage-border">
                        <span className="font-bold text-forest">Objectives: </span>
                        <span>{doc.objectives.join('; ')}</span>
                      </div>
                    )}
                    {doc.products.length > 0 && (
                      <div className="bg-white px-2.5 py-1 rounded-lg border border-sage-border">
                        <span className="font-bold text-forest">Products: </span>
                        <span>{doc.products.join(', ')}</span>
                      </div>
                    )}
                    {doc.stakeholders.length > 0 && (
                      <div className="bg-white px-2.5 py-1 rounded-lg border border-sage-border">
                        <span className="font-bold text-forest">Stakeholders: </span>
                        <span>{doc.stakeholders.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Document-to-Web Insights */}
            {briefing.documentContext.insights.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-forest-emerald" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-forest-emerald">
                    Document-to-Web Insights (Claims Cross-Referenced Against Recent News)
                  </h4>
                </div>

                <div className="space-y-3">
                  {briefing.documentContext.insights.map((ins, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-sage-border bg-white space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xs font-bold text-forest">{ins.title}</h5>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sage text-forest">
                          {ins.category.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Evidence Split View */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* Doc Evidence */}
                        <div className="p-3 rounded-xl bg-sage-subtle border border-sage-border space-y-1">
                          <span className="text-[10px] font-bold text-brand-muted uppercase block">
                            Document Evidence ({ins.documentEvidence.fileName} • Page/Slide {ins.documentEvidence.pageOrSlide})
                          </span>
                          <p className="italic text-brand-text">"{ins.documentEvidence.quote}"</p>
                        </div>

                        {/* Web Finding */}
                        {ins.webFinding ? (
                          <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 space-y-1">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                              Web Corroboration ({ins.webFinding.publisher} • {ins.webFinding.publishedDate})
                            </span>
                            <a
                              href={ins.webFinding.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-forest-emerald hover:underline block truncate"
                            >
                              {ins.webFinding.headline}
                            </a>
                            <p className="text-brand-text line-clamp-2">{ins.webFinding.summary}</p>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center">
                            <span>No public confirmation indexed in the preceding 30 days.</span>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-brand-text bg-sage-subtle/70 px-3 py-1.5 rounded-lg border border-sage-border">
                        <span className="font-bold text-forest">Analysis: </span>
                        <span>{ins.explanation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document-Based Questions */}
            {briefing.documentContext.documentQuestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-forest-emerald" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-forest-emerald">
                    Document-Based Meeting Questions
                  </h4>
                </div>

                <div className="space-y-2">
                  {briefing.documentContext.documentQuestions.map((dq, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-sage-border bg-white flex items-start gap-3 text-xs"
                    >
                      <span className="w-5 h-5 rounded-full bg-forest-emerald text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        D{idx + 1}
                      </span>
                      <div className="space-y-0.5 flex-1">
                        <p className="font-bold text-brand-text">{dq.question}</p>
                        <p className="text-[11px] text-brand-muted">
                          Rationale: {dq.rationale} (Source: {dq.documentName}
                          {dq.pageOrSlide ? `, page/slide ${dq.pageOrSlide}` : ''})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION B: RECENT DEVELOPMENTS (5-8 items with clickable source) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sage flex items-center justify-center text-forest text-xs font-bold">
                B
              </div>
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-forest-emerald">
                Recent Developments (30-Day Pre-Meeting Window)
              </h3>
            </div>
            <span className="text-xs font-medium text-brand-muted">
              {briefing.recentDevelopments.length} verified developments
            </span>
          </div>

          <div className="space-y-3">
            {briefing.recentDevelopments.map((dev, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-sage-border hover:border-forest-emerald/40 transition-colors bg-white space-y-2 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <h4 className="text-sm font-bold text-forest leading-snug group-hover:text-forest-emerald transition-colors">
                    {dev.headline}
                  </h4>
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <span className="text-[11px] font-semibold text-brand-muted">
                      {dev.publishedDate || 'Recent'}
                    </span>
                    <a
                      href={dev.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-forest-emerald hover:underline"
                    >
                      <span>{dev.sourceTitle || 'Source'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <p className="text-xs text-brand-text leading-relaxed">{dev.description}</p>

                {dev.whyItMatters && (
                  <div className="pt-1 flex items-start gap-1.5 text-xs text-forest-emerald bg-sage-subtle px-3 py-1.5 rounded-lg border border-sage-border">
                    <span className="font-bold shrink-0">Why It Matters:</span>
                    <span>{dev.whyItMatters}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 2-COLUMN SECTION: C. WHAT THIS MEANS & D. DISCUSSION OPPORTUNITIES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* SECTION C: WHAT THIS MEANS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sage flex items-center justify-center text-forest text-xs font-bold">
                C
              </div>
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-forest-emerald">
                What This Means for the Meeting
              </h3>
            </div>

            <div className="space-y-2.5">
              {briefing.whatThisMeans.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-sage-subtle border border-sage-border text-xs text-brand-text leading-relaxed"
                >
                  <TrendingUp className="w-4 h-4 text-forest-emerald shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION D: DISCUSSION OPPORTUNITIES */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sage flex items-center justify-center text-forest text-xs font-bold">
                D
              </div>
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-forest-emerald">
                Discussion Opportunities (3 Specific Topics)
              </h3>
            </div>

            <div className="space-y-2.5">
              {briefing.discussionOpportunities.map((topic, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-sage-subtle border border-sage-border text-xs text-brand-text leading-relaxed"
                >
                  <Lightbulb className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                  <span>{topic}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION E: QUESTIONS TO ASK */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sage flex items-center justify-center text-forest text-xs font-bold">
              E
            </div>
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-forest-emerald">
              Questions to Ask During the Meeting
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {briefing.questionsToAsk.map((q, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-sage-border bg-white text-xs text-brand-text"
              >
                <span className="w-5 h-5 rounded-full bg-forest text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="font-medium leading-relaxed">{q}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION F: OPEN QUESTIONS & GAPS */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sage flex items-center justify-center text-forest text-xs font-bold">
              F
            </div>
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-forest-emerald">
              Open Questions & Information Gaps
            </h3>
          </div>

          <div className="p-4 rounded-2xl bg-sage-subtle border border-sage-border space-y-2 text-xs text-brand-text">
            {briefing.openQuestions.map((gap, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                <span>{gap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION G: SOURCES CITED & ATTRIBUTION */}
        <div className="space-y-4 pt-2 border-t border-sage-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sage flex items-center justify-center text-forest text-xs font-bold">
                G
              </div>
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-forest-emerald">
                Cited Sources & Source Attribution
              </h3>
            </div>
            <span className="text-xs text-brand-muted">{briefing.sources.length} sources indexed</span>
          </div>

          {/* Strict Separation Notice Requirement */}
          <div className="p-3 rounded-xl bg-sage-subtle border border-sage-border flex items-start gap-2.5 text-xs text-brand-muted">
            <ShieldCheck className="w-4 h-4 text-forest-emerald shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-forest">Attribution Separation: </span>
              <span>
                External web sources are verified independently through real-time news reporting. Any uploaded document statements reflect internal pitch materials and are never presented as independently verified public facts.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {briefing.sources.map((src, idx) => (
              <a
                key={idx}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl border border-sage-border hover:border-forest-emerald hover:bg-sage-subtle/50 transition-all flex items-center justify-between gap-2 group"
              >
                <div className="truncate">
                  <p className="font-bold text-forest truncate group-hover:text-forest-emerald">
                    {src.title || src.domain}
                  </p>
                  <p className="text-[10px] text-brand-muted truncate">{src.url}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-forest-emerald shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
