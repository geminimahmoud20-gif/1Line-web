import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  SUPPORTED_CURRENCIES,
  CURRENCY_META,
  getFxState,
  subscribeFx,
  initFxRates,
  convertFromEgp,
  formatApprox,
  egpPerUnit,
  isCurrencyAvailable
} from '../utils/fxRates';

/**
 * Display currency for expat visitors. Prices stay in EGP everywhere (the contract currency);
 * the chosen currency only adds an "≈" line with the rate date next to EGP figures.
 */
const CurrencyContext = createContext(null);
const STORAGE_KEY = 'oneline_display_currency';

const readStored = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_CURRENCIES.includes(v) ? v : 'EGP';
  } catch {
    return 'EGP';
  }
};

export function CurrencyProvider({ children }) {
  const [selected, setSelected] = useState(readStored);
  const [fx, setFx] = useState(getFxState);

  useEffect(() => {
    // Subscribe first so the cached/live rates loaded by init reach state through the listener
    const unsub = subscribeFx(setFx);
    const stop = initFxRates();
    return () => { unsub(); stop(); };
  }, []);

  const setCurrency = useCallback((code) => {
    const next = SUPPORTED_CURRENCIES.includes(code) ? code : 'EGP';
    setSelected(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage blocked */ }
  }, []);

  // Fall back to EGP while no rate is known for the chosen currency
  const currency = selected !== 'EGP' && fx.ready && isCurrencyAvailable(selected) ? selected : 'EGP';

  const value = useMemo(() => ({
    currency,
    selectedCurrency: selected,
    setCurrency,
    fx,
    meta: CURRENCY_META,
    supported: SUPPORTED_CURRENCIES,
    convert: (amountEgp, code = currency) => convertFromEgp(amountEgp, code),
    approx: (amountEgp, lang = 'ar', code = currency) => formatApprox(amountEgp, code, lang),
    rateFor: (code = currency) => egpPerUnit(code)
  }), [currency, selected, setCurrency, fx]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
