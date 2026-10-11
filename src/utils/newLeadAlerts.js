// =============================================================
//  CRM: chime + toast + desktop notification when a new lead lands in the live list.
//  Complements the WhatsApp alert (api/notify.js) for staff who have the CRM open.
//  Only leads created in the last ALERT_WINDOW_MS count as new, so opening the CRM doesn't ring for
//  the whole backlog, and each lead rings once per page load.
// =============================================================

import { playNotificationChime } from './notificationHub';
import { leadKind, kindInfo, describeRequest } from './leadRequests.js';

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
export const enableDesktopAlerts = async () => {
  if (!desktopAlertsSupported()) return false;
  try {
    return (await window.Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
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
  // Most urgent first: a reservation, then a viewing, then the rest
  const urgency = { reservation_request: 0, viewing_request: 1 };
  fresh.sort((a, b) => (urgency[leadKind(a)] ?? 9) - (urgency[leadKind(b)] ?? 9));
  const first = fresh[0];
  const info = kindInfo(leadKind(first));
  const text = fresh.length === 1
    ? describeRequest(first, isAr)
    : `${describeRequest(first, isAr)} ${isAr ? `(+${fresh.length - 1} طلبات تانية)` : `(+${fresh.length - 1} more)`}`;
  if (typeof toast === 'function') toast(text, 'success');
  if (desktopAlertsEnabled()) {
    try {
      const n = new window.Notification(`${info.icon} ${isAr ? info.ar : info.en} — 1Line`, { body: text, tag: `lead-${first.id}`, icon: '/icon-192.png' });
      n.onclick = () => { window.focus(); openLeadInCrm(first.id); n.close(); };
    } catch { /* some mobile browsers only allow notifications from a service worker */ }
  }
}

/** Ask the CRM to show one lead (bell items, desktop alerts): switches to Leads and opens it. */
export function openLeadInCrm(id) {
  if (typeof window === 'undefined' || id == null) return;
  window.dispatchEvent(new CustomEvent('oneline_open_lead', { detail: { id: String(id) } }));
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
  if (desktopAlertsEnabled()) {
    try {
      const n = new window.Notification(isAr ? 'تحميل ملف — 1Line' : 'File downloaded — 1Line', { body: text, tag: `dl-${fresh[0].id}`, icon: '/icon-192.png' });
      n.onclick = () => { window.focus(); n.close(); };
    } catch { /* some browsers only allow notifications from a service worker */ }
  }
}
