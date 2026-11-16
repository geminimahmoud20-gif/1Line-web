// Completion of the sell form, shown as the green ring. Counts what the owner has actually filled in.
import { toLatinDigits } from './latinDigits.js';
const digits = (v) => toLatinDigits(String(v ?? '')).replace(/\D/g, '');

export function sellProgress(a = {}) {
  const items = {
    type: Boolean(a.propertyType),
    area: Boolean(a.area),
    size: parseInt(digits(a.size), 10) >= 20,
    address: String(a.address || '').trim().length >= 3,
    photos: Object.keys(a.photoSlots || {}).length > 0,
    name: String(a.name || '').trim().length >= 2,
    phone: digits(a.phone).length >= 8
  };
  const keys = Object.keys(items);
  const done = keys.filter((k) => items[k]).length;
  const next = keys.find((k) => !items[k]) || null;
  return { items, done, total: keys.length, next, percent: Math.round((done / keys.length) * 100) };
}
