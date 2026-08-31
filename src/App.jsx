import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { TRANSLATIONS } from './translations';
import { PROPERTIES_DATA } from './data/propertiesData';
import { INITIAL_LEADS, INITIAL_DEMANDS } from './data/mockData';
import { 
  saveLead, 
  subscribeToLeads, 
  isFirebaseActive, 
  saveNotification 
} from './firebaseService';
import { playNotificationChime } from './utils/notificationHub';

// Layout & Common Components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import MobileBottomBar from './components/common/MobileBottomBar';
import ToastContainer from './components/common/ToastContainer';
import QuickViewModal from './components/common/QuickViewModal';
import TrackLeadModal from './components/common/TrackLeadModal';
import ShareModal from './components/common/ShareModal';
import CallbackModal from './components/common/CallbackModal';
import PropertyCompareDrawer from './components/properties/PropertyCompareDrawer';
import LiveActivityToast from './components/common/LiveActivityToast';
import QuickContactDrawer from './components/common/QuickContactDrawer';
import BackToTopButton from './components/common/BackToTopButton';
import AIPropertyAdvisorModal from './components/common/AIPropertyAdvisorModal';

// Pages
import HomePage from './pages/HomePage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import FinancingPage from './pages/FinancingPage';
import ProjectsPage from './pages/ProjectsPage';
import MarketIntelligencePage from './pages/MarketIntelligencePage';
import PortalsPage from './pages/PortalsPage';
import CrmPage from './pages/CrmPage';

import './App.css';

