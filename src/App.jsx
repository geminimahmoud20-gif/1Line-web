import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { TRANSLATIONS } from './translations';
import { PROPERTIES_DATA } from './data/propertiesData';
import { MEGA_PROJECTS } from './data/projectsData';
import { INITIAL_LEADS, INITIAL_DEMANDS } from './data/mockData';
import { 
  saveLead, 
  subscribeToLeads, 
  subscribeToDemands,
  isFirebaseActive, 
  saveNotification,
  updateLeadField,
  deleteLead,
  saveDemand,
  loadDemands,
  updateDemandStatus,
  deleteDemandDoc,
  logoutUser,
  monitorAuthState
} from './firebaseService';
import { playNotificationChime } from './utils/notificationHub';
import { sanitizeObject, normalizePhoneNumber } from './utils/securityShield';
import { getOrCreateSession, trackEvent, identifyVisitor, getCurrentSessionJourney } from './utils/visitorTracker';
import { isRecordArray, readStoredJson } from './utils/browserStorage';
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

// Critical Landing Page (Direct Import for instant FCP)
import HomePage from './pages/HomePage';

// Lazy Loaded Secondary & Heavy Admin Pages (Code Splitting)
const PropertiesPage = lazy(() => import('./pages/PropertiesPage'));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage'));
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
        borderTopColor: 'var(--accent-gold)',
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

