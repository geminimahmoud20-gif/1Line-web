// =============================================================
//  CRM: chime + toast + desktop notification when a new lead lands in the live list.
//  Complements the WhatsApp alert (api/notify.js) for staff who have the CRM open.
//  Only leads created in the last ALERT_WINDOW_MS count as new, so opening the CRM doesn't ring for
//  the whole backlog, and each lead rings once per page load.
// =============================================================

import { playNotificationChime } from './notificationHub';

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
  const first = fresh[0];
  const name = String(first.name || (isAr ? 'عميل' : 'Lead')).slice(0, 60);
  const text = fresh.length === 1
    ? (isAr ? `🔔 عميل جديد: ${name}` : `🔔 New lead: ${name}`)
    : (isAr ? `🔔 ${fresh.length} عملاء جدد (آخرهم ${name})` : `🔔 ${fresh.length} new leads (latest ${name})`);
  if (typeof toast === 'function') toast(text, 'success');
  if (desktopAlertsEnabled()) {
    try {
      const n = new window.Notification(isAr ? 'عميل جديد — 1Line' : 'New lead — 1Line', { body: text, tag: `lead-${first.id}`, icon: '/icon-192.png' });
      n.onclick = () => { window.focus(); n.close(); };
    } catch { /* some mobile browsers only allow notifications from a service worker */ }
  }
}
