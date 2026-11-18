// The editable parts of the About page: which sections show, the company's facts, the team and
// partners, and a few photos of the company. Stored as `about` inside the founder CMS settings
// (settings/founder_cms); every item has its own `visible` switch, and an empty field never shows.
// Pure helpers, unit-tested in tests/unit/about-profile.test.mjs.

export const ABOUT_SECTIONS = [
  { id: 'founder', ar: 'المؤسس', en: 'Founder' },
  { id: 'company', ar: 'بيانات الشركة', en: 'Company facts' },
  { id: 'team', ar: 'فريق العمل والشركاء', en: 'Team & partners' },
  { id: 'gallery', ar: 'صور الشركة', en: 'Company photos' },
  { id: 'standards', ar: 'معايير العمل', en: 'Standards' },
  { id: 'hq', ar: 'المقر والتواصل', en: 'Office & contact' },
  { id: 'faq', ar: 'الأسئلة الشائعة', en: 'FAQ' },
  { id: 'cta', ar: 'دعوة التواصل في الآخر', en: 'Closing call to action' }
];

export const COMPANY_FIELDS = [
  { key: 'legalName', ar: 'الاسم القانوني', en: 'Legal name', hint_ar: 'مثال: 1Line للوساطة العقارية' },
  { key: 'founded', ar: 'سنة التأسيس', en: 'Founded', hint_ar: 'مثال: 2018' },
  { key: 'commercialReg', ar: 'السجل التجاري', en: 'Commercial registry', hint_ar: 'رقم السجل ومكتبه' },
  { key: 'taxId', ar: 'البطاقة الضريبية', en: 'Tax ID', hint_ar: 'الرقم الضريبي' },
  { key: 'license', ar: 'الترخيص', en: 'Licence', hint_ar: 'مثال: ترخيص مزاولة الوساطة العقارية رقم …' },
  { key: 'coverage', ar: 'مناطق العمل', en: 'Where we work', hint_ar: 'مثال: سوهاج والقاهرة الكبرى' },
  { key: 'hours', ar: 'مواعيد العمل', en: 'Working hours', hint_ar: 'مثال: يومياً من 1 الظهر لـ 9 بالليل (عدا الجمعة)' },
  { key: 'teamSize', ar: 'حجم الفريق', en: 'Team size', hint_ar: 'مثال: 12 موظف ومستشار' }
];

export const TEAM_GROUPS = [
  { id: 'management', ar: 'الإدارة', en: 'Management' },
  { id: 'advisors', ar: 'المستشارين والمبيعات', en: 'Advisors & sales' },
  { id: 'partners', ar: 'الشركاء', en: 'Partners' }
];

export const LIMITS = { team: 40, gallery: 12 };

/** Which part of a portrait the round frame keeps: the face is usually in the top third */
export const PHOTO_POSITIONS = [
  { id: 'top', ar: 'الوش فوق', en: 'Face high', css: '50% 18%' },
  { id: 'center', ar: 'في النص', en: 'Centre', css: '50% 50%' },
  { id: 'bottom', ar: 'تحت', en: 'Low', css: '50% 85%' }
];
export const photoPositionCss = (id) => (PHOTO_POSITIONS.find((p) => p.id === id) || PHOTO_POSITIONS[0]).css;

/** The legal advisor stands out unless switched off: a card that is not set either way follows the role */
const LEGAL_ROLE = /قانون|legal|lawyer|محام/i;
const isLegalRole = (m) => LEGAL_ROLE.test(`${m?.role_ar || ''} ${m?.role_en || ''}`);

/**
 * A bio written as lines («_ خبرة 40 سنة» on each line) becomes a list of points; a bio written
 * as one sentence stays one paragraph (a single point).
 */
export function bioPoints(text) {
  return String(text ?? '')
    .split(/\r?\n|\s+[_•·]\s*|^[_•·]\s*/u)
    .map((line) => line.replace(/^[\s_\-•·*–]+/u, '').trim())
    .filter(Boolean);
}

/** «ا.زكريا» → «أ. زكريا»: the usual way to write the title, with its hamza and a space */
export const displayName = (name) => clean(name).replace(/^ا\.\s*/u, 'أ. ').replace(/^(أ|د|م)\.(?=\S)/u, '$1. ');

const clean = (v) => String(v ?? '').trim();
const on = (v) => v !== false;
const pick = (isAr, item, key) => clean(isAr ? item[`${key}_ar`] : (item[`${key}_en`] || item[`${key}_ar`]));
const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** A blank team card for the CRM; it stays hidden until it has a name */
export const blankMember = (group = 'advisors') => ({
  id: newId('m'), group, name_ar: '', name_en: '', role_ar: '', role_en: '', bio_ar: '', bio_en: '',
  photo: '', photoPos: 'top', whatsapp: '', visible: true, featured: false, show: { photo: true, role: true, bio: true, whatsapp: false }
});

