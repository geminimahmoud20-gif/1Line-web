/**
 * Corporate & Founder CMS Configuration Store
 * Manages Dr. Mahmoud Elbaz & One Line Company Profile dynamic settings
 */

export const DEFAULT_FOUNDER_CMS = {
  // Founder Information
  founderName_ar: 'د. محمود الباز',
  founderName_en: 'Dr. Mahmoud Elbaz',
  founderRole_ar: 'مؤسس ورئيس مجلس إدارة One Line',
  founderRole_en: 'Founder & Chairman of One Line',
  founderSub_ar: 'استشاري التقييم والتطوير العقاري بسوهاج',
  founderSub_en: 'Real Estate Valuation & Investment Consultant',
  founderPhoto: '', // Optional URL, if empty fallback to Gold Logo Emblem
  
  // Founder Message & Vision
  founderQuote_ar: '«هدفنا في ون لاين ليس مجرد إتمام صفقات بيع وشراء، بل بناء منظومة حماية واستثمار حقيقية تحمي مدخرات أهالينا والمغتربين بالخارج، وتضمن حصول كل عميل على أعلى قيمة عقارية بأمان قانوني لا يقبل الشك.»',
  founderQuote_en: '«Our mission at One Line is to establish a truly secure real estate environment that protects client savings, guarantees transparent pricing, and offers unmatched investment growth in Sohag.»',

  // Contact Channels
  whatsappNumber: '201012345678',
  phoneNumber: '+201012345678',
  headquarters_ar: 'المقر الرئيسي: محافظة سوهاج (شرق النيل - سوهاج الجديدة)',
  headquarters_en: 'HQ: Sohag (East Nile & New Sohag)',

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
      desc_ar: 'نعتمد على خوارزميات تقييم دقيقة ترصد سعر المتر الفعلي في كل منطقة بسوهاج لمنع أي مغالاة أو تسعير عشوائي يحمي أموال المشترين.',
      desc_en: 'Accurate valuation models tracking fair meter prices across Sohag to prevent inflated costs.'
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

export function getFounderSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FOUNDER_CMS;
    return { ...DEFAULT_FOUNDER_CMS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to parse founder CMS settings:', err);
    return DEFAULT_FOUNDER_CMS;
  }
}

export function saveFounderSettings(data) {
  try {
    const merged = { ...getFounderSettings(), ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event('oneline_founder_cms_updated'));
    return true;
  } catch (err) {
    console.error('Failed to save founder CMS settings:', err);
    return false;
  }
}

export function resetFounderSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('oneline_founder_cms_updated'));
    return true;
  } catch (err) {
    console.error('Failed to reset founder CMS settings:', err);
    return false;
  }
}
