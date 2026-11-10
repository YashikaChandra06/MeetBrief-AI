import { config } from '../config.js';
import {
  BriefingReport,
  RecentDevelopment,
  ResearchWindow,
  SubjectType,
  VerifiedFinding,
} from '../types/index.js';

interface OllamaTagResponse {
  models?: Array<{
    name: string;
    model?: string;
    modified_at?: string;
    size?: number;
  }>;
}

interface OllamaGenerateResponse {
  model?: string;
  response?: string;
  done?: boolean;
}

export class OllamaService {
  /**
   * Checks whether Ollama is running and retrieves list of installed models.
   */
  public async getStatus(baseUrlOverride?: string): Promise<{
    running: boolean;
    baseUrl: string;
    availableModels: string[];
    selectedModel: string;
    message?: string;
  }> {
    const baseUrl = baseUrlOverride || config.getOllamaBaseUrl();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          running: false,
          baseUrl,
          availableModels: [],
          selectedModel: '',
          message: `Ollama returned status ${res.status}`,
        };
      }

      const data = (await res.json()) as OllamaTagResponse;
      const models = (data.models || []).map((m) => m.name);

      let selected = config.getOllamaModel();
      if (!selected || !models.includes(selected)) {
        // Pick best matching model
        selected = this.selectBestModel(models);
      }

      return {
        running: true,
        baseUrl,
        availableModels: models,
        selectedModel: selected,
        message:
          models.length > 0
            ? `Ollama is running with ${models.length} model(s) available.`
            : 'Ollama is running, but no models are installed yet. Run "ollama run qwen2.5:3b" or "ollama run llama3.2".',
      };
    } catch (err: any) {
      return {
        running: false,
        baseUrl,
        availableModels: [],
        selectedModel: '',
        message: 'Ollama is not running locally on ' + baseUrl,
      };
    }
  }

  private selectBestModel(models: string[]): string {
    if (models.length === 0) return '';
    const preferences = ['qwen2.5', 'llama3.2', 'llama3', 'mistral', 'gemma2', 'phi3'];
    for (const pref of preferences) {
      const match = models.find((m) => m.toLowerCase().includes(pref));
      if (match) return match;
    }
    return models[0];
  }

  /**
   * Synthesizes findings using Ollama into a structured briefing JSON.
   */
  public async generateBriefingWithLLM(params: {
    subjectName: string;
    subjectType: SubjectType;
    meetingDate: string;
    meetingTime: string;
    meetingPurpose?: string;
    additionalContext?: string;
    researchWindow: ResearchWindow;
    findings: VerifiedFinding[];
  }): Promise<{ briefing: Partial<BriefingReport>; modelUsed: string }> {
    const status = await this.getStatus();
    if (!status.running || !status.selectedModel) {
      throw new Error(
        `Ollama is not available (${status.message || 'not reachable'}). Running fallback research synthesis.`
      );
    }

    const model = status.selectedModel;
    const prompt = this.buildPrompt(params);

    const controller = new AbortController();
    // 60-second timeout for local LLM inference
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const res = await fetch(`${status.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.2, // low temperature for high fidelity factual analysis
            top_p: 0.9,
          },
        }),
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Ollama generation error (${res.status}): ${text}`);
      }

      const data = (await res.json()) as OllamaGenerateResponse;
      if (!data.response) {
        throw new Error('Ollama returned empty response');
      }

      const parsed = JSON.parse(data.response);
      return {
        briefing: parsed,
        modelUsed: model,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Ollama LLM generation failed:', err.message);
      throw err;
    }
  }

  private buildPrompt(params: {
    subjectName: string;
    subjectType: SubjectType;
    meetingDate: string;
    meetingTime: string;
    meetingPurpose?: string;
    additionalContext?: string;
    researchWindow: ResearchWindow;
    findings: VerifiedFinding[];
  }): string {
    const {
      subjectName,
      subjectType,
      meetingDate,
      meetingTime,
      meetingPurpose,
      additionalContext,
      researchWindow,
      findings,
    } = params;

    // Build verified findings text block
    const findingsList = findings
      .slice(0, 15)
      .map(
        (f, i) => `[ITEM ${i + 1}]
Headline: ${f.title}
Published Date: ${f.publishedDate}
Source URL: ${f.url}
Domain: ${f.domain}
Snippet: ${f.snippet}
Verification Note: ${f.verificationNote}
`
      )
      .join('\n');

    return `You are MeetBrief AI, an elite executive intelligence analyst preparing an authoritative one-page pre-meeting briefing.
Strict Rules:
1. ONLY utilize the provided factual findings below.
2. NEVER invent sources, fake publication dates, or hallucinate URLs. Every cited development MUST reference a valid Source URL from the items.
3. Align insights to the scheduled meeting date: ${meetingDate} (${meetingTime}).
4. Research window: strictly ${researchWindow.startDate} to ${researchWindow.endDate} (preceding 30 days).
5. Output MUST be valid JSON matching the exact schema below.

SUBJECT: ${subjectName} (${subjectType.toUpperCase()})
MEETING PURPOSE: ${meetingPurpose || 'General strategic & exploratory meeting'}
ADDITIONAL CONTEXT: ${additionalContext || 'None provided'}

VERIFIED RECENT RESEARCH FINDINGS:
${findingsList}

Return ONLY a JSON object with this EXACT structure:
{
  "executiveSummary": "A concise 2-3 paragraph executive overview of the subject's current situation, momentum, and key developments leading into this meeting.",
  "recentDevelopments": [
    {
      "headline": "Clear, concise headline of the event",
      "publishedDate": "Date as reported or 'Recent'",
      "description": "Factual 1-2 sentence description of what occurred",
      "whyItMatters": "Strategic significance for the upcoming meeting",
      "sourceUrl": "EXACT URL from the findings list",
      "sourceTitle": "Name of source publication",
      "confidence": "high"
    }
  ],
  "whatThisMeans": [
    "Implication 1 regarding the meeting agenda",
    "Implication 2 regarding leverage or mutual interest",
    "Implication 3 regarding timing or competitive urgency"
  ],
  "discussionOpportunities": [
    "Specific topic 1 worth raising during the conversation",
    "Specific topic 2 worth raising during the conversation",
    "Specific topic 3 worth raising during the conversation"
  ],
  "questionsToAsk": [
    "Sharp, context-aware question 1",
    "Sharp, context-aware question 2",
    "Sharp, context-aware question 3",
    "Sharp, context-aware question 4",
    "Sharp, context-aware question 5"
  ],
  "openQuestions": [
    "Information gap 1 (e.g. unverified metrics, undisclosed terms, or pending announcements)",
    "Information gap 2"
  ]
}`;
  }

  /**
   * Transparent Algorithmic Fallback Synthesis.
   * Runs when Ollama is offline or local LLM inference is unavailable.
   * Produces an accurate, non-hallucinated briefing directly from Tavily verified findings.
   */
  public generateFallbackBriefing(params: {
    subjectName: string;
    subjectType: SubjectType;
    meetingDate: string;
    meetingTime: string;
    meetingPurpose?: string;
    additionalContext?: string;
    researchWindow: ResearchWindow;
    findings: VerifiedFinding[];
  }): Partial<BriefingReport> {
    const { subjectName, subjectType, meetingDate, meetingPurpose, researchWindow, findings } =
      params;

    const developments: RecentDevelopment[] = findings.slice(0, 7).map((f) => ({
      headline: f.title,
      publishedDate: f.publishedDate,
      description: f.snippet || f.content.slice(0, 180),
      whyItMatters: `Directly impacts ${subjectName}'s ${f.category} profile ahead of the ${meetingDate} meeting.`,
      sourceUrl: f.url,
      sourceTitle: f.domain,
      confidence: f.confidence,
    }));

    const execSummary = `This briefing covers ${subjectName} (${subjectType}) for the scheduled meeting on ${meetingDate}. Real-time web intelligence was autonomously gathered across the 30-day window from ${researchWindow.startDate} to ${researchWindow.endDate}. ${
      findings.length > 0
        ? `Identified ${findings.length} verified news and development signals across industry publications, announcements, and recent reporting.`
        : `Limited public signals were indexed during this 30-day period.`
    } ${
      meetingPurpose
        ? `Focus was oriented around the stated objective: "${meetingPurpose}".`
        : ''
    }`;

    const whatThisMeans = [
      `${subjectName} has demonstrated active momentum across ${
        Array.from(new Set(findings.map((f) => f.category))).join(', ') || 'multiple domains'
      } in the last 30 days.`,
      `Recent news coverage provides actionable conversation anchors for the ${meetingDate} discussion.`,
      meetingPurpose
        ? `Align meeting discussions with stated goal "${meetingPurpose}" against these verified developments.`
        : `Review published announcements prior to the meeting to identify collaborative opportunities.`,
    ];

    const discussionOpportunities = [
      `Recent announcements and public updates reported by ${
        findings[0]?.domain || 'industry sources'
      }.`,
      `Strategic plans and operational developments initiated in the 30-day pre-meeting window.`,
      meetingPurpose
        ? `Next steps and mutual objectives regarding ${meetingPurpose}.`
        : `Exploring strategic collaboration areas and alignment for upcoming quarters.`,
    ];

    const questionsToAsk = [
      `How have the recent developments reported in ${findings[0]?.domain || 'the press'} influenced your priorities for this quarter?`,
      `What are the key milestones your team is aiming to achieve following these latest announcements?`,
      `How does your current strategy address the emerging industry trends observed over the past 30 days?`,
      `Are there any recent internal changes or roadmap adjustments that aren't yet reflected publicly?`,
      `What would make this meeting and any potential follow-up collaboration a definitive success for you?`,
    ];

    const openQuestions = [
      `Confirmation of exact timelines for recently announced initiatives.`,
      `Details on unpublicized metrics, partnerships, or internal organizational structure.`,
    ];

    return {
      executiveSummary: execSummary,
      recentDevelopments: developments,
      whatThisMeans,
      discussionOpportunities,
      questionsToAsk,
      openQuestions,
    };
  }
}

export const ollamaService = new OllamaService();

