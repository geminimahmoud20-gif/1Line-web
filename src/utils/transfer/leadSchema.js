// =============================================================
//  Clients (leads) ⇄ spreadsheets. Same idea as propertySchema.js: recognised column names per
//  field, value conversion, and the export uses the first label so a file round-trips.
// =============================================================

import { normKey, stripLinks, parseNumber, parseDate, normalizePhone } from './normalize.js';
import { mapPropertyType, mapAreaKey } from './propertySchema.js';

export const LEAD_FIELDS = [
  { key: 'name', label: 'اسم العميل', aliases: ['اسم العميل', 'الاسم', 'العميل', 'اسم', 'name', 'client', 'customer', 'full name', 'contact'] },
  { key: 'phone', label: 'الهاتف', aliases: ['الهاتف', 'رقم الهاتف', 'الموبايل', 'رقم الموبايل', 'تليفون', 'الرقم', 'phone', 'mobile', 'phone number', 'tel'] },
  { key: 'whatsapp', label: 'واتساب', aliases: ['واتساب', 'رقم الواتساب', 'whatsapp', 'wa'] },
  { key: 'email', label: 'البريد الإلكتروني', aliases: ['البريد الالكتروني', 'الايميل', 'البريد', 'email', 'e mail', 'mail'] },
  { key: 'type', label: 'نوع العميل', aliases: ['نوع العميل', 'نوع الطلب', 'التصنيف', 'النوع', 'الفئه', 'type', 'client type', 'lead type', 'category'] },
  { key: 'status', label: 'المرحلة', aliases: ['المرحله', 'الحاله', 'حاله العميل', 'status', 'stage', 'pipeline stage'] },
  { key: 'budget', label: 'الميزانية (ج.م)', aliases: ['الميزانيه ج م', 'الميزانيه', 'الميزانيه المتاحه', 'budget', 'max price'] },
  { key: 'propertyType', label: 'نوع العقار المطلوب', aliases: ['نوع العقار المطلوب', 'نوع العقار', 'العقار المطلوب', 'property type', 'interest'] },
  { key: 'area', label: 'المنطقة', aliases: ['المنطقه', 'المنطقه المطلوبه', 'الحي', 'area', 'location', 'district', 'city'] },
  { key: 'source', label: 'المصدر', aliases: ['المصدر', 'مصدر العميل', 'القناه', 'source', 'channel', 'lead source', 'utm source'] },
  { key: 'assignedTo', label: 'المسؤول', aliases: ['المسؤول', 'الموظف', 'المستشار', 'assigned to', 'owner', 'agent', 'assignee'] },
  { key: 'notes', label: 'ملاحظات', aliases: ['ملاحظات', 'الملاحظات', 'تفاصيل', 'الطلب', 'notes', 'comments', 'details', 'message'] },
  { key: 'createdAt', label: 'تاريخ التسجيل', aliases: ['تاريخ التسجيل', 'تاريخ الاضافه', 'التاريخ', 'created', 'created at', 'date'] }
];

export function mapLeadType(value) {
  const t = normKey(value);
  if (!t) return null;
  if (['buyer', 'seller', 'broker', 'investor', 'request'].includes(t)) return t;
  if (/بائع|بيع|مالك|عرض|seller|owner|landlord|listing/.test(t)) return 'seller';
  if (/مستثمر|استثمار|investor/.test(t)) return 'investor';
  if (/وسيط|سمسار|broker|agent/.test(t)) return 'broker';
  if (/مشتري|شراء|طالب|مستاجر|ايجار|buyer|purchase|tenant/.test(t)) return 'buyer';
  if (/خاص|مخصص|request/.test(t)) return 'request';
  return null;
}