export default function App() {
  const [lang, setLang] = useState('ar');
  const [currency, setCurrency] = useState('EGP');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('oneline_theme') || 'light';
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('oneline_theme', nextTheme);
      return nextTheme;
    });
  }, []);

  const [soundEnabled, setSoundEnabled] = useState(true);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to top on page navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Toast System
  const [toasts, setToasts] = useState([]);
  const triggerToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Properties Data State
  const [properties, setProperties] = useState(() => {
    const saved = localStorage.getItem('oneline_properties');
    return saved ? JSON.parse(saved) : PROPERTIES_DATA;
  });

  const handleAddProperty = useCallback((newProp) => {
    setProperties((prev) => {
      const updated = [newProp, ...prev];
      localStorage.setItem('oneline_properties', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleUpdateProperty = useCallback((id, updatedData) => {
    setProperties((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updatedData } : p));
      localStorage.setItem('oneline_properties', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleDeleteProperty = useCallback((id) => {
    setProperties((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem('oneline_properties', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Favorites State
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('oneline_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleFavorite = useCallback((propertyId) => {
    setFavorites((prev) => {
      const exists = prev.includes(propertyId);
      const updated = exists ? prev.filter((id) => id !== propertyId) : [...prev, propertyId];
      localStorage.setItem('oneline_favorites', JSON.stringify(updated));
      triggerToast(
        exists 
          ? (lang === 'ar' ? 'تمت الإزالة من المفضلة' : 'Removed from favorites')
          : (lang === 'ar' ? 'تمت الإضافة إلى المفضلة' : 'Saved to favorites'),
        'success'
      );
      return updated;
    });
  }, [lang, triggerToast]);

  // Comparison State (Up to 3 properties)
  const [compareList, setCompareList] = useState([]);
  const [compareDrawerOpen, setCompareDrawerOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const toggleCompare = useCallback((property) => {
    setCompareList((prev) => {
      const exists = prev.some((p) => p.id === property.id);
      if (exists) {
        triggerToast(lang === 'ar' ? 'تمت الإزالة من قائمة المقارنة' : 'Removed from comparison', 'info');
        return prev.filter((p) => p.id !== property.id);
      }
      if (prev.length >= 3) {
        triggerToast(lang === 'ar' ? 'يمكنك مقارنة 3 عقارات كحد أقصى' : 'Max 3 properties for comparison', 'error');
        return prev;
      }
      triggerToast(lang === 'ar' ? 'تمت الإضافة إلى قائمة المقارنة' : 'Added to comparison', 'success');
      return [...prev, property];
    });
  }, [lang, triggerToast]);

  const removeCompare = useCallback((propertyId) => {
    setCompareList((prev) => prev.filter((p) => p.id !== propertyId));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
    setCompareDrawerOpen(false);
  }, []);

  // CRM Leads State
  const [leads, setLeads] = useState(() => {
    const saved = localStorage.getItem('oneline_crm_leads');
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });

  const [demands, setDemands] = useState(INITIAL_DEMANDS);

  // CRM Auth State
  const [crmAuthenticated, setCrmAuthenticated] = useState(() => {
    return sessionStorage.getItem('crm_auth') === 'true';
  });

  const handleCrmLogout = () => {
    setCrmAuthenticated(false);
    sessionStorage.removeItem('crm_auth');
    navigate('/');
    triggerToast(lang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully', 'info');
  };

  // Sync with Firebase if configured
  useEffect(() => {
    if (isFirebaseActive()) {
      const unsub = subscribeToLeads((cloudLeads) => {
        if (cloudLeads && cloudLeads.length > 0) {
          setLeads(cloudLeads);
        }
      });
      return () => { if (unsub) unsub(); };
    }
  }, []);

  // Generic Lead Submission Handler
  const handleAddNewLead = useCallback(async (leadData) => {
    const newLead = {
      id: 'lead-' + Date.now(),
      timestamp: new Date().toISOString(),
      status: 'new',
      followUp: 'Pending Contact',
      assignedTo: 'Sales Advisor Team',
      score: 85,
      temperature: 'hot',
      ...leadData
    };

    // Play subtle audio alert for sales team if sound enabled
    if (soundEnabled) {
      playNotificationChime();
    }

    // 1. Update State
    setLeads((prev) => {
      const updated = [newLead, ...prev];
      localStorage.setItem('oneline_crm_leads', JSON.stringify(updated));
      return updated;
    });

    // 2. Push to Firebase if configured
    if (isFirebaseActive()) {
      try {
        await saveLead(newLead);
        await saveNotification(`New lead submitted: ${newLead.name || 'Client'}`);
      } catch (err) {
        console.error('Firebase save lead error:', err);
      }
    }

    return newLead;
  }, []);

  // Modals States
  const [quickViewProperty, setQuickViewProperty] = useState(null);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);

  // Quick View Handler
  const handleOpenQuickView = (property) => {
    setQuickViewProperty(property);
  };

  const handleCloseQuickView = () => {
    setQuickViewProperty(null);
  };

  // Callback submit handler
  const handleCallbackSubmit = (formData) => {
    handleAddNewLead({
      name: formData.name,
      phone: formData.phone,
      whatsapp: formData.phone,
      type: 'callback_request',
      notes: `طلب معاودة اتصال سريع (${formData.preferredTime})`
    });
    triggerToast(lang === 'ar' ? 'تم إرسال طلب الاتصال بنجاح! سنتصل بك قريباً.' : 'Callback request submitted!', 'success');
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

  const estimatedValue = 3200000; // Calculated approximation for valuation step

  const submitSellerJourney = async () => {
    await handleAddNewLead({
      name: sellerAnswers.name,
      phone: sellerAnswers.phone,
      whatsapp: sellerAnswers.whatsapp || sellerAnswers.phone,
      type: 'seller',
      landingPage: '/sell',
      notes: `عرض بيع ${sellerAnswers.propertyType} في ${sellerAnswers.area} بمساحة ${sellerAnswers.size}م`,
      details: sellerAnswers
    });
    triggerToast(lang === 'ar' ? 'تم إرسال بيانات العقار بنجاح! سنراجع التقييم ونتواصل معك.' : 'Property listed for valuation!', 'success');
  };

  // Investor Center
  const [invAmount, setInvAmount] = useState(5000000);
  const [invPeriod, setInvPeriod] = useState(5);
  const [invPropType, setInvPropType] = useState('commercial');
  const [investorForm, setInvestorForm] = useState({ name: '', phone: '', email: '' });
  const [showInvResultForm, setShowInvResultForm] = useState(false);

  const roiRes = {
    annualYield: '14.5%',
    totalProfit: ((invAmount * 0.145 * invPeriod) + (invAmount * 0.5)).toLocaleString() + ' EGP',
    exitValue: Math.round(invAmount * 1.6).toLocaleString() + ' EGP'
  };

  const submitInvestorForm = async () => {
    await handleAddNewLead({
      name: investorForm.name,
      phone: investorForm.phone,
      email: investorForm.email,
      type: 'investor',
      landingPage: '/investor',
      notes: `طلب دراسة جدوى استثمارية بمبلغ ${invAmount.toLocaleString()} ج.م لفترة ${invPeriod} سنوات`,
      details: { invAmount, invPeriod, invPropType }
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

  const submitBrokerPortal = async () => {
    await handleAddNewLead({
      name: brokerForm.name,
      phone: brokerForm.phone,
      whatsapp: brokerForm.whatsapp || brokerForm.phone,
      type: 'broker',
      landingPage: '/broker',
      notes: `طلب انضمام وسيط عقاري (خبرة ${brokerForm.experience} سنوات)`,
      details: brokerForm
    });
    triggerToast(lang === 'ar' ? 'تم تسجيل طلب انضمامك كشريك وسيط بنجاح!' : 'Broker application submitted!', 'success');
  };

  // Demands Match State
  const [ownerSearch, setOwnerSearch] = useState('');
  const [isScanningMap, setIsScanningMap] = useState(false);
  const [ownerMatchesFound, setOwnerMatchesFound] = useState([]);
  const [scanningMessage, setScanningMessage] = useState('');

  return (
    <div className={`app-root ${lang === 'ar' ? 'rtl-dir' : 'ltr-dir'} ${theme === 'dark' ? 'dark-theme' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Live Social Proof Activity Toast */}
      <LiveActivityToast lang={lang} />

      {/* Floating Back to Top */}
      <BackToTopButton lang={lang} />

      {/* Quick View Modal */}
      <QuickViewModal
        property={quickViewProperty}
        lang={lang}
        onClose={handleCloseQuickView}
        onToggleFavorite={toggleFavorite}
        isFavorite={quickViewProperty ? favorites.includes(quickViewProperty.id) : false}
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
        onClose={() => setShareModalOpen(false)}
        lang={lang}
        triggerToast={triggerToast}
      />

      {/* Callback Modal */}
      <CallbackModal
        isOpen={callbackModalOpen}
        onClose={() => setCallbackModalOpen(false)}
        lang={lang}
        onSubmitCallback={handleCallbackSubmit}
        triggerToast={triggerToast}
      />

      {/* Site Header Navigation */}
      <Header
        lang={lang}
        setLang={setLang}
        currency={currency}
        setCurrency={setCurrency}
        theme={theme}
        toggleTheme={toggleTheme}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
        onOpenShare={() => setShareModalOpen(true)}
        onOpenTrackLead={() => setTrackModalOpen(true)}
        compareCount={compareList.length}
        onOpenCompare={() => setCompareDrawerOpen(true)}
      />

      {/* Property Comparison Drawer */}
      <PropertyCompareDrawer
        isOpen={compareDrawerOpen}
        onClose={() => setCompareDrawerOpen(false)}
        compareList={compareList}
        onRemoveFromCompare={removeCompare}
        onClearCompare={clearCompare}
        lang={lang}
      />

      {/* Application Main Routes */}
      <main className="main-site-content">
        <Routes>
          {/* 1. Home Page */}
          <Route
            path="/"
            element={
              <HomePage
                lang={lang}
                properties={properties}
                demands={demands}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                compareList={compareList}
                onToggleCompare={toggleCompare}
                onQuickView={handleOpenQuickView}
              />
            }
          />

          {/* 2. Properties Catalog & Interactive Map */}
          <Route
            path="/properties"
            element={
              <PropertiesPage
                lang={lang}
                properties={properties}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                compareList={compareList}
                onToggleCompare={toggleCompare}
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
                t={t}
                properties={properties}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onQuickView={handleOpenQuickView}
                triggerToast={triggerToast}
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
              />
            }
          />

          <Route
            path="/vault"
            element={
              <PortalsPage
                portalType="vault"
                lang={lang}
                t={t}
                triggerToast={triggerToast}
                handleAddNewLead={handleAddNewLead}
              />
            }
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

          {/* 4. Mega Projects & Flagship Compounds Hub */}
          <Route
            path="/projects"
            element={
              <ProjectsPage
                lang={lang}
                triggerToast={triggerToast}
              />
            }
          />

          {/* 5. Sohag Real Estate Market Intelligence & Price Benchmark */}
          <Route
            path="/market-intelligence"
            element={
              <MarketIntelligencePage
                lang={lang}
                triggerToast={triggerToast}
              />
            }
          />

          {/* 6. CRM Admin Control Panel & Property CMS */}
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
                crmAuthenticated={crmAuthenticated}
                setCrmAuthenticated={setCrmAuthenticated}
                onLogout={handleCrmLogout}
                triggerToast={triggerToast}
              />
            }
          />

          {/* Fallback wildcard to Home */}
          <Route
            path="*"
            element={
              <HomePage
                lang={lang}
                t={t}
                properties={properties}
                demands={demands}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onQuickView={handleOpenQuickView}
                onOpenTrackLead={() => setTrackModalOpen(true)}
                triggerToast={triggerToast}
              />
            }
          />
        </Routes>
      </main>

      {/* Site Footer */}
      <Footer lang={lang} />

      {/* ⚖️ Property Comparison Drawer Matrix */}
      <PropertyCompareDrawer
        isOpen={compareDrawerOpen}
        onClose={() => setCompareDrawerOpen(false)}
        compareList={compareList}
        onRemoveFromCompare={removeCompare}
        onClearCompare={clearCompare}
        lang={lang}
      />

      {/* 🤖 AI Virtual Real Estate Advisor Modal */}
      <AIPropertyAdvisorModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        lang={lang}
      />

      {/* 🤖 Floating AI Advisor Quick Trigger */}
      <button
        type="button"
        className="floating-ai-advisor-trigger"
        onClick={() => setAiModalOpen(true)}
        title={lang === 'ar' ? 'اسأل المستشار العقاري الذكي' : 'Ask AI Real Estate Advisor'}
      >
        <span className="ai-icon-pulse">🤖</span>
        <span className="ai-trigger-text">{lang === 'ar' ? 'اسأل المستشار الذكي AI' : 'Ask AI Advisor'}</span>
      </button>

      {/* ⬆️ Floating Back-To-Top Button */}
      <BackToTopButton />

      {/* 📱 Quick Multi-Channel Contact & Dial Drawer (Mobile) */}
      <QuickContactDrawer
        isOpen={contactDrawerOpen}
        onClose={() => setContactDrawerOpen(false)}
        onOpenCallbackModal={() => setCallbackModalOpen(true)}
        lang={lang}
      />

      {/* 📱 Mobile Floating 1-Thumb Bottom Navigation */}
      <MobileBottomBar
        lang={lang}
        compareCount={compareList.length}
        onOpenCompare={() => setCompareDrawerOpen(true)}
        onOpenContactDrawer={() => setContactDrawerOpen(true)}
      />
    </div>
  );
}
