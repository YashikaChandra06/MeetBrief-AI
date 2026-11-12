import { v4 as uuidv4 } from 'uuid';
import {
  BriefingReport,
  DocumentIntelligence,
  ResearchJob,
  ResearchLogEntry,
  SubjectType,
  VerifiedFinding,
} from '../types/index.js';
import { calculateResearchWindow } from '../utils/dateUtils.js';
import { sanitizeInput } from '../utils/sanitize.js';
import { ollamaService } from './ollamaService.js';
import { storage } from './storageService.js';
import { tavilyService } from './tavilyService.js';

export class ResearchPipeline {
  /**
   * Initializes a new research job and queues it asynchronously.
   */
  public async createJob(params: {
    subjectName: string;
    subjectType: SubjectType;
    meetingDate: string;
    meetingTime?: string;
    meetingPurpose?: string;
    additionalContext?: string;
    documentIds?: string[];
  }): Promise<ResearchJob> {
    const cleanSubject = sanitizeInput(params.subjectName);
    if (!cleanSubject) {
      throw new Error('Subject name is required');
    }

    const meetingDate = params.meetingDate;
    const meetingTime = params.meetingTime || '09:00';
    const researchWindow = calculateResearchWindow(meetingDate);

    const job: ResearchJob = {
      id: uuidv4(),
      subjectName: cleanSubject,
      subjectType: params.subjectType,
      meetingDate,
      meetingTime,
      meetingPurpose: sanitizeInput(params.meetingPurpose),
      additionalContext: sanitizeInput(params.additionalContext),
      documentIds: params.documentIds || [],
      status: 'queued',
      currentStep: 1,
      currentStepName: 'Understanding meeting context',
      progressPercent: 5,
      currentActivity: 'Initializing autonomous meeting analysis...',
      researchWindow,
      logs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storage.saveJob(job);

    // Kick off asynchronous execution
    setImmediate(() => {
      this.executeJob(job.id).catch((err) => {
        console.error(`Error in research job ${job.id}:`, err);
      });
    });

    return job;
  }

  private addLog(
    job: ResearchJob,
    step: number,
    message: string,
    level: 'info' | 'success' | 'warn' | 'error' = 'info'
  ): void {
    const entry: ResearchLogEntry = {
      timestamp: new Date().toISOString(),
      step,
      message,
      level,
    };
    job.logs.push(entry);
  }

  /**
   * Full 7-step autonomous execution loop.
   */
  public async executeJob(jobId: string): Promise<void> {
    const job = storage.getJob(jobId);
    if (!job) return;

    try {
      job.status = 'in_progress';

      // ==========================================
      // STEP 1: UNDERSTAND THE MEETING & LOAD DOCUMENTS
      // ==========================================
      job.currentStep = 1;
      job.currentStepName = 'Understanding meeting context';
      job.progressPercent = 14;
      job.currentActivity = `Analyzing subject "${job.subjectName}" (${job.subjectType}) for meeting scheduled on ${job.meetingDate}`;
      this.addLog(
        job,
        1,
        `Defined 30-day pre-meeting research window: ${job.researchWindow.startDate} to ${job.researchWindow.endDate}`,
        'info'
      );
      if (job.meetingPurpose) {
        this.addLog(job, 1, `Targeting meeting purpose: "${job.meetingPurpose}"`, 'info');
      }

      // Load attached meeting documents if any
      const documentEvidence: DocumentIntelligence[] = [];
      if (job.documentIds && job.documentIds.length > 0) {
        for (const docId of job.documentIds) {
          const intel = storage.getIntelligence(docId);
          if (intel) {
            documentEvidence.push(intel);
          }
        }
        job.documentEvidence = documentEvidence;
        if (documentEvidence.length > 0) {
          this.addLog(
            job,
            1,
            `Loaded ${documentEvidence.length} uploaded meeting document(s): ${documentEvidence
              .map((d) => d.fileName)
              .join(', ')}`,
            'success'
          );
        }
      }

      storage.saveJob(job);
      await this.sleep(400);

      // ==========================================
      // STEP 2: CREATE A RESEARCH PLAN (WITH DOCUMENT CONTEXT)
      // ==========================================
      job.currentStep = 2;
      job.currentStepName = 'Creating research plan';
      job.progressPercent = 28;
      job.currentActivity = `Generating targeted search vectors for ${job.subjectType}${
        documentEvidence.length > 0 ? ' (incorporating document intelligence)' : ''
      }`;

      // Standard baseline plan
      const plan = tavilyService.generateResearchPlan(
        job.subjectName,
        job.subjectType,
        job.meetingPurpose,
        job.researchWindow
      );

      // Add document-driven queries if documents were uploaded
      if (documentEvidence.length > 0) {
        const docQueries = tavilyService.generateDocumentResearchQueries(
          job.subjectName,
          documentEvidence
        );
        if (docQueries.length > 0) {
          plan.push(...docQueries);
          this.addLog(
            job,
            2,
            `Generated ${docQueries.length} targeted queries to cross-reference products, claims, and competitor dynamics from uploaded documents`,
            'info'
          );
        }
      }

      job.plan = plan;
      this.addLog(
        job,
        2,
        `Formulated ${plan.length} targeted search queries across categories: ${plan
          .map((p) => p.category)
          .join(', ')}`,
        'success'
      );
      storage.saveJob(job);
      await this.sleep(400);

      // ==========================================
      // STEP 3: TAVILY RESEARCH
      // ==========================================
      job.currentStep = 3;
      job.currentStepName = 'Searching the web';
      job.progressPercent = 42;
      job.currentActivity = `Executing multi-angle Tavily research for ${job.subjectName}`;
      this.addLog(
        job,
        3,
        `Connecting to Tavily Search API with 30-day freshness parameter...`,
        'info'
      );

      const allRawResults = [];
      for (const item of plan) {
        try {
          this.addLog(job, 3, `Searching: "${item.query}" (${item.category})`, 'info');
          const results = await tavilyService.executeSearch(item.query, item.category);
          allRawResults.push(...results);
          this.addLog(
            job,
            3,
            `Retrieved ${results.length} sources for category "${item.category}"`,
            'info'
          );
        } catch (searchErr: any) {
          this.addLog(
            job,
            3,
            `Search query "${item.query}" note: ${searchErr.message || 'Check Tavily key'}`,
            'warn'
          );
        }
      }

      if (allRawResults.length === 0) {
        this.addLog(
          job,
          3,
          'No external web results returned. Please verify TAVILY_API_KEY in Settings or .env.',
          'warn'
        );
      }
      storage.saveJob(job);
      await this.sleep(400);

      // ==========================================
      // STEP 4: EXTRACT INFORMATION
      // ==========================================
      job.currentStep = 4;
      job.currentStepName = 'Extracting information';
      job.progressPercent = 56;
      job.currentActivity = `Extracting key text snippets and source metadata from ${allRawResults.length} articles`;

      const candidateUrls = allRawResults.slice(0, 3).map((r) => r.url);
      if (candidateUrls.length > 0) {
        this.addLog(job, 4, `Extracting deep content from primary sources...`, 'info');
        const extracted = await tavilyService.extractUrls(candidateUrls);
        const extractedCount = Object.keys(extracted).length;
        if (extractedCount > 0) {
          this.addLog(job, 4, `Successfully extracted full content from ${extractedCount} primary URLs`, 'success');
        }
      }
      storage.saveJob(job);
      await this.sleep(400);

      // ==========================================
      // STEP 5: VERIFY FINDINGS
      // ==========================================
      job.currentStep = 5;
      job.currentStepName = 'Verifying findings';
      job.progressPercent = 70;
      job.currentActivity = `Deduplicating articles and verifying publication dates against ${job.researchWindow.startDate} - ${job.researchWindow.endDate}`;

      const verified = tavilyService.verifyAndDeduplicate(allRawResults, job.researchWindow);
      job.findings = verified;
      this.addLog(
        job,
        5,
        `Verified and deduplicated into ${verified.length} unique sources (High confidence: ${
          verified.filter((v) => v.confidence === 'high').length
        })`,
        'success'
      );
      storage.saveJob(job);
      await this.sleep(400);

      // ==========================================
      // STEP 6: ANALYZE DEVELOPMENTS & CORRELATE WITH DOCUMENTS
      // ==========================================
      job.currentStep = 6;
      job.currentStepName = 'Analyzing developments';
      job.progressPercent = 84;
      job.currentActivity = `Synthesizing intelligence${
        documentEvidence.length > 0 ? ' and cross-referencing document claims' : ''
      }...`;

      const ollamaStatus = await ollamaService.getStatus();
      let briefingContent: Partial<BriefingReport>;
      let generatedBy: 'ollama' | 'algorithmic_synthesis' = 'algorithmic_synthesis';
      let modelUsed: string | undefined = undefined;
      let isFallback = false;

      if (ollamaStatus.running && ollamaStatus.selectedModel) {
        try {
          this.addLog(
            job,
            6,
            `Synthesizing briefing using local model: "${ollamaStatus.selectedModel}" on Ollama...`,
            'info'
          );
          const llmResult = await ollamaService.generateBriefingWithLLM({
            subjectName: job.subjectName,
            subjectType: job.subjectType,
            meetingDate: job.meetingDate,
            meetingTime: job.meetingTime,
            meetingPurpose: job.meetingPurpose,
            additionalContext: job.additionalContext,
            researchWindow: job.researchWindow,
            findings: verified,
            documentEvidence,
          });
          briefingContent = llmResult.briefing;
          generatedBy = 'ollama';
          modelUsed = llmResult.modelUsed;
          this.addLog(job, 6, `AI synthesis completed successfully via ${modelUsed}`, 'success');
        } catch (llmErr: any) {
          this.addLog(
            job,
            6,
            `Local LLM inference encountered error (${llmErr.message}). Engaging transparent algorithmic synthesis.`,
            'warn'
          );
          briefingContent = ollamaService.generateFallbackBriefing({
            subjectName: job.subjectName,
            subjectType: job.subjectType,
            meetingDate: job.meetingDate,
            meetingTime: job.meetingTime,
            meetingPurpose: job.meetingPurpose,
            additionalContext: job.additionalContext,
            researchWindow: job.researchWindow,
            findings: verified,
            documentEvidence,
          });
          isFallback = true;
        }
      } else {
        this.addLog(
          job,
          6,
          `Ollama is not running locally (${ollamaStatus.message || 'offline'}). Utilizing transparent factual synthesis.`,
          'warn'
        );
        briefingContent = ollamaService.generateFallbackBriefing({
          subjectName: job.subjectName,
          subjectType: job.subjectType,
          meetingDate: job.meetingDate,
          meetingTime: job.meetingTime,
          meetingPurpose: job.meetingPurpose,
          additionalContext: job.additionalContext,
          researchWindow: job.researchWindow,
          findings: verified,
          documentEvidence,
        });
        isFallback = true;
      }
      storage.saveJob(job);
      await this.sleep(400);

      // ==========================================
      // STEP 7: GENERATE THE BRIEFING
      // ==========================================
      job.currentStep = 7;
      job.currentStepName = 'Generating briefing';
      job.progressPercent = 100;
      job.currentActivity = 'Formatting executive one-page briefing report...';

      // Deduplicate and format sources
      const uniqueSources = Array.from(
        new Map(
          verified.map((f) => [
            f.url,
            {
              title: f.title,
              url: f.url,
              publishedDate: f.publishedDate,
              domain: f.domain,
            },
          ])
        ).values()
      );

      const briefingId = uuidv4();
      const briefing: BriefingReport = {
        id: briefingId,
        researchJobId: job.id,
        subjectName: job.subjectName,
        subjectType: job.subjectType,
        meetingDate: job.meetingDate,
        meetingTime: job.meetingTime,
        meetingPurpose: job.meetingPurpose,
        additionalContext: job.additionalContext,
        researchWindow: job.researchWindow,
        createdAt: new Date().toISOString(),
        executiveSummary:
          briefingContent.executiveSummary ||
          `Pre-meeting executive intelligence briefing for ${job.subjectName}.`,
        recentDevelopments: briefingContent.recentDevelopments || [],
        whatThisMeans: briefingContent.whatThisMeans || [
          `Key strategic developments documented leading into the ${job.meetingDate} meeting.`,
        ],
        discussionOpportunities: briefingContent.discussionOpportunities || [
          `Recent product and operational roadmap items.`,
          `Synergies and joint priorities.`,
        ],
        questionsToAsk: briefingContent.questionsToAsk || [
          `What are your primary strategic focus areas for the upcoming quarter?`,
        ],
        openQuestions: briefingContent.openQuestions || [
          `Unpublished metrics or internal organizational details.`,
        ],
        sources: uniqueSources,
        documentContext: briefingContent.documentContext,
        generatedBy,
        ollamaModel: modelUsed,
        isFallback,
      };

      storage.saveBriefing(briefing);

      job.briefingId = briefingId;
      job.status = 'completed';
      job.currentActivity = 'Briefing generated successfully!';
      this.addLog(job, 7, `Briefing report #${briefingId} is ready to view and export.`, 'success');
      storage.saveJob(job);
    } catch (err: any) {
      job.status = 'failed';
      job.error = err.message || 'An unexpected error occurred during research execution.';
      this.addLog(job, job.currentStep, `Research failure: ${job.error}`, 'error');
      storage.saveJob(job);
    }
  }

  /**
   * Regenerates an existing briefing with the latest LLM or prompt parameters.
   */
  public async regenerateBriefing(briefingId: string): Promise<BriefingReport> {
    const existing = storage.getBriefing(briefingId);
    if (!existing) {
      throw new Error(`Briefing ${briefingId} not found`);
    }

    const job = storage.getJob(existing.researchJobId);
    const findings: VerifiedFinding[] = job?.findings || [];
    const documentEvidence: DocumentIntelligence[] = job?.documentEvidence || [];

    const ollamaStatus = await ollamaService.getStatus();
    let briefingContent: Partial<BriefingReport>;
    let generatedBy: 'ollama' | 'algorithmic_synthesis' = 'algorithmic_synthesis';
    let modelUsed: string | undefined = undefined;
    let isFallback = false;

    if (ollamaStatus.running && ollamaStatus.selectedModel) {
      try {
        const llmResult = await ollamaService.generateBriefingWithLLM({
          subjectName: existing.subjectName,
          subjectType: existing.subjectType,
          meetingDate: existing.meetingDate,
          meetingTime: existing.meetingTime,
          meetingPurpose: existing.meetingPurpose,
          additionalContext: existing.additionalContext,
          researchWindow: existing.researchWindow,
          findings,
          documentEvidence,
        });
        briefingContent = llmResult.briefing;
        generatedBy = 'ollama';
        modelUsed = llmResult.modelUsed;
      } catch (err) {
        briefingContent = ollamaService.generateFallbackBriefing({
          subjectName: existing.subjectName,
          subjectType: existing.subjectType,
          meetingDate: existing.meetingDate,
          meetingTime: existing.meetingTime,
          meetingPurpose: existing.meetingPurpose,
          additionalContext: existing.additionalContext,
          researchWindow: existing.researchWindow,
          findings,
          documentEvidence,
        });
        isFallback = true;
      }
    } else {
      briefingContent = ollamaService.generateFallbackBriefing({
        subjectName: existing.subjectName,
        subjectType: existing.subjectType,
        meetingDate: existing.meetingDate,
        meetingTime: existing.meetingTime,
        meetingPurpose: existing.meetingPurpose,
        additionalContext: existing.additionalContext,
        researchWindow: existing.researchWindow,
        findings,
        documentEvidence,
      });
      isFallback = true;
    }

    const updated: BriefingReport = {
      ...existing,
      executiveSummary: briefingContent.executiveSummary || existing.executiveSummary,
      recentDevelopments: briefingContent.recentDevelopments || existing.recentDevelopments,
      whatThisMeans: briefingContent.whatThisMeans || existing.whatThisMeans,
      discussionOpportunities:
        briefingContent.discussionOpportunities || existing.discussionOpportunities,
      questionsToAsk: briefingContent.questionsToAsk || existing.questionsToAsk,
      openQuestions: briefingContent.openQuestions || existing.openQuestions,
      documentContext: briefingContent.documentContext || existing.documentContext,
      generatedBy,
      ollamaModel: modelUsed,
      isFallback,
    };

    storage.saveBriefing(updated);
    return updated;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const researchPipeline = new ResearchPipeline();
