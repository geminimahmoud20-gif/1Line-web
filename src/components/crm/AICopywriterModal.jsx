import { useState } from 'react';
import { Sparkles, Copy, Check, Send, Wand2 } from 'lucide-react';
import { getDynamicPhone, getWhatsAppUrl } from '../../utils/founderCmsData';
import { computeRentalYield } from '../../utils/propertyInsights';

export default function AICopywriterModal({
  isOpen,
  onClose,
  properties = [],
  lang = 'ar',
  triggerToast
}) {
  const isAr = lang === 'ar';
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '');
  const [adTone, setAdTone] = useState('luxury'); // 'luxury' | 'social' | 'investor' | 'english'
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const selectedProp = properties.find(p => p.id === selectedPropertyId) || properties[0] || {};

  const propTitle = isAr ? selectedProp.title_ar : selectedProp.title_en;
  const propLocation = isAr ? selectedProp.locationName_ar : selectedProp.locationName_en;
  const propPrice = selectedProp.price ? selectedProp.price.toLocaleString('en-US') + ' ج.م' : 'سعر مميز';
  const propDownPayment = selectedProp.downPayment ? selectedProp.downPayment.toLocaleString('en-US') + ' ج.م' : 'مقدم ميسر';
  const propInstallment = selectedProp.monthlyInstallment ? selectedProp.monthlyInstallment.toLocaleString('en-US') + ' ج.م' : 'أقساط مرنة';
  const propSize = selectedProp.size || '—';
  const propRooms = selectedProp.bedrooms || 0;

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
  const roomsAr = propRooms ? ` (${propRooms} غرف)` : '';

  // Sector classification
  const isLand = selectedProp.type === 'land' || (propTitle && propTitle.includes('أرض'));
  const isCom = !isLand && (selectedProp.type === 'commercial' || selectedProp.category === 'commercial' || (propTitle && (propTitle.includes('محل') || propTitle.includes('معرض') || propTitle.includes('تجاري'))));
  const isOff = !isLand && !isCom && (selectedProp.type === 'office' || selectedProp.category === 'administrative' || (propTitle && (propTitle.includes('مكتب') || propTitle.includes('عيادة') || propTitle.includes('إداري'))));

  let sectorTitleLuxury = 'قصر السكن الراقي';
  let sectorHookLuxury = 'هل تبحث عن السكن الفندقي والخصوصية الكاملة لك ولأسرتك؟';
  let sectorSpaceLuxury = propRooms ? `بتوزيع داخلي (${propRooms} غرف نوم)` : 'بتوزيع داخلي مدروس';
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
• مقدم التعاقد والاستلام: ${propDownPayment}
• قسط شهري ميسر: ${propInstallment} فقط!

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
✅ مقدم يبدأ من ${propDownPayment} وقسط شهري ${propInstallment}
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
• التسهيلات: مقدم ${propDownPayment} والباقي على أقساط.

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

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="property-form-modal-card animate-fadeIn" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
        <div className="modal-form-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wand2 size={20} className="text-gold" />
            <h3 style={{ margin: 0 }}>
              {isAr ? 'مُولّد الإعلانات التسويقية بالذكاء الاصطناعي' : 'AI Real Estate Copywriter'}
            </h3>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Controls Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '18px' }}>
            <div>
              <label style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                {isAr ? 'اختر العقار المراد كتابة إعلان له:' : 'Select Property:'}
              </label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="form-input"
                style={{ width: '100%', fontWeight: 'bold' }}
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {isAr ? p.title_ar : p.title_en} ({p.price?.toLocaleString('en-US')} ج.م)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                {isAr ? 'نبرة وأسلوب الإعلان:' : 'Campaign Tone:'}
              </label>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${adTone === 'luxury' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setAdTone('luxury')}
                  style={{ flex: '1 1 auto', padding: '5px 6px', fontSize: 'var(--crm-text-xs)' }}
                >
                  👑 {isAr ? 'فندقي' : 'Luxury'}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${adTone === 'social' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setAdTone('social')}
                  style={{ flex: '1 1 auto', padding: '5px 6px', fontSize: 'var(--crm-text-xs)' }}
                >
                  🔥 {isAr ? 'سوشيال' : 'Viral'}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${adTone === 'investor' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setAdTone('investor')}
                  style={{ flex: '1 1 auto', padding: '5px 6px', fontSize: 'var(--crm-text-xs)' }}
                >
                  📈 {isAr ? 'استثماري' : 'Investor'}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${adTone === 'expat' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setAdTone('expat')}
                  style={{ flex: '1 1 auto', padding: '5px 6px', fontSize: 'var(--crm-text-xs)' }}
                >
                  ✈️ {isAr ? 'مغتربين' : 'Expats'}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${adTone === 'english' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setAdTone('english')}
                  style={{ flex: '1 1 auto', padding: '5px 6px', fontSize: 'var(--crm-text-xs)' }}
                >
                  🌐 EN
                </button>
              </div>
            </div>
          </div>

          {/* Generated Text Preview Box */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-accent-text)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                <Sparkles size={14} /> {isAr ? 'تم الصياغة بواسطة الذكاء الاصطناعي العقاري' : 'AI Generated Content'}
              </span>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={handleCopy}
                  style={{ padding: '4px 10px', fontSize: 'var(--crm-text-xs)' }}
                >
                  {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ النص' : 'Copy')}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-accent"
                  onClick={handleSendToWhatsApp}
                  style={{ padding: '4px 10px', fontSize: 'var(--crm-text-xs)' }}
                >
                  <Send size={14} />
                  <span>{isAr ? 'مشاركة واتساب' : 'Share WhatsApp'}</span>
                </button>
              </div>
            </div>

            <textarea
              readOnly
              rows="12"
              className="form-input"
              value={adText}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--crm-ink)',
                lineHeight: '1.7',
                fontSize: 'var(--crm-text-base)',
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div className="cms-modal-actions" style={{ marginTop: '16px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
