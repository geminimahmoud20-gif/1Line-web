import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  X, 
  Trash2, 
  Heart, 
  Building, 
  MapPin, 
  ExternalLink, 
  MessageSquare, 
  Eye, 
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { formatCurrencyPrice } from '../../utils/currencyAndBenchmark.js';
import { getWhatsAppUrl } from '../../utils/founderCmsData.js';
import { trackEvent } from '../../utils/visitorTracker.js';

export default function FavoritesDrawer({
  isOpen,
  onClose,
  favorites = [],
  properties = [],
  onRemoveFavorite,
  onClearFavorites,
  onQuickView,
  lang = 'ar',
  currency = 'EGP'
}) {
  if (!isOpen) return null;

  const isAr = lang === 'ar';

  // Map favorite IDs to actual property objects
  const favoriteProperties = useMemo(() => {
    const map = new Map(properties.map(p => [p.id, p]));
    return favorites.map(id => map.get(id)).filter(Boolean);
  }, [favorites, properties]);

  // Calculate total budget of saved properties
  const totalBudget = useMemo(() => {
    return favoriteProperties.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  }, [favoriteProperties]);

  const totalBudgetObj = formatCurrencyPrice(totalBudget, currency, lang);

  // Send WhatsApp consultation with all saved favorites
  const handleShareAllWhatsApp = () => {
    if (favoriteProperties.length === 0) return;

    let msg = isAr 
      ? `❤️ *قائمة عقاراتي المفضلة والمختارة — منصة 1Line بسوهاج*\n`
      : `❤️ *My Saved & Favorite Properties — 1Line Sohag*\n`;
    msg += `----------------------------------------\n`;

    favoriteProperties.forEach((p, idx) => {
      const title = isAr ? p.title_ar : p.title_en;
      const loc = isAr ? p.locationName_ar : p.locationName_en;
      msg += `\n🏠 *${idx + 1}. ${title}* (كود: #${p.id})\n`;
      msg += `📍 *الموقع:* ${loc}\n`;
      msg += `💰 *السعر:* ${p.price?.toLocaleString()} ج.م\n`;
      msg += `🔗 ${window.location.origin}/properties/${p.id}\n`;
    });

    msg += `\n----------------------------------------\n`;
    msg += isAr 
      ? `أرجو التكرم بمراجعة هذه القائمة وتحديد إمكانية المعاينة الميدانية وأفضل خطط السداد المتاحة.`
      : `Please review these properties for viewing appointments and payment plans.`;

    trackEvent('favorites_shared_whatsapp', { count: favoriteProperties.length });
    window.open(getWhatsAppUrl(msg), '_blank');
  };

  return (
    <div className="modal-backdrop-luxury favorites-drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="favorites-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header-row">
          <div className="drawer-title-box">
            <div className="drawer-heart-icon-wrap">
              <Heart size={18} fill="#ef4444" color="#ef4444" />
            </div>
            <div>
              <h3>{isAr ? 'العقارات المحفوظة' : 'Saved Properties'}</h3>
              <span className="drawer-count-badge">
                {favoriteProperties.length} {isAr ? 'عقارات في قائمتك' : 'items'}
              </span>
            </div>
          </div>

          <div className="drawer-header-actions">
            {favoriteProperties.length > 0 && (
              <button
                type="button"
                className="btn-clear-favorites"
                onClick={onClearFavorites}
                title={isAr ? 'تفريغ قائمة المفضلة' : 'Clear all'}
              >
                <Trash2 size={14} />
                <span>{isAr ? 'مسح الكل' : 'Clear'}</span>
              </button>
            )}
            <button
              type="button"
              className="btn-close-drawer"
              onClick={onClose}
              aria-label={isAr ? 'إغلاق' : 'Close'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body-scroll">
          {favoriteProperties.length === 0 ? (
            <div className="drawer-empty-state">
              <div className="empty-heart-ring">
                <Heart size={36} className="text-muted" />
              </div>
              <h4>{isAr ? 'قائمة المفضلة فارغة حالياً' : 'No Saved Properties Yet'}</h4>
              <p>
                {isAr 
                  ? 'انقر على رمز القلب في أي عقار لحفظه في قائمتك الخاصة والرجوع إليه في أي وقت.' 
                  : 'Click the heart icon on any property card to save it for easy access.'}
              </p>
              <Link 
                to="/properties" 
                className="btn btn-primary btn-sm"
                onClick={onClose}
              >
                <Building size={15} />
                <span>{isAr ? 'استكشاف دليل العقارات' : 'Explore Properties'}</span>
              </Link>
            </div>
          ) : (
            <div className="favorites-list-cards">
              {favoriteProperties.map((p) => {
                const title = isAr ? p.title_ar : p.title_en;
                const loc = isAr ? p.locationName_ar : p.locationName_en;
                const priceObj = formatCurrencyPrice(p.price, currency, lang);
                const thumb = p.images?.[0] || p.image || '/favicon.svg';

                return (
                  <div key={p.id} className="fav-card-item">
                    <img 
                      src={thumb} 
                      alt={title} 
                      className="fav-card-thumb" 
                      loading="lazy"
                    />

                    <div className="fav-card-info">
                      <div className="fav-card-top-row">
                        <span className="fav-prop-code">{p.id.toUpperCase()}</span>
                        <button
                          type="button"
                          className="btn-remove-fav"
                          onClick={() => onRemoveFavorite(p.id)}
                          title={isAr ? 'إزالة من المفضلة' : 'Remove'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <h4 className="fav-card-title">{title}</h4>

                      <div className="fav-card-loc">
                        <MapPin size={12} />
                        <span>{loc}</span>
                      </div>

                      <div className="fav-card-price-row">
                        <strong className="fav-price-val">{priceObj.primary} {priceObj.symbol}</strong>
                        {p.monthlyInstallment && (
                          <span className="fav-installment-pill">
                            {p.monthlyInstallment.toLocaleString()} {isAr ? 'ج.م/ش' : 'EGP/mo'}
                          </span>
                        )}
                      </div>

                      <div className="fav-card-actions">
                        <Link
                          to={`/properties/${p.id}`}
                          className="fav-btn-view"
                          onClick={onClose}
                        >
                          <span>{isAr ? 'التفاصيل' : 'Details'}</span>
                          {isAr ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
                        </Link>

                        {onQuickView && (
                          <button
                            type="button"
                            className="fav-btn-quick"
                            onClick={() => {
                              onClose();
                              onQuickView(p);
                            }}
                            title={isAr ? 'معاينة سريعة' : 'Quick View'}
                          >
                            <Eye size={13} />
                            <span>{isAr ? 'معاينة' : 'Quick'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer Summary & WhatsApp CTA */}
        {favoriteProperties.length > 0 && (
          <div className="drawer-footer-panel">
            <div className="drawer-budget-summary">
              <span className="budget-lbl">{isAr ? 'إجمالي قيمة العقارات المختارة:' : 'Total Portfolio Value:'}</span>
              <strong className="budget-val">{totalBudgetObj.primary} {totalBudgetObj.symbol}</strong>
            </div>

            <button
              type="button"
              className="btn-fav-whatsapp-all"
              onClick={handleShareAllWhatsApp}
            >
              <MessageSquare size={16} />
              <span>{isAr ? 'إرسال القائمة للمستشار عبر واتساب' : 'Inquire on All via WhatsApp'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
