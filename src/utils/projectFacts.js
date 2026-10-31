// Project helpers shared by the /projects cards and the project page.
// Pure, unit-tested in tests/unit/project-facts.test.mjs.
import { monthlyFor } from './paymentTerms.js';
import { getActiveOffer } from './propertyOffers.js';
import { blockedByApproval } from './publishApproval.js';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
export const pct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

// Arabic counting: سنة، سنتين، 3–10 سنوات، 11+ سنة
export const arYears = (n) => (n === 1 ? 'سنة' : n === 2 ? 'سنتين' : n <= 10 ? `${n} سنوات` : `${n} سنة`);

export const projectPath = (p) => `/projects/${encodeURIComponent(String(p?.id || ''))}`;

/** Listings tied to this project in the CRM (unit form → المشروع), public and not sold */
export function projectUnits(project, list = []) {
  if (!project?.id) return [];
  return list.filter((u) => u && u.projectId === project.id && !u.isDeleted
    && !['trash', 'hidden', 'draft', 'sold'].includes(u.status) && !blockedByApproval(u));
}

/**
 * A worked example of the plan at the starting price: down payment, then the monthly
 * installment over the plan's years. null when the plan is not filled in.
 */
export function planExample(project) {
  const price = num(project?.startPrice);
  const years = num(project?.installmentYears);
  if (!price || !years) return null;
  const downPct = Math.min(100, num(project?.downPaymentPercent));
  const down = Math.round((price * downPct) / 100);
  const months = Math.round(years * 12);
  return { price, down, months, monthly: monthlyFor({ total: price, down, months }) };
}

/** Construction stages that were filled in, in build order */
export function projectStages(project, isAr = true) {
  const bk = project?.progressBreakdown || {};
  return [
    { key: 'concrete', ar: 'الخرسانات', en: 'Structure' },
    { key: 'masonry', ar: 'المباني', en: 'Masonry' },
    { key: 'finishing', ar: 'التشطيب', en: 'Finishing' },
    { key: 'infrastructure', ar: 'المرافق والبنية التحتية', en: 'Infrastructure' }
  ]
    .filter((s) => bk[s.key] !== undefined && bk[s.key] !== null && bk[s.key] !== '')
    .map((s) => ({ key: s.key, label: isAr ? s.ar : s.en, value: pct(bk[s.key]) }));
}

/** Hidden from the CRM (المشروعات → 👁) keeps a project off every public page */
export const isProjectPublic = (p) => Boolean(p) && !p.isHidden && !p.isDeleted && p.status !== 'hidden' && !blockedByApproval(p);
export const siteProjects = (list = []) => (Array.isArray(list) ? list.filter(isProjectPublic) : []);

/**
 * The project's running cash offer, measured against its starting price, in the same shape
 * as a listing's (utils/propertyOffers). null when there is none or it has ended.
 */
export function projectOffer(project, now = Date.now()) {
  if (!project?.offer || project.isDemo) return null;
  return getActiveOffer({ ...project, price: project.startPrice }, now);
}
