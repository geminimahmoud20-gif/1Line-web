import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser, monitorAuthState } from '../firebaseLazy';
import { usePreferences } from './PreferencesContext';
import { useUIModal } from './UIModalContext';

const AuthContext = createContext(null);
/** After this long the check says it is slow; after this long the sign-in screen opens (ms) */
export const AUTH_SLOW_MS = 6000;
export const AUTH_GIVE_UP_MS = 15000;

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
  // The sign-in check waits on Firebase (its code, then a fresh token from Google when the old one expired).
  // On a slow or blocked connection that never answers: say so after a few seconds, and after a while show the
  // sign-in screen instead of a spinner with no way out. A late answer still signs the person in.
  const [authSlow, setAuthSlow] = useState(false);
  const navigate = useNavigate();
  const { lang } = usePreferences();
  const { triggerToast } = useUIModal();

  useEffect(() => {
    const unsub = monitorAuthState((isAuth, userProfile) => {
      if (isAuth) {
        setCrmAuthenticated(true);
        setCurrentUser(userProfile || null);
        try { sessionStorage.setItem('crm_auth', 'true'); } catch { /* ignore */ }
      } else {
        let hasLocal = false;
        try { hasLocal = sessionStorage.getItem('crm_auth') === 'true'; } catch { /* ignore */ }
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

  useEffect(() => {
    if (!isAuthInitializing) return undefined;
    const slow = setTimeout(() => setAuthSlow(true), AUTH_SLOW_MS);
    const giveUp = setTimeout(() => setIsAuthInitializing(false), AUTH_GIVE_UP_MS);
    return () => { clearTimeout(slow); clearTimeout(giveUp); };
  }, [isAuthInitializing]);

  const handleCrmLogout = useCallback(async () => {
    try {
      sessionStorage.removeItem('crm_auth');
      sessionStorage.removeItem('oneline_forced_signout');
    } catch {
      /* ignore */
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
    authSlow,
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
