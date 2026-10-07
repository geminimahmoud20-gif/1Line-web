import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

// Context Providers & Hooks
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { CurrencyProvider, useCurrency } from './context/CurrencyContext';
import { UIModalProvider, useUIModal } from './context/UIModalContext';
import { PropertiesProvider, useProperties } from './context/PropertiesContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Security & Storage Helpers
import { sanitizeObject } from './utils/securityShield';

// SEO
import { updatePageSeo } from './utils/seoHelper';
import { ROUTE_SEO } from './config/routeSeo';

// Analytics & CMS
import { getOrCreateSession, trackEvent } from './utils/visitorTracker';
import { initFounderCmsSync } from './utils/founderCmsData';
import { initAreasSync } from './utils/areasData';

// Layout & Common Components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import MobileBottomBar from './components/common/MobileBottomBar';
import ToastContainer from './components/common/ToastContainer';
import FloatingCompareBar from './components/properties/FloatingCompareBar';
import ConsentBanner from './components/common/ConsentBanner';
import QuickContactDrawer from './components/common/QuickContactDrawer';
import BackToTopButton from './components/common/BackToTopButton';
import { ClientAuthProvider, useClientAuth } from './context/ClientAuthContext';

// Critical Landing Page (Direct Import for instant FCP)

// Lazy Loaded Secondary & Heavy Admin Pages (Code Splitting)
// Overlays (modals, drawers) render nothing until opened, so they load on demand instead of
// shipping in the first-paint bundle; prefetchOverlays() warms them once the browser is idle.
const OVERLAY_LOADERS = {
  QuickViewModal: () => import('./components/common/QuickViewModal'),
  TrackLeadModal: () => import('./components/common/TrackLeadModal'),
  ShareModal: () => import('./components/common/ShareModal'),
  CallbackModal: () => import('./components/common/CallbackModal'),
  AddDemandModal: () => import('./components/common/AddDemandModal'),
  AboutFounderModal: () => import('./components/common/AboutFounderModal'),
  PropertyCompareDrawer: () => import('./components/properties/PropertyCompareDrawer'),
  FavoritesDrawer: () => import('./components/properties/FavoritesDrawer'),
  AIPropertyAdvisorModal: () => import('./components/common/AIPropertyAdvisorModal'),
  QuickSearchModal: () => import('./components/common/QuickSearchModal'),
  ClientAuthModal: () => import('./components/common/ClientAuthModal'),
  RemoteInspectionModal: () => import('./components/expat/RemoteInspectionModal'),
};
const QuickViewModal = lazy(OVERLAY_LOADERS.QuickViewModal);
const TrackLeadModal = lazy(OVERLAY_LOADERS.TrackLeadModal);
const ShareModal = lazy(OVERLAY_LOADERS.ShareModal);
const CallbackModal = lazy(OVERLAY_LOADERS.CallbackModal);
const AddDemandModal = lazy(OVERLAY_LOADERS.AddDemandModal);
const AboutFounderModal = lazy(OVERLAY_LOADERS.AboutFounderModal);
const PropertyCompareDrawer = lazy(OVERLAY_LOADERS.PropertyCompareDrawer);
const FavoritesDrawer = lazy(OVERLAY_LOADERS.FavoritesDrawer);
const AIPropertyAdvisorModal = lazy(OVERLAY_LOADERS.AIPropertyAdvisorModal);
const QuickSearchModal = lazy(OVERLAY_LOADERS.QuickSearchModal);
const ClientAuthModal = lazy(OVERLAY_LOADERS.ClientAuthModal);
const RemoteInspectionModal = lazy(OVERLAY_LOADERS.RemoteInspectionModal);
const prefetchOverlays = () => Object.values(OVERLAY_LOADERS).forEach((load) => load().catch(() => {}));

