// Checks for the contact details visitors type into the site's forms (and staff into the CRM):
// a person's first and family name, an Egyptian or Gulf mobile number that isn't an obvious
// placeholder, and an email address that can receive mail. Each check returns '' when the value
// is fine, or the message to show next to the field.

const toLatinDigits = (value) => String(value ?? '')
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));

// ── Names ────────────────────────────────────────────────────────────────

// Words people type instead of their name to get past a form
const FAKE_NAME_WORDS = new Set([
  'test', 'testing', 'tester', 'asdf', 'asd', 'qwe', 'qwerty', 'xxx', 'xx', 'abc', 'aaa', 'name', 'user',
  'admin', 'null', 'undefined', 'none', 'fake', 'demo', 'sample', 'client', 'customer', 'anonymous', 'no', 'na',
  'تجربة', 'تجربه', 'اختبار', 'تست', 'اسم', 'الاسم', 'عميل', 'زبون', 'مجهول', 'لا', 'بدون', 'اي', 'أي', 'حد', 'فلان', 'علان'
]);
const LETTERS_ONLY = /^[\p{Script=Arabic}\p{Script=Latin}'’.\-\s]+$/u;
const ONE_LETTER_REPEATED = /(.)\1{2,}/u; // «ااا», «sss»

/** Words of a name, with titles («أ.», «د.», «م/», «Mr») left out */
const nameWords = (name) => String(name ?? '')
  .replace(/[ـ]/g, '')
  .split(/\s+/)
  .map((w) => w.replace(/^[.\-'’]+|[.\-'’]+$/g, ''))
  .filter(Boolean)
  .filter((w) => !/^(أ|ا|د|م|ح|mr|mrs|ms|dr|eng)\.?\/?$/i.test(w));

export function nameProblem(name, isAr = true) {
  const raw = String(name ?? '').trim().replace(/\s+/g, ' ');
  const L = (ar, en) => (isAr ? ar : en);
  if (!raw) return L('اكتب اسمك', 'Enter your name');
  if (raw.length > 80) return L('الاسم طويل قوي', 'The name is too long');
  if (/\d|[٠-٩]/.test(raw)) return L('الاسم مايكونش فيه أرقام', 'A name has no digits');
  if (!LETTERS_ONLY.test(raw)) return L('الاسم يكون حروف بس، من غير رموز', 'Use letters only, no symbols');
  const words = nameWords(raw);
  if (words.length < 2) return L('اكتب الاسم الأول واسم العيلة (مثال: أحمد علي)', 'Enter your first and family name (e.g. Ahmed Ali)');
  if (words.some((w) => w.length < 2)) return L('اكتب الاسم كامل من غير حروف مقطّعة', 'Write the full name, not initials');
  if (words.some((w) => FAKE_NAME_WORDS.has(w.toLowerCase()) || ONE_LETTER_REPEATED.test(w))) {
    return L('اكتب اسمك الحقيقي', 'Enter your real name');
  }
  if (new Set(words.map((w) => w.toLowerCase())).size === 1) return L('اكتب اسمك الحقيقي', 'Enter your real name');
  return '';
}

export const isPersonName = (name) => nameProblem(name) === '';

// ── Phones: Egyptian or Gulf mobiles only ────────────────────────────────

// local = the number without the country code and without the leading 0
export const PHONE_COUNTRIES = {
  '+20': { name_ar: 'مصر', local: /^1[0125]\d{8}$/ },
  '+966': { name_ar: 'السعودية', local: /^5\d{8}$/ },
  '+971': { name_ar: 'الإمارات', local: /^5\d{8}$/ },
  '+965': { name_ar: 'الكويت', local: /^[569]\d{7}$/ },
  '+974': { name_ar: 'قطر', local: /^[3567]\d{7}$/ },
  '+968': { name_ar: 'عمان', local: /^[79]\d{7}$/ },
  '+973': { name_ar: 'البحرين', local: /^[369]\d{7}$/ }
};

/**
 * Placeholder numbers people type to get past a form: one digit repeated (01000000000,
 * 0555555555), a run of 0123456789 / 9876543210, or a short block repeated (01212121212).
 * `subscriber` is the number after the operator prefix.
 */
export function looksLikeFakeNumber(subscriber) {
  const s = String(subscriber || '');
  if (s.length < 6) return false;
  if (/^(\d)\1+$/.test(s)) return true;
  if (/(\d)\1{5,}/.test(s)) return true; // six of the same digit in a row
  if ('01234567890123456789'.includes(s) || '98765432109876543210'.includes(s)) return true;
  if (/^(\d{2,3})\1+\d?$/.test(s)) return true;
  return false;
}

/**
 * Reads a number typed in any common way («01012345678», «+20 101 234 5678», «00966501234567»,
 * Arabic digits) and returns { code, local } for an Egyptian or Gulf mobile, or null.
 * `countryCode` is the country picked next to the field, when the form has a picker.
 */
export function parsePhone(raw, countryCode = null) {
  const text = toLatinDigits(raw).trim();
  if (!text || /[^0-9+\s\-().]/.test(text)) return null;
  let digits = text.replace(/[^0-9+]/g, '').replace(/^00/, '+');
  if (digits.startsWith('+')) {
    const code = Object.keys(PHONE_COUNTRIES).find((c) => digits.startsWith(c));
    if (!code) return null;
    return { code, local: digits.slice(code.length).replace(/^0/, '') };
  }
  if (countryCode && PHONE_COUNTRIES[countryCode]) {
    const bare = countryCode.slice(1);
    const local = digits.startsWith(bare) && digits.length > bare.length + 7 ? digits.slice(bare.length) : digits;
    return { code: countryCode, local: local.replace(/^0/, '') };
  }
  // No + and no picker: an Egyptian number written locally (01…), or 20… / 966… written without +
  if (/^01\d{9}$/.test(digits)) return { code: '+20', local: digits.slice(1) };
  const code = Object.keys(PHONE_COUNTRIES).find((c) => digits.startsWith(c.slice(1)) && digits.length > c.length + 6);
  return code ? { code, local: digits.slice(code.length - 1).replace(/^0/, '') } : null;
}

export function phoneProblem(raw, countryCode = null, isAr = true) {
  const L = (ar, en) => (isAr ? ar : en);
  if (!String(raw ?? '').trim()) return L('اكتب رقم الموبايل', 'Enter your mobile number');
  const p = parsePhone(raw, countryCode);
  if (!p) return L('الرقم لازم يكون موبايل مصري (010/011/012/015) أو خليجي', 'Use an Egyptian (010/011/012/015) or Gulf mobile number');
  const country = PHONE_COUNTRIES[p.code];
  if (!country.local.test(p.local)) {
    return p.code === '+20'
      ? L('رقم الموبايل المصري 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015', 'An Egyptian mobile is 11 digits starting 010, 011, 012 or 015')
      : L(`رقم ${country.name_ar} مش صحيح، راجعه`, 'Check the number');
  }
  const prefixLen = p.code === '+20' ? 2 : 1;
  if (looksLikeFakeNumber(p.local.slice(prefixLen))) return L('اكتب رقمك الحقيقي', 'Enter your real number');
  return '';
}

export const isValidMobile = (raw, countryCode = null) => phoneProblem(raw, countryCode) === '';

// ── Email ────────────────────────────────────────────────────────────────

// Throwaway inboxes and the usual misspellings of the big providers
const DISPOSABLE = /(^|\.)(mailinator|guerrillamail|10minutemail|tempmail|temp-mail|yopmail|trashmail|getnada|sharklasers|dispostable|maildrop|fakeinbox|throwawaymail|mintemail|emailondeck|mohmal)\./i;
const TYPOS = {
  'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmai.com': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com', 'outlook.con': 'outlook.com', 'iclod.com': 'icloud.com'
};
const FAKE_LOCAL = /^(test|testing|asdf|qwerty|abc|aaa+|x+|example|fake|none|no|na|user|email|mail|admin)\d*$/i;

/** required: false lets an empty email through (fields where email is optional) */
export function emailProblem(email, isAr = true, { required = false } = {}) {
  const L = (ar, en) => (isAr ? ar : en);
  const e = String(email ?? '').trim().toLowerCase();
  if (!e) return required ? L('اكتب الإيميل', 'Enter your email') : '';
  if (e.length > 120 || !/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(e) || e.includes('..')) {
    return L('الإيميل مش مكتوب صح (مثال: name@gmail.com)', 'Enter a valid email (e.g. name@gmail.com)');
  }
  const [local, domain] = e.split('@');
  if (TYPOS[domain]) return L(`قصدك ${local}@${TYPOS[domain]}؟`, `Did you mean ${local}@${TYPOS[domain]}?`);
  if (DISPOSABLE.test(domain) || /^(example|test|domain|email)\.(com|org|net)$/.test(domain)) {
    return L('استخدم إيميلك الحقيقي، مش إيميل مؤقت', 'Use your real email, not a temporary one');
  }
  if (FAKE_LOCAL.test(local)) return L('اكتب إيميلك الحقيقي', 'Enter your real email');
  return '';
}

export const isRealEmail = (email) => emailProblem(email, true, { required: true }) === '';

/**
 * One call for a form's submit: the first problem with its contact fields, or ''.
 * Pass only the fields the form has; phone/whatsapp may come with the picked country code.
 * An empty optional whatsapp/email is fine; `phoneOptional` for forms where the phone is optional.
 */
export function contactProblem({ name, phone, phoneCountry = null, whatsapp, whatsappCountry = null, email, emailRequired = false, phoneOptional = false } = {}, isAr = true) {
  if (name !== undefined) {
    const p = nameProblem(name, isAr);
    if (p) return p;
  }
  if (phone !== undefined && !(phoneOptional && !String(phone ?? '').trim())) {
    const p = phoneProblem(phone, phoneCountry, isAr);
    if (p) return p;
  }
  if (whatsapp !== undefined && String(whatsapp ?? '').trim()) {
    const p = phoneProblem(whatsapp, whatsappCountry, isAr);
    if (p) return isAr ? `الواتساب: ${p}` : `WhatsApp: ${p}`;
  }
  if (email !== undefined) {
    const p = emailProblem(email, isAr, { required: emailRequired });
    if (p) return p;
  }
  return '';
}
