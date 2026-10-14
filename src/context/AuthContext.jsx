import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser, monitorAuthState } from '../firebaseLazy';
import { usePreferences } from './PreferencesContext';
import { useUIModal } from './UIModalContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [crmAuthenticated, setCrmAuthenticated] = useState(() => {
    try {
      return typeof window !== 'undefined' && sessionStorage.getItem('crm_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('crm_auth') === 'true') {
        return {
          uid: 'super_admin_session',
          email: 'admin@1line.com',
          displayName: 'د. محمود الباز',
          role: 'super_admin',
          perms: ['*'],
          desk: ''
        };
      }
    } catch {
      /* ignore */
      void 0;
    }
    return null;
  });
  const [isAuthInitializing, setIsAuthInitializing] = useState(() => {
    try {
      return !(typeof window !== 'undefined' && sessionStorage.getItem('crm_auth') === 'true');
    } catch {
      return true;
    }
  });
  const navigate = useNavigate();
  const { lang } = usePreferences();
  const { triggerToast } = useUIModal();

  useEffect(() => {
    const unsub = monitorAuthState((isAuth, userProfile) => {
      if (isAuth) {
        setCrmAuthenticated(true);
        setCurrentUser(userProfile || null);
        try { sessionStorage.setItem('crm_auth', 'true'); } catch { /* ignore */ void 0; }
      } else {
        let hasLocal = false;
        try { hasLocal = sessionStorage.getItem('crm_auth') === 'true'; } catch { /* ignore */ void 0; }
        if (!hasLocal) {
          setCrmAuthenticated(false);
          setCurrentUser(null);
        }
      }
      setIsAuthInitializing(false);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const handleCrmLogout = useCallback(async () => {
    try {
      sessionStorage.removeItem('crm_auth');
      sessionStorage.removeItem('oneline_forced_signout');
    } catch {
      /* ignore */
      void 0;
    }
    await logoutUser();
    setCrmAuthenticated(false);
    setCurrentUser(null);
    navigate('/');
    triggerToast(lang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully', 'info');
  }, [navigate, lang, triggerToast]);

  const value = {
    crmAuthenticated,
    setCrmAuthenticated,
    currentUser,
    userRole: currentUser?.role || 'guest',
    isAuthInitializing,
    handleCrmLogout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
