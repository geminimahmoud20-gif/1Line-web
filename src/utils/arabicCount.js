// Arabic noun agreement with a number: 1 غرفة، 2 غرفتين، 3–10 غرف، 11+ غرفة.
const FORMS = {
  room: { one: 'غرفة', two: 'غرفتين', few: 'غرف', many: 'غرفة', en: ['room', 'rooms'] },
  bath: { one: 'حمام', two: 'حمامين', few: 'حمامات', many: 'حمام', en: ['bath', 'baths'] }
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
