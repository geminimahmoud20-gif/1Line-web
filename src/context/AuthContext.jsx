import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser, monitorAuthState } from '../firebaseService';
import { usePreferences } from './PreferencesContext';
import { useUIModal } from './UIModalContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [crmAuthenticated, setCrmAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthInitializing, setIsAuthInitializing] = useState(true);
  const navigate = useNavigate();
  const { lang } = usePreferences();
  const { triggerToast } = useUIModal();

  useEffect(() => {
    const unsub = monitorAuthState((isAuth, userProfile) => {
      setCrmAuthenticated(Boolean(isAuth));
      setCurrentUser(userProfile || null);
      setIsAuthInitializing(false);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const handleCrmLogout = useCallback(async () => {
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
