// scripts/crm-audit/run-all-audits.mjs
// Master audit runner: executes all audit subroutines and outputs unified report data.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

console.log('=====================================================');
console.log('  1LINE CRM / 1LINE OS — DEEP ARCHITECTURAL AUDIT   ');
console.log('=====================================================');

const SCRIPTS = [
  'scripts/crm-audit/audit-buttons-and-screens.mjs',
  'scripts/crm-audit/audit-security-and-leakage.mjs',
  'scripts/crm-audit/audit-data-integrity.mjs',
  'scripts/crm-audit/audit-kpis-and-capacity.mjs'
];

for (const script of SCRIPTS) {
  console.log(`\nExecuting ${script}...`);
  execSync(`node "${script}"`, { stdio: 'inherit' });
}

// Read outputs
const buttons = JSON.parse(fs.readFileSync('scripts/crm-audit/buttons-audit-summary.json', 'utf8'));
const security = JSON.parse(fs.readFileSync('scripts/crm-audit/security-audit-summary.json', 'utf8'));
const integrity = JSON.parse(fs.readFileSync('scripts/crm-audit/data-integrity-summary.json', 'utf8'));
const capacity = JSON.parse(fs.readFileSync('scripts/crm-audit/capacity-kpis-summary.json', 'utf8'));

const consolidated = {
  timestamp: new Date().toISOString(),
  environment: 'Firebase Firestore Emulator + Static AST Analysis',
  screensAudited: buttons.screensInventory.length,
  buttonsTotal: buttons.totalButtonsFound,
  deadButtonsCount: buttons.deadButtons.length,
  falseButtonsCount: buttons.falseButtons.length,
  localOnlyButtonsCount: buttons.localOnlyButtons.length,
  unprotectedButtonsCount: buttons.unprotectedButtons.length,
  urlLeaksCount: security.urlLeaks.length,
  piiExposureCount: security.piiLeaks.length,
  sparkDailyReadsCurrent50Agents: capacity.currentArchitecture.totalDailyReads50Agents,
  sparkDailyReadsOptimized50Agents: capacity.optimizedArchitecture.totalDailyReads50Agents,
  maxSustainableAgentsCurrent: capacity.currentArchitecture.maxSustainableAgents,
  maxSustainableAgentsOptimized: capacity.optimizedArchitecture.maxSustainableAgents,
  kpisAudited: capacity.kpiAudit.length
};

const consolidatedPath = path.resolve('scripts/crm-audit/audit-report-data.json');
fs.writeFileSync(consolidatedPath, JSON.stringify(consolidated, null, 2), 'utf8');

console.log('\n=====================================================');
console.log('  AUDIT CONSOLIDATION COMPLETE                      ');
console.log(`  Summary file: ${consolidatedPath}`);
console.log('=====================================================');
