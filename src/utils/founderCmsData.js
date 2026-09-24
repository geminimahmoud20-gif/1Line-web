/**
 * Corporate & Founder CMS Configuration Store
 * Manages Dr. Mahmoud Elbaz & One Line Company Profile dynamic settings
 * Supports local caching + Real-time Firebase Firestore cloud persistence
 */

import { saveSettings, subscribeToSettings, isFirebaseActive } from '../firebaseLazy.js';

export const DEFAULT_FOUNDER_CMS = {
  // Founder Information
  founderName_ar: 'د. محمود الباز',
  founderName_en: 'Dr. Mahmoud Elbaz',
  founderRole_ar: 'مؤسس ورئيس مجلس إدارة 1Line',
  founderRole_en: 'Founder & Chairman of 1Line',
  founderSub_ar: 'استشاري التقييم والتطوير العقاري بسوهاج',
  founderSub_en: 'Real Estate Valuation & Investment Consultant',
  founderPhoto: '/founder-dr-mahmoud-elbaz.jpg', // Professional executive portrait of Dr. Mahmoud Elbaz
  
  // Founder Message & Vision
  founderQuote_ar: '«هدفنا في 1Line ليس مجرد إتمام صفقات بيع وشراء، بل بناء منظومة حماية واستثمار حقيقية تحمي مدخرات أهالينا والمغتربين بالخارج، وتضمن حصول كل عميل على أعلى قيمة عقارية بأمان قانوني لا يقبل الشك.»',
  founderQuote_en: '«Our mission at 1Line is to establish a truly secure real estate environment that protects client savings, guarantees transparent pricing, and offers unmatched investment growth in Sohag.»',

  // Contact Channels
  whatsappNumber: '01223222956',
  phoneNumber: '+201223222956',
  headquarters_ar: 'المقر الرئيسي: محافظة سوهاج ش الجمهورية برج احمد حلمي الشريف',
  headquarters_en: 'HQ: Sohag - El Gomhoria St., Ahmed Helmy El Sherif Tower',

  // Badges
  badges: [
    { ar: '🏅 خبرة +8 سنوات بالسوق العقاري', en: '8+ Years Market Leadership' },
    { ar: '🏛️ مستشار كبار المستثمرين', en: 'Prime Investors Advisor' },
    { ar: '📜 متخصص في التقييم والتسعير', en: 'Valuation & pricing specialist' }
  ],

  // 4 Top Stats — only facts that can be documented. Edit from the CRM (Founder CMS);
  // replace with real deal counts / volumes once you have records to back them.
  stats: [
    {
      num_ar: '+8',
      num_en: '8+',
      label_ar: 'سنوات خبرة المؤسس',
      label_en: 'Years of founder experience',
      sub_ar: 'في سوق العقارات بسوهاج',
      sub_en: 'in the Sohag property market'
    },
    {
      num_ar: '2',
      num_en: '2',
      label_ar: 'نطاقا خدمة',
      label_en: 'Service regions',
      sub_ar: 'سوهاج والقاهرة الكبرى',
      sub_en: 'Sohag and Greater Cairo'
    },
    {
      num_ar: '3',
      num_en: '3',
      label_ar: 'مراجعات قبل العرض',
      label_en: 'Checks before listing',
      sub_ar: 'الملكية • الترخيص • السعر',
      sub_en: 'Title • Permits • Price'
    },
    {
      num_ar: '1',
      num_en: '1',
      label_ar: 'مستشار مسؤول لكل عميل',
      label_en: 'Dedicated advisor per client',
      sub_ar: 'من أول مكالمة حتى التسجيل',
      sub_en: 'From first call to registration'
    }
  ],

  // 4 Hero Stats Strip (Top of Homepage)
  heroStats: [
    { num_ar: '+8', num_en: '8+', label_ar: 'سنوات خبرة', label_en: 'Years experience' },
    { num_ar: '3', num_en: '3', label_ar: 'مراجعات قبل العرض', label_en: 'Pre-listing checks' },
    { num_ar: '2', num_en: '2', label_ar: 'سوهاج والقاهرة', label_en: 'Sohag & Cairo' },
    { num_ar: '7 سنوات', num_en: '7 Yrs', label_ar: 'أطول تقسيط متاح', label_en: 'Longest installment' }
  ],

  // 3 Corporate Pillars
  pillars: [
    {
      title_ar: 'مراجعة قانونية قبل العرض',
      title_en: 'Legal review before listing',
      desc_ar: 'نراجع تسلسل الملكية والتراخيص والتوكيلات لكل عقار قبل عرضه، ونطلعك على نتيجة المراجعة كتابياً قبل التعاقد.',
      desc_en: 'We review title chain, permits and powers of attorney before listing, and share the findings in writing before contract.'
    },
    {
      title_ar: 'تسعير مبني على مقارنات فعلية',
      title_en: 'Pricing from real comparables',
      desc_ar: 'نحدد السعر بمقارنة عروض وصفقات فعلية في نفس المنطقة ومعاينة ميدانية، لا بأرقام عامة.',
      desc_en: 'We price from actual listings and deals in the same area plus a site visit — not generic figures.'
    },
    {
      title_ar: 'خدمة المغتربين عن بُعد',
      title_en: 'Remote service for expats',
      desc_ar: 'معاينات فيديو مباشرة، ومتابعة التوكيلات والإجراءات، وتقارير مكتوبة في كل مرحلة حتى الاستلام.',
      desc_en: 'Live video viewings, power-of-attorney follow-up, and written updates at each stage until handover.'
    }
  ],

  // The 4 1Line standards
  goldStandardsTitle_ar: 'أربعة التزامات نعمل بها في كل صفقة',
  goldStandardsTitle_en: 'Four commitments on every deal',
  goldStandardsDesc_ar: 'لماذا يختار الملاك والمستثمرون 1Line لصفقاتهم الكبيرة؟',
  goldStandardsDesc_en: 'Why owners and investors choose 1Line for high-value transactions.',
  goldStandards: [
    {
      number: '01',
      icon: 'ShieldCheck',
      title_ar: 'مراجعة المستندات قبل العرض',
      title_en: 'Documents reviewed before listing',
      desc_ar: 'تسلسل الملكية وتراخيص البناء وصحة التوكيلات تُراجع قبل عرض أي عقار، ونسلمك ملخص المراجعة قبل التعاقد.',
      desc_en: 'Title chain, building permits and powers of attorney are reviewed before listing; you get the summary before contract.',
      badge_ar: '',
      badge_en: ''
    },
    {
      number: '02',
      icon: 'Scale',
      title_ar: 'سعر عادل بمقارنات حقيقية',
      title_en: 'Fair price from real comparables',
      desc_ar: 'تقرير سعر مبني على عروض وصفقات فعلية في نفس المنطقة ومعاينة ميدانية، يحمي البائع من البيع بأقل والمشتري من المغالاة.',
      desc_en: 'A price report based on real listings, deals and a site visit — protecting sellers from underpricing and buyers from overpaying.',
      badge_ar: '',
      badge_en: ''
    },
    {
      number: '03',
      icon: 'Award',
      title_ar: 'تسويق هادئ لمشترين جادين',
      title_en: 'Discreet marketing to serious buyers',
      desc_ar: 'نعرض عقارك على المشترين المسجلين لدينا بطلبات مطابقة أولاً، ونرتب المعاينات لمن تم التحقق من جديتهم فقط.',
      desc_en: 'We present your property to registered buyers with matching briefs first, and arrange viewings only for qualified buyers.',
      badge_ar: '',
      badge_en: ''
    },
    {
      number: '04',
      icon: 'Video',
      title_ar: 'خدمة المغتربين حتى الاستلام',
      title_en: 'Expat service through handover',
      desc_ar: 'معاينات فيديو مباشرة، ومتابعة التوكيلات والتحويلات البنكية الرسمية، وتحديثات مكتوبة حتى تسليم المفتاح.',
      desc_en: 'Live video viewings, power-of-attorney and official bank transfer follow-up, and written updates until keys.',
      badge_ar: '',
      badge_en: ''
    }
  ],
  // 🎬 Cinematic Hero Video & Visual Engine (The Agency & Sotheby's Style)
  // Stock video host blocks hot-linking (ERR_BLOCKED_BY_ORB); use a self-hosted clip before re-enabling.
  heroVideoEnabled: false,
  heroVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-modern-architecture-buildings-and-skyscrapers-41551-large.mp4',
  heroVideoAutoCycle: true,
  heroVideoIntervalSec: 10,
  heroVideoClips: [
    {
      id: 'clip-1',
      title_ar: '🏢 أبراج معمارية حديثة وواجهات زجاجية',
      title_en: 'Modern Skyscrapers & Architecture',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-modern-architecture-buildings-and-skyscrapers-41551-large.mp4',
      poster: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=70'
    },
    {
      id: 'clip-2',
      title_ar: '🏡 فلل فارهة ومنتجع مائي خاص',
      title_en: 'Luxury Pool Resort & Signature Villas',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-luxury-pool-resort-41553-large.mp4',
      poster: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=70'
    },
    {
      id: 'clip-3',
      title_ar: '🌳 كمبوند سكني ومساحات خضراء بالدرون',
      title_en: 'Residential Compound & Drone Landscapes',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-drone-view-of-a-modern-residential-neighborhood-41555-large.mp4',
      poster: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=70'
    }
  ],
  heroPosterUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=70',
  heroOverlayOpacity: 0.8,
  heroBadge_ar: 'وساطة واستشارات عقارية — سوهاج والقاهرة الكبرى',
  heroBadge_en: 'Real estate brokerage & advisory — Sohag and Greater Cairo',
  heroTitle_ar: 'امتلك واستثمر في أرقى عقارات سوهاج',
  heroTitle_en: 'Own & Invest in Sohag’s Finest Properties',
  heroHighlight_ar: 'بكل ثقة وضمان قانوني معتمد',
  heroHighlight_en: 'With Full Confidence & Legal Security',
  heroSubtitle_ar: 'شقق سكنية فاخرة، مقرات تجارية وإدارية، وفيلات مستقلة مسجلة ومفحوصة قانونياً مع برامج تقسيط مرنة حتى 7 سنوات.',
  heroSubtitle_en: 'Verified luxury apartments, retail shops, executive offices, and standalone villas with flexible financing up to 7 years.'
};

