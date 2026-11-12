import React, { useState, useMemo, useRef } from 'react';
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
  UploadCloud,
  File,
  X,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentMetadata, SubjectType, SystemStatus } from '../types';

interface NewResearchPageProps {
  systemStatus: SystemStatus | null;
  onJobStarted: (jobId: string) => void;
  onNavigateSettings: () => void;
}

interface UploadedFileState {
  file: File;
  id?: string;
  name: string;
  size: number;
  extension: string;
  progress: number;
  status: 'uploading' | 'uploaded' | 'processing' | 'processed' | 'error';
  error?: string;
  isScannedPdf?: boolean;
  pageCount?: number;
}

export const NewResearchPage: React.FC<NewResearchPageProps> = ({
  systemStatus,
  onJobStarted,
  onNavigateSettings,
}) => {
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

  // Documents state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Format file size nicely
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.pptx', '.txt'];
  const MAX_FILES = 5;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const validateAndUploadFiles = async (files: File[]) => {
    setDocError(null);

    if (uploadedFiles.length + files.length > MAX_FILES) {
      setDocError(`Maximum ${MAX_FILES} documents allowed per research request.`);
      return;
    }

    const validFiles: File[] = [];
    for (const f of files) {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setDocError(`Unsupported file format "${f.name}". Supported: PDF, DOCX, DOC, PPTX, TXT.`);
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        setDocError(`File "${f.name}" exceeds the 10 MB limit (${formatSize(f.size)}).`);
        return;
      }
      validFiles.push(f);
    }

    if (validFiles.length === 0) return;

    // Create placeholder entries
    const newItems: UploadedFileState[] = validFiles.map((file) => ({
      file,
      name: file.name,
      size: file.size,
      extension: '.' + file.name.split('.').pop()?.toLowerCase(),
      progress: 15,
      status: 'uploading',
    }));

    setUploadedFiles((prev) => [...prev, ...newItems]);

    try {
      const response = await api.uploadDocuments(validFiles, (pct) => {
        setUploadedFiles((prev) =>
          prev.map((item) => {
            const isTarget = validFiles.some((vf) => vf.name === item.name);
            return isTarget ? { ...item, progress: Math.min(90, pct) } : item;
          })
        );
      });

      if (response.success && response.documents) {
        setUploadedFiles((prev) =>
          prev.map((item) => {
            const matched = response.documents.find((d) => d.originalName === item.name);
            if (matched) {
              return {
                ...item,
                id: matched.id,
                progress: 100,
                status: matched.status,
                error: matched.error,
                isScannedPdf: matched.isScannedPdf,
                pageCount: matched.pageCount,
              };
            }
            return item;
          })
        );
      }
    } catch (uploadErr: any) {
      setDocError(uploadErr.message || 'Failed to upload documents');
      setUploadedFiles((prev) =>
        prev.map((item) => {
          const isTarget = validFiles.some((vf) => vf.name === item.name);
          return isTarget
            ? { ...item, status: 'error', error: uploadErr.message || 'Upload error' }
            : item;
        })
      );
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      validateAndUploadFiles(filesArray);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      validateAndUploadFiles(filesArray);
    }
  };

  const handleRemoveFile = async (name: string, docId?: string) => {
    setUploadedFiles((prev) => prev.filter((item) => item.name !== name));
    if (docId) {
      try {
        await api.deleteDocument(docId);
      } catch (err) {
        console.warn('Failed to delete document from backend storage:', err);
      }
    }
  };

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

    // Check if any file is still uploading
    const stillUploading = uploadedFiles.some(
      (f) => f.status === 'uploading' || f.status === 'processing'
    );
    if (stillUploading) {
      setError('Please wait for uploaded documents to finish extracting before starting research.');
      return;
    }

    setLoading(true);
    setError(null);

    // Collect valid document IDs
    const documentIds = uploadedFiles
      .filter((f) => f.id && f.status === 'processed')
      .map((f) => f.id as string);

    try {
      const res = await api.startResearch({
        subjectName: subjectName.trim(),
        subjectType,
        meetingDate,
        meetingTime,
        meetingPurpose: meetingPurpose.trim() || undefined,
        additionalContext: additionalContext.trim() || undefined,
        documentIds: documentIds.length > 0 ? documentIds : undefined,
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
          Provide your upcoming meeting details and optional pitch decks, agendas, or whitepapers. MeetBrief AI will autonomously scour the preceding 30 days of real-world developments, cross-reference document claims, and synthesize a single-page briefing.
        </p>
      </div>

      {!systemStatus?.tavily?.configured && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-900">Tavily API Key Not Configured</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              To fetch live verified web results, please configure your free Tavily key in Settings.
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
              <span>Calculated strictly 30 days prior to scheduled meeting date:</span>
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

        {/* 6. UPLOAD MEETING DOCUMENTS (OPTIONAL) - SECTION REQUIREMENT */}
        <div className="pt-2 border-t border-sage-border space-y-3">
          <div>
            <label className="block text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-forest-emerald" />
              <span>UPLOAD MEETING DOCUMENTS (OPTIONAL)</span>
            </label>
            <p className="text-xs text-brand-muted mt-0.5">
              Upload documents to give MeetBrief additional context for more relevant and personalized research.
            </p>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all bg-white flex flex-col items-center justify-center gap-2.5 ${
              isDragging
                ? 'border-forest-emerald bg-sage-subtle scale-[1.01]'
                : 'border-forest-emerald/50 hover:border-forest-emerald'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-sage flex items-center justify-center text-forest">
              <UploadCloud className="w-6 h-6 text-forest-emerald" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-brand-text">
                Drag and drop your meeting files here, or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-forest-emerald font-bold hover:underline"
                >
                  browse files
                </button>
              </p>
              <p className="text-[11px] text-brand-muted">
                Supports PDF (.pdf), Word (.docx, .doc), PowerPoint (.pptx), and Plain Text (.txt)
              </p>
              <p className="text-[10px] text-brand-muted/70 font-medium">
                Max 5 files • Up to 10 MB per file
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.pptx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {docError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{docError}</span>
            </div>
          )}

          {/* Uploaded Documents List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wider block">
                Attached Files ({uploadedFiles.length}/{MAX_FILES})
              </span>

              <div className="space-y-2">
                {uploadedFiles.map((item) => (
                  <div
                    key={item.name}
                    className="p-3 rounded-xl border border-sage-border bg-white flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-sage flex items-center justify-center text-forest shrink-0">
                        <File className="w-4 h-4 text-forest-emerald" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-brand-text truncate">{item.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-brand-muted mt-0.5">
                          <span>{formatSize(item.size)}</span>
                          <span>•</span>
                          <span className="uppercase text-[10px] font-bold px-1.5 py-0.2 rounded bg-sage-subtle">
                            {item.extension.replace('.', '')}
                          </span>
                          {item.pageCount && (
                            <>
                              <span>•</span>
                              <span>{item.pageCount} pages/slides</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Status pill */}
                      {item.status === 'uploading' && (
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Uploading {item.progress}%</span>
                        </span>
                      )}

                      {item.status === 'processing' && (
                        <span className="text-[11px] font-semibold text-forest bg-sage px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin text-forest-emerald" />
                          <span>Extracting Text...</span>
                        </span>
                      )}

                      {item.status === 'processed' && (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Extracted</span>
                        </span>
                      )}

                      {item.isScannedPdf && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Scanned (OCR Req)</span>
                        </span>
                      )}

                      {item.status === 'error' && (
                        <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>Extraction Error</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.name, item.id)}
                        className="p-1.5 text-brand-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
