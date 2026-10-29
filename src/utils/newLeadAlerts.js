// =============================================================
//  CRM: chime + toast + desktop notification when a new lead lands in the live list.
//  Complements the WhatsApp alert (api/notify.js) for staff who have the CRM open.
//  Only leads created in the last ALERT_WINDOW_MS count as new, so opening the CRM doesn't ring for
//  the whole backlog, and each lead rings once per page load.
// =============================================================

import { playNotificationChime } from './notificationHub.js';
import { getAreas } from './areasData.js';
import { areaLabel, propertyTypeLabel } from './placeLabels.js';

const ALERT_WINDOW_MS = 10 * 60 * 1000;
const seen = new Set();

const createdMillis = (lead) => {
  const c = lead?.createdAt;
  if (c && typeof c.toMillis === 'function') return c.toMillis();
  const t = Date.parse(c || lead?.timestamp || '');
  return Number.isNaN(t) ? 0 : t;
};

export const desktopAlertsSupported = () => typeof window !== 'undefined' && 'Notification' in window;
export const desktopAlertsEnabled = () => desktopAlertsSupported() && window.Notification.permission === 'granted';
/** 'granted' | 'denied' | 'default' | 'unsupported' — the CRM explains each one */
export const desktopAlertsState = () => (desktopAlertsSupported() ? window.Notification.permission : 'unsupported');
export const enableDesktopAlerts = async () => {
  if (!desktopAlertsSupported()) return false;
  try {
    return (await window.Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
};

/**
 * A system notification. Phones (Chrome on Android, an installed CRM on iPhone) only show one
 * through the service worker: `new Notification()` throws there, which is why phones used to get
 * nothing. Tapping it opens data.url (or focuses the open CRM, see public/sw.js).
 */
export async function showSystemAlert(title, { body = '', tag = '', data = {}, onClick } = {}) {
  if (!desktopAlertsEnabled()) return false;
  const options = { body, tag: tag || undefined, icon: '/icon-192.png', badge: '/icon-192.png', data, renotify: Boolean(tag) };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg && typeof reg.showNotification === 'function') {
      await reg.showNotification(title, options);
      return true;
    }
  } catch { /* fall back to the page notification below */ }
  try {
    const n = new window.Notification(title, options);
    n.onclick = () => { window.focus(); if (onClick) onClick(); n.close(); };
    return true;
  } catch {
    return false;
  }
}

export const formatLeadHeadline = (lead, isAr = true) => {
  const d = lead?.details || {};
  const typeName = (key) => (key ? propertyTypeLabel(key, isAr) : (isAr ? 'عقار' : 'Property'));
  const name = String(lead?.name || (isAr ? 'عميل' : 'Client')).slice(0, 40);
  
  // 1. Viewing / Site Inspection Request
  if (lead?.type === 'visit' || lead?.type === 'viewing' || d.visitDate || d.propertyId || lead?.notes?.includes('معاينة')) {
    const code = d.propertyCode || d.propertyId || (isAr ? 'عقار' : 'Property');
    const when = d.visitDate ? ` ${d.visitDate}` : '';
    const slot = d.visitSlot ? ` ${d.visitSlot}` : '';
    return isAr ? `🏠 طلب معاينة: كود ${code}${when}${slot} — ${name}` : `🏠 Viewing Request: Code ${code}${when}${slot} — ${name}`;
  }

  // 2. Seller / Property Listing
  if (lead?.type === 'seller' || lead?.type === 'valuation' || lead?.landingPage === '/sell' || lead?.notes?.includes('عرض بيع')) {
    const propType = typeName(d.propertyType || lead?.propertyType);
    const areaKey = d.area || lead?.area || '';
    const area = areaKey ? areaLabel(areaKey, isAr, getAreas()) : '';
    const size = d.size || lead?.size ? ` (${d.size || lead?.size}م²)` : '';
    const where = area ? (isAr ? ` في ${area}` : ` in ${area}`) : '';
    return isAr ? `💰 عرض بيع: ${propType}${where}${size} — ${name}` : `💰 Sale listing: ${propType}${where}${size} — ${name}`;
  }

  // 3. Buyer Demand / Purchase Inquiry
  if (lead?.type === 'buyer' || lead?.type === 'request' || lead?.type === 'investor' || lead?.notes?.includes('طلب شراء')) {
    const propType = typeName(d.propertyType || lead?.propertyType);
    const rawBudget = d.budget || lead?.budget;
    const budgetNum = Number(String(rawBudget ?? '').replace(/[^\d.]/g, ''));
    const budget = rawBudget
      ? (isAr ? ` (ميزانية: ${budgetNum ? `${budgetNum.toLocaleString('en-US')} ج.م` : rawBudget})` : ` (budget: ${budgetNum ? budgetNum.toLocaleString('en-US') : rawBudget})`)
      : '';
    return isAr ? `🎯 طلب شراء: ${propType}${budget} — ${name}` : `🎯 Buyer Demand: ${propType}${budget} — ${name}`;
  }

  // 4. Broker Partner
  if (lead?.type === 'broker' || lead?.landingPage === '/broker') {
    return isAr ? `🤝 انضمام وسيط عقاري معتمد: ${name}` : `🤝 New Broker Partner: ${name}`;
  }

  // 5. Registered User Account
  if (lead?.type === 'account' || lead?.type === 'client_registration') {
    return isAr ? `👤 حساب مستخدم مسجل جديد: ${name}` : `👤 New User Account: ${name}`;
  }

  return isAr ? `🔔 طلب جديد: ${name}` : `🔔 New request: ${name}`;
};

