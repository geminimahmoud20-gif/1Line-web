import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const UIModalContext = createContext(null);

export function UIModalProvider({ children }) {
  // Toasts
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

  // Modals & Drawers States
  const [quickViewProperty, setQuickViewProperty] = useState(null);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [addDemandModalOpen, setAddDemandModalOpen] = useState(false);
  const [aboutFounderModalOpen, setAboutFounderModalOpen] = useState(false);
  const [compareDrawerOpen, setCompareDrawerOpen] = useState(false);
  const [favoritesDrawerOpen, setFavoritesDrawerOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Share Handlers
  const handleOpenShare = useCallback((data = null) => {
    setShareData(data);
    setShareModalOpen(true);
  }, []);

  const handleCloseShare = useCallback(() => {
    setShareModalOpen(false);
    setShareData(null);
  }, []);

  // Quick View Handlers
  const handleOpenQuickView = useCallback((property) => {
    setQuickViewProperty(property);
  }, []);

  const handleCloseQuickView = useCallback(() => {
    setQuickViewProperty(null);
  }, []);

  // Global listener for Founder Modal
  useEffect(() => {
    const handleOpenModal = () => setAboutFounderModalOpen(true);
    window.addEventListener('oneline_open_founder_modal', handleOpenModal);
    return () => window.removeEventListener('oneline_open_founder_modal', handleOpenModal);
  }, []);

  // Global Keyboard Shortcut for Omnisearch (Ctrl + K / Cmd + K or '/')
  useEffect(() => {
    const handleGlobalSearchKey = (e) => {
      // The CRM has its own command palette on Ctrl+K; opening the public search too stacked two dialogs
      if (window.location.pathname.startsWith('/crm')) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setQuickSearchOpen((prev) => !prev);
      } else if (e.key === '/' && !isInput && !(e.ctrlKey || e.metaKey || e.altKey)) {
        e.preventDefault();
        setQuickSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalSearchKey);
    return () => window.removeEventListener('keydown', handleGlobalSearchKey);
  }, []);

  const value = {
    toasts,
    triggerToast,
    dismissToast,
    quickViewProperty,
    handleOpenQuickView,
    handleCloseQuickView,
    trackModalOpen,
    setTrackModalOpen,
    shareModalOpen,
    setShareModalOpen,
    shareData,
    handleOpenShare,
    handleCloseShare,
    callbackModalOpen,
    setCallbackModalOpen,
    contactDrawerOpen,
    setContactDrawerOpen,
    quickSearchOpen,
    setQuickSearchOpen,
    addDemandModalOpen,
    setAddDemandModalOpen,
    aboutFounderModalOpen,
    setAboutFounderModalOpen,
    compareDrawerOpen,
    setCompareDrawerOpen,
    favoritesDrawerOpen,
    setFavoritesDrawerOpen,
    aiModalOpen,
    setAiModalOpen
  };

  return (
    <UIModalContext.Provider value={value}>
      {children}
    </UIModalContext.Provider>
  );
}

export function useUIModal() {
  const context = useContext(UIModalContext);
  if (!context) {
    throw new Error('useUIModal must be used within a UIModalProvider');
  }
  return context;
}
