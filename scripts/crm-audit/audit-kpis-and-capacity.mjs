// scripts/crm-audit/audit-kpis-and-capacity.mjs
// Mathematical capacity planning on Firebase Spark Free Tier & KPI calculation readiness audit.
import fs from 'node:fs';
import path from 'node:path';

console.log('Auditing Firebase Spark Tier capacity and KPI calculation readiness...');

// 1. Spark Limits
const SPARK_LIMITS = {
  dailyReads: 50000,
  dailyWrites: 20000,
  dailyDeletes: 20000
};

// Simulation parameters: 10 teams × 5 agents = 50 agents
const TEAM_COUNT = 10;
const AGENTS_PER_TEAM = 5;
const TOTAL_AGENTS = TEAM_COUNT * AGENTS_PER_TEAM; // 50 agents
const WORK_HOURS_PER_DAY = 8;

// Read usage per agent session under current architecture:
// - Initial load of leads (window of 150): 150 reads
// - Corresponding lead_contacts docs: 150 reads
// - useFullLeadStats paginated query (500 leads): 500 reads
// - Properties cache / initial fetch (100 properties): 100 reads
// - Demands & intake initial fetch: 80 reads
// - Real-time listeners churn (average 20 lead updates/hr * 8 hrs): 160 reads
// - Page refreshes / navigation (average 3 reloads/day): 3 * 900 = 2700 reads
const READS_PER_AGENT_PER_DAY_CURRENT = 150 + 150 + 500 + 100 + 80 + 160 + (3 * (150 + 150 + 500));
const TOTAL_DAILY_READS_50_AGENTS_CURRENT = TOTAL_AGENTS * READS_PER_AGENT_PER_DAY_CURRENT;

const MAX_SUSTAINABLE_AGENTS_CURRENT = Math.floor(SPARK_LIMITS.dailyReads / READS_PER_AGENT_PER_DAY_CURRENT);

// Optimized architecture parameters:
// - Read server-cached summaries for stats (1 read instead of 500)
// - Narrower real-time listener (my desk only: ~30 leads instead of 150)
// - Contact sub-document or batch lookup on-demand (only when opening drawer)
// - Properties fetched via CDN catalog (/api/catalog) with 0 Firestore reads for browsing
const READS_PER_AGENT_PER_DAY_OPTIMIZED = 30 + 10 + 1 + 0 + 20 + 80 + (2 * 41);
const TOTAL_DAILY_READS_50_AGENTS_OPTIMIZED = TOTAL_AGENTS * READS_PER_AGENT_PER_DAY_OPTIMIZED;
const MAX_SUSTAINABLE_AGENTS_OPTIMIZED = Math.floor(SPARK_LIMITS.dailyReads / READS_PER_AGENT_PER_DAY_OPTIMIZED);

