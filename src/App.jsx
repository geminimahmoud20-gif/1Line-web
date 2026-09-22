import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

// Context Providers & Hooks
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { UIModalProvider, useUIModal } from './context/UIModalContext';
import { PropertiesProvider, useProperties } from './context/PropertiesContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Security & Storage Helpers
import { sanitizeObject } from './utils/securityShield';
import { readStoredJson } from './utils/browserStorage';
import { saveLead } from './firebaseService';

// Analytics & CMS
import { getOrCreateSession, trackEvent } from './utils/visitorTracker';
import { initFounderCmsSync } from './utils/founderCmsData';
import { initAreasSync } from './utils/areasData';

// Layout & Common Components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import MobileBottomBar from './components/common/MobileBottomBar';
import ToastContainer from './components/common/ToastContainer';
import QuickViewModal from './components/common/QuickViewModal';
import TrackLeadModal from './components/common/TrackLeadModal';
import ShareModal from './components/common/ShareModal';
import CallbackModal from './components/common/CallbackModal';
import AddDemandModal from './components/common/AddDemandModal';
import AboutFounderModal from './components/common/AboutFounderModal';
import PropertyCompareDrawer from './components/properties/PropertyCompareDrawer';
import FloatingCompareBar from './components/properties/FloatingCompareBar';
import FavoritesDrawer from './components/properties/FavoritesDrawer';
import LiveActivityToast from './components/common/LiveActivityToast';
import QuickContactDrawer from './components/common/QuickContactDrawer';
import BackToTopButton from './components/common/BackToTopButton';
import AIPropertyAdvisorModal from './components/common/AIPropertyAdvisorModal';
import QuickSearchModal from './components/common/QuickSearchModal';
import ClientAuthModal from './components/common/ClientAuthModal';
import { ClientAuthProvider, useClientAuth } from './context/ClientAuthContext';

// Critical Landing Page (Direct Import for instant FCP)
import HomePage from './pages/HomePage';

