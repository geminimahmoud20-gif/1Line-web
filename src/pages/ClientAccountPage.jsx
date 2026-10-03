import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Scale, ShieldCheck, Mail, Phone, LogOut, Trash2, ArrowLeft, ArrowRight, MessageSquare, CheckCircle2, Calendar, Edit3, X } from 'lucide-react';
import { useClientAuth } from '../context/ClientAuthContext';
import PropertyCard from '../components/properties/PropertyCard';
import { formatCurrencyPrice } from '../utils/currencyAndBenchmark';
import { getWhatsAppUrl } from '../utils/founderCmsData';

import { normalizePhoneNumber } from '../utils/securityShield';

import { readMyDemands } from '../utils/browserStorage';
import AccountInquiriesTab from '../components/account/AccountInquiriesTab';
import AccountCompareTab from '../components/account/AccountCompareTab';
import { LEAD_TYPE_NAMES } from './ClientAccountPageData';

/**
 * Lead Stages & Color Scheme
 */

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

  // Client's submitted demands: the ones sent from this device for this phone (the public list
  // has no contact details), with their live status from the published list when available
  const clientDemands = useMemo(() => {
    if (!clientUser?.whatsapp && !clientUser?.phone) return [];
    const clientPhone = clientUser.whatsapp || clientUser.phone;
    const liveById = new Map((demands || []).map((d) => [String(d.id), d]));
    return readMyDemands()
      .filter((d) => phonesMatch(d.whatsapp || d.phone, clientPhone))
      .map((d) => ({ ...d, ...(liveById.get(String(d.id)) || {}) }));
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
      msg += `💰 ${Number(p.price).toLocaleString('en-US')} ج.م\n`;
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
                  <span>{isAr ? 'عميل 1Line' : '1Line Client'}</span>
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
                    <span>{isAr ? 'عضو منذ: ' : 'Member since: '} {new Date(clientUser.verifiedAt).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-US')}</span>
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
                    : 'Browse properties and tap the heart icon on any card to save it here to your account.'}
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
          <AccountCompareTab
            compareList={compareList}
            currency={currency}
            favorites={favorites}
            isAr={isAr}
            lang={lang}
            onClearCompare={onClearCompare}
            onOpenCompare={onOpenCompare}
            onToggleCompare={onToggleCompare}
            onToggleFavorite={onToggleFavorite}
          />
        )}

        {/* Tab 3: My Inquiries, Site Visits & Demands View */}
        {activeTab === 'inquiries' && (
          <AccountInquiriesTab
            clientDemands={clientDemands}
            clientLeads={clientLeads}
            clientSiteVisits={clientSiteVisits}
            handleInquiryWhatsApp={handleInquiryWhatsApp}
            handleSiteVisitWhatsApp={handleSiteVisitWhatsApp}
            isAr={isAr}
            lang={lang}
            properties={properties}
          />
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
                <label>{isAr ? 'رقم الواتساب' : 'WhatsApp Number'}</label>
                <div className="verified-phone-display">
                  <span>{clientUser.whatsapp || clientUser.phone}</span>
                  <span className="badge-locked">
                    <ShieldCheck size={13} className="text-emerald" />
                    <span>{isAr ? 'ثابت' : 'Locked'}</span>
                  </span>
                </div>
                <small className="field-hint">
                  {isAr ? 'رقم الواتساب هو هوية حسابك، ومينفعش يتغير من هنا' : 'Your WhatsApp number is your account ID and can\'t be changed here'}
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
