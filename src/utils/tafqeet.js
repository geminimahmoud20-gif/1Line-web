// Amount in Arabic words for receipts ("تفقيط"): 50000 → «فقط خمسون ألف جنيه مصري لا غير».
// Whole pounds only; the counted noun after 11+ stays singular (ألف / مليون), as Egyptian receipts write it.

const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
  'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

const SCALES = [
  { value: 1e9, one: 'مليار', two: 'ملياران', few: 'مليارات' },
  { value: 1e6, one: 'مليون', two: 'مليونان', few: 'ملايين' },
  { value: 1e3, one: 'ألف', two: 'ألفان', few: 'آلاف' },
];

const below100 = (n) => {
  if (n < 20) return ONES[n];
  const unit = n % 10;
  const tens = TENS[Math.floor(n / 10)];
  return unit ? `${ONES[unit]} و${tens}` : tens;
};

const below1000 = (n) => {
  const parts = [HUNDREDS[Math.floor(n / 100)], below100(n % 100)].filter(Boolean);
  return parts.join(' و');
};

const scaleWords = (count, scale) => {
  if (count === 1) return scale.one;
  if (count === 2) return scale.two;
  const lastTwo = count % 100;
  const noun = lastTwo >= 3 && lastTwo <= 10 ? scale.few : scale.one;
  return `${below1000(count)} ${noun}`;
};

export function numberToArabicWords(value) {
  let n = Math.floor(Math.abs(Number(value) || 0));
  if (n === 0) return 'صفر';
  const parts = [];
  for (const scale of SCALES) {
    const count = Math.floor(n / scale.value);
    if (count) parts.push(scaleWords(count, scale));
    n %= scale.value;
  }
  if (n) parts.push(below1000(n));
  return parts.join(' و');
}

export function amountInArabicWords(value) {
  return `فقط ${numberToArabicWords(value)} جنيه مصري لا غير`;
}