const STORAGE_KEY = 'oneline_founder_cms_settings';

/**
 * Normalizes any phone / whatsapp string to international WhatsApp digits format (e.g. 201223222956)
 */
export function cleanWhatsAppNumber(input) {
  if (!input) input = DEFAULT_FOUNDER_CMS.whatsappNumber;
  let digits = String(input).replace(/[^0-9]/g, '');
  if (!digits) digits = '201223222956';

  // Handle leading 00
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // If Egyptian local format starting with 01 (11 digits: 01XXXXXXXXX) -> convert to 201XXXXXXXXX
  if (digits.startsWith('01') && digits.length === 11) {
    digits = '2' + digits; // '2' + '01...' = '201...'
  } else if (digits.startsWith('1') && digits.length === 10) {
    // 10 digits without leading zero -> '20' + '1XXXXXXXXX'
    digits = '20' + digits;
  }

  return digits;
}

/**
 * Normalizes phone number for direct dial (tel:...) and UI presentation
 */
export function cleanPhoneNumber(input) {
  if (!input) input = DEFAULT_FOUNDER_CMS.phoneNumber;
  const str = String(input).trim();
  if (str.startsWith('+')) return str;
  if (str.startsWith('00')) return '+' + str.slice(2);
  if (str.startsWith('01') && str.length === 11) return '+2' + str;
  return str;
}