// 2. Audit of the 10 Weekly KPIs
const kpiAudit = [
  {
    id: 1,
    name: '% مؤهلين وصلهم ترشيح خلال 48 ساعة',
    target: '≥ 90%',
    status: '❌ Missing Data',
    missingFields: ['qualifiedAt (timestamp)', 'nominationSentAt (timestamp)', 'nominations collection'],
    fix: 'Record exact server timestamps on qualification transition and create persistent nomination dispatch events.'
  },
  {
    id: 2,
    name: 'ترشيحات مكتوبة مُرسلة أسبوعياً',
    target: '≥ 10 أسبوعياً',
    status: '❌ Missing Entity',
    missingFields: ['nominations collection (closest, value, challenge roles + written rationale)'],
    fix: 'Persist 3 written nominations with role tags and written rationale in Firestore instead of in-memory matching state.'
  },
  {
    id: 3,
    name: 'معاينات منفذة',
    target: '≥ 3 أسبوعياً',
    status: '🟡 Partially Supported',
    missingFields: ['site_visits collection', 'clientFeedback', 'rejectionReason'],
    fix: 'Promote SiteVisitModal to write structured site_visits with feedback and property score.'
  },
  {
    id: 4,
    name: 'عروض شراء وحجوزات',
    target: 'تتبع مستمر',
    status: '🟡 Partially Supported',
    missingFields: ['writtenOffers collection', 'dealLinkage'],
    fix: 'Connect OfferModal directly to a unified Opportunity/Deal pipeline.'
  },
  {
    id: 5,
    name: 'عملاء مؤهلون جدد (سوهاج + قاهرة)',
    target: '≥ 4 أسبوعياً',
    status: '❌ Missing Classification',
    missingFields: ['BuyerProfile.targetMarket ("sohag" | "cairo")', 'qualifiedAt'],
    fix: 'Add structured BuyerProfile with market choice and qualification checklist.'
  },
  {
    id: 6,
    name: 'زمن الرد الأول (الوسيط)',
    target: '≤ 15 دقيقة',
    status: '🟡 Partially Supported',
    missingFields: ['firstResponseActivityAt (server-enforced)', 'slaBreachEscalation'],
    fix: 'Enforce server-side firstResponseAt on lead creation and trigger automated manager escalation on 15m breach.'
  },
  {
    id: 7,
    name: 'عقارات A نشطة · جديدة هذا الأسبوع',
    target: '≥ 15 نشطة · ≥ 2 جديدة',
    status: '❌ Gated Verification Missing',
    missingFields: ['gate1Checklist', 'verifiedBy', 'verifiedAt', 'gradeAutoCalculated'],
    fix: 'Replace manual dropdown with Gate 1 checklist evaluation (title deed, power of attorney, licenses).'
  },
  {
    id: 8,
    name: 'طلبات بحث موجّه منفذة خلال 7 أيام',
    target: '≥ 80%',
    status: '❌ Entity Missing',
    missingFields: ['search_requests collection', 'inventoryAssignee', 'slaDeadline (7 days)', 'matchedPropertyId'],
    fix: 'Create SearchRequest collection when no 3 A-grade matches exist for a qualified buyer.'
  },
  {
    id: 9,
    name: 'طلبات تذكر محتوى المؤسس ("سمعت عنا منين؟")',
    target: '≥ 1 أسبوعياً',
    status: '❌ Field Missing in Intake',
    missingFields: ['howDidYouHearAboutUs', 'contentAttribution'],
    fix: 'Add mandatory "سمعت عنا منين؟" select in all lead capture forms and link to founder content tracking.'
  },
  {
    id: 10,
    name: 'صفقات مغلقة ومبيعات تراكمية مقابل هدف الربع',
    target: 'حسب خطة الربع',
    status: '❌ Orphaned Collection & Formula Error',
    missingFields: ['deals collection integration', 'Deal.collectedAmount', 'commissionInvoices'],
    fix: 'Activate deals collection, decouple from flat 2% on lead.status, and calculate incentives strictly upon collection.'
  }
];

const capacityReport = {
  sparkLimits: SPARK_LIMITS,
  currentArchitecture: {
    readsPerAgentPerDay: READS_PER_AGENT_PER_DAY_CURRENT,
    totalDailyReads50Agents: TOTAL_DAILY_READS_50_AGENTS_CURRENT,
    quotaExceeded: TOTAL_DAILY_READS_50_AGENTS_CURRENT > SPARK_LIMITS.dailyReads,
    maxSustainableAgents: MAX_SUSTAINABLE_AGENTS_CURRENT
  },
  optimizedArchitecture: {
    readsPerAgentPerDay: READS_PER_AGENT_PER_DAY_OPTIMIZED,
    totalDailyReads50Agents: TOTAL_DAILY_READS_50_AGENTS_OPTIMIZED,
    quotaExceeded: TOTAL_DAILY_READS_50_AGENTS_OPTIMIZED > SPARK_LIMITS.dailyReads,
    maxSustainableAgents: MAX_SUSTAINABLE_AGENTS_OPTIMIZED
  },
  kpiAudit
};

const outPath = path.resolve('scripts/crm-audit/capacity-kpis-summary.json');
fs.writeFileSync(outPath, JSON.stringify(capacityReport, null, 2), 'utf8');
console.log(`Capacity & KPI audit complete. Saved to ${outPath}`);
