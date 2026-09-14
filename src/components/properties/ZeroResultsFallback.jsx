import { RotateCcw, Sparkles, MessageSquare, SearchX, CheckCircle2 } from 'lucide-react';
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

  const handleCustomRequestWhatsApp = () => {
    const msg = isAr 
      ? 'مرحباً 1Line، أبحث عن عقار بمواصفات محددة في سوهاج ولم أجده في الموقع، وأرغب في تسجيل طلب مخصص.'
      : 'Hello 1Line, I am looking for a specific property in Sohag and would like to submit a custom request.';
    window.open(getWhatsAppUrl(msg), '_blank');
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
            ? 'لا تتردد في طلب استشارة خاصة؛ يمكن لمكتب 1Line توفير وحدتك المستهدفة من خلال شبكة الصفقات المغلقة (Off-Market) خلال 48 ساعة.' 
            : 'Looking for specific criteria? 1Line Private Office can source your target asset via our Off-Market network within 48 hours.'}
        </p>

        <div className="zero-actions-row">
          <button type="button" className="btn btn-primary" onClick={onResetFilters}>
            <RotateCcw size={16} />
            <span>{isAr ? 'عرض جميع العقارات المتاحة' : 'Show All Available Properties'}</span>
          </button>

          <button 
            type="button" 
            className="btn btn-whatsapp-direct" 
            onClick={handleCustomRequestWhatsApp}
            title={isAr ? 'طلب صفقة سرية خاصة' : 'Request Private Off-Market Deal'}
          >
            <Sparkles size={16} />
            <span>{isAr ? 'طلب صفقة خاصة (Off-Market VIP)' : 'Request Private Off-Market Deal'}</span>
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
