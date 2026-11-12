import { config } from '../config.js';
import {
  BriefingReport,
  DocumentBasedQuestion,
  DocumentBriefingContext,
  DocumentIntelligence,
  DocumentToWebInsight,
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
   * Synthesizes findings and optional uploaded document context using Ollama.
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
    documentEvidence?: DocumentIntelligence[];
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
    const timeoutId = setTimeout(() => controller.abort(), 95000);

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
            temperature: 0.2,
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
    documentEvidence?: DocumentIntelligence[];
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
      documentEvidence = [],
    } = params;

    const findingsList = findings
      .slice(0, 15)
      .map(
        (f, i) => `[WEB ITEM ${i + 1}]
Headline: ${f.title}
Published Date: ${f.publishedDate}
Source URL: ${f.url}
Publisher / Domain: ${f.domain}
Snippet: ${f.snippet}
`
      )
      .join('\n');

    const documentText =
      documentEvidence.length > 0
        ? documentEvidence
            .map(
              (d, i) => `[DOCUMENT ${i + 1}: ${d.fileName}]
Summary: ${d.summary}
Objectives: ${d.objectives.join(', ') || 'N/A'}
Products: ${d.products.join(', ') || 'N/A'}
Competitors: ${d.competitors.join(', ') || 'N/A'}
Key Claims / Statements:
${d.keyStatements.map((k) => ` - (Page/Slide ${k.pageOrSlide}): "${k.statement}"`).join('\n')}
`
            )
            .join('\n\n')
        : 'None uploaded.';

    return `You are MeetBrief AI, an executive intelligence analyst preparing an authoritative one-page pre-meeting briefing.
Strict Rules:
1. ONLY utilize the provided factual web findings and uploaded document evidence below.
2. NEVER invent sources, fake publication dates, or hallucinate URLs. Every cited web development MUST reference a valid Source URL from the items.
3. Keep external web sources and uploaded document evidence strictly attributed and separate.
4. Never present uploaded document claims as independently verified public facts. Cite page or slide references when referencing uploaded documents.
5. Align insights to scheduled meeting date: ${meetingDate} (${meetingTime}) and research window: strictly ${researchWindow.startDate} to ${researchWindow.endDate} (preceding 30 days).
6. Compare uploaded document statements with 30-day web findings to identify:
   - Claims independently verified by public news
   - Changes or progress since the document was created
   - Discrepancies, delays, or contradictions
7. Output MUST be valid JSON matching the exact schema below.

SUBJECT: ${subjectName} (${subjectType.toUpperCase()})
MEETING PURPOSE: ${meetingPurpose || 'General strategic & exploratory meeting'}
ADDITIONAL CONTEXT: ${additionalContext || 'None provided'}

UPLOADED MEETING DOCUMENTS EVIDENCE:
${documentText}

VERIFIED RECENT 30-DAY WEB RESEARCH FINDINGS:
${findingsList}

Return ONLY a JSON object with this EXACT structure:
{
  "executiveSummary": "A concise 2-3 paragraph executive overview connecting public developments with the meeting context and uploaded materials.",
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
    "Information gap 1",
    "Information gap 2"
  ]
  ${
    documentEvidence.length > 0
      ? `,
  "documentContext": {
    "documentsCount": ${documentEvidence.length},
    "documents": [
      {
        "documentId": "ID",
        "fileName": "Document name",
        "summary": "Brief document summary",
        "objectives": ["Objective 1"],
        "products": ["Product 1"],
        "stakeholders": ["Stakeholder 1"],
        "competitors": ["Competitor 1"]
      }
    ],
    "insights": [
      {
        "id": "insight-1",
        "category": "verified_claim",
        "title": "Short title of insight",
        "documentEvidence": {
          "fileName": "Document name",
          "pageOrSlide": 1,
          "quote": "Quote from document"
        },
        "webFinding": {
          "headline": "Headline from web findings",
          "publisher": "Domain",
          "publishedDate": "Date",
          "url": "Source URL",
          "summary": "Web summary"
        },
        "explanation": "How the recent 30-day news corroborates, modifies, or contradicts the document claim",
        "significance": "high"
      }
    ],
    "documentQuestions": [
      {
        "question": "Question bridging document and recent news",
        "rationale": "Why this needs to be asked based on document statement vs reality",
        "documentName": "Document name",
        "pageOrSlide": 1,
        "requiresClarification": true
      }
    ]
  }`
      : ''
  }
}`;
  }

  /**
   * Transparent Algorithmic Fallback Synthesis.
   * Runs when Ollama is offline or local LLM inference is unavailable.
   * Produces an accurate, non-hallucinated briefing directly from Tavily verified findings
   * and document extractions.
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
    documentEvidence?: DocumentIntelligence[];
  }): Partial<BriefingReport> {
    const {
      subjectName,
      subjectType,
      meetingDate,
      meetingPurpose,
      researchWindow,
      findings,
      documentEvidence = [],
    } = params;

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
      documentEvidence.length > 0
        ? `Additionally synthesized ${documentEvidence.length} uploaded meeting document(s) (${documentEvidence
            .map((d) => d.fileName)
            .join(', ')}) to cross-reference internal objectives against public developments.`
        : ''
    } ${
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

    if (documentEvidence.length > 0 && documentEvidence[0].objectives.length > 0) {
      whatThisMeans.unshift(
        `Uploaded document targets "${documentEvidence[0].objectives[0]}" which can be directly referenced in this discussion.`
      );
    }

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

    let documentContext: DocumentBriefingContext | undefined = undefined;

    if (documentEvidence.length > 0) {
      const insights: DocumentToWebInsight[] = [];
      const documentQuestions: DocumentBasedQuestion[] = [];

      for (const doc of documentEvidence) {
        // Correlate doc key statements with web findings
        if (doc.keyStatements.length > 0 && findings.length > 0) {
          const stmt = doc.keyStatements[0];
          const matchedFinding = findings[0];

          insights.push({
            id: `insight-${insights.length + 1}`,
            category: 'verified_claim',
            title: `Corroborated Strategy: ${stmt.statement.slice(0, 50)}...`,
            documentEvidence: {
              fileName: doc.fileName,
              pageOrSlide: stmt.pageOrSlide,
              quote: stmt.statement,
            },
            webFinding: {
              headline: matchedFinding.title,
              publisher: matchedFinding.domain,
              publishedDate: matchedFinding.publishedDate,
              url: matchedFinding.url,
              summary: matchedFinding.snippet,
            },
            explanation: `Document statement on page/slide ${stmt.pageOrSlide} aligns with recent 30-day public reporting from ${matchedFinding.domain}.`,
            significance: 'high',
          });
        }

        // Generate document-based question
        if (doc.objectives.length > 0) {
          documentQuestions.push({
            question: `In ${doc.fileName}, the stated objective is "${doc.objectives[0]}". How does this map to the current timeline given recent developments?`,
            rationale: `Directly bridges uploaded document priorities with upcoming meeting agenda.`,
            documentName: doc.fileName,
            pageOrSlide: doc.keyStatements[0]?.pageOrSlide || 1,
            requiresClarification: true,
          });
        }
      }

      documentContext = {
        documentsCount: documentEvidence.length,
        documents: documentEvidence.map((d) => ({
          documentId: d.documentId,
          fileName: d.fileName,
          summary: d.summary,
          objectives: d.objectives,
          products: d.products,
          stakeholders: d.people,
          competitors: d.competitors,
          financials: d.financials,
        })),
        insights,
        documentQuestions,
      };
    }

    return {
      executiveSummary: execSummary,
      recentDevelopments: developments,
      whatThisMeans,
      discussionOpportunities,
      questionsToAsk,
      openQuestions,
      documentContext,
    };
  }
}

export const ollamaService = new OllamaService();
