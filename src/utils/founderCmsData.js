/**
 * Corporate & Founder CMS Configuration Store
 * Manages Dr. Mahmoud Elbaz & One Line Company Profile dynamic settings
 * Supports local caching + Real-time Firebase Firestore cloud persistence
 */

import { saveSettings, subscribeToSettings, isFirebaseActive } from '../firebaseService.js';

export const DEFAULT_FOUNDER_CMS = {
  // Founder Information
  founderName_ar: 'د. محمود الباز',
  founderName_en: 'Dr. Mahmoud Elbaz',
  founderRole_ar: 'مؤسس ورئيس مجلس إدارة 1Line',
  founderRole_en: 'Founder & Chairman of 1Line',
  founderSub_ar: 'استشاري التقييم والتطوير العقاري بسوهاج',
  founderSub_en: 'Real Estate Valuation & Investment Consultant',
  founderPhoto: '', // Optional URL, if empty fallback to Gold Logo Emblem
  
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
    { ar: '📜 اعتماد التقييم والتسعير العادل', en: 'Certified Valuation Expert' }
  ],

  // 4 Top Stats
  stats: [
    {
      num_ar: '+500',
      num_en: '500+',
      label_ar: 'صفقة عقارية ناجحة',
      label_en: 'Successful Deals',
      sub_ar: 'موثقة ومسجلة رسمياً',
      sub_en: 'Officially Verified'
    },
    {
      num_ar: '+1.2B',
      num_en: '$25M+',
      label_ar: 'جنيه حجم تداولات',
      label_en: 'Trading Volume',
      sub_ar: 'أصول واستثمارات مدارة',
      sub_en: 'Managed Real Estate Assets'
    },
    {
      num_ar: '100%',
      num_en: '100%',
      label_ar: 'فحص وتدقيق قانوني',
      label_en: 'Legal Compliance',
      sub_ar: 'تراخيص وملكية معتمدة',
      sub_en: 'Valid Title Deeds'
    },
    {
      num_ar: '+12K',
      num_en: '12K+',
      label_ar: 'عميل ومستثمر يثقون بنا',
      label_en: 'Trusted Clients',
      sub_ar: 'بسوهاج ومغتربي الخليج',
      sub_en: 'In Egypt & Gulf Expats'
    }
  ],

  // 4 Hero Stats Strip (Top of Homepage)
  heroStats: [
    {
      num_ar: '+150',
      num_en: '150+',
      label_ar: 'عقار مفحوص ومعتمد',
      label_en: 'Verified Properties'
    },
    {
      num_ar: '100%',
      num_en: '100%',
      label_ar: 'سلامة قانونية وتراخيص',
      label_en: 'Legal Compliance'
    },
    {
      num_ar: '+12 M',
      num_en: '12M+',
      label_ar: 'حجم مبيعات سنوي',
      label_en: 'Annual Volume'
    },
    {
      num_ar: '7 سنوات',
      num_en: '7 Yrs',
      label_ar: 'أطول فترة تقسيط',
      label_en: 'Max Installment'
    }
  ],

  // 3 Corporate Pillars
  pillars: [
    {
      title_ar: 'الأمان القانوني المطلق',
      title_en: 'Absolute Legal Security',
      desc_ar: 'لا يتم عرض أو تسويق أي وحدة عقارية إلا بعد مراجعة شاملة لتسلسل الملكية، وتراخيص البناء، ومطابقة المخططات الهندسية من الإدارة القانونية.',
      desc_en: 'Every property undergoes thorough title deed review and building permit verification before listing.'
    },
    {
      title_ar: 'التقييم السعري العادل والمعتمد',
      title_en: 'Certified Fair Valuation',
      desc_ar: 'نعتمد على دراسات ميدانية وتقييم هندسي دقيق يرصد سعر المتر الفعلي في كل منطقة بسوهاج لمنع أي مغالاة أو تسعير عشوائي يحمي أموال المشترين.',
      desc_en: 'Accurate field studies and certified engineering valuations tracking fair meter prices across Sohag to protect buyer capital.'
    },
    {
      title_ar: 'برنامج رعاية المستثمرين والمغتربين',
      title_en: 'Expats & Investors Care',
      desc_ar: 'إدارة متكاملة مخصصة للمغتربين بالخليج تتولى المعاينات الحية بالفيديو، وتسهيلات السداد والتوكيلات، وتحقيق أعلى عائد استثماري وإيجاري.',
      desc_en: 'Dedicated services for Gulf expats including live video tours, verified legal procedures, and high ROI deals.'
    }
  ]
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