export default function App() {
  const [lang, setLang] = useState('ar');
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('oneline_currency') || 'EGP';
  });

  const handleSetCurrency = useCallback((newCurr) => {
    setCurrency(newCurr);
    localStorage.setItem('oneline_currency', newCurr);
  }, []);

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

  // Synchronize theme to document root, body and mobile theme-color meta tag
  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark-theme', isDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.body.setAttribute('data-theme', theme);
    document.body.classList.toggle('dark-theme', isDark);
    document.body.classList.toggle('dark', isDark);

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#070b14' : '#f8fafc');
    }
  }, [theme]);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
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

  // Toast System
  const [toasts, setToasts] = useState([]);
  const triggerToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Properties Data State (Smart Catalog Merge to ensure all verified Sohag listings are always accessible)
  const [properties, setProperties] = useState(() => {
    const stored = readStoredJson('oneline_properties', PROPERTIES_DATA, isRecordArray);
    if (Array.isArray(stored) && stored.length > 0) {
      const existingIds = new Set(stored.map(p => p.id));
      const missing = PROPERTIES_DATA.filter(p => !existingIds.has(p.id));
      if (missing.length > 0) {
        const merged = [...stored, ...missing];
        localStorage.setItem('oneline_properties', JSON.stringify(merged));
        return merged;
      }
      return stored;
    }
    return PROPERTIES_DATA;
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

  // Mega Projects State (Smart Catalog Merge to ensure verified Sohag developments are always accessible)
  const [projects, setProjects] = useState(() => {
    const stored = readStoredJson('oneline_mega_projects', MEGA_PROJECTS, isRecordArray);
    if (Array.isArray(stored) && stored.length > 0) {
      const existingIds = new Set(stored.map(p => p.id));
      const missing = MEGA_PROJECTS.filter(p => !existingIds.has(p.id));
      if (missing.length > 0) {
        const merged = [...stored, ...missing];
        localStorage.setItem('oneline_mega_projects', JSON.stringify(merged));
        return merged;
      }
      return stored;
    }
    return MEGA_PROJECTS;
  });

  const handleAddProject = useCallback((newProj) => {
    setProjects((prev) => {
      const updated = [newProj, ...prev];
      localStorage.setItem('oneline_mega_projects', JSON.stringify(updated));
      return updated;
    });
    triggerToast(lang === 'ar' ? 'تم إضافة المشروع بنجاح 🏢' : 'Project added!', 'success');
  }, [lang, triggerToast]);

  const handleUpdateProject = useCallback((id, updatedData) => {
    setProjects((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updatedData } : p));
      localStorage.setItem('oneline_mega_projects', JSON.stringify(updated));
      return updated;
    });
    triggerToast(lang === 'ar' ? 'تم تحديث بيانات المشروع ونسب الإنجاز بنجاح 💾' : 'Project updated!', 'success');
  }, [lang, triggerToast]);

  const handleDeleteProject = useCallback((id) => {
    setProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem('oneline_mega_projects', JSON.stringify(updated));
      return updated;
    });
    triggerToast(lang === 'ar' ? 'تم حذف المشروع بنجاح 🗑️' : 'Project deleted!', 'info');
  }, [lang, triggerToast]);

  // Favorites State
  const [favorites, setFavorites] = useState(() => {
    return readStoredJson('oneline_favorites', [], Array.isArray);
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

  const [favoritesDrawerOpen, setFavoritesDrawerOpen] = useState(false);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    localStorage.removeItem('oneline_favorites');
    triggerToast(lang === 'ar' ? 'تم مسح قائمة المفضلة' : 'Favorites cleared', 'info');
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
      if (prev.length >= 4) {
        triggerToast(lang === 'ar' ? 'يمكنك مقارنة 4 عقارات كحد أقصى' : 'Max 4 properties for comparison', 'error');
        return prev;
      }
      triggerToast(lang === 'ar' ? 'تمت الإضافة إلى قائمة المقارنة' : 'Added to comparison', 'success');
      return [...prev, property];
    });
  }, [lang, triggerToast]);

  const addToCompare = useCallback((property) => {
    setCompareList((prev) => {
      if (prev.some((p) => p.id === property.id)) return prev;
      if (prev.length >= 4) {
        triggerToast(lang === 'ar' ? 'يمكنك مقارنة 4 عقارات كحد أقصى' : 'Max 4 properties for comparison', 'error');
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
    return readStoredJson('oneline_crm_leads', INITIAL_LEADS, isRecordArray);
  });

  const [demands, setDemands] = useState(() => {
    const fallback = INITIAL_DEMANDS.map((d) => ({ ...d, status: d.status || 'published' }));
    const stored = readStoredJson('oneline_demands', fallback, isRecordArray);
    return Array.isArray(stored) && stored.length > 0 ? stored : fallback;
  });

  const [addDemandModalOpen, setAddDemandModalOpen] = useState(false);
  const [aboutFounderModalOpen, setAboutFounderModalOpen] = useState(false);

  // Global event listener to trigger Founder Modal from anywhere
  useEffect(() => {
    const handleOpenModal = () => setAboutFounderModalOpen(true);
    window.addEventListener('oneline_open_founder_modal', handleOpenModal);
    return () => window.removeEventListener('oneline_open_founder_modal', handleOpenModal);
  }, []);

  // Generic Lead Submission Handler with Deduplication & Auto-Merge
  const handleAddNewLead = useCallback(async (leadData, extraData, sourceLabel) => {
    let rawLead = leadData;
    if (typeof leadData === 'string' && extraData && typeof extraData === 'object') {
      rawLead = {
        ...extraData,
        type: extraData.type || leadData,
        source: sourceLabel || extraData.source || 'Direct Entry'
      };
    }

    // 🛡️ Sanitize all user-submitted data to prevent XSS attacks
    const cleanData = sanitizeObject(rawLead || leadData);
    sanitizeObject(leadData);

    // Standardize mandatory client registration fields
    const normalizedName = (cleanData.name || cleanData.clientName || '').trim();
    const rawPhone = cleanData.phone || cleanData.whatsapp || '';
    const rawWhatsapp = cleanData.whatsapp || cleanData.phone || '';
    const normalizedPropertyType = cleanData.propertyType || cleanData.details?.propertyType || cleanData.targetType || cleanData.type || 'residential';
    const normalizedArea = cleanData.area || cleanData.details?.area || cleanData.location || 'sohag_jadida';

    const standardizedData = {
      ...cleanData,
      name: normalizedName || 'عميل مسجل',
      phone: rawPhone,
      whatsapp: rawWhatsapp,
      propertyType: normalizedPropertyType,
      area: normalizedArea,
      details: {
        ...(cleanData.details || {}),
        propertyType: normalizedPropertyType,
        area: normalizedArea
      }
    };

    const incomingPhone = normalizePhoneNumber(rawPhone || rawWhatsapp);

    // 🌐 Enrich Digital Visitor Session
    identifyVisitor(standardizedData);
    const sessionJourney = getCurrentSessionJourney();

    // Play subtle audio alert for sales team if sound enabled
    if (soundEnabled) {
      playNotificationChime();
    }

    let finalLead = null;

    // 1. Update State & LocalStorage
    setLeads((prev) => {
      // 🛡️ Check if phone already exists in leads database
      const existingIndex = prev.findIndex(
        (l) => normalizePhoneNumber(l.phone || l.whatsapp) === incomingPhone
      );

      if (existingIndex !== -1 && incomingPhone) {
        // Customer already exists -> Merge new request into existing lead record
        const existing = prev[existingIndex];
        const newLog = {
          timestamp: new Date().toISOString(),
          action: `تسجيل اهتمام إضافي: طلب ${standardizedData.propertyType || standardizedData.type || 'جديد'}`
        };

        const mergedLead = {
          ...existing,
          name: existing.name || standardizedData.name,
          whatsapp: standardizedData.whatsapp || existing.whatsapp,
          phone: standardizedData.phone || existing.phone,
          propertyType: standardizedData.propertyType || existing.propertyType,
          area: standardizedData.area || existing.area,
          score: Math.min(100, (existing.score || 80) + 10), // Boost urgency score
          timestamp: new Date().toISOString(), // Refresh recency
          notes: `${existing.notes ? existing.notes + ' | ' : ''}طلب إضافي: ${standardizedData.propertyType || ''} في ${standardizedData.area || ''}`,
          details: { ...(existing.details || {}), ...(standardizedData.details || {}) },
          activityLogs: [newLog, ...(existing.activityLogs || [])],
          digitalJourney: (sessionJourney.events && sessionJourney.events.length > 0) ? sessionJourney.events : (existing.digitalJourney || []),
          dwellTimeFormatted: sessionJourney.dwellTimeFormatted || existing.dwellTimeFormatted || '1د 15ث',
          isLiveTracked: true
        };

        finalLead = mergedLead;
        const updated = [...prev];
        updated[existingIndex] = mergedLead;
        localStorage.setItem('oneline_crm_leads', JSON.stringify(updated));
        return updated;
      } else {
        // Brand new customer record
        const newLead = {
          id: 'lead-' + Date.now(),
          timestamp: new Date().toISOString(),
          status: 'new',
          followUp: 'Pending Contact',
          assignedTo: 'Sales Advisor Team',
          score: 85,
          temperature: 'hot',
          activityLogs: [{
            timestamp: new Date().toISOString(),
            action: 'تسجيل العميل لأول مرة عبر المنصة'
          }],
          digitalJourney: sessionJourney.events || [],
          dwellTimeFormatted: sessionJourney.dwellTimeFormatted || '45 ثانية',
          dwellTimeSeconds: sessionJourney.dwellTimeSeconds || 45,
          isLiveTracked: true,
          ...standardizedData
        };

        finalLead = newLead;
        const updated = [newLead, ...prev];
        localStorage.setItem('oneline_crm_leads', JSON.stringify(updated));
        return updated;
      }
    });

    // 2. Push to Firebase if configured
    if (isFirebaseActive() && finalLead) {
      try {
        await saveLead(finalLead);
        await saveNotification(`Lead update: ${finalLead.name || 'Client'}`);
      } catch (err) {
        console.error('Firebase save lead error:', err);
      }
    }

    return finalLead;
  }, [soundEnabled]);

  // Demands Management Handlers
  const handleAddPublicDemand = useCallback(async (newDemand) => {
    // 🛡️ Sanitize user-submitted demand payload
    const sanitizedDemand = sanitizeObject(newDemand);

    setDemands((prev) => {
      const updated = [sanitizedDemand, ...prev];
      localStorage.setItem('oneline_demands', JSON.stringify(updated));
      return updated;
    });

    // Also log in CRM Leads for immediate sales tracking
    handleAddNewLead({
      name: sanitizedDemand.clientName || 'مشتري عقار',
      phone: sanitizedDemand.phone,
      whatsapp: sanitizedDemand.whatsapp,
      source: 'طلب شراء عقار (مراجعة الإدارة)',
      notes: `طلب شراء جديد: ${sanitizedDemand.text_ar || ''} | الميزانية: ${sanitizedDemand.budget} ج.م | المنطقة: ${sanitizedDemand.area_ar || sanitizedDemand.area}`,
      type: 'buyer_demand',
      status: 'new',
      details: {
        demandId: sanitizedDemand.id,
        budget: sanitizedDemand.budget,
        propertyType: sanitizedDemand.type,
        area: sanitizedDemand.area
      }
    });

    if (isFirebaseActive()) {
      saveDemand(sanitizedDemand);
    }
  }, [handleAddNewLead]);

  const handleAddAdminDemand = useCallback((demandPayload) => {
    const sanitizedPayload = sanitizeObject(demandPayload);
    setDemands((prev) => {
      const updated = [sanitizedPayload, ...prev];
      localStorage.setItem('oneline_demands', JSON.stringify(updated));
      return updated;
    });
    if (isFirebaseActive()) {
      saveDemand(sanitizedPayload);
    }
  }, []);

  const handleApproveDemand = useCallback((demandId) => {
    setDemands((prev) => {
      const updated = prev.map(d => d.id === demandId ? { 
        ...d, 
        status: 'published', 
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } : d);
      // Ensure newly approved / published demands appear at the top
      const sorted = [...updated].sort((a, b) => {
        const timeA = new Date(a.approvedAt || a.createdAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.approvedAt || b.createdAt || b.timestamp || 0).getTime();
        return timeB - timeA;
      });
      localStorage.setItem('oneline_demands', JSON.stringify(sorted));
      return sorted;
    });
    if (isFirebaseActive()) {
      updateDemandStatus(demandId, { status: 'published', approvedAt: new Date().toISOString() });
    }
  }, []);

  const handleUpdateDemand = useCallback((demandId, updatedData) => {
    setDemands((prev) => {
      const updated = prev.map(d => d.id === demandId ? { ...d, ...updatedData } : d);
      localStorage.setItem('oneline_demands', JSON.stringify(updated));
      return updated;
    });
    if (isFirebaseActive()) {
      updateDemandStatus(demandId, updatedData);
    }
  }, []);

  const handleDeleteDemand = useCallback((demandId) => {
    setDemands((prev) => {
      const updated = prev.filter(d => d.id !== demandId);
      localStorage.setItem('oneline_demands', JSON.stringify(updated));
      return updated;
    });
    if (isFirebaseActive()) {
      deleteDemandDoc(demandId);
    }
  }, []);

  const handleUnpublishDemand = useCallback((demandId) => {
    setDemands((prev) => {
      const updated = prev.map(d => d.id === demandId ? { ...d, status: 'pending' } : d);
      localStorage.setItem('oneline_demands', JSON.stringify(updated));
      return updated;
    });
    if (isFirebaseActive()) {
      updateDemandStatus(demandId, { status: 'pending' });
    }
  }, []);

  // CRM Auth State
  const [crmAuthenticated, setCrmAuthenticated] = useState(false);

  useEffect(() => monitorAuthState(setCrmAuthenticated), []);

  const handleCrmLogout = async () => {
    await logoutUser();
    setCrmAuthenticated(false);
    navigate('/');
    triggerToast(lang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully', 'info');
  };

  // Sync with Firebase if configured (Real-time Leads & Demands)
  useEffect(() => {
    if (isFirebaseActive()) {
      const unsubLeads = subscribeToLeads((cloudLeads) => {
        if (cloudLeads && cloudLeads.length > 0) {
          setLeads(cloudLeads);
        }
      });
      const unsubDemands = subscribeToDemands((cloudDemands) => {
        if (cloudDemands && cloudDemands.length > 0) {
          const sorted = [...cloudDemands].sort((a, b) => {
            const timeA = new Date(a.approvedAt || a.createdAt || a.timestamp || 0).getTime();
            const timeB = new Date(b.approvedAt || b.createdAt || b.timestamp || 0).getTime();
            return timeB - timeA;
          });
          setDemands(sorted);
        }
      });
      return () => { 
        if (unsubLeads) unsubLeads(); 
        if (unsubDemands) unsubDemands();
      };
    }
  }, []);

  // CRM Leads Handlers
  const handleUpdateLead = useCallback(async (id, updatedFields) => {
    if (isFirebaseActive()) {
      const saved = await updateLeadField(id, updatedFields);
      if (!saved) {
        triggerToast(
          lang === 'ar'
            ? 'تعذر حفظ التعديل في Firebase. تأكد من نشر قواعد Firestore وتسجيل الدخول بحساب المدير.'
            : 'Could not save to Firebase. Check Firestore rules and your admin sign-in.',
          'error'
        );
        return false;
      }
    }

    setLeads((prev) => {
      const updated = prev.map((l) => {
        if (l.id === id) {
          const activityLogs = l.activityLogs || [];
          const newLog = {
            timestamp: new Date().toISOString(),
            action: `تحديث بيانات: ${Object.keys(updatedFields).join(', ')}`
          };
          return { ...l, ...updatedFields, activityLogs: [newLog, ...activityLogs] };
        }
        return l;
      });
      localStorage.setItem('oneline_crm_leads', JSON.stringify(updated));
      return updated;
    });

    return true;
  }, [lang, triggerToast]);

  const handleDeleteLead = useCallback(async (id) => {
    setLeads((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      localStorage.setItem('oneline_crm_leads', JSON.stringify(updated));
      return updated;
    });

    if (isFirebaseActive()) {
      try {
        await deleteLead(id);
      } catch (err) {
        console.error('Firebase delete lead error:', err);
      }
    }
  }, []);

  // Modals States
  const [quickViewProperty, setQuickViewProperty] = useState(null);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);

  // Global Keyboard Shortcut for Omnisearch (Ctrl + K / Cmd + K or '/')
  useEffect(() => {
    const handleGlobalSearchKey = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setQuickSearchOpen(prev => !prev);
      } else if (e.key === '/' && !isInput && !(e.ctrlKey || e.metaKey || e.altKey)) {
        e.preventDefault();
        setQuickSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalSearchKey);
    return () => window.removeEventListener('keydown', handleGlobalSearchKey);
  }, []);

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
      whatsapp: formData.whatsapp || formData.phone,
      propertyType: formData.propertyType || 'apartment',
      area: formData.area || 'sohag_jadida',
      type: 'callback_request',
      notes: `طلب معاودة اتصال سريع (${formData.preferredTime}) | نوع العقار: ${formData.propertyType || 'سكني'} | المنطقة: ${formData.area || 'سوهاج'}`,
      details: formData
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
      propertyType: buyerAnswers.propertyType || 'apartment',
      area: buyerAnswers.area || 'sohag_jadida',
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

  const submitSellerJourney = async (overrideData) => {
    const data = overrideData || sellerAnswers;
    await handleAddNewLead({
      name: data.name,
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
      propertyType: data.propertyType || 'apartment',
      area: data.area || 'sohag_jadida',
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
  const [investorForm, setInvestorForm] = useState({ name: '', phone: '', whatsapp: '', email: '', area: 'sohag_jadida' });
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
      area: data.area || 'sohag_jadida',
      email: data.email,
      type: 'investor',
      landingPage: '/investor',
      notes: `طلب دراسة جدوى استثمارية بمبلغ ${(data.budget || invAmount).toLocaleString()} ج.م لفترة ${data.investmentHorizon || invPeriod} سنوات`,
      details: { invAmount: data.budget || invAmount, invPeriod: data.investmentHorizon || invPeriod, invPropType: data.propertyType || invPropType, area: data.area || 'sohag_jadida', ...data }
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
      area: data.area || (data.areas && data.areas[0]) || 'sohag_jadida',
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

      {/* Floating Back to Top */}
      <BackToTopButton lang={lang} />

      {/* Quick View Modal */}
      <QuickViewModal
        property={quickViewProperty}
        lang={lang}
        currency={currency}
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

      {/* Site Header Navigation (Hidden on CRM for clean enterprise workspace) */}
      {!location.pathname.startsWith('/crm') && (
        <Header
          lang={lang}
          setLang={setLang}
          currency={currency}
          setCurrency={handleSetCurrency}
          theme={theme}
          toggleTheme={toggleTheme}
          soundEnabled={soundEnabled}
          toggleSound={toggleSound}
          onOpenShare={() => setShareModalOpen(true)}
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
                onToggleFavorite={toggleFavorite}
                compareList={compareList}
                onToggleCompare={toggleCompare}
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
                currency={currency}
                t={t}
                properties={properties}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
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

          {/* 4. Mega Projects & Flagship Compounds Hub */}
          <Route
            path="/projects"
            element={
              <ProjectsPage
                lang={lang}
                projects={projects}
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

          {/* 6. CRM Admin Control Panel & Property CMS & Mega Projects & Demands CMS */}
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
                t={t}
                properties={properties}
                demands={demands}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onQuickView={handleOpenQuickView}
                onOpenTrackLead={() => setTrackModalOpen(true)}
                onOpenAddDemand={() => setAddDemandModalOpen(true)}
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

      {/* 🏢 About 1Line & Founder Profile Modal */}
      <AboutFounderModal
        isOpen={aboutFounderModalOpen}
        onClose={() => setAboutFounderModalOpen(false)}
        lang={lang}
      />

      {/* 📝 Add Buyer Demand Modal */}
      <AddDemandModal
        isOpen={addDemandModalOpen}
        onClose={() => setAddDemandModalOpen(false)}
        lang={lang}
        onSubmitDemand={handleAddPublicDemand}
        triggerToast={triggerToast}
      />

      {/* ⚖️ Property Comparison Drawer Matrix */}
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

      {/* ❤️ Saved Properties & Favorites Drawer */}
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

      {/* 🤖 AI Virtual Real Estate Advisor Modal */}
      <AIPropertyAdvisorModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        lang={lang}
      />

      {/* 🔍 Global Omnisearch Spotlight Modal */}
      <QuickSearchModal
        isOpen={quickSearchOpen}
        onClose={() => setQuickSearchOpen(false)}
        properties={properties}
        lang={lang}
        currency={currency}
        onOpenAddDemand={() => setAddDemandModalOpen(true)}
      />

      {/* ⚖️ Floating Compare Dock Bar (Shown on all pages when units selected) */}
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

      {/* 🏛️ Floating Real Estate Advisor Quick Trigger (Hidden on CRM) */}
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

      {/* ⬆️ Floating Back-To-Top Button */}
      <BackToTopButton />

      {/* 📱 Quick Multi-Channel Contact & Dial Drawer (Mobile) */}
      <QuickContactDrawer
        isOpen={contactDrawerOpen}
        onClose={() => setContactDrawerOpen(false)}
        onOpenCallbackModal={() => setCallbackModalOpen(true)}
        lang={lang}
      />

      {/* 📱 Mobile Floating 1-Thumb Bottom Navigation (Hidden on CRM) */}
      {!location.pathname.startsWith('/crm') && (
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
