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
  Calendar, 
  Clock, 
  Car, 
  Edit3, 
  X, 
  Search, 
  HelpCircle,
  TrendingUp,
  Tag
} from 'lucide-react';
import { useClientAuth } from '../context/ClientAuthContext';
import PropertyCard from '../components/properties/PropertyCard';
import { formatCurrencyPrice } from '../utils/currencyAndBenchmark';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import { generateComparePdf } from '../utils/comparePdfGenerator';
import { normalizePhoneNumber } from '../utils/securityShield';
import { getAreas, normalizeAreaKey } from '../utils/areasData';

function getAreaDisplayName(areaKey, lang = 'ar') {
  if (!areaKey) return lang === 'ar' ? 'سوهاج' : 'Sohag';
  const normKey = normalizeAreaKey(areaKey);
  const areas = getAreas();
  const found = areas.find(a => a.id === normKey || a.id === areaKey);
  if (found) {
    return lang === 'ar' ? (found.name_ar || found.label_ar) : (found.name_en || found.label_en);
  }
  return areaKey;
}

/**
 * Lead Stages & Color Scheme
 */
const STAGE_CONFIG = {
  new: { ar: 'طلب جديد (قيد التعيين)', en: 'New Inquiry', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)' },
  contacted: { ar: 'تم التواصل الأولي', en: 'Contacted', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' },
  site_visit: { ar: 'معاينة مجدولة مؤكدة 🚗', en: 'Site Visit Scheduled', color: '#d97706', bg: 'rgba(217, 119, 6, 0.14)' },
  negotiating: { ar: 'قيد التفاوض والتقييم', en: 'Negotiation', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.14)' },
  closing: { ar: 'إجراءات حجز وتعاقد', en: 'Closing / Deposit', color: '#059669', bg: 'rgba(5, 150, 105, 0.14)' },
  closed: { ar: 'صفقة ناجحة ومكتملة 🎉', en: 'Completed', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.14)' }
};

const PROPERTY_TYPE_NAMES = {
  apartment: 'شقة سكنية',
  retail: 'محل تجاري',
  villa: 'فيلا / تاون هاوس',
  office: 'مكتب إداري / عيادة',
  land: 'قطعة أرض',
  building: 'عمارة سكنية / تجارية',
  clinic: 'عيادة طبية',
  chalet: 'شاليه',
  commercial: 'تجاري',
  residential: 'سكني',
  administrative: 'إداري'
};

const LEAD_TYPE_NAMES = {
  buyer: 'شراء عقار',
  seller: 'عرض عقار للبيع',
  investor: 'استثمار عقاري VIP',
  bespoke_request: 'طلب عقار خاص VIP',
  financing: 'استفسار تمويل وتقسيط',
  valuation: 'طلب تقييم عقاري',
  client_account_verified: 'تفعيل حساب عميل'
};

/**
 * Fuzzy phone number comparison (handles +20, 010, spaces, and international formats)
 */
function phonesMatch(phone1, phone2) {
  if (!phone1 || !phone2) return false;
  const n1 = normalizePhoneNumber(String(phone1));
  const n2 = normalizePhoneNumber(String(phone2));
  if (n1 && n2 && n1 === n2) return true;
  const d1 = String(phone1).replace(/[^0-9]/g, '');
  const d2 = String(phone2).replace(/[^0-9]/g, '');
  if (d1.length >= 9 && d2.length >= 9) {
    return d1.slice(-9) === d2.slice(-9);
  }
  return false;
}

export default function ClientAccountPage({
  properties = [],
  favorites = [],
  onToggleFavorite,
  compareList = [],
  onToggleCompare,
  onClearFavorites,
  onClearCompare,
  onOpenCompare,
  leads = [],
  demands = [],
  lang = 'ar',
  currency = 'EGP'
}) {
  const isAr = lang === 'ar';
  const { 
    clientUser, 
    isClientAuthenticated, 
    logoutClient, 
    setClientAuthModalOpen,
    updateClientProfile 
  } = useClientAuth();

  const [activeTab, setActiveTab] = useState('favorites'); // 'favorites' | 'compare' | 'inquiries'

  // Edit Profile Modal State
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(clientUser?.name || '');
  const [editEmail, setEditEmail] = useState(clientUser?.email || '');

  // Map favorite IDs to actual property objects
  const favoriteProperties = useMemo(() => {
    const map = new Map(properties.map(p => [p.id, p]));
    return favorites.map(id => map.get(id)).filter(Boolean);
  }, [favorites, properties]);

  // Client's personal inquiries/leads filtered by phone
  const clientLeads = useMemo(() => {
    if (!clientUser?.whatsapp && !clientUser?.phone) return [];
    const clientPhone = clientUser.whatsapp || clientUser.phone;
    return (leads || []).filter(lead => {
      const leadPhone = lead.whatsapp || lead.phone;
      return phonesMatch(leadPhone, clientPhone);
    });
  }, [leads, clientUser]);

  // Client's scheduled site visits
  const clientSiteVisits = useMemo(() => {
    return clientLeads.filter(lead => lead.siteVisit || lead.status === 'site_visit');
  }, [clientLeads]);

  // Client's submitted demands
  const clientDemands = useMemo(() => {
    if (!clientUser?.whatsapp && !clientUser?.phone) return [];
    const clientPhone = clientUser.whatsapp || clientUser.phone;
    return (demands || []).filter(d => {
      const dPhone = d.whatsapp || d.phone;
      return phonesMatch(dPhone, clientPhone);
    });
  }, [demands, clientUser]);

  // Aggregate stats
  const totalFavoriteValue = useMemo(() => {
    return favoriteProperties.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  }, [favoriteProperties]);

  const formattedFavoriteTotal = formatCurrencyPrice(totalFavoriteValue, currency, lang);
  const totalInquiriesCount = clientLeads.length + clientDemands.length;

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

  // WhatsApp follow-up for a specific inquiry
  const handleInquiryWhatsApp = (lead) => {
    const typeLabel = LEAD_TYPE_NAMES[lead.type] || lead.type || 'استشارة عقارية';
    const msg = isAr
      ? `📋 *متابعة طلب استشارة عقارية — منصة 1Line سوهاج*\n` +
        `👤 *الاسم:* ${clientUser?.name || lead.name}\n` +
        `📱 *الهاتف:* ${clientUser?.whatsapp || lead.phone}\n` +
        `🔖 *الطلب:* ${typeLabel} (كود #${lead.id || 'N/A'})\n` +
        `──────────────\n` +
        `أرجو إفادتي بآخر المستجدات بخصوص هذا الطلب والمواعيد المتاحة.`
      : `Inquiry follow up for request #${lead.id}`;
    window.open(getWhatsAppUrl(msg), '_blank');
  };

  // WhatsApp follow-up for a site visit
  const handleSiteVisitWhatsApp = (lead) => {
    const visit = lead.siteVisit || {};
    const dateText = visit.date ? `${visit.date} ${visit.time || ''}` : 'المحدد';
    const msg = isAr
      ? `🚗 *تأكيد موعد معاينة ميدانية — منصة 1Line سوهاج*\n` +
        `👤 *الاسم:* ${clientUser?.name}\n` +
        `📱 *الهاتف:* ${clientUser?.whatsapp}\n` +
        `📅 *الموعد:* ${dateText}\n` +
        `──────────────\n` +
        `أرغب في تأكيد تفاصيل الحضور وتحديد نقطة الانطلاق مع المستشار المرافق.`
      : `Site visit confirmation for ${dateText}`;
    window.open(getWhatsAppUrl(msg), '_blank');
  };

  // Save profile changes
  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    updateClientProfile({
      name: editName.trim(),
      email: editEmail.trim().toLowerCase()
    });
    setEditProfileOpen(false);
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
            {isAr ? 'لوحة إدارة عقاراتك المفضلة والمقارنات والمواعيد' : 'My Saved Properties, Comparisons & Visits'}
          </h1>
          <p className="unauth-desc">
            {isAr 
              ? 'قم بتسجيل وتأكيد حسابك عبر الواتساب للاحتفاظ بعقاراتك المفضلة، ومقارنة المشروعات، ومتابعة مواعيد معايناتك الميدانية لحظة بلحظة.'
              : 'Activate your client account via WhatsApp to save favorites, run comparisons, and track your site visits in real time.'}
          </p>

          <div className="unauth-features-row">
            <div className="unauth-feat">
              <Heart size={20} className="text-rose" />
              <strong>{isAr ? 'حفظ دائم للمفضلة' : 'Saved Favorites'}</strong>
              <span>{isAr ? 'مزامنة معزولة وآمنة لحسابك' : 'Isolated and synced to your account'}</span>
            </div>
            <div className="unauth-feat">
              <Calendar size={20} className="text-gold" />
              <strong>{isAr ? 'متابعة المعاينات' : 'Site Visits Tracker'}</strong>
              <span>{isAr ? 'متابعة مواعيد المعاينات وسيارات الجولات' : 'Track booked dates & chauffeurs'}</span>
            </div>
            <div className="unauth-feat">
              <Scale size={20} className="text-amber" />
              <strong>{isAr ? 'مقارنة فنية ومالية' : 'Side-by-Side Compare'}</strong>
              <span>{isAr ? 'مقارنة دقيقة للمساحات والأقساط' : 'Price & specs table'}</span>
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
    <div className="client-account-page" dir={isAr ? 'rtl' : 'ltr'}>
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
                  <span>{isAr ? 'عميل معتمد رسمي' : 'Verified Client'}</span>
                </span>
                <button
                  type="button"
                  className="btn-edit-profile-trigger"
                  onClick={() => {
                    setEditName(clientUser.name || '');
                    setEditEmail(clientUser.email || '');
                    setEditProfileOpen(true);
                  }}
                  title={isAr ? 'تعديل بيانات الحساب' : 'Edit profile details'}
                >
                  <Edit3 size={13} />
                  <span>{isAr ? 'تعديل الحساب' : 'Edit'}</span>
                </button>
              </div>
              <div className="client-contact-details">
                <span className="contact-tag">
                  <Phone size={13} className="text-emerald" />
                  <bdi>{clientUser.whatsapp || clientUser.phone}</bdi>
                </span>
                {clientUser.email && (
                  <span className="contact-tag">
                    <Mail size={13} className="text-muted" />
                    <span>{clientUser.email}</span>
                  </span>
                )}
                {clientUser.verificationToken && (
                  <span className="contact-tag hide-mobile">
                    <ShieldCheck size={13} className="text-gold" />
                    <span>{isAr ? 'كود التوثيق: ' : 'Token: '} {clientUser.verificationToken}</span>
                  </span>
                )}
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
            <div 
              className={`stat-box clickable ${activeTab === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveTab('favorites')}
            >
              <span className="stat-label">{isAr ? 'العقارات المفضلة' : 'Favorites'}</span>
              <strong className="stat-num text-rose">
                {favoriteProperties.length}
              </strong>
            </div>

            <div 
              className={`stat-box clickable ${activeTab === 'compare' ? 'active' : ''}`}
              onClick={() => setActiveTab('compare')}
            >
              <span className="stat-label">{isAr ? 'عقارات المقارنة' : 'Compared'}</span>
              <strong className="stat-num text-amber">
                {compareList.length}
              </strong>
            </div>

            <div 
              className={`stat-box clickable ${activeTab === 'inquiries' ? 'active' : ''}`}
              onClick={() => setActiveTab('inquiries')}
            >
              <span className="stat-label">{isAr ? 'طلباتي ومواعيدي' : 'Inquiries & Visits'}</span>
              <strong className="stat-num text-gold">
                {totalInquiriesCount}
              </strong>
            </div>

            {favoriteProperties.length > 0 && (
              <div className="stat-box hide-mobile">
                <span className="stat-label">{isAr ? 'قيمة المفضلة' : 'Portfolio Value'}</span>
                <strong className="stat-num text-emerald" style={{ fontSize: '0.95rem' }}>
                  {formattedFavoriteTotal.primary} {formattedFavoriteTotal.symbol}
                </strong>
              </div>
            )}

            <button 
              type="button" 
              onClick={logoutClient} 
              className="btn-client-logout"
              title={isAr ? 'تسجيل الخروج ومسح الجلسة' : 'Logout and clear active session'}
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

          <button 
            type="button" 
            className={`account-tab-btn ${activeTab === 'inquiries' ? 'active' : ''}`}
            onClick={() => setActiveTab('inquiries')}
          >
            <Calendar size={16} color={activeTab === 'inquiries' ? '#059669' : 'currentColor'} />
            <span>{isAr ? 'طلباتي ومواعيدي' : 'My Requests & Site Visits'}</span>
            <span className="tab-pill-count">{totalInquiriesCount}</span>
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
                    <strong>{favoriteProperties.length}</strong> {isAr ? 'عقاراً في مفضلتك الخاصة (محفوظة في حسابك)' : 'properties saved in your account'}
                  </div>
                  <div className="actions-btns-group">
                    <button 
                      type="button" 
                      onClick={handleShareFavoritesWhatsApp}
                      className="btn-account-action btn-wa-share"
                    >
                      <MessageSquare size={15} />
                      <span>{isAr ? 'استشارة واتساب للمفضلة' : 'Consult on WhatsApp'}</span>
                    </button>
                    {onClearFavorites && (
                      <button 
                        type="button" 
                        onClick={() => onClearFavorites(false)} 
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
                    ? 'تصفح المشروعات والوحدات العقارية المعتمدة بسوهاج، واضغط على علامة القلب في أي بطاقة لحفظها هنا في حسابك.'
                    : 'Browse properties and tap the heart icon on any card to save it here to your verified account.'}
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
                        <span>{isAr ? 'فتح المقارنة الشاملة 4-Way' : 'Open 4-Way Compare'}</span>
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

        {/* Tab 3: My Inquiries, Site Visits & Demands View */}
        {activeTab === 'inquiries' && (
          <div className="account-tab-content inquiries-tab-view">
            {/* Section 1: Scheduled Site Visits */}
            <div className="inquiries-section">
              <div className="section-head">
                <div className="section-title-wrap">
                  <Car size={20} className="text-gold" />
                  <div>
                    <h3>{isAr ? 'المعاينات الميدانية المجدولة (VIP Site Visits)' : 'Scheduled VIP Site Visits'}</h3>
                    <p>{isAr ? 'جولات المعاينة الميدانية المنظمة مع مستشارك العقاري وسيارات النقل المخصصة' : 'Your on-site property tours with 1Line advisors and private transport'}</p>
                  </div>
                </div>
                <span className="section-count-badge">{clientSiteVisits.length}</span>
              </div>

              {clientSiteVisits.length > 0 ? (
                <div className="site-visits-cards-grid">
                  {clientSiteVisits.map((lead) => {
                    const visit = lead.siteVisit || {};
                    const targetProp = properties.find(p => p.id === (visit.propertyId || lead.targetPropertyId));
                    return (
                      <div key={lead.id} className="client-visit-card">
                        <div className="visit-card-header">
                          <span className="visit-status-badge">
                            <Clock size={13} />
                            <span>{isAr ? 'معاينة مجدولة ومؤكدة' : 'Confirmed Visit'}</span>
                          </span>
                          <span className="visit-code">#{lead.id}</span>
                        </div>

                        <div className="visit-card-body">
                          {targetProp && (
                            <div className="visit-prop-preview">
                              <Building size={16} className="text-gold" />
                              <Link to={`/properties/${targetProp.id}`} className="visit-prop-title">
                                {isAr ? targetProp.title_ar : targetProp.title_en}
                              </Link>
                            </div>
                          )}

                          <div className="visit-details-row">
                            <div className="visit-detail-item">
                              <Calendar size={14} className="text-emerald" />
                              <span>{visit.date || (isAr ? 'قيد التحديد' : 'TBD')}</span>
                            </div>
                            {visit.time && (
                              <div className="visit-detail-item">
                                <Clock size={14} className="text-emerald" />
                                <span>{visit.time}</span>
                              </div>
                            )}
                            <div className="visit-detail-item">
                              <MapPin size={14} className="text-muted" />
                              <span>{getAreaDisplayName(lead.area || targetProp?.area || 'new_sohag', lang)}</span>
                            </div>
                          </div>

                          {visit.notes && (
                            <div className="visit-notes-box">
                              <p>💡 {visit.notes}</p>
                            </div>
                          )}
                        </div>

                        <div className="visit-card-footer">
                          <button
                            type="button"
                            className="btn-visit-whatsapp"
                            onClick={() => handleSiteVisitWhatsApp(lead)}
                          >
                            <MessageSquare size={14} />
                            <span>{isAr ? 'تأكيد الموعد عبر واتساب' : 'Confirm via WhatsApp'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-sub-section">
                  <p>
                    {isAr 
                      ? 'ليس لديك معاينات ميدانية مجدولة حالياً. يمكنك طلب معاينة مجانية لأي عقار من بطاقته أو بالتواصل المباشر مع مستشارك.' 
                      : 'No scheduled site visits yet. You can request a free on-site tour from any property card.'}
                  </p>
                  <Link to="/properties" className="btn-book-visit-cta">
                    <Car size={15} />
                    <span>{isAr ? 'استعراض العقارات وحجز معاينة مجانية' : 'Browse & Book Free Tour'}</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Section 2: General Inquiries & Consultations */}
            <div className="inquiries-section">
              <div className="section-head">
                <div className="section-title-wrap">
                  <FileText size={20} className="text-gold" />
                  <div>
                    <h3>{isAr ? 'استشاراتي وطلباتي العقارية المسجلة' : 'My Inquiries & Consultations'}</h3>
                    <p>{isAr ? 'تتبع مسار طلبك ومرحلته في خط سير مستشاري 1Line بسوهاج' : 'Live tracking of your inquiries within 1Line CRM pipeline'}</p>
                  </div>
                </div>
                <span className="section-count-badge">{clientLeads.length}</span>
              </div>

              {clientLeads.length > 0 ? (
                <div className="client-inquiries-table-wrap">
                  <div className="client-inquiries-grid">
                    {clientLeads.map((lead) => {
                      const stage = STAGE_CONFIG[lead.status] || STAGE_CONFIG.new;
                      const typeLabel = LEAD_TYPE_NAMES[lead.type] || lead.type || (isAr ? 'استشارة' : 'Inquiry');
                      const areaName = getAreaDisplayName(lead.area || 'new_sohag', lang);
                      const propTypeLabel = PROPERTY_TYPE_NAMES[lead.propertyType] || lead.propertyType || '';

                      return (
                        <div key={lead.id} className="client-lead-card">
                          <div className="lead-card-top">
                            <div className="lead-type-tag">
                              <Sparkles size={13} className="text-gold" />
                              <span>{typeLabel}</span>
                            </div>
                            <span 
                              className="lead-stage-pill"
                              style={{ color: stage.color, background: stage.bg }}
                            >
                              {isAr ? stage.ar : stage.en}
                            </span>
                          </div>

                          <div className="lead-card-body">
                            <div className="lead-info-row">
                              <span className="lead-info-label">{isAr ? 'المنطقة:' : 'Area:'}</span>
                              <span className="lead-info-val"><MapPin size={12} /> {areaName}</span>
                            </div>

                            {propTypeLabel && (
                              <div className="lead-info-row">
                                <span className="lead-info-label">{isAr ? 'نوع العقار:' : 'Type:'}</span>
                                <span className="lead-info-val"><Building size={12} /> {propTypeLabel}</span>
                              </div>
                            )}

                            {lead.budget && (
                              <div className="lead-info-row">
                                <span className="lead-info-label">{isAr ? 'الميزانية المستهدفة:' : 'Budget:'}</span>
                                <span className="lead-info-val text-gold">{lead.budget} {isAr ? 'ج.م' : 'EGP'}</span>
                              </div>
                            )}

                            <div className="lead-info-row">
                              <span className="lead-info-label">{isAr ? 'تاريخ التسجيل:' : 'Date:'}</span>
                              <span className="lead-info-val text-muted">
                                {lead.createdAt || lead.timestamp 
                                  ? new Date(lead.createdAt || lead.timestamp).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') 
                                  : (isAr ? 'مؤخراً' : 'Recent')}
                              </span>
                            </div>

                            {lead.notes && (
                              <div className="lead-notes-snippet">
                                <p>{lead.notes}</p>
                              </div>
                            )}
                          </div>

                          <div className="lead-card-footer">
                            <button
                              type="button"
                              className="btn-lead-action btn-wa"
                              onClick={() => handleInquiryWhatsApp(lead)}
                            >
                              <MessageSquare size={13} />
                              <span>{isAr ? 'متابعة مع المستشار' : 'Follow up on WhatsApp'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="empty-sub-section">
                  <p>
                    {isAr 
                      ? 'لا توجد طلبات استشارة مسجلة برقم هاتفك بعد. يمكنك تقديم طلب عقار خاص أو حجز استشارة مجانية مع مستشارينا.' 
                      : 'No recorded inquiries found for your phone number yet.'}
                  </p>
                  <Link to="/special-requests" className="btn-book-visit-cta">
                    <Sparkles size={15} />
                    <span>{isAr ? 'تقديم طلب عقار خاص VIP' : 'Submit Bespoke Request'}</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Section 3: Submitted Demands */}
            <div className="inquiries-section">
              <div className="section-head">
                <div className="section-title-wrap">
                  <Tag size={20} className="text-gold" />
                  <div>
                    <h3>{isAr ? 'طلبات الشراء المعلنة بسوق العقارات (Demands)' : 'My Published Demands'}</h3>
                    <p>{isAr ? 'طلباتك المعروضة على شبكة وسطاء وملاك سوهاج لاستقبال العروض المباشرة' : 'Your demands posted to the public brokers network'}</p>
                  </div>
                </div>
                <span className="section-count-badge">{clientDemands.length}</span>
              </div>

              {clientDemands.length > 0 ? (
                <div className="client-demands-grid">
                  {clientDemands.map((demand) => (
                    <div key={demand.id} className="client-demand-card">
                      <div className="demand-card-header">
                        <h4>{isAr ? demand.title_ar || demand.title : demand.title_en || demand.title}</h4>
                        <span className={`demand-status-badge ${demand.status === 'published' ? 'published' : 'pending'}`}>
                          {demand.status === 'published' 
                            ? (isAr ? 'معتمد ومنشور ✅' : 'Published') 
                            : (isAr ? 'قيد المراجعة الإدارية ⏳' : 'Pending Review')}
                        </span>
                      </div>

                      <div className="demand-card-details">
                        <div className="demand-detail-item">
                          <MapPin size={13} className="text-muted" />
                          <span>{getAreaDisplayName(demand.area, lang)}</span>
                        </div>
                        {demand.budgetMax && (
                          <div className="demand-detail-item">
                            <span className="text-gold font-bold">{Number(demand.budgetMax).toLocaleString()} {isAr ? 'ج.م كحد أقصى' : 'EGP max'}</span>
                          </div>
                        )}
                      </div>

                      <div className="demand-card-footer">
                        <Link to="/demands" className="btn-view-demand">
                          <ExternalLink size={13} />
                          <span>{isAr ? 'عرض في لوحة طلبات السوق' : 'View in Demands Board'}</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-sub-section">
                  <p>
                    {isAr 
                      ? 'هل تبحث عن مواصفات عقارية معينة ولا تجدها؟ انشر طلبك في بورصة طلبات سوهاج وسيقوم الوسطاء المعتمدون بعرض وحداتهم عليك.' 
                      : 'Looking for a specific property? Publish your demand on the Sohag real estate exchange board.'}
                  </p>
                  <Link to="/demands" className="btn-book-visit-cta">
                    <Tag size={15} />
                    <span>{isAr ? 'نشر طلب شراء جديد' : 'Publish Buyer Demand'}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {editProfileOpen && (
        <div className="client-modal-overlay" onClick={() => setEditProfileOpen(false)}>
          <div className="client-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="client-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={18} className="text-gold" />
                <h3>{isAr ? 'تعديل بيانات الحساب' : 'Edit Account Profile'}</h3>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setEditProfileOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="client-edit-form">
              <div className="form-group">
                <label>{isAr ? 'الاسم الكامل' : 'Full Name'}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={isAr ? 'أدخل اسمك الكريم' : 'Your full name'}
                  required
                  className="client-input"
                />
              </div>

              <div className="form-group">
                <label>{isAr ? 'البريد الإلكتروني' : 'Email Address'}</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="client-input"
                />
              </div>

              <div className="form-group">
                <label>{isAr ? 'رقم الواتساب الموثق' : 'Verified WhatsApp Number'}</label>
                <div className="verified-phone-display">
                  <span>{clientUser.whatsapp || clientUser.phone}</span>
                  <span className="badge-locked">
                    <ShieldCheck size={13} className="text-emerald" />
                    <span>{isAr ? 'موثق' : 'Verified'}</span>
                  </span>
                </div>
                <small className="field-hint">
                  {isAr ? 'رقم الواتساب هو هوية الحساب المعتمدة لضمان أمان المفضلة' : 'WhatsApp number serves as your verified account ID'}
                </small>
              </div>

              <div className="modal-actions-row">
                <button type="submit" className="btn-modal-save">
                  <CheckCircle2 size={16} />
                  <span>{isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
                </button>
                <button 
                  type="button" 
                  className="btn-modal-cancel" 
                  onClick={() => setEditProfileOpen(false)}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
