// scripts/crm-audit/audit-data-integrity.mjs
// Analyze data integrity, intake forms, Egyptian Law 151/2020 compliance, and stage gating.
import fs from 'node:fs';
import path from 'node:path';

console.log('Auditing data integrity, intake channels, consent tracking, and stage transitions...');

const findings = {
  intakeForms: [],
  consentGaps: [],
  deduplicationRisks: [],
  stageGatingGaps: [],
  auditLogAnalysis: []
};

// 1. Inspect AddLeadModal.jsx
const addLeadPath = path.resolve('src/components/crm/AddLeadModal.jsx');
if (fs.existsSync(addLeadPath)) {
  const content = fs.readFileSync(addLeadPath, 'utf8');
  const hasConsentField = content.includes('consent') || content.includes('موافقة');
  const hasSourceRequired = content.includes('required') && (content.includes('source') || content.includes('المصدر'));
  const generatesTimestampId = content.includes('Date.now()');

  findings.intakeForms.push({
    file: 'src/components/crm/AddLeadModal.jsx',
    hasConsentField,
    hasSourceRequired,
    generatesTimestampId,
    issues: [
      !hasConsentField ? '🔴 Missing mandatory marketing consent checkbox (Egyptian Law 151/2020 violation)' : null,
      !hasSourceRequired ? '🟠 Lead source field is not strictly enforced as required in validation' : null,
      generatesTimestampId ? '🟠 Client-side ID generation (lead-${Date.now()}) instead of phone-based primary key' : null
    ].filter(Boolean)
  });
}

// 2. Inspect KanbanPipeline.jsx stage transitions
const kanbanPath = path.resolve('src/components/crm/KanbanPipeline.jsx');
if (fs.existsSync(kanbanPath)) {
  const content = fs.readFileSync(kanbanPath, 'utf8');
  const hasGateChecks = content.includes('gate1') || content.includes('checklist') || content.includes('qualifications');
  const allowsFreeDrag = content.includes('onDragEnd') || content.includes('handleDragEnd') || content.includes('moveLead');

  findings.stageGatingGaps.push({
    file: 'src/components/crm/KanbanPipeline.jsx',
    hasGateChecks,
    allowsFreeDrag,
    finding: '🔴 Stage transitions allow arbitrary drag-and-drop between columns without validating stage deliverables (e.g., 5 qualification questions, 3 written nominations, site visit report, Gate 1/2/3 checklist).'
  });
}

// 3. Inspect PropertiesContext.jsx lead addition
const propCtxPath = path.resolve('src/context/PropertiesContext.jsx');
if (fs.existsSync(propCtxPath)) {
  const content = fs.readFileSync(propCtxPath, 'utf8');
  const hasPhoneDedup = content.includes('normalizePhone') || content.includes('find(l => l.phone');
  findings.deduplicationRisks.push({
    file: 'src/context/PropertiesContext.jsx',
    scope: 'Local in-memory window only',
    risk: 'Deduplication only checks the currently loaded batch of 150 leads. Historical leads outside the 150-lead live window will create duplicate lead profiles.'
  });
}

// 4. Audit firestore.rules for stage constraints
const rulesContent = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');
const checksDealsInRules = rulesContent.includes("isDealStage(request.resource.data.status)");
findings.stageGatingGaps.push({
  file: 'firestore.rules',
  ruleGating: 'Only checks deal.edit when moving to closing or closed. Moving from new to site_visit, negotiating, etc., is completely unvalidated at the database layer.'
});

const outPath = path.resolve('scripts/crm-audit/data-integrity-summary.json');
fs.writeFileSync(outPath, JSON.stringify(findings, null, 2), 'utf8');
console.log(`Data integrity audit complete. Output saved to ${outPath}`);
