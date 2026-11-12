export type SubjectType = 'company' | 'person';
export type JobStatus = 'queued' | 'in_progress' | 'completed' | 'failed';

export interface ResearchWindow {
  startDate: string;
  endDate: string;
  daysCovered: number;
}

export interface ResearchLogEntry {
  timestamp: string;
  step: number;
  message: string;
  level: 'info' | 'success' | 'warn' | 'error';
}

export interface ResearchPlanQuery {
  category: string;
  query: string;
  rationale: string;
  sourceContext?: 'web_baseline' | 'document_driven';
}

export interface VerifiedFinding {
  id: string;
  title: string;
  url: string;
  content: string;
  snippet: string;
  publishedDate: string;
  isDateWithinWindow: boolean;
  category: string;
  domain: string;
  verificationNote: string;
  confidence: 'high' | 'medium' | 'unverified';
}

export interface RecentDevelopment {
  headline: string;
  publishedDate: string;
  description: string;
  whyItMatters: string;
  sourceUrl: string;
  sourceTitle: string;
  confidence: 'high' | 'medium' | 'unverified';
}

// -------------------------------------------------------------
// Document Intelligence Types
// -------------------------------------------------------------

export interface DocumentPage {
  pageNumber: number;
  text: string;
}

export interface KeyStatement {
  statement: string;
  pageOrSlide: number;
}

export interface DocumentMetadata {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  extension: string;
  uploadedAt: string;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  error?: string;
  isScannedPdf?: boolean;
  requiresOcr?: boolean;
  pageCount?: number;
}

export interface DocumentIntelligence {
  id: string;
  documentId: string;
  fileName: string;
  title: string;
  summary: string;
  headings: string[];
  people: string[];
  organizations: string[];
  products: string[];
  dates: string[];
  financials: string[];
  objectives: string[];
  competitors: string[];
  agendaItems: string[];
  keyStatements: KeyStatement[];
  pages: DocumentPage[];
  extractedAt: string;
}

export interface DocumentEvidenceItem {
  fileName: string;
  pageOrSlide: number;
  quote: string;
}

export interface DocumentToWebInsight {
  id: string;
  category: 'verified_claim' | 'recent_development' | 'contradiction_or_discrepancy' | 'change_since_document';
  title: string;
  documentEvidence: DocumentEvidenceItem;
  webFinding?: {
    headline: string;
    publisher: string;
    publishedDate: string;
    url: string;
    summary: string;
  };
  explanation: string;
  significance: 'high' | 'medium' | 'low';
}

export interface DocumentBasedQuestion {
  question: string;
  rationale: string;
  documentName: string;
  pageOrSlide?: number;
  requiresClarification: boolean;
}

export interface DocumentBriefingContext {
  documentsCount: number;
  documents: Array<{
    documentId: string;
    fileName: string;
    summary: string;
    objectives: string[];
    products: string[];
    stakeholders: string[];
    competitors: string[];
    financials: string[];
    isScannedPdf?: boolean;
    requiresOcr?: boolean;
  }>;
  insights: DocumentToWebInsight[];
  documentQuestions: DocumentBasedQuestion[];
}

export interface BriefingReport {
  id: string;
  researchJobId: string;
  subjectName: string;
  subjectType: SubjectType;
  meetingDate: string;
  meetingTime: string;
  meetingPurpose?: string;
  additionalContext?: string;
  researchWindow: ResearchWindow;
  createdAt: string;
  executiveSummary: string;
  recentDevelopments: RecentDevelopment[];
  whatThisMeans: string[];
  discussionOpportunities: string[];
  questionsToAsk: string[];
  openQuestions: string[];
  sources: Array<{
    title: string;
    url: string;
    publishedDate?: string;
    domain: string;
  }>;
  documentContext?: DocumentBriefingContext;
  generatedBy: 'ollama' | 'algorithmic_synthesis';
  ollamaModel?: string;
  isFallback: boolean;
}

export interface ResearchJob {
  id: string;
  subjectName: string;
  subjectType: SubjectType;
  meetingDate: string;
  meetingTime: string;
  meetingPurpose?: string;
  additionalContext?: string;
  documentIds?: string[];
  status: JobStatus;
  currentStep: number;
  currentStepName: string;
  progressPercent: number;
  currentActivity: string;
  researchWindow: ResearchWindow;
  plan?: ResearchPlanQuery[];
  findings?: VerifiedFinding[];
  documentEvidence?: DocumentIntelligence[];
  briefingId?: string;
  error?: string;
  logs: ResearchLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface SystemStatus {
  tavily: {
    configured: boolean;
    valid?: boolean;
    message?: string;
  };
  ollama: {
    running: boolean;
    baseUrl: string;
    availableModels: string[];
    selectedModel: string;
    message?: string;
  };
  storage: {
    status: 'ok' | 'error';
    briefingsCount: number;
    jobsCount: number;
    documentsCount?: number;
  };
}
