import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TRANSLATIONS } from '../translations';

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [lang, setLang] = useState('ar');
  const [currency, setCurrency] = useState(() => {
    try {
      localStorage.removeItem('oneline_currency');
    } catch (e) {}
    return 'EGP';
  });

  const handleSetCurrency = useCallback(() => {
    setCurrency('EGP');
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

  const [soundEnabled, setSoundEnabled] = useState(false);

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

  const value = {
    lang,
    setLang,
    t,
    currency,
    setCurrency: handleSetCurrency,
    theme,
    toggleTheme,
    soundEnabled,
    toggleSound
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
