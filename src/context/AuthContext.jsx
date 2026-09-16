import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser, monitorAuthState } from '../firebaseService';
import { usePreferences } from './PreferencesContext';
import { useUIModal } from './UIModalContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [crmAuthenticated, setCrmAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { lang } = usePreferences();
  const { triggerToast } = useUIModal();

  useEffect(() => {
    const unsub = monitorAuthState(setCrmAuthenticated);
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const handleCrmLogout = useCallback(async () => {
    await logoutUser();
    setCrmAuthenticated(false);
    navigate('/');
    triggerToast(lang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully', 'info');
  }, [navigate, lang, triggerToast]);

  const value = {
    crmAuthenticated,
    setCrmAuthenticated,
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