/** Call with the CRM's current lead list whenever it changes. */
export function announceNewLeads(leads, { isAr = true, toast } = {}) {
  if (!Array.isArray(leads)) return;
  const now = Date.now();
  const fresh = [];
  for (const lead of leads) {
    if (!lead?._cloud || lead.id == null) continue; // only leads that came from Firestore
    const id = String(lead.id);
    if (seen.has(id)) continue;
    seen.add(id);
    const age = now - createdMillis(lead);
    if (age >= 0 && age <= ALERT_WINDOW_MS) fresh.push(lead);
  }
  if (fresh.length === 0) return;

  playNotificationChime();
  const first = fresh[0];
  const headline = formatLeadHeadline(first, isAr);
  const text = fresh.length === 1
    ? headline
    : (isAr ? `${headline} (+${fresh.length - 1} طلبات أخرى)` : `${headline} (+${fresh.length - 1} more)`);

  if (typeof toast === 'function') toast(text, 'success');
  showSystemAlert(headline, {
    body: text,
    tag: `lead-${first.id}`,
    data: { url: `/crm?lead=${encodeURIComponent(first.id)}`, leadId: String(first.id) },
    onClick: () => window.dispatchEvent(new CustomEvent('oneline_open_lead', { detail: { leadId: first.id, lead: first } }))
  });
}

// Expat remote inspections and trade-ins: their own lists in the CRM, so they ring here too
export const INTAKE_KINDS = {
  remote_inspections: { tab: 'expat', ar: '🌍 طلب معاينة عن بُعد (مغترب)', en: '🌍 Remote inspection request' },
  trade_ins: { tab: 'trade_ins', ar: '🔁 طلب بدل / استبدال', en: '🔁 Trade-in request' }
};
export const intakeHeadline = (item, isAr = true) => {
  const k = INTAKE_KINDS[item?._kind] || INTAKE_KINDS.remote_inspections;
  const name = String(item?.name || item?.clientName || (isAr ? 'عميل' : 'Client')).slice(0, 40);
  return `${isAr ? k.ar : k.en} — ${name}`;
};

const seenIntake = new Set();
/** Call with the CRM's latest intake requests (each tagged _kind): rings once for each fresh one */
export function announceIntake(items, { isAr = true, toast } = {}) {
  if (!Array.isArray(items)) return;
  const now = Date.now();
  const fresh = [];
  for (const it of items) {
    const key = `${it?._kind}/${it?.id}`;
    if (!it?.id || seenIntake.has(key)) continue;
    seenIntake.add(key);
    const age = now - (Date.parse(it.createdAtIso || '') || 0);
    if (age >= 0 && age <= ALERT_WINDOW_MS) fresh.push(it);
  }
  if (fresh.length === 0) return;
  playNotificationChime();
  const first = fresh[0];
  const headline = intakeHeadline(first, isAr);
  const text = fresh.length > 1 ? `${headline} (+${fresh.length - 1})` : headline;
  if (typeof toast === 'function') toast(text, 'success');
  const tab = (INTAKE_KINDS[first._kind] || INTAKE_KINDS.remote_inspections).tab;
  showSystemAlert(headline, { body: text, tag: `${first._kind}-${first.id}`, data: { url: `/crm?tab=${tab}` } });
}

const KIND_AR = {
  property_brochure: 'بروشور الوحدة',
  story_card: 'بطاقة الستوري',
  project_brochure: 'كتالوج المشروع',
  investor_prospectus: 'دراسة المستثمرين',
  compare_pdf: 'ملف مقارنة العقارات'
};
export const downloadKindLabel = (kind, isAr = true) => (isAr ? KIND_AR[kind] : kind?.replace(/_/g, ' ')) || (isAr ? 'ملف' : 'file');
export const describeDownload = (d, isAr = true) => {
  const what = downloadKindLabel(d.kind, isAr);
  return isAr
    ? `${d.clientName || 'عميل'} حمّل ${what}${d.itemTitle ? `: ${d.itemTitle}` : ''}`
    : `${d.clientName || 'A client'} downloaded the ${what}${d.itemTitle ? `: ${d.itemTitle}` : ''}`;
};

const seenDownloads = new Set();
/** Call with the CRM's latest client downloads: rings once for each one from the last few minutes */
export function announceDownloads(downloads, { isAr = true, toast } = {}) {
  if (!Array.isArray(downloads)) return;
  const now = Date.now();
  const fresh = [];
  for (const d of downloads) {
    if (!d?.id || seenDownloads.has(d.id)) continue;
    seenDownloads.add(d.id);
    const age = now - createdMillis(d);
    if (age >= 0 && age <= ALERT_WINDOW_MS) fresh.push(d);
  }
  if (fresh.length === 0) return;
  playNotificationChime();
  const text = `📥 ${describeDownload(fresh[0], isAr)}${fresh.length > 1 ? (isAr ? ` (+${fresh.length - 1})` : ` (+${fresh.length - 1})`) : ''}`;
  if (typeof toast === 'function') toast(text, 'success');
  showSystemAlert(isAr ? 'تحميل ملف — 1Line' : 'File downloaded — 1Line', { body: text, tag: `dl-${fresh[0].id}`, data: { url: '/crm' } });
}
