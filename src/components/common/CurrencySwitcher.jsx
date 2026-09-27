import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Info } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import '../../styles/expat-suite.css';

const fmtDate = (iso, isAr) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

const fmtRate = (v) => (v >= 100 ? Math.round(v).toLocaleString('en-US') : (Math.round(v * 100) / 100).toLocaleString('en-US'));

/**
 * Display-currency picker for expat visitors. EGP stays the contract currency; the chosen
 * currency adds "≈" equivalents across listings, with the rate and its date shown here.
 */
export default function CurrencySwitcher({ lang = 'ar', compact = false }) {
  const { currency, selectedCurrency, setCurrency, fx, meta, supported, rateFor } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const isAr = lang === 'ar';
  const current = meta[currency] || meta.EGP;

  useEffect(() => {
    if (!isOpen) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const waiting = selectedCurrency !== 'EGP' && currency === 'EGP';
  const rate = currency !== 'EGP' ? rateFor(currency) : null;

  return (
    <div className={`xs-cur ${compact ? 'xs-cur--compact' : ''}`} ref={ref}>
      <button
        type="button"
        className={`xs-cur-trigger ${currency !== 'EGP' ? 'is-foreign' : ''}`}
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={isAr ? 'عرض الأسعار بعملة بلد إقامتك (استرشادي)' : 'Show prices in your currency (indicative)'}
      >
        <span className="xs-cur-flag" aria-hidden="true">{current.flag}</span>
        <span className="xs-cur-code">{current.code}</span>
        <ChevronDown size={12} className={isOpen ? 'is-rot' : ''} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="xs-cur-menu" role="listbox" aria-label={isAr ? 'عملة العرض' : 'Display currency'}>
          <div className="xs-cur-head">
            <strong>{isAr ? 'عملة العرض' : 'Display currency'}</strong>
            <span>{isAr ? 'التعاقد دائماً بالجنيه المصري' : 'Contracts are always in EGP'}</span>
          </div>
          <div className="xs-cur-list">
            {supported.map((code) => {
              const m = meta[code];
              const unavailable = code !== 'EGP' && !(fx.perUsd && fx.perUsd[code] > 0);
              const active = selectedCurrency === code;
              return (
                <button
                  key={code}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={unavailable}
                  className={`xs-cur-opt ${active ? 'is-active' : ''}`}
                  onClick={() => { setCurrency(code); setIsOpen(false); }}
                >
                  <span className="xs-cur-flag" aria-hidden="true">{m.flag}</span>
                  <span className="xs-cur-opt-text">
                    <strong>{m.code}</strong>
                    <small>{isAr ? m.name_ar : m.name_en}</small>
                  </span>
                  {active && <Check size={15} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <div className="xs-cur-foot">
            <Info size={13} aria-hidden="true" />
            {fx.ready ? (
              <span>
                {rate ? (
                  <>
                    <bdi>1 {isAr ? current.symbol_ar : current.code} ≈ {fmtRate(rate)} {isAr ? 'ج.م' : 'EGP'}</bdi>
                    {' · '}
                  </>
                ) : null}
                {isAr ? 'سعر استرشادي' : 'Indicative rate'}
                {fx.updatedAt ? ` · ${isAr ? 'تحديث' : 'updated'} ${fmtDate(fx.updatedAt, isAr)}` : ''}
                {fx.source === 'manual' ? (isAr ? ' · يحدده فريق 1Line' : ' · set by 1Line') : ''}
              </span>
            ) : (
              <span>{isAr ? 'جاري تحميل أسعار الصرف… الأسعار معروضة بالجنيه مؤقتاً.' : 'Loading exchange rates… showing EGP for now.'}</span>
            )}
          </div>
          {waiting && fx.ready && (
            <div className="xs-cur-warn">{isAr ? 'لا يتوفر سعر لهذه العملة الآن.' : 'No rate available for this currency right now.'}</div>
          )}
        </div>
      )}
    </div>
  );
}
