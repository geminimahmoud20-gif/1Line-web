import { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Send, 
  Building, 
  Flame, 
  Globe, 
  TrendingUp, 
  X,
  MessageSquare,
  Wand2
} from 'lucide-react';

export default function AICopywriterModal({
  isOpen,
  onClose,
  properties = [],
  lang = 'ar',
  triggerToast
}) {
  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '');
  const [adTone, setAdTone] = useState('luxury'); // 'luxury' | 'social' | 'investor' | 'english'
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedProp = properties.find(p => p.id === selectedPropertyId) || properties[0] || {};

  const propTitle = isAr ? selectedProp.title_ar : selectedProp.title_en;
  const propLocation = isAr ? selectedProp.locationName_ar : selectedProp.locationName_en;
  const propPrice = selectedProp.price ? selectedProp.price.toLocaleString() + ' ج.م' : 'سعر مميز';
  const propDownPayment = selectedProp.downPayment ? selectedProp.downPayment.toLocaleString() + ' ج.م' : 'مقدم ميسر';
  const propInstallment = selectedProp.monthlyInstallment ? selectedProp.monthlyInstallment.toLocaleString() + ' ج.م' : 'أقساط مرنة';
  const propSize = selectedProp.size || 150;
  const propRooms = selectedProp.bedrooms || 3;

  // AI Generated Templates
  const generateAdContent = () => {
    if (adTone === 'luxury') {
      return (
`✨【 قصر السكن الراقي في قلب سوهاج — ${propTitle} 】✨

💎 هل تبحث عن السكن الفندقي والخصوصية الكاملة لك ولأسرتك؟
يسر شركة "ون لاين للحلول العقارية" أن تقدم لعشاق الفخامة والمغتربين أرقى المعروضات العقارية بسوهاج:

📍 الموقع الاستراتيجي: ${propLocation}
📐 المساحة الملكية: ${propSize} م² بتوزيع داخلي فريد (${propRooms} غرف نوم فاخرة)
⚖️ الموقف القانوني: مرخص رسمياً ومسجل شهر عقاري 100% (حصة بالأرض)
⭐ المميزات: تشطيب سوبر لوكس، أسانسير حديث، إطلالة مفتوحة ومرافق كاملة جاهزة.

💰 خطة السداد والاستثمار:
• السعر الإجمالي: ${propPrice}
• مقدم التعاقد والاستلام: ${propDownPayment}
• قسط شهري ميسر: ${propInstallment} فقط!

📞 للتواصل المباشر وحجز موعد المعاينة الخاصة:
مستشارك العقاري: 01012345678
واتساب فوري: https://wa.me/201012345678
شركة ون لاين — استثمارك المضمون في سوهاج.`);
    }

    if (adTone === 'social') {
      return (
`🔥【 لقطة الأسبوع بسوهاج — فرصة لن تتكرر للسكن والاستثمار! 】🔥

🏡 فرصة العمر: ${propTitle}
📍 في أميز مناطق سوهاج: ${propLocation}

⚡ ليه العقار ده بالذات ميتفوتش؟
✅ مساحة واسعة: ${propSize} م² (${propRooms} غرف + ريسبشن كبير)
✅ مقدم يبدأ من ${propDownPayment} وقسط شهري ${propInstallment}
✅ خالص التراخيص ونموذج 10 وجاهز للاستلام والسكن الفوري!
✅ مفيش عمولة على المشتري!

⏳ العرض ساري لأسبقية الحجز فقط!
📲 كلمنا فوراً أو ابعتلنا واتساب على: 01012345678
#عقارات_سوهاج #شقق_للبيع #سوهاج_الجديدة #ون_لاين`);
    }

    if (adTone === 'investor') {
      return (
`📊【 دراسة جدوى استثمارية عالية العائد — ONE LINE INVEST 】📊

🏢 الأصل العقاري: ${propTitle}
📍 الموقع: ${propLocation}
💵 السعر الإجمالي: ${propPrice}

📈 مؤشرات الجدوى والأرباح المتوقعة:
• العائد الإيجاري السنوي المتوقع (Rental Yield): 12.5% - 15% سنوياً
• معدل نمو القيمة الرأسمالية (Capital Appreciation): 25% سنوياً في هذه المنطقة
• فترة استرداد رأس المال: قياسية بفضل الموقع التجاري والحيوي
• التسهيلات: مقدم ${propDownPayment} والباقي على أقساط مريحة.

🛡️ الفحص والتدقيق القانوني:
العقار معتمد ومفحوص بواسطة الإدارة القانونية لمنصة ون لاين مع حصة مسجلة في الأرض وخلو تام من أي نزاعات.

💼 لطلب الملف الاستثماري الكامل وجدول التدفقات النقدية:
تواصل مع مكتب كبار المستثمرين: 01012345678`);
    }

    return (
`🏛️【 Premium Verified Property in Sohag — One Line Real Estate 】🏛️

🌟 Featured Unit: ${selectedProp.title_en || propTitle}
📍 Prime Location: ${selectedProp.locationName_en || propLocation}
📐 Total Area: ${propSize} sqm | ${propRooms} Luxury Bedrooms
📑 Legal Status: 100% Verified Title Deed & Construction Permit

💎 Payment Terms:
• Total Value: ${propPrice}
• Down Payment: ${propDownPayment}
• Monthly Installment: ${propInstallment}

📲 Book a private viewing today with our executive team:
WhatsApp / Direct Call: +201012345678
One Line Real Estate — Trust, Security, Excellence.`);
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
      <div className="property-form-modal-card animate-fadeIn" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="modal-form-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wand2 size={20} className="text-gold" />
            <h3 style={{ margin: 0 }}>
              {isAr ? 'مُولّد الإعلانات التسويقية بالذكاء الاصطناعي (AI Real Estate Copywriter)' : 'AI Real Estate Copywriter'}
            </h3>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Controls Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '18px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
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
                    {isAr ? p.title_ar : p.title_en} ({p.price?.toLocaleString()} ج.م)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                {isAr ? 'نبرة وأسلوب الإعلان (Tone):' : 'Campaign Tone:'}
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${adTone === 'luxury' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setAdTone('luxury')}
                  style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem' }}
                >
                  👑 {isAr ? 'فندقي نخبوي' : 'Luxury'}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${adTone === 'social' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setAdTone('social')}
                  style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem' }}
                >
                  🔥 {isAr ? 'سوشيال جذاب' : 'Viral'}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${adTone === 'investor' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setAdTone('investor')}
                  style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem' }}
                >
                  📈 {isAr ? 'استثماري' : 'Investor'}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${adTone === 'english' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setAdTone('english')}
                  style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem' }}
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
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                <Sparkles size={14} /> {isAr ? 'تم الصياغة بواسطة الذكاء الاصطناعي العقاري' : 'AI Generated Content'}
              </span>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={handleCopy}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ النص' : 'Copy')}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-accent"
                  onClick={handleSendToWhatsApp}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
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
                color: 'var(--text-primary)',
                lineHeight: '1.7',
                fontSize: '0.85rem',
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
