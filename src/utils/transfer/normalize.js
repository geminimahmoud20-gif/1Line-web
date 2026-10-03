// =============================================================
//  Cleaning values coming from other systems (Notion, Excel sheets, other CRMs) before they
//  land in 1Line fields: one spelling of Arabic letters for matching, numbers with any digits
//  and separators, dates in common formats, Egyptian phone numbers.
// =============================================================

import { toLatinDigits } from '../latinDigits.js';

/**
 * Text for comparing labels: Arabic letter variants unified (أإآ→ا، ة→ه، ى→ي), diacritics,
 * tatweel, emoji, brackets and punctuation removed, lowercase, single spaces.
 */
export function normKey(value) {
  return toLatinDigits(String(value ?? ''))
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Notion exports links next to relation values: "28 (https://app.notion.com/p/…)" → "28" */
export function stripLinks(value) {
  return String(value ?? '')
    .replace(/\s*\((?:https?:\/\/)[^)]*\)/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim();
}

/** "8,900,000" / "٨٫٩ مليون" / "1.350.000 ج.م" / "2.5m" → number, or null */
export function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let s = toLatinDigits(String(value)).trim().toLowerCase();
  if (!s) return null;
  let factor = 1;
  if (/مليون|million|\bm\b|(\d)m$/.test(s)) factor = 1e6;
  else if (/الف|ألف|thousand|\bk\b|(\d)k$/.test(s)) factor = 1e3;
  s = s.replace(/[^\d.,-]/g, '');
  if (!s || !/\d/.test(s)) return null;
  // Thousands separators: "1,350,000" or "1.350.000"; a single "." or "," with 1–2 decimals is a fraction
  const groups = s.split(/[.,]/);
  if (groups.length > 2 || (groups.length === 2 && groups[1].length === 3 && factor === 1)) {
    s = groups.join('');
  } else {
    s = s.replace(',', '.');
  }
  const n = Number(s) * factor;
  return Number.isFinite(n) ? n : null;
}

/** Whole number (floors, rooms); "الأرضي" → 0 */
export function parseCount(value) {
  const t = normKey(value);
  if (!t) return null;
  if (/^(الارضي|ارضي|ground|g)$/.test(t)) return 0;
  const n = parseNumber(value);
  return n === null ? null : Math.round(n);
}

const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
  يناير: 0, فبراير: 1, مارس: 2, ابريل: 3, مايو: 4, يونيو: 5, يوليو: 6, اغسطس: 7, سبتمبر: 8, اكتوبر: 9, نوفمبر: 10, ديسمبر: 11
};

/** "May 22, 2024" / "2024-05-22" / "22/05/2024" / "22 مايو 2024" → "2024-05-22", or null */
export function parseDate(value) {
  const raw = toLatinDigits(String(value ?? '')).trim();
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const ymd = (y, m, d) => {
    const dt = new Date(Date.UTC(y, m, d));
    return Number.isNaN(dt.getTime()) || dt.getUTCDate() !== d ? null : dt.toISOString().slice(0, 10);
  };
  if (iso) return ymd(+iso[1], +iso[2] - 1, +iso[3]);
  const dmy = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (dmy) return ymd(+dmy[3], +dmy[2] - 1, +dmy[1]);
  const words = normKey(raw).split(' ');
  const mi = words.findIndex((w) => w in MONTHS);
  const nums = words.filter((w) => /^\d+$/.test(w)).map(Number);
  const year = nums.find((n) => n > 1900);
  const day = nums.find((n) => n >= 1 && n <= 31);
  if (mi !== -1 && year && day) return ymd(year, MONTHS[words[mi]], day);
  return null;
}

/**
 * Egyptian mobile in local form (01xxxxxxxxx). Accepts 1xxxxxxxxx (leading 0 dropped by
 * Excel), 201xxxxxxxxx, +20…, 0020…. Other international numbers are kept with "+".
 * Returns '' when it isn't a phone number.
 */
export function normalizePhone(value) {
  const raw = toLatinDigits(String(value ?? '')).trim();
  let d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0020')) d = d.slice(4);
  else if (d.startsWith('20') && d.length === 12) d = d.slice(2);
  if (/^1[0125]\d{8}$/.test(d)) return `0${d}`;
  if (/^01[0125]\d{8}$/.test(d)) return d;
  if (/^0\d{8,9}$/.test(d)) return d; // landline
  if ((raw.startsWith('+') || raw.startsWith('00')) && d.length >= 8 && d.length <= 15) return `+${d.replace(/^00/, '')}`;
  return '';
}

/** First value of a multi-select cell: "Whatsapp, telegram" → ["Whatsapp", "telegram"] */
export const splitList = (value) => String(value ?? '').split(/[,،;|\n]+/).map((s) => s.trim()).filter(Boolean);
