// =============================================================
//  Ad campaigns — homepage hero takeover + in-page sponsored banners.
//  Stored in Firestore settings/ad_campaigns (public read, super-admin write),
//  cached in localStorage so the page (and index.html's LCP preload) can use it instantly.
//
//  Campaign shape:
//    id, placement: 'hero' | 'inline', active: boolean, priority: number (higher wins)
//    advertiser, title_ar, title_en, subtitle_ar, subtitle_en, cta_ar, cta_en
//    url: internal path ('/projects') or https URL
//    imageDesktop (https, ~1920×1080), imageMobile (https, ~900×1200, optional)
//    startAt, endAt: 'YYYY-MM-DD' (inclusive, local time)
// =============================================================

import { useEffect, useState } from 'react';
import { saveSettings, subscribeToSettings, incrementAdStat } from '../firebaseLazy.js';

export const ADS_SETTINGS_KEY = 'ad_campaigns';
export const ADS_CACHE_KEY = 'oneline_ad_campaigns';
const UPDATED_EVENT = 'oneline_ad_campaigns_updated';
const SYNC_FAILED_EVENT = 'oneline_ad_campaigns_sync_failed';

const parseDay = (v, end = false) => {
  if (!v) return null;
  const [y, m, d] = String(v).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return end ? new Date(y, m - 1, d, 23, 59, 59, 999).getTime() : new Date(y, m - 1, d).getTime();
};

/** 'paused' | 'scheduled' | 'live' | 'ended' */
export function campaignStatus(c, now = Date.now()) {
  if (!c?.active) return 'paused';
  const start = parseDay(c.startAt);
  const end = parseDay(c.endAt, true);
  if (start && now < start) return 'scheduled';
  if (end && now > end) return 'ended';
  return 'live';
}

export const isSafeAdUrl = (url) => {
  const u = String(url || '').trim();
  if (/^\/(?!\/)[\w\-./?=&%#~]*$/.test(u)) return true; // internal path
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isSafeImageUrl = (url) => {
  try {
    return new URL(String(url || '').trim()).protocol === 'https:';
  } catch {
    return false;
  }
};

const byPriority = (a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0) || String(b.startAt || '').localeCompare(String(a.startAt || ''));

export function pickHeroCampaign(list, now = Date.now()) {
  return (list || []).filter((c) => c.placement === 'hero' && campaignStatus(c, now) === 'live' && isSafeImageUrl(c.imageDesktop)).sort(byPriority)[0] || null;
}

export function getInlineCampaigns(list, now = Date.now()) {
  return (list || []).filter((c) => c.placement === 'inline' && campaignStatus(c, now) === 'live' && isSafeImageUrl(c.imageDesktop)).sort(byPriority);
}

export function getCampaigns() {
  try {
    const raw = JSON.parse(localStorage.getItem(ADS_CACHE_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((c) => c && c.id) : [];
  } catch {
    return [];
  }
}

const cacheLocally = (list) => {
  try {
    localStorage.setItem(ADS_CACHE_KEY, JSON.stringify(list));
  } catch { /* storage unavailable */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(UPDATED_EVENT, { detail: list }));
};

/** Local first, cloud in the background; failures raise SYNC_FAILED_EVENT for the CRM toast */
export function saveCampaigns(list) {
  cacheLocally(list);
  return saveSettings(ADS_SETTINGS_KEY, { campaigns: list })
    .then((ok) => { if (ok === false) throw new Error('saveSettings returned false'); return true; })
    .catch((err) => {
      console.warn('Ad campaigns cloud sync failed:', err);
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SYNC_FAILED_EVENT));
      return false;
    });
}

/**
 * Subscribe to campaigns (cloud + local changes). Returns unsubscribe.
 * An empty cloud list is authoritative too (all campaigns deleted), unlike areas.
 */
export function subscribeToCampaigns(callback) {
  const onLocal = (e) => callback(e.detail || getCampaigns());
  window.addEventListener(UPDATED_EVENT, onLocal);
  const unsubCloud = subscribeToSettings(ADS_SETTINGS_KEY, (data) => {
    if (data && Array.isArray(data.campaigns)) cacheLocally(data.campaigns);
  });
  return () => {
    window.removeEventListener(UPDATED_EVENT, onLocal);
    if (typeof unsubCloud === 'function') unsubCloud();
  };
}

export const onCampaignSyncFailed = (fn) => {
  window.addEventListener(SYNC_FAILED_EVENT, fn);
  return () => window.removeEventListener(SYNC_FAILED_EVENT, fn);
};

/** One impression per campaign per browser session; clicks always count. Never tracks inside the CRM. */
export function trackAd(campaignId, kind) {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/crm')) return;
  if (kind === 'impressions') {
    const key = `oneline_ad_seen_${campaignId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch { /* private mode: still count once per page load */ }
  }
  incrementAdStat(campaignId, kind).catch(() => {});
}

/** Live campaign list for components; re-evaluates schedules every minute */
export function useAdCampaigns() {
  const [campaigns, setCampaigns] = useState(getCampaigns);
  const [now, setNow] = useState(Date.now());
  useEffect(() => subscribeToCampaigns(setCampaigns), []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(t);
  }, []);
  return { campaigns, now };
}

export const newCampaignId = () => `ad-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