export function mapLeadStatus(value) {
  const t = normKey(value);
  if (!t) return null;
  if (['new', 'contacted', 'site visit', 'negotiating', 'closing', 'closed'].includes(t)) return t.replace(' ', '_');
  if (/ناجح|تم البيع|مغلق|closed|won|تمت/.test(t)) return 'closed';
  if (/توقيع|حجز|عربون|closing|deposit/.test(t)) return 'closing';
  if (/تفاوض|negotiat/.test(t)) return 'negotiating';
  if (/معاينه|زياره|visit/.test(t)) return 'site_visit';
  if (/تواصل|اتصال|متابعه|contacted|follow/.test(t)) return 'contacted';
  if (/جديد|new/.test(t)) return 'new';
  return null;
}

/**
 * One row → { lead, warnings } or { skip: reason }.
 * options.areas: CRM area list.
 */
export function rowToLead(row, { areas = [], now = new Date() } = {}) {
  const warnings = [];
  const text = (k) => stripLinks(row[k] ?? '').trim();
  const phone = normalizePhone(row.phone) || normalizePhone(row.whatsapp);
  const whatsapp = normalizePhone(row.whatsapp) || phone;
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text('email')) ? text('email').toLowerCase() : '';
  const name = text('name').slice(0, 100);
  if (!phone && !email) return { skip: 'بدون رقم هاتف أو بريد' };
  if (row.phone && !normalizePhone(row.phone)) warnings.push(`رقم غير صالح «${String(row.phone).trim()}»`);

  const type = mapLeadType(row.type) || 'buyer';
  const status = mapLeadStatus(row.status) || 'new';
  const budget = parseNumber(row.budget);
  const area = mapAreaKey(text('area'), areas) || '';
  if (text('area') && !area) warnings.push(`منطقة خارج القائمة «${text('area')}»`);
  const propertyType = mapPropertyType(row.propertyType) || '';
  const createdAt = parseDate(row.createdAt);
  const extraNotes = [
    text('area') && !area ? `المنطقة: ${text('area')}` : '',
    text('propertyType') && !propertyType ? `العقار: ${text('propertyType')}` : ''
  ].filter(Boolean).join(' | ');

  const lead = {
    name: name.length >= 2 ? name : `عميل ${phone || email}`,
    phone,
    whatsapp,
    email,
    type,
    status,
    budget: budget || '',
    propertyType,
    area,
    source: text('source') || 'استيراد ملف',
    assignedTo: text('assignedTo') || 'Unassigned',
    notes: [text('notes'), extraNotes].filter(Boolean).join(' | ').slice(0, 2000),
    temperature: 'warm',
    score: 70,
    details: { propertyType, area, budget: budget || '' },
    // The original registration date; createdAt itself is set by the server when saved
    originalCreatedAt: createdAt ? new Date(`${createdAt}T12:00:00Z`).toISOString() : now.toISOString(),
    importedAt: now.toISOString()
  };
  return { lead, warnings };
}

/** Export: one lead → { [label]: value } */
export function leadToRow(l) {
  const typeLabel = { buyer: 'مشتري', seller: 'بائع / مالك', broker: 'وسيط', investor: 'مستثمر', request: 'طلب خاص' };
  const statusLabel = { new: 'جديد', contacted: 'تم التواصل', site_visit: 'معاينة', negotiating: 'تفاوض', closing: 'توقيع وحجز', closed: 'صفقة ناجحة' };
  const created = l.createdAt?.toDate ? l.createdAt.toDate().toISOString() : (l.createdAt || l.timestamp || '');
  const values = {
    name: l.name || '',
    phone: l.phone || '',
    whatsapp: l.whatsapp || '',
    email: l.email || '',
    type: typeLabel[l.type] || l.type || '',
    status: statusLabel[l.status] || l.status || '',
    budget: Number(l.budget || l.details?.budget) || '',
    propertyType: l.propertyType || l.details?.propertyType || '',
    area: l.area || l.details?.area || '',
    source: l.source || '',
    assignedTo: l.assignedTo || '',
    notes: l.notes || '',
    createdAt: String(created).slice(0, 10)
  };
  return Object.fromEntries(LEAD_FIELDS.map((f) => [f.label, values[f.key] ?? '']));
}
