import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Scale, 
  ShieldCheck, 
  User, 
  Mail, 
  Phone, 
  LogOut, 
  Building, 
  Sparkles, 
  Share2, 
  FileText, 
  Trash2, 
  ArrowLeft, 
  ArrowRight,
  MapPin,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { useClientAuth } from '../context/ClientAuthContext';
import PropertyCard from '../components/properties/PropertyCard';
import { formatCurrencyPrice } from '../utils/currencyAndBenchmark';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import { generateComparePdf } from '../utils/comparePdfGenerator';

export default function ClientAccountPage({
  properties = [],
  favorites = [],
  onToggleFavorite,
  compareList = [],
  onToggleCompare,
  onClearFavorites,
  onClearCompare,
  onOpenCompare,
  lang = 'ar',
  currency = 'EGP'
}) {
  const isAr = lang === 'ar';
  const { 
    clientUser, 
    isClientAuthenticated, 
    logoutClient, 
    setClientAuthModalOpen 
  } = useClientAuth();

  const [activeTab, setActiveTab] = useState('favorites'); // 'favorites' | 'compare' | 'profile'

  // Map favorite IDs to actual property objects
  const favoriteProperties = useMemo(() => {
    const map = new Map(properties.map(p => [p.id, p]));
    return favorites.map(id => map.get(id)).filter(Boolean);
  }, [favorites, properties]);

  // Aggregate stats
  const totalFavoriteValue = useMemo(() => {
    return favoriteProperties.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  }, [favoriteProperties]);

  const formattedFavoriteTotal = formatCurrencyPrice(totalFavoriteValue, currency, lang);

  // Send WhatsApp consultation with all saved favorites
  const handleShareFavoritesWhatsApp = () => {
    if (favoriteProperties.length === 0) return;

    let msg = isAr 
      ? `❤️ *ملف العقارات المفضلة للعميل المعتمد:* ${clientUser?.name || 'عميل 1Line'}\n`
      : `❤️ *Saved Properties Portfolio for:* ${clientUser?.name || '1Line Client'}\n`;
    msg += `📱 رقم الواتساب: ${clientUser?.whatsapp || ''}\n`;
    msg += `----------------------------------------\n`;

    favoriteProperties.forEach((p, idx) => {
      const title = isAr ? p.title_ar : p.title_en;
      const loc = isAr ? p.locationName_ar : p.locationName_en;
      msg += `\n🏠 *${idx + 1}. ${title}* (كود: #${p.id})\n`;
      msg += `📍 ${loc}\n`;
      msg += `💰 ${Number(p.price).toLocaleString()} ج.م\n`;
      msg += `🔗 ${window.location.origin}/properties/${p.id}\n`;
    });

    msg += `\n----------------------------------------\n`;
    msg += isAr 
      ? `أرجو التكرم بالتواصل معي لترتيب المعاينات الميدانية وبحث التسهيلات المالية المتاحة.`
      : `Please contact me to schedule site visits and explore payment facilities.`;

    window.open(getWhatsAppUrl(msg), '_blank');
  };

  // If client is not authenticated, render the welcoming account activation gate
  if (!isClientAuthenticated) {
    return (
      <div className="client-account-page unauth-view">
        <div className="account-unauth-container">
          <div className="unauth-shield-icon">
            <ShieldCheck size={40} className="text-gold" />
          </div>
          <span className="unauth-badge-pill">
            {isAr ? 'منظومة حسابات عملاء 1Line سوهاج' : '1Line Client Accounts'}
          </span>
          <h1 className="unauth-title">
            {isAr ? 'لوحة إدارة عقاراتك المفضلة والمقارنات الذكية' : 'My Saved Properties & Smart Comparisons'}
          </h1>
          <p className="unauth-desc">
            {isAr 
              ? 'قم بتسجيل وتأكيد حسابك عبر الواتساب للاحتفاظ بعقاراتك المفضلة ومقارنتها عبر جميع أجهزتك وتلقي إشعارات انخفاض الأسعار.'
              : 'Activate your client account via WhatsApp to save your favorites, run comparisons, and get instant price alerts.'}
          </p>

          <div className="unauth-features-row">
            <div className="unauth-feat">
              <Heart size={20} className="text-rose" />
              <strong>{isAr ? 'حفظ دائم للمفضلة' : 'Saved Favorites'}</strong>
              <span>{isAr ? 'مزامنة كاملة عبر هاتفك وحاسوبك' : 'Synced on all devices'}</span>
            </div>
            <div className="unauth-feat">
              <Scale size={20} className="text-amber" />
              <strong>{isAr ? 'مقارنة فنية ومالية' : 'Side-by-Side Compare'}</strong>
              <span>{isAr ? 'مقارنة دقيقة للمساحات والأقساط' : 'Price & specs table'}</span>
            </div>
            <div className="unauth-feat">
              <Sparkles size={20} className="text-emerald" />
              <strong>{isAr ? 'معاينات VIP مباشرة' : 'VIP Priority Tours'}</strong>
              <span>{isAr ? 'أولوية حجز وحضور المعاينات' : 'Priority viewing slots'}</span>
            </div>
          </div>

          <button 
            type="button" 
            onClick={() => setClientAuthModalOpen(true)} 
            className="btn-activate-account-cta"
          >
            <span>{isAr ? 'تفعيل حسابي وتأكيد البيانات عبر واتساب 🚀' : 'Activate Account via WhatsApp'}</span>
            {isAr ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="client-account-page">
      <div className="client-account-container">
        {/* Profile Card Header */}
        <div className="client-profile-card">
          <div className="client-profile-main">
            <div className="client-avatar-circle">
              <span>{clientUser.name ? clientUser.name.charAt(0).toUpperCase() : 'U'}</span>
            </div>
            <div className="client-profile-info">
              <div className="client-name-row">
                <h2>{clientUser.name}</h2>
                <span className="verified-status-tag">
                  <ShieldCheck size={14} className="text-emerald" />
                  <span>{isAr ? 'حساب موثق رسمياً' : 'Verified Client'}</span>
                </span>
              </div>
              <div className="client-contact-details">
                <span className="contact-tag">
                  <Phone size={13} className="text-emerald" />
                  <bdi>{clientUser.whatsapp}</bdi>
                </span>
                <span className="contact-tag">
                  <Mail size={13} className="text-muted" />
                  <span>{clientUser.email}</span>
                </span>
                {clientUser.verifiedAt && (
                  <span className="contact-tag hide-mobile">
                    <Calendar size={13} className="text-muted" />
                    <span>{isAr ? 'عضو منذ: ' : 'Member since: '} {new Date(clientUser.verifiedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Portfolio Stats */}
          <div className="client-stats-strip">
            <div className="stat-box">
              <span className="stat-label">{isAr ? 'العقارات المفضلة' : 'Favorites'}</span>
              <strong className="stat-num text-rose">
                {favoriteProperties.length}
              </strong>
            </div>
            <div className="stat-box">
              <span className="stat-label">{isAr ? 'عقارات المقارنة' : 'Compared'}</span>
              <strong className="stat-num text-amber">
                {compareList.length}
              </strong>
            </div>
            {favoriteProperties.length > 0 && (
              <div className="stat-box hide-mobile">
                <span className="stat-label">{isAr ? 'إجمالي قيمة المفضلة' : 'Portfolio Value'}</span>
                <strong className="stat-num text-gold">
                  {formattedFavoriteTotal.primary} {formattedFavoriteTotal.symbol}
                </strong>
              </div>
            )}
            <button 
              type="button" 
              onClick={logoutClient} 
              className="btn-client-logout"
              title={isAr ? 'تسجيل الخروج' : 'Logout'}
            >
              <LogOut size={15} />
              <span>{isAr ? 'خروج' : 'Logout'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="client-account-tabs">
          <button 
            type="button" 
            className={`account-tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            <Heart size={16} fill={activeTab === 'favorites' ? '#ef4444' : 'none'} color={activeTab === 'favorites' ? '#ef4444' : 'currentColor'} />
            <span>{isAr ? 'عقاراتي المفضلة' : 'My Saved Properties'}</span>
            <span className="tab-pill-count">{favoriteProperties.length}</span>
          </button>

          <button 
            type="button" 
            className={`account-tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
          >
            <Scale size={16} color={activeTab === 'compare' ? '#d97706' : 'currentColor'} />
            <span>{isAr ? 'عقارات المقارنة الفورية' : 'Compared Properties'}</span>
            <span className="tab-pill-count">{compareList.length}</span>
          </button>
        </div>

        {/* Tab 1: Saved Favorites View */}
        {activeTab === 'favorites' && (
          <div className="account-tab-content">
            {favoriteProperties.length > 0 ? (
              <div>
                {/* Batch Actions Bar */}
                <div className="account-actions-bar">
                  <div className="actions-info">
                    <strong>{favoriteProperties.length}</strong> {isAr ? 'عقاراً في مفضلتك الخاصة' : 'properties saved'}
                  </div>
                  <div className="actions-btns-group">
                    <button 
                      type="button" 
                      onClick={handleShareFavoritesWhatsApp}
                      className="btn-account-action btn-wa-share"
                    >
                      <MessageSquare size={15} />
                      <span>{isAr ? 'إرسال المفضلة لاستشارة واتساب شاملة' : 'Consult on WhatsApp'}</span>
                    </button>
                    {onClearFavorites && (
                      <button 
                        type="button" 
                        onClick={onClearFavorites} 
                        className="btn-account-action btn-clear"
                        title={isAr ? 'تفريغ المفضلة' : 'Clear all'}
                      >
                        <Trash2 size={14} />
                        <span>{isAr ? 'تفريغ' : 'Clear'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Properties Cards Grid */}
                <div className="properties-grid-4">
                  {favoriteProperties.map((prop) => (
                    <PropertyCard
                      key={prop.id}
                      property={prop}
                      lang={lang}
                      currency={currency}
                      isFavorite={true}
                      onToggleFavorite={onToggleFavorite}
                      isCompared={compareList.some(c => c.id === prop.id)}
                      onToggleCompare={onToggleCompare}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="account-empty-state">
                <div className="empty-state-icon">
                  <Heart size={36} className="text-muted" />
                </div>
                <h3>{isAr ? 'لم تقم بحفظ أي عقار في مفضلتك بعد' : 'No favorites saved yet'}</h3>
                <p>
                  {isAr 
                    ? 'تصفح المشروعات والوحدات العقارية المعتمدة بسوهاج، واضغط على علامة القلب في أي بطاقة لحفظها هنا.'
                    : 'Browse properties and tap the heart icon on any card to save it here.'}
                </p>
                <Link to="/properties" className="btn-browse-properties">
                  <span>{isAr ? 'استعراض العقارات المتاحة الآن 🏢' : 'Browse Properties'}</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Compare Properties View */}
        {activeTab === 'compare' && (
          <div className="account-tab-content">
            {compareList.length > 0 ? (
              <div>
                {/* Compare Control Header */}
                <div className="account-actions-bar">
                  <div className="actions-info">
                    <strong>{compareList.length}</strong> {isAr ? 'من أصل 4 عقارات مضافة للمقارنة' : 'of 4 properties in comparison'}
                  </div>
                  <div className="actions-btns-group">
                    {onOpenCompare && (
                      <button 
                        type="button" 
                        onClick={onOpenCompare}
                        className="btn-account-action btn-open-compare"
                      >
                        <Scale size={15} />
                        <span>{isAr ? 'فتح لوحة المقارنة الشاملة 4-Way' : 'Open 4-Way Compare'}</span>
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={() => generateComparePdf(compareList, lang)}
                      className="btn-account-action btn-pdf-export"
                    >
                      <FileText size={15} />
                      <span>{isAr ? 'تصدير تقرير المقارنة (PDF)' : 'Export PDF'}</span>
                    </button>
                    {onClearCompare && (
                      <button 
                        type="button" 
                        onClick={onClearCompare} 
                        className="btn-account-action btn-clear"
                      >
                        <Trash2 size={14} />
                        <span>{isAr ? 'تفريغ' : 'Clear'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Compared Cards Grid */}
                <div className="properties-grid-4">
                  {compareList.map((prop) => (
                    <PropertyCard
                      key={prop.id}
                      property={prop}
                      lang={lang}
                      currency={currency}
                      isFavorite={favorites.includes(prop.id)}
                      onToggleFavorite={onToggleFavorite}
                      isCompared={true}
                      onToggleCompare={onToggleCompare}
                    />
                  ))}
                </div>

                {/* Side-by-Side Quick Comparison Table */}
                <div className="account-compare-table-wrap">
                  <h3 className="compare-table-title">
                    <Scale size={17} className="text-gold" />
                    <span>{isAr ? 'جدول المقارنة الفنية والمالية السريعة' : 'Technical & Financial Quick Table'}</span>
                  </h3>
                  <div className="compare-table-scroll">
                    <table className="account-quick-table">
                      <thead>
                        <tr>
                          <th>{isAr ? 'المعيار / العقار' : 'Metric'}</th>
                          {compareList.map(prop => (
                            <th key={prop.id}>
                              <Link to={`/properties/${prop.id}`} className="table-prop-link">
                                {isAr ? prop.title_ar : prop.title_en}
                              </Link>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="row-label">{isAr ? 'السعر الإجمالي' : 'Total Price'}</td>
                          {compareList.map(prop => (
                            <td key={prop.id} className="row-val price-highlight">
                              <strong>{Number(prop.price).toLocaleString()}</strong> {isAr ? 'ج.م' : 'EGP'}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="row-label">{isAr ? 'المساحة الصافية' : 'Area (Sqm)'}</td>
                          {compareList.map(prop => (
                            <td key={prop.id} className="row-val">
                              {prop.size} {isAr ? 'م²' : 'sqm'}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="row-label">{isAr ? 'سعر المتر' : 'Price / Sqm'}</td>
                          {compareList.map(prop => (
                            <td key={prop.id} className="row-val">
                              {prop.pricePerMeter ? `${Number(prop.pricePerMeter).toLocaleString()} ج.م/م²` : '—'}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="row-label">{isAr ? 'المقدم' : 'Down Payment'}</td>
                          {compareList.map(prop => (
                            <td key={prop.id} className="row-val">
                              {prop.downPayment > 0 ? `${Number(prop.downPayment).toLocaleString()} ج.م` : (isAr ? 'كاش كامل' : 'Full Cash')}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="row-label">{isAr ? 'القسط الشهري' : 'Monthly Installment'}</td>
                          {compareList.map(prop => (
                            <td key={prop.id} className="row-val">
                              {prop.monthlyInstallment > 0 ? `${Number(prop.monthlyInstallment).toLocaleString()} ج.م` : '—'}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="row-label">{isAr ? 'الموقف القانوني' : 'Legal Status'}</td>
                          {compareList.map(prop => (
                            <td key={prop.id} className="row-val">
                              <span className="legal-check-pill">
                                <ShieldCheck size={13} className="text-emerald" />
                                <span>{isAr ? 'مرخص ومعتمد رسمياً' : 'Licensed'}</span>
                              </span>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="account-empty-state">
                <div className="empty-state-icon">
                  <Scale size={36} className="text-muted" />
                </div>
                <h3>{isAr ? 'لم تقم بإضافة عقارات للمقارنة بعد' : 'No properties in comparison'}</h3>
                <p>
                  {isAr 
                    ? 'اضغط على علامة الميزان في أي بطاقة عقار لإضافتها للمقارنة والاطلاع على الفروقات المالية والفنية.'
                    : 'Tap the compare icon on any property to compare specifications.'}
                </p>
                <Link to="/properties" className="btn-browse-properties">
                  <span>{isAr ? 'استعراض العقارات للمقارنة ⚖️' : 'Browse & Compare'}</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