/**
 * Generates a full WhatsApp wa.me URL with prefilled text and dynamic contact number
 */
export function getWhatsAppUrl(text = '', customNumber = null) {
  const num = customNumber ? cleanWhatsAppNumber(customNumber) : getDynamicWhatsApp();
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/**
 * Safely opens a WhatsApp conversation in a secure new tab
 * without hijacking or breaking the user's ongoing session.
 */
export function openWhatsAppSafely(text = '', customNumber = null) {
  const url = getWhatsAppUrl(text, customNumber);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return url;
}

/**
 * Generates a full tel: URL with dynamic contact number
 */
export function getPhoneCallUrl(customNumber = null) {
  const num = customNumber ? cleanPhoneNumber(customNumber) : getDynamicPhone();
  return `tel:${num}`;
}

/**
 * Retrieves the current dynamic WhatsApp number (clean digits)
 */
export function getDynamicWhatsApp() {
  const current = getFounderSettings();
  return cleanWhatsAppNumber(current.whatsappNumber);
}

/**
 * Retrieves the current dynamic Phone number
 */
export function getDynamicPhone() {
  const current = getFounderSettings();
  return cleanPhoneNumber(current.phoneNumber);
}

/**
 * Read founder settings from localStorage or default fallback
 */
export function getFounderSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FOUNDER_CMS;
    const parsed = { ...DEFAULT_FOUNDER_CMS, ...JSON.parse(raw) };
    
    // Auto-migrate legacy placeholder number if present
    if (parsed.whatsappNumber === '201012345678' || parsed.whatsappNumber === '01012345678') {
      parsed.whatsappNumber = DEFAULT_FOUNDER_CMS.whatsappNumber;
    }
    if (parsed.phoneNumber === '+201012345678' || parsed.phoneNumber === '01012345678') {
      parsed.phoneNumber = DEFAULT_FOUNDER_CMS.phoneNumber;
    }

    if (parsed.founderRole_ar) parsed.founderRole_ar = parsed.founderRole_ar.replace(/One\s*Line/gi, '1Line');
    if (parsed.founderRole_en) parsed.founderRole_en = parsed.founderRole_en.replace(/One\s*Line/gi, '1Line');
    if (parsed.founderQuote_ar) parsed.founderQuote_ar = parsed.founderQuote_ar.replace(/One\s*Line/gi, '1Line');
    if (parsed.founderQuote_en) parsed.founderQuote_en = parsed.founderQuote_en.replace(/One\s*Line/gi, '1Line');
    if (!parsed.founderPhoto) parsed.founderPhoto = DEFAULT_FOUNDER_CMS.founderPhoto;
    return parsed;
  } catch (err) {
    console.error('Failed to parse founder CMS settings:', err);
    return DEFAULT_FOUNDER_CMS;
  }
}

