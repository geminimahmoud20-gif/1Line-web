// Arabic noun agreement with a number: 1 غرفة، 2 غرفتين، 3–10 غرف، 11+ غرفة.
const FORMS = {
  room: { one: 'غرفة', two: 'غرفتين', few: 'غرف', many: 'غرفة', en: ['room', 'rooms'] },
  bath: { one: 'حمام', two: 'حمامين', few: 'حمامات', many: 'حمام', en: ['bath', 'baths'] },
  listing: { one: 'عرض', two: 'عرضين', few: 'عروض', many: 'عرض', en: ['listing', 'listings'] },
  property: { one: 'عقار', two: 'عقارين', few: 'عقارات', many: 'عقار', en: ['property', 'properties'] },
  unit: { one: 'وحدة', two: 'وحدتين', few: 'وحدات', many: 'وحدة', en: ['listing', 'listings'] },
  area: { one: 'منطقة', two: 'منطقتين', few: 'مناطق', many: 'منطقة', en: ['area', 'areas'] }
};

export function countWord(kind, n, isAr = true) {
  const f = FORMS[kind];
  const v = Math.abs(Math.trunc(Number(n) || 0));
  if (!isAr) return v === 1 ? f.en[0] : f.en[1];
  if (v === 1) return f.one;
  if (v === 2) return f.two;
  if (v >= 3 && v <= 10) return f.few;
  return f.many;
}

export const countLabel = (kind, n, isAr = true) => `${n} ${countWord(kind, n, isAr)}`;

/** As it is said: «عقار واحد»، «عقارين»، «3 عقارات»، «12 عقار» (and «1 listing» in English) */
export function countPhrase(kind, n, isAr = true) {
  const v = Math.abs(Math.trunc(Number(n) || 0));
  if (!isAr) return `${v} ${countWord(kind, v, false)}`;
  if (v === 1) return `${FORMS[kind].one} ${kind === 'area' || kind === 'unit' ? 'واحدة' : 'واحد'}`;
  if (v === 2) return FORMS[kind].two;
  return `${v} ${countWord(kind, v, true)}`;
}