// Lazy Loaded Secondary & Heavy Admin Pages (Code Splitting)
const PropertiesPage = lazy(() => import('./pages/PropertiesPage'));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage'));
const ClientAccountPage = lazy(() => import('./pages/ClientAccountPage'));
const FinancingPage = lazy(() => import('./pages/FinancingPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const MarketIntelligencePage = lazy(() => import('./pages/MarketIntelligencePage'));
const PortalsPage = lazy(() => import('./pages/PortalsPage'));
const CrmPage = lazy(() => import('./pages/CrmPage'));

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

/**
 * Main Application Shell & Route Controller
 */
function AppContent() {
  const { 
    lang, setLang, t, 
    currency, setCurrency, 
    theme, toggleTheme, 
    soundEnabled, toggleSound 
  } = usePreferences();

  const {
    toasts, triggerToast, dismissToast,
    quickViewProperty, handleOpenQuickView, handleCloseQuickView,
    trackModalOpen, setTrackModalOpen,
    shareModalOpen, setShareModalOpen, shareData, handleOpenShare, handleCloseShare,
    callbackModalOpen, setCallbackModalOpen,
    contactDrawerOpen, setContactDrawerOpen,
    quickSearchOpen, setQuickSearchOpen,
    addDemandModalOpen, setAddDemandModalOpen,
    aboutFounderModalOpen, setAboutFounderModalOpen,
    compareDrawerOpen, setCompareDrawerOpen,
    favoritesDrawerOpen, setFavoritesDrawerOpen,
    aiModalOpen, setAiModalOpen
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
    clientUser, 
    isClientAuthenticated, 
    requireClientAuth, 
    setClientAuthModalOpen 
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
  useEffect(() => {
    window.scrollTo(0, 0);
    getOrCreateSession();
    trackEvent('page_view', { path: location.pathname });
  }, [location.pathname]);

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

  const submitBuyerJourney = async () => {
    await handleAddNewLead({
      name: buyerAnswers.name,
      phone: buyerAnswers.phone,
      whatsapp: buyerAnswers.whatsapp || buyerAnswers.phone,
      propertyType: buyerAnswers.propertyType || 'apartment',
      area: buyerAnswers.area || 'new_sohag',
      type: 'buyer',
      landingPage: '/buy',
      notes: `طلب شراء ${buyerAnswers.propertyType} في منطقة ${buyerAnswers.area} بميزانية ${buyerAnswers.budget}`,
      details: buyerAnswers
    });
    triggerToast(lang === 'ar' ? 'تم استلام طلب الشراء بنجاح! سيتم مطابقة عقاراتك فورياً.' : 'Buyer request submitted!', 'success');
    navigate('/properties');
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
    await handleAddNewLead({
      name: data.name,
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
      propertyType: data.propertyType || 'apartment',
      area: data.area || 'new_sohag',
      type: 'seller',
      landingPage: '/sell',
      notes: `عرض بيع ${data.propertyType} في ${data.area} بمساحة ${data.size || ''}م`,
      details: data
    });
    triggerToast(lang === 'ar' ? 'تم إرسال بيانات العقار بنجاح! سنراجع التقييم ونتواصل معك.' : 'Property listed for valuation!', 'success');
  };

  // Investor Center
  const [invAmount, setInvAmount] = useState(5000000);
  const [invPeriod, setInvPeriod] = useState(5);
  const [invPropType, setInvPropType] = useState('commercial');
  const [investorForm, setInvestorForm] = useState({ name: '', phone: '', whatsapp: '', email: '', area: 'new_sohag' });
  const [showInvResultForm, setShowInvResultForm] = useState(false);

  const roiRes = {
    annualYield: '14.5%',
    totalProfit: ((invAmount * 0.145 * invPeriod) + (invAmount * 0.5)).toLocaleString() + ' EGP',
    exitValue: Math.round(invAmount * 1.6).toLocaleString() + ' EGP'
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
      notes: `طلب دراسة جدوى استثمارية بمبلغ ${(data.budget || invAmount).toLocaleString()} ج.م لفترة ${data.investmentHorizon || invPeriod} سنوات`,
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
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Live Social Proof Activity Toast */}
      <LiveActivityToast lang={lang} />

      {/* Quick View Modal */}
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

      {/* Track Lead Modal */}
      <TrackLeadModal
        isOpen={trackModalOpen}
        onClose={() => setTrackModalOpen(false)}
        leads={leads}
        lang={lang}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={handleCloseShare}
        lang={lang}
        triggerToast={triggerToast}
        shareData={shareData}
      />

      {/* Callback / VIP Consultation Modal */}
      <CallbackModal
        isOpen={callbackModalOpen}
        onClose={() => setCallbackModalOpen(false)}
        lang={lang}
        onSubmitCallback={handleCallbackSubmit}
        triggerToast={triggerToast}
      />

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
      <main className="main-site-content">
        <Suspense fallback={<RouteLoadingSpinner lang={lang} />}>
          <Routes>
            {/* 1. Home Page */}
            <Route
              path="/"
              element={
                <HomePage
                  lang={lang}
                  currency={currency}
                  properties={properties}
                  demands={demands}
                  favorites={favorites}
                  onToggleFavorite={handleProtectedToggleFavorite}
                  compareList={compareList}
                  onToggleCompare={handleProtectedToggleCompare}
                  onQuickView={handleOpenQuickView}
                  onOpenAddDemand={() => setAddDemandModalOpen(true)}
                  onAddNewLead={handleAddNewLead}
                  triggerToast={triggerToast}
                />
              }
            />

            {/* 2. Properties Catalog & Interactive Map */}
            <Route
              path="/properties"
              element={
                <PropertiesPage
                  lang={lang}
                  currency={currency}
                  properties={properties}
                  favorites={favorites}
                  onToggleFavorite={handleProtectedToggleFavorite}
                  compareList={compareList}
                  onToggleCompare={handleProtectedToggleCompare}
                  onQuickView={handleOpenQuickView}
                />
              }
            />

            {/* 3. Single Property Details Page */}
            <Route
              path="/properties/:id"
              element={
                <PropertyDetailPage
                  lang={lang}
                  currency={currency}
                  t={t}
                  properties={properties}
                  favorites={favorites}
                  onToggleFavorite={handleProtectedToggleFavorite}
                  onQuickView={handleOpenQuickView}
                  triggerToast={triggerToast}
                  onAddNewLead={handleAddNewLead}
                />
              }
            />

            {/* 4. Financing & Mortgage Calculator Page */}
            <Route
              path="/financing"
              element={<FinancingPage lang={lang} t={t} />}
            />

            {/* 5. Specialized Business Portals & Wizards */}
            <Route
              path="/buy"
              element={
                <PortalsPage
                  portalType="buy"
                  lang={lang}
                  t={t}
                  buyerStep={buyerStep}
                  setBuyerStep={setBuyerStep}
                  buyerAnswers={buyerAnswers}
                  setBuyerAnswers={setBuyerAnswers}
                  handleBuyerChoice={handleBuyerChoice}
                  submitBuyerJourney={submitBuyerJourney}
                  triggerToast={triggerToast}
                  handleAddNewLead={handleAddNewLead}
                />
              }
            />

            <Route
              path="/sell"
              element={
                <PortalsPage
                  portalType="sell"
                  lang={lang}
                  t={t}
                  sellerStep={sellerStep}
                  setSellerStep={setSellerStep}
                  sellerAnswers={sellerAnswers}
                  setSellerAnswers={setSellerAnswers}
                  handleSellerChoice={handleSellerChoice}
                  submitSellerJourney={submitSellerJourney}
                  estimatedValue={estimatedValue}
                  triggerToast={triggerToast}
                  handleAddNewLead={handleAddNewLead}
                />
              }
            />

            <Route
              path="/valuation"
              element={
                <PortalsPage
                  portalType="valuation"
                  lang={lang}
                  t={t}
                  sellerStep={sellerStep}
                  setSellerStep={setSellerStep}
                  sellerAnswers={sellerAnswers}
                  setSellerAnswers={setSellerAnswers}
                  handleSellerChoice={handleSellerChoice}
                  submitSellerJourney={submitSellerJourney}
                  estimatedValue={estimatedValue}
                  triggerToast={triggerToast}
                  handleAddNewLead={handleAddNewLead}
                />
              }
            />

            <Route
              path="/investor"
              element={
                <PortalsPage
                  portalType="investor"
                  lang={lang}
                  currency={currency}
                  t={t}
                  invAmount={invAmount}
                  setInvAmount={setInvAmount}
                  invPeriod={invPeriod}
                  setInvPeriod={setInvPeriod}
                  invPropType={invPropType}
                  setInvPropType={setInvPropType}
                  investorForm={investorForm}
                  setInvestorForm={setInvestorForm}
                  showInvResultForm={showInvResultForm}
                  setShowInvResultForm={setShowInvResultForm}
                  roiRes={roiRes}
                  submitInvestorForm={submitInvestorForm}
                  triggerToast={triggerToast}
                  handleAddNewLead={handleAddNewLead}
                />
              }
            />

            <Route
              path="/broker"
              element={
                <PortalsPage
                  portalType="broker"
                  lang={lang}
                  t={t}
                  brokerForm={brokerForm}
                  setBrokerForm={setBrokerForm}
                  handleBrokerCheckbox={handleBrokerCheckbox}
                  submitBrokerPortal={submitBrokerPortal}
                  triggerToast={triggerToast}
                  handleAddNewLead={handleAddNewLead}
                />
              }
            />

            <Route
              path="/demands"
              element={
                <PortalsPage
                  portalType="demands"
                  lang={lang}
                  t={t}
                  demands={demands}
                  ownerSearch={ownerSearch}
                  setOwnerSearch={setOwnerSearch}
                  isScanningMap={isScanningMap}
                  setIsScanningMap={setIsScanningMap}
                  ownerMatchesFound={ownerMatchesFound}
                  setOwnerMatchesFound={setOwnerMatchesFound}
                  scanningMessage={scanningMessage}
                  setScanningMessage={setScanningMessage}
                  navigateTo={(path) => navigate('/' + path)}
                  setSellerAnswers={setSellerAnswers}
                  triggerToast={triggerToast}
                  handleAddNewLead={handleAddNewLead}
                  onOpenAddDemand={() => setAddDemandModalOpen(true)}
                />
              }
            />

            <Route
              path="/vault"
              element={<Navigate to="/properties" replace />}
            />

            <Route
              path="/referral"
              element={
                <PortalsPage
                  portalType="referral"
                  lang={lang}
                  t={t}
                  triggerToast={triggerToast}
                  handleAddNewLead={handleAddNewLead}
                />
              }
            />

            <Route
              path="/special"
              element={
                <PortalsPage
                  portalType="special"
                  lang={lang}
                  t={t}
                  triggerToast={triggerToast}
                  handleAddNewLead={handleAddNewLead}
                />
              }
            />

            <Route
              path="/special-requests"
              element={
                <PortalsPage
                  portalType="special"
                  lang={lang}
                  t={t}
                  triggerToast={triggerToast}
                  handleAddNewLead={handleAddNewLead}
                />
              }
            />

            {/* Mega Projects & Flagship Compounds Hub */}
            <Route
              path="/projects"
              element={
                <ProjectsPage
                  lang={lang}
                  currency={currency}
                  projects={projects}
                  triggerToast={triggerToast}
                />
              }
            />

            {/* Sohag Real Estate Market Intelligence & Price Benchmark */}
            <Route
              path="/market-intelligence"
              element={
                <MarketIntelligencePage
                  lang={lang}
                  currency={currency}
                  triggerToast={triggerToast}
                />
              }
            />

            {/* 👤 Verified Client Account, Saved Favorites & Smart Comparisons Hub */}
            <Route
              path="/my-account"
              element={
                <ClientAccountPage
                  properties={properties}
                  favorites={favorites}
                  onToggleFavorite={handleProtectedToggleFavorite}
                  compareList={compareList}
                  onToggleCompare={handleProtectedToggleCompare}
                  onClearFavorites={clearFavorites}
                  onClearCompare={clearCompare}
                  onOpenCompare={() => setCompareDrawerOpen(true)}
                  leads={leads}
                  demands={demands}
                  lang={lang}
                  currency={currency}
                />
              }
            />

            <Route
              path="/favorites"
              element={<Navigate to="/my-account" replace />}
            />

            <Route
              path="/compare"
              element={<Navigate to="/my-account" replace />}
            />

            {/* CRM Admin Control Panel & Property CMS & Demands CMS */}
            <Route
              path="/crm"
              element={
                <CrmPage
                  lang={lang}
                  t={t}
                  leads={leads}
                  setLeads={setLeads}
                  properties={properties}
                  onAddProperty={handleAddProperty}
                  onUpdateProperty={handleUpdateProperty}
                  onDeleteProperty={handleDeleteProperty}
                  projects={projects}
                  onAddProject={handleAddProject}
                  onUpdateProject={handleUpdateProject}
                  onDeleteProject={handleDeleteProject}
                  demands={demands}
                  onAddDemand={handleAddAdminDemand}
                  onApproveDemand={handleApproveDemand}
                  onUpdateDemand={handleUpdateDemand}
                  onDeleteDemand={handleDeleteDemand}
                  onUnpublishDemand={handleUnpublishDemand}
                  crmAuthenticated={crmAuthenticated}
                  setCrmAuthenticated={setCrmAuthenticated}
                  onLogout={handleCrmLogout}
                  triggerToast={triggerToast}
                  onUpdateLead={handleUpdateLead}
                  onDeleteLead={handleDeleteLead}
                  onAddNewLead={handleAddNewLead}
                />
              }
            />

            {/* Fallback wildcard to Home */}
            <Route
              path="*"
              element={
                <HomePage
                  lang={lang}
                  currency={currency}
                  properties={properties}
                  demands={demands}
                  favorites={favorites}
                  onToggleFavorite={handleProtectedToggleFavorite}
                  compareList={compareList}
                  onToggleCompare={handleProtectedToggleCompare}
                  onQuickView={handleOpenQuickView}
                  onOpenAddDemand={() => setAddDemandModalOpen(true)}
                  onAddNewLead={handleAddNewLead}
                  triggerToast={triggerToast}
                />
              }
            />
          </Routes>
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
      <AboutFounderModal
        isOpen={aboutFounderModalOpen}
        onClose={() => setAboutFounderModalOpen(false)}
        lang={lang}
      />

      {/* Add Buyer Demand Modal */}
      <AddDemandModal
        isOpen={addDemandModalOpen}
        onClose={() => setAddDemandModalOpen(false)}
        lang={lang}
        onSubmitDemand={handleAddPublicDemand}
        triggerToast={triggerToast}
      />

      {/* Property Comparison Drawer Matrix */}
      {compareDrawerOpen && (
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
      )}

      {/* Saved Properties & Favorites Drawer */}
      {favoritesDrawerOpen && (
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
      )}

      {/* Client Identity & WhatsApp Security Verification Modal */}
      <ClientAuthModal lang={lang} />

      {/* AI Virtual Real Estate Advisor Modal */}
      <AIPropertyAdvisorModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        lang={lang}
        onOpenCallbackModal={() => setCallbackModalOpen(true)}
      />

      {/* Global Omnisearch Spotlight Modal */}
      <QuickSearchModal
        isOpen={quickSearchOpen}
        onClose={() => setQuickSearchOpen(false)}
        properties={properties}
        lang={lang}
        currency={currency}
        onOpenAddDemand={() => setAddDemandModalOpen(true)}
      />

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
      <UIModalProvider>
        <PropertiesProvider>
          <AuthProvider>
            <ClientAuthConsumer>
              <AppContent />
            </ClientAuthConsumer>
          </AuthProvider>
        </PropertiesProvider>
      </UIModalProvider>
    </PreferencesProvider>
  );
}