export const blankPhoto = (url = '') => ({ id: newId('g'), url, caption_ar: '', caption_en: '', visible: true });

/** The stored value in one shape, whatever was saved before (or nothing) */
export function normalizeAbout(raw) {
  const a = raw && typeof raw === 'object' ? raw : {};
  const sections = Object.fromEntries(ABOUT_SECTIONS.map((s) => [s.id, on(a.sections?.[s.id])]));
  const company = Object.fromEntries(COMPANY_FIELDS.map((f) => {
    const v = a.company?.[f.key] || {};
    return [f.key, { value_ar: clean(v.value_ar), value_en: clean(v.value_en), visible: on(v.visible) }];
  }));
  const groups = new Set(TEAM_GROUPS.map((g) => g.id));
  const team = (Array.isArray(a.team) ? a.team : []).filter((m) => m && typeof m === 'object').slice(0, LIMITS.team).map((m) => ({
    ...blankMember(),
    ...m,
    id: clean(m.id) || newId('m'),
    group: groups.has(m.group) ? m.group : 'advisors',
    visible: on(m.visible),
    photoPos: PHOTO_POSITIONS.some((p) => p.id === m.photoPos) ? m.photoPos : 'top',
    featured: typeof m.featured === 'boolean' ? m.featured : isLegalRole(m),
    show: { photo: on(m.show?.photo), role: on(m.show?.role), bio: on(m.show?.bio), whatsapp: m.show?.whatsapp === true }
  }));
  const gallery = (Array.isArray(a.gallery) ? a.gallery : []).filter((g) => g && clean(g.url) && !clean(g.url).startsWith('data:'))
    .slice(0, LIMITS.gallery).map((g) => ({ ...blankPhoto(), ...g, id: clean(g.id) || newId('g'), url: clean(g.url), visible: on(g.visible) }));
  return { sections, company, team, gallery };
}

export const sectionOn = (about, id) => normalizeAbout(about).sections[id] !== false;

/** Company facts the visitor sees: switched on and filled in */
export function visibleCompanyFacts(about, isAr = true) {
  const { company } = normalizeAbout(about);
  return COMPANY_FIELDS
    .map((f) => ({ key: f.key, label: isAr ? f.ar : f.en, value: pick(isAr, company[f.key], 'value'), visible: company[f.key].visible }))
    .filter((f) => f.visible && f.value)
    .map(({ key, label, value }) => ({ key, label, value }));
}

/** wa.me digits for an Egyptian or international number; '' when it isn't one */
export function waDigits(input) {
  let d = String(input ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('01') && d.length === 11) d = `2${d}`;
  return d.length >= 10 && d.length <= 15 ? d : '';
}

const visibleMember = (m, isAr) => {
  const wa = m.show.whatsapp ? waDigits(m.whatsapp) : '';
  const bio = m.show.bio ? pick(isAr, m, 'bio') : '';
  return {
    id: m.id,
    name: displayName(pick(isAr, m, 'name')),
    role: m.show.role ? pick(isAr, m, 'role') : '',
    bio,
    points: bioPoints(bio),
    photo: m.show.photo ? clean(m.photo) : '',
    photoPos: m.photoPos,
    whatsapp: wa,
    legal: isLegalRole(m)
  };
};
const shown = (m, isAr) => m.visible && pick(isAr, m, 'name');

/** People shown large at the top of the team (the legal advisor by default) */
export function featuredTeam(about, isAr = true) {
  return normalizeAbout(about).team.filter((m) => m.featured && shown(m, isAr)).map((m) => visibleMember(m, isAr));
}

/** Team grouped for the page: only shown people with a name, each field only when switched on; featured people are left to featuredTeam */
export function visibleTeam(about, isAr = true) {
  const { team } = normalizeAbout(about);
  return TEAM_GROUPS.map((g) => ({
    id: g.id,
    label: isAr ? g.ar : g.en,
    members: team.filter((m) => m.group === g.id && !m.featured && shown(m, isAr)).map((m) => visibleMember(m, isAr))
  })).filter((g) => g.members.length > 0);
}

/** Gallery photos the visitor sees */
export function visibleGallery(about, isAr = true) {
  return normalizeAbout(about).gallery
    .filter((g) => g.visible)
    .map((g) => ({ id: g.id, url: g.url, caption: pick(isAr, g, 'caption') }));
}

/** First letter of the name (after a title like «د.») for a card without a photo; two for Latin names */
export function initials(name) {
  const words = clean(name).replace(/^(د|م|أ|ا)\.\s*/u, '').split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  return /^[A-Za-z]/.test(words[0]) ? words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() : words[0][0];
}

/** Move an item one step up (-1) or down (+1) in a list */
export function moveItem(list, index, step) {
  const to = index + step;
  if (!Array.isArray(list) || index < 0 || index >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}