// Luxury Route Transition Fallback Spinner
function RouteLoadingSpinner({ lang = 'ar' }) {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '40px'
    }}>
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        border: '3px solid rgba(217, 119, 6, 0.15)',
        borderTopColor: 'var(--accent-gold, #d97706)',
        animation: 'routeSpin 0.8s linear infinite'
      }} />
      <span style={{
        fontSize: '0.85rem',
        color: '#94a3b8',
        fontWeight: 'bold',
        letterSpacing: '0.5px'
      }}>
        {lang === 'ar' ? 'جاري تحميل البيانات الذكية... 1Line Sohag' : 'Loading Platform Data...'}
      </span>
      <style>{`
        @keyframes routeSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

import './App.css';
import './styles/luxury-system.css';
import './styles/home-luxe.css';
import './styles/mobile-polish.css';
import AppRoutes from './AppRoutes';

/**
 * Main Application Shell & Route Controller
 */
function AppContent() {
  const {
    lang, setLang, t,
    theme, toggleTheme,
    soundEnabled, toggleSound
  } = usePreferences();
  const { currency, setCurrency } = useCurrency();

  const {
    toasts, triggerToast, dismissToast,
    quickViewProperty, handleOpenQuickView, handleCloseQuickView,
    trackModalOpen, setTrackModalOpen,
    shareModalOpen, shareData, handleOpenShare, handleCloseShare,
    callbackModalOpen, setCallbackModalOpen,
    contactDrawerOpen, setContactDrawerOpen,
    quickSearchOpen, setQuickSearchOpen,
    addDemandModalOpen, setAddDemandModalOpen,
    aboutFounderModalOpen, setAboutFounderModalOpen,
    compareDrawerOpen, setCompareDrawerOpen,
    favoritesDrawerOpen, setFavoritesDrawerOpen,
    aiModalOpen, setAiModalOpen,
    remoteInspectionTarget, closeRemoteInspection
  } = useUIModal();

  const {
    properties, handleAddProperty, handleUpdateProperty, handleDeleteProperty,
    projects, handleAddProject, handleUpdateProject, handleDeleteProject,
    favorites, toggleFavorite, clearFavorites,
    compareList, toggleCompare, addToCompare, removeCompare, clearCompare,
    leads, setLeads, handleAddNewLead, handleUpdateLead, handleDeleteLead,
    demands, handleAddPublicDemand: contextAddPublicDemand, handleAddAdminDemand: contextAddAdminDemand, handleApproveDemand,
    handleUpdateDemand, handleDeleteDemand, handleUnpublishDemand
  } = useProperties();

  // 🛡️ Explicit sanitizeObject wrappers for client and admin demands
  const handleAddPublicDemand = useCallback(async (newDemand) => {
    const sanitizedDemand = sanitizeObject(newDemand);
    return contextAddPublicDemand(sanitizedDemand);
  }, [contextAddPublicDemand]);

  const handleAddAdminDemand = useCallback((demandPayload) => {
    const sanitizedPayload = sanitizeObject(demandPayload);
    return contextAddAdminDemand(sanitizedPayload);
  }, [contextAddAdminDemand]);

  // 📋 Real-Time Demands Lifecycle & Sorting Mapping:
  // Subscribed via subscribeToDemands; handleApproveDemand enforces status: 'published' with approvedAt: ISO timestamp
  // Priority sorting logic ensures newest approved first: a.approvedAt || a.createdAt

  // 🛡️ Client Leads & Customer Registration Pipeline:
  // Sanitizes lead: sanitizeObject(leadData)
  // Lead Schema: id: 'lead-' + Date.now(), timestamp: new Date().toISOString(), status: 'new'
  // Persists to Cloud: await saveLead(finalLead)
  // Local storage: localStorage.setItem('oneline_crm_leads', JSON.stringify(updated))

  const { crmAuthenticated, setCrmAuthenticated, handleCrmLogout } = useAuth();
  const {
    requireClientAuth,
    clientAuthModalOpen
  } = useClientAuth();

  // 🛡️ Protected Client Favorites Toggle (Requires Name, Email, WhatsApp verification)
  const handleProtectedToggleFavorite = useCallback((propertyId) => {
    const targetProp = properties.find(p => p.id === propertyId);
    const propTitle = lang === 'ar' ? targetProp?.title_ar : targetProp?.title_en;

    requireClientAuth(() => {
      toggleFavorite(propertyId);
    }, 'favorite', propTitle || '');
  }, [properties, lang, requireClientAuth, toggleFavorite]);

  // 🛡️ Protected Client Compare Toggle (Requires Name, Email, WhatsApp verification)
  const handleProtectedToggleCompare = useCallback((property) => {
    const propTitle = lang === 'ar' ? property?.title_ar : property?.title_en;

    requireClientAuth(() => {
      toggleCompare(property);
    }, 'compare', propTitle || '');
  }, [lang, requireClientAuth, toggleCompare]);

  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to top on page navigation & Track Visitor Intelligence
  // Warm the on-demand overlays after first paint so opening one never waits on the network
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(prefetchOverlays, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(prefetchOverlays, 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    getOrCreateSession();
    trackEvent('page_view', { path: location.pathname });
  }, [location.pathname]);

  // Titles/descriptions for routes whose page components don't manage their own SEO
  useEffect(() => {
    const seo = ROUTE_SEO[location.pathname];
    if (!seo) return;
    const isAr = lang === 'ar';
    updatePageSeo({
      title: isAr ? seo.title_ar : seo.title_en,
      description: isAr ? seo.desc_ar : seo.desc_en,
      url: location.pathname,
      noindex: !!seo.noindex
    });
  }, [location.pathname, lang]);

  // Real-time Cloud Settings, Founder CMS & Areas Synchronization
  useEffect(() => {
    const unsubFounder = initFounderCmsSync();
    const unsubAreas = initAreasSync();
    return () => {
      if (typeof unsubFounder === 'function') unsubFounder();
      if (typeof unsubAreas === 'function') unsubAreas();
    };
  }, []);

  // Secret Admin Portal Access Shortcut (Ctrl + Shift + A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a' || e.code === 'KeyA')) {
        e.preventDefault();
        navigate('/crm');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Callback submit handler
  const handleCallbackSubmit = (formData) => {
    handleAddNewLead({
      name: formData.name,
      phone: formData.phone,
      whatsapp: formData.whatsapp || formData.phone,
      propertyType: formData.propertyType || 'apartment',
      area: formData.area || 'new_sohag',
      type: 'callback_request',
      notes: `طلب استشارة ومعاودة اتصال (${formData.preferredTime || 'في أقرب وقت'}) | نوع العقار: ${formData.propertyType || 'سكني'} | المسار: ${formData.consultationTrack || 'عام'}`,
      details: formData
    });
    triggerToast(lang === 'ar' ? 'تم استلام طلب الاستشارة بنجاح! سيتواصل معك مستشارك العقاري المختص.' : 'Consultation request submitted!', 'success');
  };

  // ===================== WIZARDS STATE MANAGEMENT =====================
  // Buyer Wizard
  const [buyerStep, setBuyerStep] = useState(1);
  const [buyerAnswers, setBuyerAnswers] = useState({
    purpose: '',
    propertyType: '',
    area: '',
    budget: '',
    paymentMethod: '',
    timeframe: '',
    downPayment: '',
    monthlyInstallment: '',
    sourceOfFunds: '',
    currentResidence: '',
    reasonForBuying: '',
    familySize: '',
    moveInDate: '',
    investmentHorizon: '',
    name: '',
    phone: '',
    whatsapp: ''
  });

  const handleBuyerChoice = (field, val) => {
    setBuyerAnswers((prev) => ({ ...prev, [field]: val }));
    setBuyerStep((prev) => prev + 1);
  };

  const submitBuyerJourney = async (overrideData) => {
    const data = overrideData || buyerAnswers;
    return handleAddNewLead({
      name: data.name,
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
      propertyType: data.propertyType || 'apartment',
      area: data.area || 'new_sohag',
      type: 'buyer',
      landingPage: '/buy',
      notes: `طلب شراء ${data.propertyType} في منطقة ${data.area} بميزانية ${data.budget}`,
      details: data
    });
  };

  // Seller Wizard
  const [sellerStep, setSellerStep] = useState(1);
  const [sellerAnswers, setSellerAnswers] = useState({
    propertyType: '',
    area: '',
    size: '',
    finishing: '',
    expectedPrice: '',
    urgency: '',
    name: '',
    phone: '',
    whatsapp: ''
  });

  const handleSellerChoice = (field, val) => {
    setSellerAnswers((prev) => ({ ...prev, [field]: val }));
    setSellerStep((prev) => prev + 1);
  };

  const estimatedValue = 3200000;

  const submitSellerJourney = async (overrideData) => {
    const data = overrideData || sellerAnswers;
    const isHouse = data.propertyType === 'villa';
    const floorDesc = isHouse 
      ? ` | المبنى: ${data.totalFloors || data.floor || 'طوابق متعددة'}`
      : (data.floor ? ` | الدور: ${data.floor}` : '');
    const legalSummary = data.legalSummaryAr ? ` | المستندات: ${data.legalSummaryAr}` : '';
    return handleAddNewLead({
      name: data.name,
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
      propertyType: data.propertyType || 'apartment',
      area: data.area || 'new_sohag',
      type: 'seller',
      landingPage: '/sell',
      notes: `عرض بيع ${data.propertyType} في ${data.area} بمساحة ${data.size || ''}م${floorDesc}${legalSummary}`,
      details: data
    });
  };

  // Investor Center
  const [invAmount, setInvAmount] = useState(5000000);
  const [invPeriod, setInvPeriod] = useState(5);
  const [invPropType, setInvPropType] = useState('commercial');
  const [investorForm, setInvestorForm] = useState({ name: '', phone: '', whatsapp: '', email: '', area: 'new_sohag' });
  const [showInvResultForm, setShowInvResultForm] = useState(false);

  const roiRes = {
    annualYield: '14.5%',
    totalProfit: ((invAmount * 0.145 * invPeriod) + (invAmount * 0.5)).toLocaleString('en-US') + ' EGP',
    exitValue: Math.round(invAmount * 1.6).toLocaleString('en-US') + ' EGP'
  };

  const submitInvestorForm = async (overrideData) => {
    const data = overrideData || investorForm;
    await handleAddNewLead({
      name: data.name,
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
      propertyType: data.propertyType || data.targetType || invPropType,
      area: data.area || 'new_sohag',
      email: data.email,
      type: 'investor',
      landingPage: '/investor',
      notes: `طلب دراسة جدوى استثمارية بمبلغ ${(data.budget || invAmount).toLocaleString('en-US')} ج.م لفترة ${data.investmentHorizon || invPeriod} سنوات`,
      details: { invAmount: data.budget || invAmount, invPeriod: data.investmentHorizon || invPeriod, invPropType: data.propertyType || invPropType, area: data.area || 'new_sohag', ...data }
    });
    triggerToast(lang === 'ar' ? 'تم إرسال طلب دراسة الجدوى الاستثمارية بنجاح!' : 'Investment study requested!', 'success');
  };

  // Broker Portal
  const [brokerForm, setBrokerForm] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    experience: '1_3',
    areas: ['new_sohag'],
    categories: ['residential'],
    inventoryCount: '1_5'
  });

  const handleBrokerCheckbox = (field, val) => {
    setBrokerForm((prev) => {
      const list = prev[field] || [];
      const updated = list.includes(val) ? list.filter((i) => i !== val) : [...list, val];
      return { ...prev, [field]: updated };
    });
  };

  const submitBrokerPortal = async (overrideData) => {
    const data = overrideData || brokerForm;
    await handleAddNewLead({
      name: data.name,
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
      propertyType: data.propertyType || (data.categories && data.categories[0]) || 'all_types',
      area: data.area || (data.areas && data.areas[0]) || 'new_sohag',
      type: 'broker',
      landingPage: '/broker',
      notes: `طلب انضمام وسيط عقاري (خبرة ${data.experience} سنوات) - المنطقة: ${data.area || 'سوهاج'}`,
      details: data
    });
    triggerToast(lang === 'ar' ? 'تم تسجيل طلب انضمامك كشريك وسيط بنجاح!' : 'Broker application submitted!', 'success');
  };

  // Demands Match State
  const [ownerSearch, setOwnerSearch] = useState('');
  const [isScanningMap, setIsScanningMap] = useState(false);
  const [ownerMatchesFound, setOwnerMatchesFound] = useState([]);
  const [scanningMessage, setScanningMessage] = useState('');

  return (
    <div 
      className={`app-root ${lang === 'ar' ? 'rtl-dir' : 'ltr-dir'} ${theme === 'dark' ? 'dark-theme' : ''}`} 
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      data-theme={theme}
    >
      <a href="#main-content" className="lx-skip-link">{lang === 'ar' ? 'انتقل إلى المحتوى' : 'Skip to content'}</a>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Privacy notice & analytics consent (loads Clarity only after acceptance) */}
      <ConsentBanner lang={lang} />

      {/* Quick View Modal */}
      {quickViewProperty && (
        <Suspense fallback={null}>
          <QuickViewModal
            property={quickViewProperty}
            lang={lang}
            currency={currency}
            onClose={handleCloseQuickView}
            onToggleFavorite={handleProtectedToggleFavorite}
            isFavorite={quickViewProperty ? favorites.includes(quickViewProperty.id) : false}
            onOpenShare={handleOpenShare}
            triggerToast={triggerToast}
          />
        </Suspense>
      )}

      {/* Track Lead Modal */}
      {trackModalOpen && (
        <Suspense fallback={null}>
          <TrackLeadModal
            isOpen={trackModalOpen}
            onClose={() => setTrackModalOpen(false)}
            leads={leads}
            lang={lang}
          />
        </Suspense>
      )}

      {/* Share Modal */}
      {shareModalOpen && (
        <Suspense fallback={null}>
          <ShareModal
            isOpen={shareModalOpen}
            onClose={handleCloseShare}
            lang={lang}
            triggerToast={triggerToast}
            shareData={shareData}
          />
        </Suspense>
      )}

      {/* Callback / VIP Consultation Modal */}
      {callbackModalOpen && (
        <Suspense fallback={null}>
          <CallbackModal
            isOpen={callbackModalOpen}
            onClose={() => setCallbackModalOpen(false)}
            lang={lang}
            onSubmitCallback={handleCallbackSubmit}
            triggerToast={triggerToast}
          />
        </Suspense>
      )}

      {/* "معاينة الغربة" — expat remote inspection (opened from cards, listing page and hubs) */}
      {remoteInspectionTarget !== false && (
        <Suspense fallback={null}>
          <RemoteInspectionModal
            key={remoteInspectionTarget?.id || 'general'}
            isOpen
            property={remoteInspectionTarget || null}
            onClose={closeRemoteInspection}
            lang={lang}
            onCreateLead={handleAddNewLead}
            triggerToast={triggerToast}
          />
        </Suspense>
      )}

      {/* Site Header Navigation (Hidden on CRM for clean enterprise workspace) */}
      {!location.pathname.startsWith('/crm') && (
        <Header
          lang={lang}
          setLang={setLang}
          currency={currency}
          setCurrency={setCurrency}
          theme={theme}
          toggleTheme={toggleTheme}
          soundEnabled={soundEnabled}
          toggleSound={toggleSound}
          onOpenShare={() => handleOpenShare(null)}
          onOpenTrackLead={() => setTrackModalOpen(true)}
          compareCount={compareList.length}
          onOpenCompare={() => setCompareDrawerOpen(true)}
          onOpenAboutFounder={() => setAboutFounderModalOpen(true)}
          onOpenQuickSearch={() => setQuickSearchOpen(true)}
          favoritesCount={favorites.length}
          onOpenFavorites={() => setFavoritesDrawerOpen(true)}
        />
      )}

      {/* Application Main Routes with Lazy Suspense Code Splitting */}
      <main className="main-site-content" id="main-content" tabIndex={-1}>
        <Suspense fallback={<RouteLoadingSpinner lang={lang} />}>
          <AppRoutes
            brokerForm={brokerForm}
            buyerAnswers={buyerAnswers}
            buyerStep={buyerStep}
            clearCompare={clearCompare}
            clearFavorites={clearFavorites}
            compareList={compareList}
            crmAuthenticated={crmAuthenticated}
            currency={currency}
            demands={demands}
            estimatedValue={estimatedValue}
            favorites={favorites}
            handleAddAdminDemand={handleAddAdminDemand}
            handleAddNewLead={handleAddNewLead}
            handleAddProject={handleAddProject}
            handleAddProperty={handleAddProperty}
            handleApproveDemand={handleApproveDemand}
            handleBrokerCheckbox={handleBrokerCheckbox}
            handleBuyerChoice={handleBuyerChoice}
            handleCrmLogout={handleCrmLogout}
            handleDeleteDemand={handleDeleteDemand}
            handleDeleteLead={handleDeleteLead}
            handleDeleteProject={handleDeleteProject}
            handleDeleteProperty={handleDeleteProperty}
            handleOpenQuickView={handleOpenQuickView}
            handleProtectedToggleCompare={handleProtectedToggleCompare}
            handleProtectedToggleFavorite={handleProtectedToggleFavorite}
            handleSellerChoice={handleSellerChoice}
            handleUnpublishDemand={handleUnpublishDemand}
            handleUpdateDemand={handleUpdateDemand}
            handleUpdateLead={handleUpdateLead}
            handleUpdateProject={handleUpdateProject}
            handleUpdateProperty={handleUpdateProperty}
            invAmount={invAmount}
            invPeriod={invPeriod}
            invPropType={invPropType}
            investorForm={investorForm}
            isScanningMap={isScanningMap}
            lang={lang}
            leads={leads}
            navigate={navigate}
            ownerMatchesFound={ownerMatchesFound}
            ownerSearch={ownerSearch}
            projects={projects}
            properties={properties}
            roiRes={roiRes}
            scanningMessage={scanningMessage}
            sellerAnswers={sellerAnswers}
            sellerStep={sellerStep}
            setAddDemandModalOpen={setAddDemandModalOpen}
            setBrokerForm={setBrokerForm}
            setBuyerAnswers={setBuyerAnswers}
            setBuyerStep={setBuyerStep}
            setCompareDrawerOpen={setCompareDrawerOpen}
            setCrmAuthenticated={setCrmAuthenticated}
            setInvAmount={setInvAmount}
            setInvPeriod={setInvPeriod}
            setInvPropType={setInvPropType}
            setInvestorForm={setInvestorForm}
            setIsScanningMap={setIsScanningMap}
            setLeads={setLeads}
            setOwnerMatchesFound={setOwnerMatchesFound}
            setOwnerSearch={setOwnerSearch}
            setScanningMessage={setScanningMessage}
            setSellerAnswers={setSellerAnswers}
            setSellerStep={setSellerStep}
            setShowInvResultForm={setShowInvResultForm}
            showInvResultForm={showInvResultForm}
            submitBrokerPortal={submitBrokerPortal}
            submitBuyerJourney={submitBuyerJourney}
            submitInvestorForm={submitInvestorForm}
            submitSellerJourney={submitSellerJourney}
            t={t}
            triggerToast={triggerToast}
          />
        </Suspense>
      </main>

      {/* Site Footer (Hidden on CRM) */}
      {!location.pathname.startsWith('/crm') && (
        <Footer 
          lang={lang} 
          onOpenAboutFounder={() => setAboutFounderModalOpen(true)} 
        />
      )}

      {/* About 1Line & Founder Profile Modal */}
      {aboutFounderModalOpen && (
        <Suspense fallback={null}>
          <AboutFounderModal
            isOpen={aboutFounderModalOpen}
            onClose={() => setAboutFounderModalOpen(false)}
            lang={lang}
          />
        </Suspense>
      )}

      {/* Add Buyer Demand Modal */}
      {addDemandModalOpen && (
        <Suspense fallback={null}>
          <AddDemandModal
            isOpen={addDemandModalOpen}
            onClose={() => setAddDemandModalOpen(false)}
            lang={lang}
            onSubmitDemand={handleAddPublicDemand}
            triggerToast={triggerToast}
          />
        </Suspense>
      )}

      {/* Property Comparison Drawer Matrix */}
      {compareDrawerOpen && (
        <Suspense fallback={null}>
          <PropertyCompareDrawer
            isOpen={compareDrawerOpen}
            onClose={() => setCompareDrawerOpen(false)}
            compareList={compareList}
            onRemoveFromCompare={removeCompare}
            onClearCompare={clearCompare}
            onAddToCompare={addToCompare}
            availableProperties={properties}
            currency={currency}
            lang={lang}
          />
        </Suspense>
      )}

      {/* Saved Properties & Favorites Drawer */}
      {favoritesDrawerOpen && (
        <Suspense fallback={null}>
          <FavoritesDrawer
            isOpen={favoritesDrawerOpen}
            onClose={() => setFavoritesDrawerOpen(false)}
            favorites={favorites}
            properties={properties}
            onRemoveFavorite={toggleFavorite}
            onClearFavorites={clearFavorites}
            onQuickView={handleOpenQuickView}
            lang={lang}
            currency={currency}
          />
        </Suspense>
      )}

      {/* Client Identity & WhatsApp Security Verification Modal */}
      {clientAuthModalOpen && (
        <Suspense fallback={null}>
          <ClientAuthModal lang={lang} />
        </Suspense>
      )}

      {/* AI Virtual Real Estate Advisor Modal */}
      {aiModalOpen && (
        <Suspense fallback={null}>
          <AIPropertyAdvisorModal
            isOpen={aiModalOpen}
            onClose={() => setAiModalOpen(false)}
            lang={lang}
            onOpenCallbackModal={() => setCallbackModalOpen(true)}
          />
        </Suspense>
      )}

      {/* Global Omnisearch Spotlight Modal */}
      {quickSearchOpen && (
        <Suspense fallback={null}>
          <QuickSearchModal
            isOpen={quickSearchOpen}
            onClose={() => setQuickSearchOpen(false)}
            properties={properties}
            lang={lang}
            currency={currency}
            onOpenAddDemand={() => setAddDemandModalOpen(true)}
          />
        </Suspense>
      )}

      {/* Floating Compare Dock Bar */}
      {!location.pathname.startsWith('/crm') && (
        <FloatingCompareBar
          compareList={compareList}
          onOpenCompare={() => setCompareDrawerOpen(true)}
          onRemoveFromCompare={removeCompare}
          onClearCompare={clearCompare}
          lang={lang}
          maxCompare={4}
        />
      )}

      {/* Floating Real Estate Advisor Quick Trigger */}
      {!location.pathname.startsWith('/crm') && (
        <button
          type="button"
          className="floating-ai-advisor-trigger"
          onClick={() => setAiModalOpen(true)}
          title={lang === 'ar' ? 'استشارة عقارية مباشرة مع مستشاري 1Line' : 'Live 1Line Real Estate Advisory'}
        >
          <span className="ai-icon-pulse"><MessageSquare size={16} strokeWidth={1.8} /></span>
          <span className="ai-trigger-text">{lang === 'ar' ? 'مستشارك العقاري المباشر' : 'Live Property Advisor'}</span>
        </button>
      )}

      {/* Floating Back-To-Top Button */}
      <BackToTopButton lang={lang} />

      {/* Quick Multi-Channel Contact & Dial Drawer (Mobile) */}
      <QuickContactDrawer
        isOpen={contactDrawerOpen}
        onClose={() => setContactDrawerOpen(false)}
        onOpenCallbackModal={() => setCallbackModalOpen(true)}
        lang={lang}
      />

      {/* Mobile Floating Bottom Navigation */}
      {!location.pathname.startsWith('/crm') && !location.pathname.startsWith('/property/') && (
        <MobileBottomBar
          lang={lang}
          compareCount={compareList.length}
          onOpenCompare={() => setCompareDrawerOpen(true)}
          onOpenContactDrawer={() => setContactDrawerOpen(true)}
        />
      )}
    </div>
  );
}

/**
 * Bridge Consumer to pass Parent Context values to ClientAuthProvider
 */
function ClientAuthConsumer({ children }) {
  const { lang } = usePreferences();
  const { triggerToast } = useUIModal();
  const { 
    handleAddNewLead, 
    clearFavorites, 
    clearCompare, 
    restoreFavorites, 
    favorites 
  } = useProperties();
  return (
    <ClientAuthProvider 
      lang={lang} 
      triggerToast={triggerToast} 
      handleAddNewLead={handleAddNewLead}
      clearFavorites={clearFavorites}
      clearCompare={clearCompare}
      restoreFavorites={restoreFavorites}
      favorites={favorites}
    >
      {children}
    </ClientAuthProvider>
  );
}

/**
 * Top-Level App with Integrated Context Providers
 */
export default function App() {
  return (
    <PreferencesProvider>
      <CurrencyProvider>
        <UIModalProvider>
          <PropertiesProvider>
            <AuthProvider>
              <ClientAuthConsumer>
                <AppContent />
              </ClientAuthConsumer>
            </AuthProvider>
          </PropertiesProvider>
        </UIModalProvider>
      </CurrencyProvider>
    </PreferencesProvider>
  );
}
