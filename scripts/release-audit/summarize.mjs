// Turns raw/sweep-*.json into the page × device matrix and the per-issue tallies used in REPORT.md.
//   node scripts/release-audit/summarize.mjs [raw/sweep-all.json] > raw/sweep-summary.md
import fs from 'node:fs';
import path from 'node:path';
import { RAW } from './lib.mjs';

const file = process.argv[2] || path.join(RAW, 'sweep-all.json');
const rows = JSON.parse(fs.readFileSync(file, 'utf8'));

const grade = (r) => {
  if (r.failed) return '⛔';
  if (r.overflowPx > 1 || r.rawKeys?.length || r.errors?.some((e) => e.startsWith('pageerror'))) return '🔴';
  if (r.smallFields?.count || r.eastern?.length || (r.smallText?.count || 0) > 5 || (r.contentShare ?? 100) < 60 || (r.axe || []).length) return '🟡';
  return '✅';
};

const pages = [...new Set(rows.map((r) => r.page))];
const devices = [...new Set(rows.map((r) => r.device))];
const at = (p, d) => rows.find((r) => r.page === p && r.device === d);

let md = `| الصفحة | ${devices.join(' | ')} |\n|---|${devices.map(() => ':-:').join('|')}|\n`;
for (const p of pages) md += `| \`${p}\` | ${devices.map((d) => { const r = at(p, d); return r ? grade(r) : ''; }).join(' | ')} |\n`;

const tally = (label, pick) => {
  const hits = rows.filter(pick);
  return { label, count: hits.length, examples: hits.slice(0, 6).map((r) => `${r.page} @ ${r.device}`) };
};
const issues = [
  tally('horizontal overflow', (r) => r.overflowPx > 1),
  tally('fields under 16px (iOS zoom)', (r) => r.smallFields?.count > 0),
  tally('Eastern-Arabic digits shown', (r) => r.eastern?.length > 0),
  tally('raw keys shown (undefined/NaN/new_sohag…)', (r) => r.rawKeys?.length > 0),
  tally('more than 5 texts under 12px', (r) => (r.smallText?.count || 0) > 5),
  tally('fixed bars leave under 60% of the screen', (r) => (r.contentShare ?? 100) < 60),
  tally('CLS above 0.1', (r) => (r.cls || 0) > 0.1),
  tally('page errors (uncaught)', (r) => r.errors?.some((e) => e.startsWith('pageerror'))),
  tally('console errors', (r) => r.errors?.length > 0),
  tally('axe serious/critical', (r) => (r.axe || []).length > 0),
  tally('screens that failed to open', (r) => r.failed)
];
md += '\n| المشكلة | عدد (صفحة × جهاز) | أمثلة |\n|---|:-:|---|\n';
for (const i of issues) md += `| ${i.label} | ${i.count} | ${i.examples.join('<br>')} |\n`;

const axeIds = {};
for (const r of rows) for (const v of r.axe || []) axeIds[v.id] = (axeIds[v.id] || 0) + 1;
md += `\naxe (serious/critical) by rule: ${Object.entries(axeIds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'}\n`;
const targets = rows.filter((r) => r.smallTargets?.count).map((r) => r.smallTargets.count);
md += `\nTouch targets under 44px: median ${targets.sort((a, b) => a - b)[Math.floor(targets.length / 2)] || 0} per page, max ${Math.max(0, ...targets)}\n`;
const lcp = rows.filter((r) => r.lcpMs > 0).map((r) => r.lcpMs).sort((a, b) => a - b);
md += `LCP (local server, no throttling): median ${lcp[Math.floor(lcp.length / 2)] || 0} ms, p90 ${lcp[Math.floor(lcp.length * 0.9)] || 0} ms\n`;
const storage = rows.find((r) => r.device === '390x844-storage-blocked');
if (storage) md += `\nBlocked storage: rendered ${storage.renderedTextChars} characters; errors: ${storage.errors.join(' | ') || 'none'}\n`;
process.stdout.write(md);
