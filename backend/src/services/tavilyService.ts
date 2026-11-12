import { config } from '../config.js';
import {
  ResearchPlanQuery,
  ResearchWindow,
  SubjectType,
  TavilySearchResult,
  VerifiedFinding,
} from '../types/index.js';
import { isDateWithinWindow } from '../utils/dateUtils.js';
import { extractDomain, sanitizeWebContent } from '../utils/sanitize.js';

interface TavilyApiResponse {
  query?: string;
  results?: Array<{
    title: string;
    url: string;
    content: string;
    score?: number;
    published_date?: string;
  }>;
  response_time?: number;
}

export class TavilyService {
  private baseUrl = 'https://api.tavily.com';

  /**
   * Validates if the configured Tavily API key works by making a tiny test search.
   */
  public async validateApiKey(apiKeyOverride?: string): Promise<{ valid: boolean; message: string }> {
    const key = apiKeyOverride || config.getTavilyApiKey();
    if (!key || key.trim() === '') {
      return {
        valid: false,
        message: 'Tavily API key is missing. Please provide TAVILY_API_KEY in backend/.env or the Settings page.',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: key,
          query: 'test connectivity',
          search_depth: 'basic',
          max_results: 1,
        }),
      });

      if (response.ok) {
        return { valid: true, message: 'Tavily API key is valid and connected.' };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          valid: false,
          message: 'Invalid Tavily API key. Please check your key at https://tavily.com',
        };
      }

      const errText = await response.text();
      return {
        valid: false,
        message: `Tavily API returned status ${response.status}: ${errText.slice(0, 150)}`,
      };
    } catch (err: any) {
      return {
        valid: false,
        message: `Failed to connect to Tavily: ${err.message || 'Network error'}`,
      };
    }
  }

  /**
   * Generates a targeted research plan based on subject type and meeting window.
   */
  public generateResearchPlan(
    subjectName: string,
    subjectType: SubjectType,
    meetingPurpose?: string,
    window?: ResearchWindow
  ): ResearchPlanQuery[] {
    const cleanName = subjectName.trim();
    const timeframeHint = window ? ` ${window.startDate} to ${window.endDate}` : '';

    if (subjectType === 'company') {
      const plan: ResearchPlanQuery[] = [
        {
          category: 'announcements',
          query: `"${cleanName}" news announcement product launch`,
          rationale: 'Identify recent product releases, press statements, and commercial launches.',
        },
        {
          category: 'financials',
          query: `"${cleanName}" funding investment acquisition revenue quarterly results`,
          rationale: 'Track capital events, funding rounds, earnings, or M&A activities.',
        },
        {
          category: 'leadership',
          query: `"${cleanName}" CEO executive appointment hire departure board`,
          rationale: 'Detect C-suite appointments, key promotions, or organizational restructuring.',
        },
        {
          category: 'partnerships',
          query: `"${cleanName}" partnership agreement collaboration deal client`,
          rationale: 'Discover recent strategic partnerships and client wins.',
        },
        {
          category: 'strategic',
          query: `"${cleanName}" strategy expansion initiative restructuring lawsuit challenge`,
          rationale: 'Uncover business headwinds, competitive risks, or new strategic initiatives.',
        },
      ];

      // If user provided a specific meeting purpose, add a tailored search query
      if (meetingPurpose && meetingPurpose.trim()) {
        plan.unshift({
          category: 'meeting_focus',
          query: `"${cleanName}" ${meetingPurpose.trim()}`,
          rationale: `Target developments directly aligned with meeting objective: "${meetingPurpose.trim()}"`,
        });
      }

      return plan;
    } else {
      // Person subject
      const plan: ResearchPlanQuery[] = [
        {
          category: 'interviews',
          query: `"${cleanName}" interview podcast quote profile speaking`,
          rationale: 'Capture recent public statements, thought leadership, and interviews.',
        },
        {
          category: 'career',
          query: `"${cleanName}" appointment role new position joined promoted`,
          rationale: 'Identify recent career milestones, title changes, and professional transitions.',
        },
        {
          category: 'announcements',
          query: `"${cleanName}" announced launched published keynote article`,
          rationale: 'Review published articles, recent keynote speeches, and public announcements.',
        },
        {
          category: 'achievements',
          query: `"${cleanName}" award recognized achievement board venture investment`,
          rationale: 'Track accolades, advisory boards, or angel investments.',
        },
      ];

      if (meetingPurpose && meetingPurpose.trim()) {
        plan.unshift({
          category: 'meeting_focus',
          query: `"${cleanName}" ${meetingPurpose.trim()}`,
          rationale: `Target background relevant to meeting topic: "${meetingPurpose.trim()}"`,
        });
      }

      return plan;
    }
  }

  /**
   * Generates targeted search queries derived from uploaded documents
   * WITHOUT sending entire confidential documents to the search engine.
   * Only uses high-signal extracted entities (products, competitors, key claims).
   */
  public generateDocumentResearchQueries(
    subjectName: string,
    documents: any[]
  ): ResearchPlanQuery[] {
    const queries: ResearchPlanQuery[] = [];
    const cleanName = subjectName.trim();

    for (const doc of documents) {
      // 1. Check products mentioned in the uploaded document
      for (const prod of (doc.products || []).slice(0, 2)) {
        queries.push({
          category: 'document_product',
          query: `"${cleanName}" "${prod}" launch announcement update`,
          rationale: `Investigate recent developments for product "${prod}" identified in ${doc.fileName}`,
          sourceContext: 'document_driven',
        });
      }

      // 2. Check competitors mentioned in the document
      for (const comp of (doc.competitors || []).slice(0, 2)) {
        queries.push({
          category: 'document_competitor',
          query: `"${cleanName}" "${comp}" market comparison`,
          rationale: `Cross-reference competitor dynamics with "${comp}" highlighted in ${doc.fileName}`,
          sourceContext: 'document_driven',
        });
      }

      // 3. Check key claims / milestones if available
      for (const stmt of (doc.keyStatements || []).slice(0, 2)) {
        const keywords = (stmt.statement || '')
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter((w: string) => w.length > 4 && !/^(about|their|there|which|these|would|could|document)$/i.test(w))
          .slice(0, 3)
          .join(' ');

        if (keywords.length > 5) {
          queries.push({
            category: 'document_claim_verification',
            query: `"${cleanName}" ${keywords}`,
            rationale: `Verify claim from ${doc.fileName} (page/slide ${stmt.pageOrSlide}) against recent 30-day news`,
            sourceContext: 'document_driven',
          });
        }
      }
    }

    return queries.slice(0, 4);
  }

  /**
   * Executes Tavily search query with error handling and date-range awareness.
   */
  public async executeSearch(
    query: string,
    category: string,
    apiKeyOverride?: string
  ): Promise<TavilySearchResult[]> {
    const key = apiKeyOverride || config.getTavilyApiKey();
    if (!key) {
      throw new Error('Tavily API key is not configured. Please set TAVILY_API_KEY.');
    }

    const payload = {
      api_key: key,
      query: query,
      search_depth: 'advanced', // Retrieve high quality research results
      include_raw_content: false,
      include_answer: false,
      max_results: 6,
      topic: 'news', // Tavily's dedicated news index for fresh coverage
      days: 30,      // Prioritizes last 30 days
    };

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // If 'news' topic fails or is unsupported for certain queries, fallback to general search
        if (response.status === 400) {
          const fallbackResponse = await fetch(`${this.baseUrl}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: key,
              query: query,
              search_depth: 'basic',
              max_results: 5,
            }),
          });
          if (fallbackResponse.ok) {
            const fallbackData = (await fallbackResponse.json()) as TavilyApiResponse;
            return (fallbackData.results || []).map((r) => ({
              ...r,
              category,
            }));
          }
        }
        const errText = await response.text();
        throw new Error(`Tavily search API error (${response.status}): ${errText}`);
      }

      const data = (await response.json()) as TavilyApiResponse;
      return (data.results || []).map((r) => ({
        ...r,
        category,
      }));
    } catch (err: any) {
      console.error(`Search error for query "${query}":`, err.message);
      throw err;
    }
  }

  /**
   * Extracts raw content using Tavily Extract API if extra depth is needed.
   */
  public async extractUrls(urls: string[], apiKeyOverride?: string): Promise<Record<string, string>> {
    const key = apiKeyOverride || config.getTavilyApiKey();
    if (!key || urls.length === 0) return {};

    try {
      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: key,
          urls: urls.slice(0, 3), // extract top 3 primary sources
        }),
      });

      if (!response.ok) {
        return {};
      }

      const data = (await response.json()) as { results?: Array<{ url: string; raw_content?: string }> };
      const output: Record<string, string> = {};
      for (const item of data.results || []) {
        if (item.url && item.raw_content) {
          output[item.url] = sanitizeWebContent(item.raw_content);
        }
      }
      return output;
    } catch (err) {
      console.warn('Tavily extract API failed, continuing with snippets:', err);
      return {};
    }
  }

  /**
   * Deduplicates and verifies search results against the 30-day window.
   */
  public verifyAndDeduplicate(
    rawResults: TavilySearchResult[],
    window: ResearchWindow
  ): VerifiedFinding[] {
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const verified: VerifiedFinding[] = [];

    for (const item of rawResults) {
      if (!item.url || !item.title) continue;

      // Clean URL (remove trailing slashes, tracking parameters)
      let cleanUrl = item.url;
      try {
        const u = new URL(item.url);
        cleanUrl = `${u.origin}${u.pathname}`.toLowerCase();
      } catch {
        cleanUrl = item.url.toLowerCase();
      }

      if (seenUrls.has(cleanUrl)) continue;
      seenUrls.add(cleanUrl);

      // Check title similarity (normalize)
      const normalizedTitle = item.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .trim();

      // Simple deduplication check for same headline
      let duplicateTitle = false;
      for (const seen of seenTitles) {
        if (normalizedTitle.includes(seen) || seen.includes(normalizedTitle)) {
          duplicateTitle = true;
          break;
        }
      }
      if (duplicateTitle) continue;
      seenTitles.add(normalizedTitle.slice(0, 40));

      const domain = extractDomain(item.url);
      const dateCheck = isDateWithinWindow(item.published_date, window);

      const isReputable = this.isReputableDomain(domain);
      const confidence: 'high' | 'medium' | 'unverified' =
        dateCheck.isWithin && isReputable
          ? 'high'
          : dateCheck.isWithin
          ? 'medium'
          : 'unverified';

      verified.push({
        id: `finding-${verified.length + 1}`,
        title: item.title.trim(),
        url: item.url,
        content: sanitizeWebContent(item.content),
        snippet: (item.content || '').slice(0, 280),
        publishedDate: item.published_date || 'Date unlisted',
        isDateWithinWindow: dateCheck.isWithin,
        category: item.category || 'general',
        domain,
        verificationNote: dateCheck.note,
        confidence,
      });
    }

    return verified;
  }

  private isReputableDomain(domain: string): boolean {
    const reputable = [
      'reuters.com',
      'bloomberg.com',
      'wsj.com',
      'ft.com',
      'techcrunch.com',
      'theverge.com',
      'wired.com',
      'forbes.com',
      'cnbc.com',
      'nytimes.com',
      'bbc.com',
      'businessinsider.com',
      'prnewswire.com',
      'businesswire.com',
      'globenewswire.com',
      'linkedin.com',
      'github.com',
      'medium.com',
      'substack.com',
    ];
    return reputable.some((d) => domain.toLowerCase().includes(d));
  }
}

export const tavilyService = new TavilyService();

