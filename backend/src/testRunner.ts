import fs from 'fs';
import path from 'path';
import { calculateResearchWindow, isDateWithinWindow } from './utils/dateUtils.js';
import { tavilyService } from './services/tavilyService.js';
import { ollamaService } from './services/ollamaService.js';
import { storage } from './services/storageService.js';
import { generateBriefingPdf } from './services/pdfService.js';
import { documentParserService } from './services/documentParserService.js';
import { BriefingReport, DocumentMetadata, SubjectType } from './types/index.js';

async function runSelfTests() {
  console.log('🧪 Starting MeetBrief AI Self-Tests (with Document & PDF Intelligence)...');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. Test 30-day window relative to meeting date
  console.log('\n--- Test 1: 30-Day Pre-Meeting Research Window Calculation ---');
  const meetingDate = '2026-12-15';
  const window = calculateResearchWindow(meetingDate);
  assert(window.endDate === '2026-12-15', 'End date matches scheduled meeting date');
  assert(window.startDate === '2026-11-15', 'Start date is exactly 30 days prior (2026-11-15)');
  assert(window.daysCovered === 30, 'Window covers exactly 30 days');

  const inWindow = isDateWithinWindow('2026-12-01', window);
  assert(inWindow.isWithin === true, '2026-12-01 is verified within window');

  const outOfWindow = isDateWithinWindow('2026-09-01', window);
  assert(outOfWindow.isWithin === false, '2026-09-01 is flagged outside 30-day window');

  // 2. Test Research Plan Formulation
  console.log('\n--- Test 2: Research Plan Formulation for Company & Person ---');
  const companyPlan = tavilyService.generateResearchPlan(
    'Stripe',
    'company',
    'Series C Partnership',
    window
  );
  assert(companyPlan.length >= 5, `Company plan contains ${companyPlan.length} targeted search queries`);
  assert(
    companyPlan.some((p) => p.category === 'meeting_focus'),
    'Company plan includes specialized meeting focus query'
  );

  const personPlan = tavilyService.generateResearchPlan('Jensen Huang', 'person', '', window);
  assert(personPlan.length >= 4, `Person plan contains ${personPlan.length} targeted search queries`);
  assert(
    personPlan.some((p) => p.category === 'interviews'),
    'Person plan targets executive interviews and thought leadership'
  );

  // 3. Test Deduplication & Source Verification
  console.log('\n--- Test 3: Deduplication and Verification Logic ---');
  const rawFindings = [
    {
      title: 'Stripe Launches New Payment Protocol for AI Agents',
      url: 'https://techcrunch.com/2026/12/01/stripe-ai-agent-payments/',
      content: 'Stripe has announced a brand new payments protocol designed specifically for autonomous AI agents.',
      published_date: '2026-12-01',
      category: 'announcements',
    },
    {
      title: 'Stripe launches new payment protocol for AI agents',
      url: 'https://techcrunch.com/2026/12/01/stripe-ai-agent-payments/?utm_source=twitter',
      content: 'Stripe has announced a brand new payments protocol...',
      published_date: '2026-12-01',
      category: 'announcements',
    },
    {
      title: 'Stripe Expands EMEA Presence With Dublin Tech Hub',
      url: 'https://reuters.com/business/stripe-dublin-hub-2026-11-20',
      content: 'Stripe announces European expansion...',
      published_date: '2026-11-20',
      category: 'strategic',
    },
    {
      title: 'Old History of Stripe Founding in 2011',
      url: 'https://forbes.com/archive/stripe-2011',
      content: 'Back in 2011 Stripe was founded...',
      published_date: '2020-01-01',
      category: 'background',
    },
  ];

  const verified = tavilyService.verifyAndDeduplicate(rawFindings, window);
  assert(verified.length === 3, `Deduplication reduced 4 items to 3 unique items (got ${verified.length})`);
  const tcItem = verified.find((v) => v.domain.includes('techcrunch.com'));
  assert(tcItem?.confidence === 'high', 'Reputable tech publication within 30-day window flagged as high confidence');
  const oldItem = verified.find((v) => v.domain.includes('forbes.com'));
  assert(oldItem?.isDateWithinWindow === false, 'Old item outside 30-day window flagged as not within window');

  // 4. Test Document Extraction & Entity Extraction
  console.log('\n--- Test 4: Document Parsing & Intelligence Extraction ---');
  const sampleDocMeta: DocumentMetadata = {
    id: 'doc-test-1',
    originalName: 'Stripe_Q4_Strategy_Deck.txt',
    storedName: 'Stripe_Q4_Strategy_Deck_123.txt',
    mimeType: 'text/plain',
    size: 2048,
    extension: '.txt',
    uploadedAt: new Date().toISOString(),
    status: 'processed',
  };

  const samplePages = [
    {
      pageNumber: 1,
      text: `EXECUTIVE BRIEFING & PARTNERSHIP PROPOSAL
Objective: Accelerate autonomous payments expansion with Stripe Agentic Pay.
Key Product: Stripe Agentic Pay SDK
Competitors: Adyen, Checkout.com, PayPal
Target Launch: Q4 2026 target milestone with initial $50 million investment.
Leadership: John Collison and Patrick Collison leading strategic initiative.`,
    },
  ];

  const intel = await documentParserService.extractIntelligence(sampleDocMeta, samplePages);
  assert(Boolean(intel.title), 'Document intelligence extracted document title');
  assert(intel.products.length > 0 || intel.summary.includes('Stripe'), 'Extracted products or context from document');
  assert(intel.competitors.length > 0 || intel.financials.length > 0, 'Extracted competitors or financial figures');
  assert(intel.keyStatements.length > 0, 'Identified key statements with page/slide attribution');

  // Test Document-Driven Queries Formulation
  const docQueries = tavilyService.generateDocumentResearchQueries('Stripe', [intel]);
  assert(docQueries.length > 0, `Generated ${docQueries.length} targeted search queries from document entities`);
  assert(
    docQueries.every((q) => !q.query.includes('EXECUTIVE BRIEFING & PARTNERSHIP PROPOSAL')),
    'Confidential document text was NOT leaked into search queries (only extracted keywords used)'
  );

  // 5. Test Ollama Synthesis with Document Context
  console.log('\n--- Test 5: AI Synthesis with Document Context ---');
  const fallbackWithDocs = ollamaService.generateFallbackBriefing({
    subjectName: 'Stripe',
    subjectType: 'company',
    meetingDate: '2026-12-15',
    meetingTime: '10:00',
    meetingPurpose: 'Strategic Partnership Discussion',
    researchWindow: window,
    findings: verified,
    documentEvidence: [intel],
  });

  assert(Boolean(fallbackWithDocs.documentContext), 'Generated briefing includes Document Context section');
  assert(
    (fallbackWithDocs.documentContext?.insights.length || 0) > 0,
    'Generated Document-to-Web insights correlating document statements with web findings'
  );
  assert(
    (fallbackWithDocs.documentContext?.documentQuestions.length || 0) > 0,
    'Generated personalized Document-based meeting questions'
  );

  // 6. Test PDF Generation with Document Evidence
  console.log('\n--- Test 6: A4 PDF Generation with Document Evidence ---');
  const sampleBriefing: BriefingReport = {
    id: 'test-briefing-doc-1',
    researchJobId: 'test-job-doc-1',
    subjectName: 'Stripe',
    subjectType: 'company',
    meetingDate: '2026-12-15',
    meetingTime: '10:00 AM',
    meetingPurpose: 'Strategic API Partnership',
    researchWindow: window,
    createdAt: new Date().toISOString(),
    executiveSummary: fallbackWithDocs.executiveSummary!,
    recentDevelopments: fallbackWithDocs.recentDevelopments!,
    whatThisMeans: fallbackWithDocs.whatThisMeans!,
    discussionOpportunities: fallbackWithDocs.discussionOpportunities!,
    questionsToAsk: fallbackWithDocs.questionsToAsk!,
    openQuestions: fallbackWithDocs.openQuestions!,
    sources: [
      {
        title: 'Stripe Launches New Payment Protocol',
        url: 'https://techcrunch.com/2026/12/01/stripe-ai-agent-payments/',
        publishedDate: '2026-12-01',
        domain: 'techcrunch.com',
      },
    ],
    documentContext: fallbackWithDocs.documentContext,
    generatedBy: 'algorithmic_synthesis',
    isFallback: true,
  };

  const pdfBuffer = await generateBriefingPdf(sampleBriefing);
  assert(pdfBuffer.length > 1000, `Generated PDF buffer is valid (${pdfBuffer.length} bytes)`);
  assert(pdfBuffer.subarray(0, 4).toString() === '%PDF', 'Buffer starts with valid %PDF magic header');

  // 7. Test Document Storage & Cleanup
  console.log('\n--- Test 7: Document Storage and Deletion ---');
  storage.saveDocument(sampleDocMeta);
  storage.saveIntelligence(intel);
  assert(storage.getDocument(sampleDocMeta.id) !== null, 'Document metadata persists in storage');
  assert(storage.getIntelligence(sampleDocMeta.id) !== null, 'Document intelligence persists in storage');

  const deleted = storage.deleteDocument(sampleDocMeta.id);
  assert(deleted === true, 'Document and associated intelligence deleted successfully');
  assert(storage.getDocument(sampleDocMeta.id) === null, 'Document is no longer retrievable after deletion');

  console.log(`\n========================================`);
  console.log(`🏁 Self-Tests Completed: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSelfTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
