// =============================================================
//  Site settings edited in CRM → إدارة المنظومة → إعدادات الموقع (Firestore settings/site_cms):
//  contact details, social links, FAQ, testimonials and the Google title/description of each page.
//
//  Visitors get them inside the cached /api/catalog response (no Firestore read per visit); the CRM
//  and local dev, where that route is missing, read the document directly. Until either arrives the
//  site shows the last copy this browser saw, then the defaults below (today's hard-coded values).
//  Everything passes through normalizeSiteSettings, so a bad or hostile value can never reach a page.
// =============================================================

import { useSyncExternalStore } from 'react';
import { CONTACT } from '../config/siteConfig.js';

export const SITE_SETTINGS_KEY = 'site_cms';
const CACHE_KEY = 'oneline_site_settings_v1';

export const SOCIAL_NETWORKS = [
  { id: 'facebook', label: 'Facebook', hosts: ['facebook.com', 'fb.com', 'fb.me'] },
  { id: 'instagram', label: 'Instagram', hosts: ['instagram.com'] },
  { id: 'tiktok', label: 'TikTok', hosts: ['tiktok.com'] },
  { id: 'youtube', label: 'YouTube', hosts: ['youtube.com', 'youtu.be'] },
  { id: 'linkedin', label: 'LinkedIn', hosts: ['linkedin.com'] },
  { id: 'x', label: 'X', hosts: ['x.com', 'twitter.com'] }
];

// Pages whose Google title/description can be set from the CRM (keyed by path, as updatePageSeo sees them)
export const SEO_PAGES = [
  { path: '/', ar: 'الصفحة الرئيسية', en: 'Home' },
  { path: '/properties', ar: 'العقارات', en: 'Properties' },
  { path: '/projects', ar: 'المشروعات', en: 'Projects' },
  { path: '/market-intelligence', ar: 'مؤشرات السوق', en: 'Market' },
  { path: '/financing', ar: 'التمويل', en: 'Financing' },
  { path: '/commercial-hub', ar: 'التجاري', en: 'Commercial' },
  { path: '/about', ar: 'عن الشركة', en: 'About' }
];

export const FAQ_CATEGORIES = ['services', 'valuation', 'legal', 'expats'];

const LIMITS = { short: 120, text: 600, answer: 1500, title: 70, description: 170, faq: 30, testimonials: 20 };

export const DEFAULT_SITE_SETTINGS = Object.freeze({
  contact: Object.freeze({
    email: CONTACT.email,
    hours_ar: CONTACT.hours_ar,
    hours_en: CONTACT.hours_en,
    mapsUrl: CONTACT.mapsUrl
  }),
  social: Object.freeze({}),
  faq: Object.freeze([]),
  testimonials: Object.freeze([]),
  seo: Object.freeze({})
});

const str = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const longStr = (v, max) => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').trim().slice(0, max) : '');

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i;

/** An https URL on one of the given hosts (or any host when none are given); anything else → '' */
export function safeHttpsUrl(value, hosts = null) {
  const raw = str(value, 300);
  if (!raw) return '';
  let url;
  try { url = new URL(raw); } catch { return ''; }
  if (url.protocol !== 'https:') return '';
  if (hosts) {
    const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, '');
    if (!hosts.some((h) => host === h || host.endsWith(`.${h}`))) return '';
  }
  return url.toString();
}

/** Cloud or cached data → a complete, safe settings object (unknown fields dropped, defaults filled in). */
export function normalizeSiteSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const c = src.contact && typeof src.contact === 'object' ? src.contact : {};
  const email = str(c.email, LIMITS.short);
  const contact = {
    email: EMAIL_RE.test(email) ? email : DEFAULT_SITE_SETTINGS.contact.email,
    hours_ar: str(c.hours_ar, LIMITS.short) || DEFAULT_SITE_SETTINGS.contact.hours_ar,
    hours_en: str(c.hours_en, LIMITS.short) || DEFAULT_SITE_SETTINGS.contact.hours_en,
    mapsUrl: safeHttpsUrl(c.mapsUrl) || DEFAULT_SITE_SETTINGS.contact.mapsUrl
  };

  const s = src.social && typeof src.social === 'object' ? src.social : {};
  const social = {};
  for (const net of SOCIAL_NETWORKS) {
    const url = safeHttpsUrl(s[net.id], net.hosts);
    if (url) social[net.id] = url;
  }

  const faq = (Array.isArray(src.faq) ? src.faq : [])
    .map((f) => ({
      q_ar: str(f?.q_ar, LIMITS.text),
      a_ar: longStr(f?.a_ar, LIMITS.answer),
      q_en: str(f?.q_en, LIMITS.text),
      a_en: longStr(f?.a_en, LIMITS.answer),
      category: FAQ_CATEGORIES.includes(f?.category) ? f.category : 'services'
    }))
    .filter((f) => (f.q_ar && f.a_ar) || (f.q_en && f.a_en))
    .slice(0, LIMITS.faq);

  const testimonials = (Array.isArray(src.testimonials) ? src.testimonials : [])
    .map((t) => ({
      name: str(t?.name, LIMITS.short),
      role_ar: str(t?.role_ar, LIMITS.short),
      role_en: str(t?.role_en, LIMITS.short),
      text_ar: longStr(t?.text_ar, LIMITS.text),
      text_en: longStr(t?.text_en, LIMITS.text)
    }))
    .filter((t) => t.name && (t.text_ar || t.text_en))
    .slice(0, LIMITS.testimonials);

  const seoSrc = src.seo && typeof src.seo === 'object' ? src.seo : {};
  const seo = {};
  for (const page of SEO_PAGES) {
    const p = seoSrc[page.path];
    if (!p || typeof p !== 'object') continue;
    const entry = {
      title_ar: str(p.title_ar, LIMITS.title),
      description_ar: str(p.description_ar, LIMITS.description),
      title_en: str(p.title_en, LIMITS.title),
      description_en: str(p.description_en, LIMITS.description)
    };
    if (Object.values(entry).some(Boolean)) seo[page.path] = entry;
  }

  return { contact, social, faq, testimonials, seo };
}

// ---- store ----
const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
};

let current = normalizeSiteSettings(typeof localStorage === 'undefined' ? null : readCache());
const listeners = new Set();

export const getSiteSettings = () => current;

export function subscribeSiteSettings(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Apply a copy from the cloud (null = no document yet → defaults). */
export function applySiteSettings(raw) {
  const next = normalizeSiteSettings(raw);
  if (JSON.stringify(next) === JSON.stringify(current)) return;
  current = next;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  listeners.forEach((fn) => fn(current));
}

export function useSiteSettings() {
  return useSyncExternalStore(subscribeSiteSettings, getSiteSettings, getSiteSettings);
}