/**
 * Save settings both locally and to Firebase Firestore cloud database
 */
export async function saveFounderSettings(data) {
  try {
    const current = getFounderSettings();
    const merged = { ...current, ...data };
    
    // 1. Save locally for instant availability
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('oneline_founder_cms_updated', { detail: merged }));

    // 2. Persist to Firestore cloud database
    try {
      await saveSettings('founder_cms', merged);
    } catch (cloudErr) {
      console.warn('Could not persist founder settings to Firebase Firestore:', cloudErr);
    }

    return true;
  } catch (err) {
    console.error('Failed to save founder CMS settings:', err);
    return false;
  }
}

/**
 * Reset settings back to defaults
 */
export async function resetFounderSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('oneline_founder_cms_updated', { detail: DEFAULT_FOUNDER_CMS }));

    try {
      await saveSettings('founder_cms', DEFAULT_FOUNDER_CMS);
    } catch (cloudErr) {
      console.warn('Could not reset founder settings in Firebase Firestore:', cloudErr);
    }

    return true;
  } catch (err) {
    console.error('Failed to reset founder CMS settings:', err);
    return false;
  }
}

/**
 * Subscribe to real-time updates from Firebase Firestore
 * Syncs incoming cloud settings to localStorage and dispatches updates
 */
export function initFounderCmsSync() {
  return subscribeToSettings('founder_cms', (cloudData) => {
    if (cloudData && typeof cloudData === 'object') {
      try {
        const merged = { ...DEFAULT_FOUNDER_CMS, ...cloudData };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('oneline_founder_cms_updated', { detail: merged }));
      } catch (e) {
        console.warn('Failed to sync Firestore founder settings to local state:', e);
      }
    }
  });
}

