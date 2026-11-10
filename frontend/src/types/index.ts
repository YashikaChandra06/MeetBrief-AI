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
  status: JobStatus;
  currentStep: number;
  currentStepName: string;
  progressPercent: number;
  currentActivity: string;
  researchWindow: ResearchWindow;
  plan?: ResearchPlanQuery[];
  findings?: VerifiedFinding[];
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
  };
}

