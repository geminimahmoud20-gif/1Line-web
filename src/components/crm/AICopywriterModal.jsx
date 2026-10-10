import { useState } from 'react';
import { Sparkles, Copy, Check, Send, Wand2 } from 'lucide-react';
import { getDynamicPhone, getWhatsAppUrl } from '../../utils/founderCmsData';
import { computeRentalYield } from '../../utils/propertyInsights';

// Arabic room counter grammar (قواعد تمييز العدد في اللغة العربية)
const formatRoomsAr = (num) => {
  if (!num) return '';
  const n = parseInt(num, 10);
  if (isNaN(n) || n <= 0) return '';
  if (n === 1) return ' (غرفة واحدة)';
  if (n === 2) return ' (غرفتان)';
  if (n >= 3 && n <= 10) return ` (${n} غرف)`;
  return ` (${n} غرفة)`;
};

// Clean common spelling mistakes in Egyptian real estate listings
const fixArabicSpelling = (str) => {
  if (!str) return '';
  return str
    .replace(/الجديده\b/g, 'الجديدة')
    .replace(/\bالحي الاول\b/g, 'الحي الأول')
    .replace(/\bالاول\b/g, 'الأول');
};

export default function AICopywriterModal({
  isOpen,
  onClose,
  properties = [],
  lang = 'ar',
  triggerToast
}) {
  const isAr = lang === 'ar';
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '');
  const [adTone, setAdTone] = useState('social'); // 'social' | 'luxury' | 'investor' | 'expat' | 'english'
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const selectedProp = properties.find(p => p.id === selectedPropertyId) || properties[0] || {};

  const propTitle = isAr ? fixArabicSpelling(selectedProp.title_ar) : selectedProp.title_en;
  const propLocation = isAr ? fixArabicSpelling(selectedProp.locationName_ar) : selectedProp.locationName_en;

  const hasPrice = Boolean(selectedProp.price);
  const hasDownPayment = Boolean(selectedProp.downPayment);
  const hasInstallment = Boolean(selectedProp.monthlyInstallment);

  const propPrice = hasPrice ? selectedProp.price.toLocaleString('en-US') + ' ج.م' : (isAr ? 'سعر مميز عند التعاقد' : 'Special Price');
  const propDownPayment = hasDownPayment ? selectedProp.downPayment.toLocaleString('en-US') + ' ج.م' : (isAr ? 'مقدم تعاقد ميسر' : 'Flexible Down Payment');
  const propInstallment = hasInstallment ? selectedProp.monthlyInstallment.toLocaleString('en-US') + ' ج.م' : (isAr ? 'أقساط ميسرة' : 'Flexible Installments');
  const propSize = selectedProp.size || '—';
  const propRooms = selectedProp.bedrooms || 0;

  // Natural phrasing for payments in social ad to avoid awkward repetition
  const paymentLineSocial = (hasDownPayment && hasInstallment)
    ? `مقدم يبدأ من ${selectedProp.downPayment.toLocaleString('en-US')} ج.م وقسط شهري ${selectedProp.monthlyInstallment.toLocaleString('en-US')} ج.م`
    : (hasDownPayment
        ? `مقدم تعاقد يبدأ من ${selectedProp.downPayment.toLocaleString('en-US')} ج.م وتسهيلات سداد ممتدة`
        : `أنظمة سداد ميسرة بمقدم تعاقد بسيط وأقساط شهرية مرنة`);

  // Every factual line comes from the listing itself — posts get published as-is.
  const legal = selectedProp.legalStatus || null;
  const legalLineAr = legal
    ? [legal.ownershipType_ar, legal.licenseStatus_ar].filter(Boolean).join(' • ')
    : 'نراجع معك المستندات وموقفها القانوني قبل التعاقد';
  const legalLineEn = legal
    ? [legal.ownershipType_en || legal.ownershipType_ar, legal.licenseStatus_en].filter(Boolean).join(' • ')
    : 'Documents reviewed with you before contract';
  const rentPerSqm = Number(selectedProp.commercial?.rentPerSqm) || 0;
  const yieldStudy = rentPerSqm ? computeRentalYield({ price: selectedProp.price, size: selectedProp.size, rentPerSqm }) : null;
  const roomsAr = formatRoomsAr(propRooms);

  // Sector classification
  const isLand = selectedProp.type === 'land' || (propTitle && propTitle.includes('أرض'));
  const isCom = !isLand && (selectedProp.type === 'commercial' || selectedProp.category === 'commercial' || (propTitle && (propTitle.includes('محل') || propTitle.includes('معرض') || propTitle.includes('تجاري'))));
  const isOff = !isLand && !isCom && (selectedProp.type === 'office' || selectedProp.category === 'administrative' || (propTitle && (propTitle.includes('مكتب') || propTitle.includes('عيادة') || propTitle.includes('إداري'))));

  let sectorTitleLuxury = 'قصر السكن الراقي';
  let sectorHookLuxury = 'هل تبحث عن السكن الفندقي والخصوصية الكاملة لك ولأسرتك؟';
  let sectorSpaceLuxury = propRooms ? `بتوزيع داخلي${roomsAr}` : 'بتوزيع داخلي مدروس';
  let sectorAdvantagesLuxury = selectedProp.finishing_ar ? `تشطيب ${selectedProp.finishing_ar}.` : 'التفاصيل الكاملة والصور في صفحة العقار.';

  let sectorSpaceSocial = `${propSize} م²${roomsAr}`;
  let sectorSpaceExpat = `${propSize} م²${roomsAr}${selectedProp.finishing_ar ? ` — ${selectedProp.finishing_ar}` : ''}`;
  let sectorSpaceEn = `${propSize} sqm${propRooms ? ` | ${propRooms} bedrooms` : ''}`;

  if (isLand) {
    sectorTitleLuxury = 'أرض استثمارية استثنائية';
    sectorHookLuxury = 'هل تبحث عن موقع استثماري نادر وتطوير عقاري بعائد رأسمالي مضاعف؟';
    sectorSpaceLuxury = `${selectedProp.landType_ar || 'أرض استثمارية مرخصة'} ${selectedProp.frontage ? `• ${selectedProp.frontage}` : ''}`;
    sectorAdvantagesLuxury = selectedProp.frontage ? `${selectedProp.frontage}.` : 'موقف المرافق والترخيص نوضحه لك كتابياً قبل التعاقد.';
    sectorSpaceSocial = `${propSize} م² (${selectedProp.landType_ar || 'أرض استثمارية'} • ${selectedProp.frontage || 'واجهة عريضة'})`;
    sectorSpaceExpat = `${propSize} م² (${selectedProp.landType_ar || 'أرض استثمارية مرخصة وموثقة'})`;
    sectorSpaceEn = `${propSize} sqm | ${selectedProp.landType_en || 'Licensed Investment Land Plot'} ${selectedProp.frontage ? `(${selectedProp.frontage})` : ''}`;
  } else if (isCom) {
    sectorTitleLuxury = 'أصل تجاري بعائد استثماري فوري';
    sectorHookLuxury = 'هل تبحث عن مقر استراتيجي لفرنشايز أو محل تجاري يدر أعلى دخل إيجاري بسوهاج؟';
    sectorSpaceLuxury = `${selectedProp.commercialType_ar || 'محل تجاري واجهة مباشرة'} ${selectedProp.frontage ? `• ${selectedProp.frontage}` : ''}`;
    sectorAdvantagesLuxury = [selectedProp.frontage, selectedProp.commercialType_ar].filter(Boolean).join(' • ') || 'موقع تجاري — التفاصيل في صفحة العقار.';
    sectorSpaceSocial = `${propSize} م² (${selectedProp.commercialType_ar || 'محل تجاري'} • ${selectedProp.frontage || 'واجهة رئيسية'})`;
    sectorSpaceExpat = `${propSize} م² (${selectedProp.commercialType_ar || 'محل تجاري'})`;
    sectorSpaceEn = `${propSize} sqm | ${selectedProp.commercialType_en || 'Prime Commercial Retail Space'} ${selectedProp.frontage ? `(${selectedProp.frontage})` : ''}`;
  } else if (isOff) {
    sectorTitleLuxury = 'صرح إداري وطبي متكامل';
    sectorHookLuxury = 'ارتقِ بمقر شركتك أو عيادتك التخصصية في قلب المركز الإداري والخدمي بسوهاج:';
    sectorSpaceLuxury = `${selectedProp.adminType_ar || 'مقر إداري / عيادة طبية'} ${selectedProp.frontage ? `• ${selectedProp.frontage}` : ''}`;
    sectorAdvantagesLuxury = selectedProp.finishing_ar ? `تشطيب ${selectedProp.finishing_ar}.` : 'مقر إداري / طبي — التفاصيل في صفحة العقار.';
    sectorSpaceSocial = `${propSize} م² (${selectedProp.adminType_ar || 'مقر إداري وطبي مجهز'})`;
    sectorSpaceExpat = `${propSize} م² (${selectedProp.adminType_ar || 'مقر إداري وطبي فاخر'})`;
    sectorSpaceEn = `${propSize} sqm | ${selectedProp.adminType_en || 'Executive Admin Office & Clinic'}`;
  }

  // AI Generated Templates
  const generateAdContent = () => {
    if (adTone === 'luxury') {
      return (
`✨【 ${sectorTitleLuxury} في قلب سوهاج — ${propTitle} 】✨

💎 ${sectorHookLuxury}
يسر شركة "1Line للحلول العقارية" أن تقدم لعشاق الفخامة والمستثمرين والمغتربين أرقى المعروضات العقارية بسوهاج:

📍 الموقع الاستراتيجي: ${propLocation}
📐 المساحة الملكية: ${propSize} م² — ${sectorSpaceLuxury}
⚖️ الموقف القانوني: ${legalLineAr}
⭐ المميزات: ${sectorAdvantagesLuxury}

💰 خطة السداد والاستثمار:
• السعر الإجمالي: ${propPrice}
• مقدم التعاقد: ${propDownPayment}
• قسط شهري ميسر: ${propInstallment}

📞 للتواصل المباشر وحجز موعد المعاينة الخاصة:
مستشارك العقاري: ${getDynamicPhone()}
واتساب فوري: ${getWhatsAppUrl()}
شركة 1Line — قرارك العقاري بوضوح في سوهاج.`);
    }

    if (adTone === 'social') {
      return (
`🔥【 لقطة الأسبوع بسوهاج — فرصة لن تتكرر للسكن والاستثمار! 】🔥

🏡 فرصة العمر: ${propTitle}
📍 في أميز مناطق سوهاج: ${propLocation}

⚡ ليه العقار ده بالذات ميتفوتش؟
✅ مساحة واسعة: ${sectorSpaceSocial}
✅ ${paymentLineSocial}
✅ ${legalLineAr}
✅ معاينة مجانية للموقع قبل أي التزام!

⏳ العرض ساري لأسبقية الحجز فقط!
📲 كلمنا فوراً أو ابعتلنا واتساب على: ${getDynamicPhone()}
#عقارات_سوهاج #فرص_استثمار #سوهاج_الجديدة #1Line`);
    }

    if (adTone === 'investor') {
      return (
`📊【 فرصة استثمارية — 1LINE INVEST 】📊

🏢 الأصل العقاري: ${propTitle}
📍 الموقع: ${propLocation}
💵 السعر الإجمالي: ${propPrice}

📈 مؤشرات الجدوى:
${yieldStudy
  ? `• العائد الإجمالي التقديري: ${Math.round(yieldStudy.grossYieldPct * 10) / 10}% سنوياً (على إيجار متوقع ${rentPerSqm.toLocaleString('en-US')} ج.م للمتر شهرياً)
• فترة استرداد رأس المال التقديرية: ${Math.round(yieldStudy.paybackYears * 10) / 10} سنة قبل الضرائب`
  : '• نجهز لك دراسة عائد بإيجارات مقارنة فعلية في نفس الشارع قبل القرار'}
• التسهيلات: ${paymentLineSocial}

🛡️ الموقف القانوني:
${legalLineAr}

💼 لطلب الملف الاستثماري الكامل وجدول التدفقات النقدية:
تواصل مع مكتب كبار المستثمرين: ${getDynamicPhone()}`);
    }

    if (adTone === 'expat') {
      return (
`✈️【 إلى أهلنا وإخوتنا المغتربين في السعودية والخليج — استثمارك الآمن في سوهاج 】✈️

🇸🇦🇦🇪🇰🇼 هل تخطط لتأمين مستقبل عائلتك وحفظ مدخراتك في أصل عقاري استراتيجي عالي العائد؟
تقدم شركة "1Line للحلول العقارية" بسوهاج فرصة حصرية لأبناء الصعيد المغتربين:

🏢 العقار: ${propTitle}
📍 الموقع: ${propLocation}
📐 المساحة والمواصفات: ${sectorSpaceExpat}
⚖️ الموقف القانوني: ${legalLineAr}
🎥 معاينة عن بُعد بالفيديو الحي قبل أي قرار

💰 خطة السداد:
• السعر الإجمالي: ${propPrice} (التعاقد بالجنيه المصري، والسداد بتحويلات بنكية رسمية)
• مقدم التعاقد: ${propDownPayment}
• قسط شهري ميسر: ${propInstallment}
• خدمة "إدارة وتأجير العقار" نيابة عنك لتحقيق عائد إيجاري أثناء فترة سفرك!

📲 للاستشارة الخاصة بخدمة عملاء المغتربين عبر واتساب الدولي:
واتساب مباشر: ${getWhatsAppUrl()}
اتصال هاتفي: ${getDynamicPhone()}
شركة 1Line — عينك وأمانك العقاري في مصر.`);
    }

    return (
`🏛️【 Premium Verified Property in Sohag — 1Line Real Estate 】🏛️

🌟 Featured Unit: ${selectedProp.title_en || propTitle}
📍 Prime Location: ${selectedProp.locationName_en || propLocation}
📐 Specifications: ${sectorSpaceEn}
📑 Legal Status: ${legalLineEn}

💎 Payment Terms:
• Total Value: ${propPrice}
• Down Payment: ${propDownPayment}
• Monthly Installment: ${propInstallment}

📲 Book a private viewing today with our executive team:
WhatsApp / Direct Call: ${getDynamicPhone()}
1Line Real Estate — Trust, Security, Excellence.`);
  };

  const adText = generateAdContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(adText);
    setCopied(true);
    if (triggerToast) triggerToast(isAr ? 'تم نسخ الإعلان التسويقي بنجاح!' : 'Ad text copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(adText)}`, '_blank');
  };

  const toneOptions = [
    { id: 'social', icon: '🔥', labelAr: 'سوشيال', labelEn: 'Viral' },
    { id: 'luxury', icon: '👑', labelAr: 'فندقي', labelEn: 'Luxury' },
    { id: 'investor', icon: '📈', labelAr: 'استثماري', labelEn: 'Investor' },
    { id: 'expat', icon: '✈️', labelAr: 'مغتربين', labelEn: 'Expats' },
    { id: 'english', icon: '🌐', labelAr: 'English', labelEn: 'EN' }
  ];

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="property-form-modal-card animate-fadeIn" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px', borderRadius: '20px', overflow: 'hidden' }}>
        <div className="modal-form-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wand2 size={22} className="text-gold" />
            <h3 style={{ margin: 0, fontSize: 'var(--crm-text-lg)', fontWeight: '800' }}>
              {isAr ? 'مُولّد الإعلانات التسويقية بالذكاء الاصطناعي' : 'AI Real Estate Copywriter'}
            </h3>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'}>✕</button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Controls Bar: Clean Stacked Responsive Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: 'var(--crm-text-sm)', fontWeight: '700', display: 'block', marginBottom: '8px', color: 'var(--crm-ink)' }}>
                {isAr ? 'اختر العقار المراد كتابة إعلان له:' : 'Select Property:'}
              </label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="form-input"
                style={{ width: '100%', fontWeight: '700', padding: '10px 14px', borderRadius: '10px' }}
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {isAr ? fixArabicSpelling(p.title_ar) : p.title_en} ({p.price ? p.price.toLocaleString('en-US') + ' ج.م' : 'سعر مميز'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 'var(--crm-text-sm)', fontWeight: '700', display: 'block', marginBottom: '8px', color: 'var(--crm-ink)' }}>
                {isAr ? 'نبرة وأسلوب الإعلان:' : 'Campaign Tone:'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                {toneOptions.map(t => {
                  const isActive = adTone === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAdTone(t.id)}
                      style={{
                        padding: '9px 12px',
                        fontSize: 'var(--crm-text-xs)',
                        fontWeight: '700',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                        background: isActive ? 'var(--crm-surface-ink)' : 'var(--crm-subtle)',
                        color: isActive ? 'var(--crm-on-dark)' : 'var(--crm-ink)',
                        border: isActive ? '1px solid var(--crm-surface-ink)' : '1px solid var(--crm-line)',
                        boxShadow: isActive ? '0 2px 8px rgba(11, 19, 43, 0.25)' : 'none'
                      }}
                    >
                      <span>{t.icon}</span>
                      <span>{isAr ? t.labelAr : t.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Generated Text Preview Box with High Contrast Dark Luxury Theme */}
          <div style={{
            background: 'var(--crm-surface-ink)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '16px',
            padding: '18px 20px',
            position: 'relative',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-accent)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', letterSpacing: '0.3px' }}>
                <Sparkles size={16} style={{ color: 'var(--crm-accent)' }} /> {isAr ? 'تمت الصياغة بواسطة الذكاء الاصطناعي العقاري' : 'AI Generated Marketing Copy'}
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    padding: '7px 14px',
                    fontSize: 'var(--crm-text-xs)',
                    fontWeight: '700',
                    background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: 'var(--crm-on-dark)',
                    border: copied ? '1px solid var(--crm-positive-solid)' : '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ النص' : 'Copy Text')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendToWhatsApp}
                  style={{
                    padding: '7px 14px',
                    fontSize: 'var(--crm-text-xs)',
                    fontWeight: '700',
                    background: 'var(--crm-positive-solid)',
                    color: 'var(--crm-on-dark)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Send size={14} />
                  <span>{isAr ? 'مشاركة واتساب' : 'Share WhatsApp'}</span>
                </button>
              </div>
            </div>

            <textarea
              readOnly
              rows="13"
              value={adText}
              style={{
                width: '100%',
                background: 'rgba(2, 6, 23, 0.55)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                color: 'var(--crm-on-dark)',
                lineHeight: '1.85',
                fontSize: 'var(--crm-text-base)',
                fontWeight: '500',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent'
              }}
            />
          </div>

          <div className="cms-modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: '700' }}>
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
