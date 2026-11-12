import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import AdmZip from 'adm-zip';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { config } from '../config.js';
import {
  DocumentIntelligence,
  DocumentMetadata,
  DocumentPage,
  KeyStatement,
} from '../types/index.js';
import { sanitizeWebContent } from '../utils/sanitize.js';
import { ollamaService } from './ollamaService.js';
import { storage } from './storageService.js';

export class DocumentParserService {
  /**
   * Sanitizes filename to prevent directory traversal and weird characters.
   */
  public sanitizeFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const base = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
    return `${base || 'document'}_${Date.now()}_${uuidv4().slice(0, 8)}${ext}`;
  }

  /**
   * Parses document text by format, preserving page / slide numbers wherever possible.
   */
  public async extractTextAndPages(
    filePath: string,
    extension: string
  ): Promise<{ pages: DocumentPage[]; isScanned: boolean; requiresOcr: boolean }> {
    const ext = extension.toLowerCase();

    if (ext === '.pdf') {
      return this.parsePdf(filePath);
    } else if (ext === '.docx') {
      return this.parseDocx(filePath);
    } else if (ext === '.pptx') {
      return this.parsePptx(filePath);
    } else if (ext === '.txt') {
      return this.parseTxt(filePath);
    } else if (ext === '.doc') {
      return this.parseLegacyDoc(filePath);
    }

    throw new Error(`Unsupported document extension: ${ext}`);
  }

  /**
   * Extracts text and page references from PDF files.
   * Detects scanned PDFs where text layer is missing.
   */
  private async parsePdf(
    filePath: string
  ): Promise<{ pages: DocumentPage[]; isScanned: boolean; requiresOcr: boolean }> {
    const dataBuffer = fs.readFileSync(filePath);
    const pages: DocumentPage[] = [];

    // Custom pager to preserve page numbers
    let currentPage = 1;
    const options = {
      pagerender: (pageData: any) => {
        return pageData.getTextContent().then((textContent: any) => {
          let lastY: number | null = null;
          let text = '';
          for (const item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }
          const cleanPageText = sanitizeWebContent(text);
          pages.push({
            pageNumber: currentPage++,
            text: cleanPageText,
          });
          return text;
        });
      },
    };

    try {
      const parsed = await pdfParse(dataBuffer, options);
      const totalText = parsed.text || '';
      const totalChars = totalText.replace(/\s+/g, '').length;

      // If virtually no text was extracted, it is likely a scanned PDF
      if (totalChars < 40 && parsed.numpages > 0) {
        return {
          pages: [
            {
              pageNumber: 1,
              text: '[Scanned PDF detected - Document consists primarily of scanned images. OCR required for full extraction.]',
            },
          ],
          isScanned: true,
          requiresOcr: true,
        };
      }

      return {
        pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: sanitizeWebContent(totalText) }],
        isScanned: false,
        requiresOcr: false,
      };
    } catch (err: any) {
      console.error('PDF parsing error:', err);
      throw new Error(`Failed to extract text from PDF: ${err.message || 'Corrupted PDF'}`);
    }
  }

  /**
   * Extracts text and heading structure from DOCX files using mammoth.
   */
  private async parseDocx(
    filePath: string
  ): Promise<{ pages: DocumentPage[]; isScanned: boolean; requiresOcr: boolean }> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const fullText = sanitizeWebContent(result.value);

      // Estimate pages by ~300 words or paragraph blocks
      const paragraphs = fullText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
      const pages: DocumentPage[] = [];
      let currentChunk = '';
      let pageNum = 1;

      for (const p of paragraphs) {
        currentChunk += p + '\n\n';
        if (currentChunk.length > 1800) {
          pages.push({
            pageNumber: pageNum++,
            text: currentChunk.trim(),
          });
          currentChunk = '';
        }
      }

      if (currentChunk.trim().length > 0 || pages.length === 0) {
        pages.push({
          pageNumber: pageNum,
          text: currentChunk.trim() || fullText.trim(),
        });
      }

      return {
        pages,
        isScanned: false,
        requiresOcr: false,
      };
    } catch (err: any) {
      console.error('DOCX parsing error:', err);
      throw new Error(`Failed to extract text from DOCX: ${err.message}`);
    }
  }

  /**
   * Extracts slides and notes from PPTX archives preserving slide numbers.
   */
  private async parsePptx(
    filePath: string
  ): Promise<{ pages: DocumentPage[]; isScanned: boolean; requiresOcr: boolean }> {
    try {
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();
      const pages: DocumentPage[] = [];

      // Find all slide XML entries: ppt/slides/slide1.xml, slide2.xml, etc.
      const slideEntries = zipEntries
        .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry.entryName))
        .sort((a, b) => {
          const numA = parseInt(a.entryName.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
          const numB = parseInt(b.entryName.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
          return numA - numB;
        });

      for (let i = 0; i < slideEntries.length; i++) {
        const xmlContent = slideEntries[i].getData().toString('utf-8');
        // Strip XML tags and clean up text
        const slideText = xmlContent
          .replace(/<a:t[^>]*>(.*?)<\/a:t>/gi, '$1 ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (slideText.length > 0) {
          pages.push({
            pageNumber: i + 1,
            text: sanitizeWebContent(slideText),
          });
        }
      }

      if (pages.length === 0) {
        return {
          pages: [
            {
              pageNumber: 1,
              text: '[PPTX presentation contains primarily visual diagrams or image-based slides.]',
            },
          ],
          isScanned: true,
          requiresOcr: true,
        };
      }

      return {
        pages,
        isScanned: false,
        requiresOcr: false,
      };
    } catch (err: any) {
      console.error('PPTX parsing error:', err);
      throw new Error(`Failed to extract text from PPTX: ${err.message}`);
    }
  }

  /**
   * Parses plain text files.
   */
  private async parseTxt(
    filePath: string
  ): Promise<{ pages: DocumentPage[]; isScanned: boolean; requiresOcr: boolean }> {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const clean = sanitizeWebContent(raw);
      return {
        pages: [{ pageNumber: 1, text: clean }],
        isScanned: false,
        requiresOcr: false,
      };
    } catch (err: any) {
      throw new Error(`Failed to read text file: ${err.message}`);
    }
  }

  /**
   * Fallback parser for legacy .doc binary format.
   */
  private async parseLegacyDoc(
    filePath: string
  ): Promise<{ pages: DocumentPage[]; isScanned: boolean; requiresOcr: boolean }> {
    try {
      const buffer = fs.readFileSync(filePath);
      // Clean readable ASCII/UTF strings from binary stream
      let text = '';
      for (let i = 0; i < buffer.length; i++) {
        const code = buffer[i];
        if (code >= 32 && code <= 126) {
          text += String.fromCharCode(code);
        } else if (code === 10 || code === 13) {
          text += '\n';
        }
      }
      const clean = sanitizeWebContent(text.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' '));
      return {
        pages: [{ pageNumber: 1, text: clean.slice(0, 10000) }],
        isScanned: false,
        requiresOcr: false,
      };
    } catch (err: any) {
      throw new Error(`Failed to extract legacy DOC file: ${err.message}`);
    }
  }

  /**
   * Extracts structured intelligence (names, products, financials, objectives, claims)
   * from the extracted pages using algorithmic analysis with optional Ollama acceleration.
   */
  public async extractIntelligence(
    docMeta: DocumentMetadata,
    pages: DocumentPage[]
  ): Promise<DocumentIntelligence> {
    const fullText = pages.map((p) => p.text).join('\n\n');

    // 1. Algorithmic baseline extraction
    const headings: string[] = [];
    const keyStatements: KeyStatement[] = [];

    // Extract headings and key statements with page attribution
    for (const p of pages) {
      const lines = p.text.split('\n').map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (
          (line.length < 90 && line.length > 5 && /^[A-Z0-9]/.test(line) && !line.endsWith('.')) ||
          /^#{1,4}\s+/.test(line)
        ) {
          headings.push(line.replace(/^#{1,4}\s+/, ''));
        }
        if (
          (line.includes('%') ||
            /\$\d+/.test(line) ||
            line.toLowerCase().includes('target') ||
            line.toLowerCase().includes('launch') ||
            line.toLowerCase().includes('objective') ||
            line.toLowerCase().includes('strategy') ||
            line.toLowerCase().includes('revenue')) &&
          line.length > 25 &&
          line.length < 220
        ) {
          if (keyStatements.length < 15) {
            keyStatements.push({
              statement: line,
              pageOrSlide: p.pageNumber,
            });
          }
        }
      }
    }

    // Algorithmic entity patterns
    const financialMatches = Array.from(
      new Set(fullText.match(/\$[\d,.]+(\s*(million|billion|m|b|k))?/gi) || [])
    ).slice(0, 8);

    const dateMatches = Array.from(
      new Set(
        fullText.match(
          /\b(202[4-9]|Q[1-4]\s*202[4-9]|January|February|March|April|May|June|July|August|September|October|November|December)\b/gi
        ) || []
      )
    ).slice(0, 8);

    // Baseline algorithmic structure
    let intelligence: DocumentIntelligence = {
      id: uuidv4(),
      documentId: docMeta.id,
      fileName: docMeta.originalName,
      title: headings[0] || docMeta.originalName.replace(/\.[^/.]+$/, ''),
      summary: `Document "${docMeta.originalName}" (${pages.length} page/slide${
        pages.length > 1 ? 's' : ''
      }). Contains corporate discussion material, strategic initiatives, and meeting context.`,
      headings: Array.from(new Set(headings)).slice(0, 10),
      people: this.extractNames(fullText),
      organizations: this.extractOrganizations(fullText),
      products: this.extractProducts(fullText),
      dates: dateMatches,
      financials: financialMatches,
      objectives: this.extractObjectives(fullText),
      competitors: this.extractCompetitors(fullText),
      agendaItems: this.extractAgendaItems(fullText),
      keyStatements: keyStatements.slice(0, 8),
      pages,
      extractedAt: new Date().toISOString(),
    };

    // 2. Ollama Enhancement (if online and available)
    try {
      const ollamaStatus = await ollamaService.getStatus();
      if (ollamaStatus.running && ollamaStatus.selectedModel && fullText.length > 100) {
        const enriched = await this.enrichWithOllama(
          docMeta.originalName,
          fullText.slice(0, 4500),
          ollamaStatus.selectedModel
        );
        if (enriched) {
          intelligence = {
            ...intelligence,
            title: enriched.title || intelligence.title,
            summary: enriched.summary || intelligence.summary,
            objectives:
              enriched.objectives && enriched.objectives.length > 0
                ? enriched.objectives
                : intelligence.objectives,
            products:
              enriched.products && enriched.products.length > 0
                ? enriched.products
                : intelligence.products,
            competitors:
              enriched.competitors && enriched.competitors.length > 0
                ? enriched.competitors
                : intelligence.competitors,
            people:
              enriched.people && enriched.people.length > 0 ? enriched.people : intelligence.people,
          };
        }
      }
    } catch (err) {
      console.warn('Ollama document enrichment skipped, using robust baseline extraction:', err);
    }

    return intelligence;
  }

  private async enrichWithOllama(
    fileName: string,
    sampleText: string,
    model: string
  ): Promise<any> {
    const prompt = `Analyze this meeting document snippet (${fileName}) and extract structured business intelligence.
Strict rules:
1. Return ONLY valid JSON matching the exact schema below.
2. Do not invent facts or names not in the document.

DOCUMENT CONTENT:
${sampleText}

JSON Schema:
{
  "title": "Document title or main topic",
  "summary": "2-3 sentence executive summary of what this document covers and why it matters for an upcoming meeting",
  "objectives": ["Strategic objective 1", "Objective 2"],
  "products": ["Product or service 1", "Product 2"],
  "competitors": ["Competitor 1", "Competitor 2"],
  "people": ["Key person 1", "Key person 2"]
}`;

    const res = await fetch(`${config.getOllamaBaseUrl()}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: 'json',
        options: { temperature: 0.1 },
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      if (data.response) {
        return JSON.parse(data.response);
      }
    }
    return null;
  }

  // Heuristic extraction helpers
  private extractNames(text: string): string[] {
    const matches = text.match(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g) || [];
    const stopWords = new Set(['United States', 'New York', 'San Francisco', 'North America', 'Product Launch', 'Executive Summary']);
    return Array.from(new Set(matches.filter((m) => !stopWords.has(m)))).slice(0, 6);
  }

  private extractOrganizations(text: string): string[] {
    const matches = text.match(/\b([A-Z][a-zA-Z0-9]+ (Inc|LLC|Corp|Group|Labs|Technologies|Ventures|Partners|Capital))\b/g) || [];
    return Array.from(new Set(matches)).slice(0, 6);
  }

  private extractProducts(text: string): string[] {
    const matches = text.match(/\b([A-Z][a-zA-Z0-9]+ (Platform|API|SDK|Engine|Cloud|Suite|Pro|Enterprise|Assistant))\b/g) || [];
    return Array.from(new Set(matches)).slice(0, 6);
  }

  private extractObjectives(text: string): string[] {
    const lines = text.split('\n');
    const objectives: string[] = [];
    for (const l of lines) {
      const trimmed = l.trim();
      if (
        (trimmed.toLowerCase().includes('goal') ||
          trimmed.toLowerCase().includes('objective') ||
          trimmed.toLowerCase().includes('plan') ||
          trimmed.toLowerCase().includes('aim to') ||
          trimmed.toLowerCase().includes('milestone')) &&
        trimmed.length > 20 &&
        trimmed.length < 160
      ) {
        objectives.push(trimmed);
      }
    }
    return Array.from(new Set(objectives)).slice(0, 4);
  }

  private extractCompetitors(text: string): string[] {
    const matches = text.match(/competitor[s]?\s*[:\-]\s*([^\n.]+)/i);
    if (matches && matches[1]) {
      return matches[1]
        .split(/[,;&]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2)
        .slice(0, 5);
    }
    return [];
  }

  private extractAgendaItems(text: string): string[] {
    const matches = text.match(/agenda\s*[:\-]?([\s\S]*?)((\n\s*\n)|$)/i);
    if (matches && matches[1]) {
      return matches[1]
        .split('\n')
        .map((s) => s.replace(/^[-*•\d.]+\s*/, '').trim())
        .filter((s) => s.length > 5)
        .slice(0, 5);
    }
    return [];
  }
}

export const documentParserService = new DocumentParserService();
