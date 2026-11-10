import { calculateResearchWindow, isDateWithinWindow } from './utils/dateUtils.js';
import { tavilyService } from './services/tavilyService.js';
import { ollamaService } from './services/ollamaService.js';
import { storage } from './services/storageService.js';
import { generateBriefingPdf } from './services/pdfService.js';
import { BriefingReport, SubjectType } from './types/index.js';

async function runSelfTests() {
  console.log('🧪 Starting MeetBrief AI Self-Tests...');
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

  // Test date within window
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
  assert(
    companyPlan.some((p) => p.category === 'announcements'),
    'Company plan includes product announcements query'
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
      title: 'Stripe launches new payment protocol for AI agents', // Duplicate headline
      url: 'https://techcrunch.com/2026/12/01/stripe-ai-agent-payments/?utm_source=twitter', // Duplicate URL with tracking
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
      published_date: '2020-01-01', // Outside 30-day window
      category: 'background',
    },
  ];

  const verified = tavilyService.verifyAndDeduplicate(rawFindings, window);
  assert(verified.length === 3, `Deduplication reduced 4 items to 3 unique items (got ${verified.length})`);
  const tcItem = verified.find((v) => v.domain.includes('techcrunch.com'));
  assert(tcItem?.confidence === 'high', 'Reputable tech publication within 30-day window flagged as high confidence');
  const oldItem = verified.find((v) => v.domain.includes('forbes.com'));
  assert(oldItem?.isDateWithinWindow === false, 'Old item outside 30-day window flagged as not within window');

  // 4. Test Ollama Status & Fallback Synthesis
  console.log('\n--- Test 4: Ollama Service Status & Synthesis ---');
  const ollamaStatus = await ollamaService.getStatus();
  console.log(`  ℹ Ollama status: ${ollamaStatus.running ? 'Online' : 'Offline'} (${ollamaStatus.message})`);
  assert(typeof ollamaStatus.running === 'boolean', 'Ollama detection returns valid status');

  const fallback = ollamaService.generateFallbackBriefing({
    subjectName: 'Stripe',
    subjectType: 'company',
    meetingDate: '2026-12-15',
    meetingTime: '10:00',
    meetingPurpose: 'Strategic Partnership Discussion',
    researchWindow: window,
    findings: verified,
  });

  assert(Boolean(fallback.executiveSummary), 'Fallback synthesis provides structured executive summary');
  assert(
    (fallback.recentDevelopments?.length || 0) > 0,
    `Fallback synthesis extracts ${fallback.recentDevelopments?.length} verified developments without hallucination`
  );
  assert(
    (fallback.questionsToAsk?.length || 0) === 5,
    'Fallback synthesis generates 5 context-aware questions'
  );
  assert(
    (fallback.discussionOpportunities?.length || 0) === 3,
    'Fallback synthesis provides 3 discussion opportunities'
  );

  // 5. Test PDF Generation
  console.log('\n--- Test 5: A4 Executive Intelligence PDF Generation ---');
  const sampleBriefing: BriefingReport = {
    id: 'test-briefing-1',
    researchJobId: 'test-job-1',
    subjectName: 'Stripe',
    subjectType: 'company',
    meetingDate: '2026-12-15',
    meetingTime: '10:00 AM',
    meetingPurpose: 'Strategic API Partnership',
    researchWindow: window,
    createdAt: new Date().toISOString(),
    executiveSummary: fallback.executiveSummary!,
    recentDevelopments: fallback.recentDevelopments!,
    whatThisMeans: fallback.whatThisMeans!,
    discussionOpportunities: fallback.discussionOpportunities!,
    questionsToAsk: fallback.questionsToAsk!,
    openQuestions: fallback.openQuestions!,
    sources: [
      {
        title: 'Stripe Launches New Payment Protocol',
        url: 'https://techcrunch.com/2026/12/01/stripe-ai-agent-payments/',
        publishedDate: '2026-12-01',
        domain: 'techcrunch.com',
      },
    ],
    generatedBy: 'algorithmic_synthesis',
    isFallback: true,
  };

  const pdfBuffer = await generateBriefingPdf(sampleBriefing);
  assert(pdfBuffer.length > 1000, `Generated PDF buffer is valid (${pdfBuffer.length} bytes)`);
  assert(pdfBuffer.subarray(0, 4).toString() === '%PDF', 'Buffer starts with valid %PDF magic header');

  // 6. Test Persistent Storage
  console.log('\n--- Test 6: Modular Persistent Storage ---');
  storage.saveBriefing(sampleBriefing);
  const loaded = storage.getBriefing('test-briefing-1');
  assert(loaded !== null && loaded.subjectName === 'Stripe', 'Briefing persists and reloads accurately');

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
