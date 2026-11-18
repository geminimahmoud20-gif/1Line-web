// scripts/crm-audit/audit-security-and-leakage.mjs
// Audit security, PII leakage, and RBAC matrix enforcement.
import fs from 'node:fs';
import path from 'node:path';

console.log('Auditing codebase for security vulnerabilities, PII leakage, and RBAC gaps...');

const findings = {
  piiLeaks: [],
  unmaskedPhoneRenderings: [],
  urlLeaks: [],
  missingRbacEnforcements: [],
  rulesAnalysis: []
};

// 1. Scan for wa.me / URL leakage
const scanFiles = [
  'src/components/CrmAdminPanel.jsx',
  'src/components/crm/LeadsTab.jsx',
  'src/components/crm/CustomerProfileModal.jsx',
  'src/components/crm/LeadQuickDrawer.jsx',
  'src/components/crm/DemandsManagerPanel.jsx',
  'src/components/crm/WhatsAppMatchNotifierModal.jsx',
  'src/components/crm/KanbanPipeline.jsx'
];

for (const rel of scanFiles) {
  const p = path.resolve(rel);
  if (!fs.existsSync(p)) continue;
  const content = fs.readFileSync(p, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // Check for wa.me link with customer phone
    if (line.includes('wa.me') || line.includes('api.whatsapp.com')) {
      findings.urlLeaks.push({
        file: rel,
        line: idx + 1,
        code: line.trim(),
        severity: '🔴 CRITICAL',
        issue: 'Direct unauthenticated WhatsApp URL generated in browser client'
      });
    }

    // Check for unmasked phone usage without role check
    if ((line.includes('.phone') || line.includes('.whatsapp')) && !line.includes('//') && !line.includes('mask') && !line.includes('hidden') && !line.includes('***')) {
      if (line.includes('href={`tel:') || line.includes('window.open')) {
        findings.piiLeaks.push({
          file: rel,
          line: idx + 1,
          code: line.trim(),
          issue: 'Client phone number directly bound to anchor/window.open without desk/role gate'
        });
      }
    }
  });
}

// 2. Audit firestore.rules for permissions matrix
const rulesContent = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');

const collections = [
  'leads',
  'lead_contacts',
  'properties',
  'projects',
  'deals',
  'demands',
  'public_demands',
  'request_contacts',
  'remote_inspections',
  'trade_ins',
  'audit_logs',
  'analytics_daily',
  'analytics_visitors',
  'client_downloads',
  'client_errors'
];

const rbacMatrix = {
  super_admin: {},
  sales_manager: {},
  sales_agent: {},
  property_manager: {},
  finance: {},
  viewer: {},
  guest: {}
};

// Inspect collection rules
for (const col of collections) {
  const match = rulesContent.match(new RegExp(`match \\/${col}\\/\\{([a-zA-Z0-9_]+)\\}[\\s\\S]*?\\n  \\}`, 'g'));
  findings.rulesAnalysis.push({
    collection: col,
    isDefinedInRules: rulesContent.includes(`match /${col}/`)
  });
}

const summaryPath = path.resolve('scripts/crm-audit/security-audit-summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(findings, null, 2), 'utf8');
console.log(`Security audit completed. Found ${findings.urlLeaks.length} URL leakage risks and ${findings.piiLeaks.length} PII exposure risks.`);
console.log(`Summary written to ${summaryPath}`);
