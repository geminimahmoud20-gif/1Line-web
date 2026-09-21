import { useState } from 'react';
import { RotateCcw, Sparkles, MessageSquare, SearchX, CheckCircle2, Send, PhoneCall, ShieldCheck } from 'lucide-react';
import PropertyCard from './PropertyCard';
import { getWhatsAppUrl } from '../../utils/founderCmsData';

export default function ZeroResultsFallback({
  lang = 'ar',
  onResetFilters,
  suggestedProperties = [],
  favorites = [],
  onToggleFavorite,
  compareList = [],
  onToggleCompare,
  onQuickView
}) {
  const isAr = lang === 'ar';
  const [demandPhone, setDemandPhone] = useState('');
  const [demandNote, setDemandNote] = useState('');
  const [demandSubmitted, setDemandSubmitted] = useState(false);

  const handleCustomRequestWhatsApp = () => {
    const noteText = demandNote ? ` المواصفات المطلوبة: ${demandNote}.` : '';
    const phoneText = demandPhone ? ` رقم التواصل: ${demandPhone}.` : '';
    const msg = isAr 
      ? `مرحباً 1Line، أبحث عن عقار بمواصفات محددة في سوهاج ولم أجده في الموقع، وأرغب في تسجيل طلب مخصص.${noteText}${phoneText}`
      : `Hello 1Line, I am looking for a custom property in Sohag.${noteText}${phoneText}`;
    window.open(getWhatsAppUrl(msg), '_blank');
  };

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (!demandPhone) return;
    setDemandSubmitted(true);
    handleCustomRequestWhatsApp();
  };

  return (
    <div className="zero-results-fallback-container">
      {/* Top Friendly Guidance Card */}
      <div className="zero-results-hero-box">
        <div className="zero-icon-circle">
          <SearchX size={36} className="text-gold" />
        </div>
        <h3>{isAr ? 'لم نجد عقارات مطابقة تماماً لشروط بحثك الحالية' : 'No exact property matches found'}</h3>
        <p>
          {isAr 
            ? 'لا تتردد في تسجيل طلبك الخاص؛ يمتلك مكتب 1Line شبكة علاقات مع كبار المطورين والملاك في سوهاج لتوفير صفقات حصرية (Off-Market) غير معلنة خلال 48 ساعة وبدون أي عمولة على المشروعات.' 
            : 'Looking for specific criteria? 1Line Private Office can source your target asset via our Off-Market network within 48 hours.'}
        </p>

        {/* 📋 Interactive Quick Demand Register Box */}
        <div className="zero-demand-register-card" style={{
          maxWidth: '540px',
          margin: '20px auto',
          padding: '18px 20px',
          background: 'var(--card-bg, #ffffff)',
          border: '1.5px solid var(--accent-gold, #d97706)',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          textAlign: 'right'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-primary)' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-gold)' }} />
            <strong style={{ fontSize: '0.92rem' }}>
              {isAr ? 'سجّل طلبك العقاري الآن (سنوفره لك خلال 48 ساعة)' : 'Register Your Custom Demand (Sourced in 48h)'}
            </strong>
          </div>

          {demandSubmitted ? (
            <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} />
              <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>
                {isAr ? 'تم استلام طلبك بنجاح! جاري تحويلك لمستشار الصفقات الخاصة عبر واتساب.' : 'Request received! Redirecting to WhatsApp advisor.'}
              </span>
            </div>
          ) : (
            <form onSubmit={handleQuickSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="tel"
                placeholder={isAr ? 'رقم هاتفك أو الواتساب (مثال: 01012345678)' : 'WhatsApp Number'}
                value={demandPhone}
                onChange={(e) => setDemandPhone(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--secondary, #f8fafc)',
                  fontSize: '0.86rem',
                  color: 'var(--text-primary)'
                }}
              />
              <input
                type="text"
                placeholder={isAr ? 'ما الذي تبحث عنه؟ (مثال: شقة في الجمهورية، أو محل في الكوثر تحت 2 مليون)' : 'What are you looking for?'}
                value={demandNote}
                onChange={(e) => setDemandNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--secondary, #f8fafc)',
                  fontSize: '0.86rem',
                  color: 'var(--text-primary)'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px 16px', fontSize: '0.84rem', fontWeight: 800 }}
                >
                  <Send size={15} />
                  <span>{isAr ? 'إرسال لمستشار الصفقات الخاصة' : 'Send to VIP Advisor'}</span>
                </button>
              </div>
            </form>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>🔒 {isAr ? 'سرية تامة لبياناتك' : '100% Confidential'}</span>
            <span>✨ {isAr ? '0% عمولة للمشتري على المشروعات' : '0% Buyer Commission on Projects'}</span>
          </div>
        </div>

        <div className="zero-actions-row">
          <button type="button" className="btn btn-primary" onClick={onResetFilters}>
            <RotateCcw size={16} />
            <span>{isAr ? 'عرض جميع العقارات المتاحة' : 'Show All Available Properties'}</span>
          </button>
        </div>
      </div>

      {/* Suggested Alternatives Section */}
      {suggestedProperties && suggestedProperties.length > 0 && (
        <div className="zero-suggestions-section">
          <div className="suggestions-header">
            <Sparkles size={20} className="text-gold" />
            <h4>{isAr ? 'عقارات بديلة مميزة يوصي بها خبراؤنا في سوهاج' : 'Recommended Top Alternatives in Sohag'}</h4>
          </div>

          <div className="properties-grid-3">
            {suggestedProperties.slice(0, 3).map((prop) => (
              <PropertyCard
                key={prop.id}
                property={prop}
                lang={lang}
                isFavorite={favorites.includes(prop.id)}
                onToggleFavorite={onToggleFavorite}
                isCompared={compareList.some((c) => c.id === prop.id)}
                onToggleCompare={onToggleCompare}
                onQuickView={onQuickView}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
