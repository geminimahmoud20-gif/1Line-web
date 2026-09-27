import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Info } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import '../../styles/expat-suite.css';

// 🌟 Pixel-perfect vector flag emblems (avoids Windows regional indicator text bug: EGEGP, SASAR, etc.)
const FLAG_ICONS = {
  EGP: (
    <svg viewBox="0 0 640 480" width="22" height="15" style={{ borderRadius: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0 }}>
      <path fill="#CE1126" d="M0 0h640v160H0z"/>
      <path fill="#FFF" d="M0 160h640v160H0z"/>
      <path fill="#000" d="M0 320h640v160H0z"/>
      <circle cx="320" cy="240" r="28" fill="#C69214"/>
    </svg>
  ),
  SAR: (
    <svg viewBox="0 0 640 480" width="22" height="15" style={{ borderRadius: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0 }}>
      <path fill="#006C35" d="M0 0h640v480H0z"/>
      <path fill="#FFF" d="M190 320h260v12H190zM280 200h80v20h-80z"/>
    </svg>
  ),
  AED: (
    <svg viewBox="0 0 640 480" width="22" height="15" style={{ borderRadius: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0 }}>
      <path fill="#00732F" d="M0 0h640v160H0z"/>
      <path fill="#FFF" d="M0 160h640v160H0z"/>
      <path fill="#000" d="M0 320h640v160H0z"/>
      <path fill="#FF0000" d="M0 0h170v480H0z"/>
    </svg>
  ),
  KWD: (
    <svg viewBox="0 0 640 480" width="22" height="15" style={{ borderRadius: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0 }}>
      <path fill="#007A3D" d="M0 0h640v160H0z"/>
      <path fill="#FFF" d="M0 160h640v160H0z"/>
      <path fill="#CE1126" d="M0 320h640v160H0z"/>
      <path fill="#000" d="M0 0l160 160v160L0 480z"/>
    </svg>
  ),
  QAR: (
    <svg viewBox="0 0 640 480" width="22" height="15" style={{ borderRadius: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0 }}>
      <path fill="#8D1B3D" d="M0 0h640v480H0z"/>
      <path fill="#FFF" d="M0 0h180l50 30-50 30 50 30-50 30 50 30-50 30 50 30-50 30 50 30-50 30 50 30-50 30 50 30-50 30 50 30-50 30H0z"/>
    </svg>
  ),
  USD: (
    <svg viewBox="0 0 640 480" width="22" height="15" style={{ borderRadius: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0 }}>
      <path fill="#B22234" d="M0 0h640v480H0z"/>
      <path fill="#FFF" d="M0 40h640v37H0zm0 74h640v37H0zm0 74h640v37H0zm0 74h640v37H0zm0 74h640v37H0zm0 74h640v37H0z"/>
      <path fill="#3C3B6E" d="M0 0h280v260H0z"/>
      <circle cx="140" cy="130" r="35" fill="#FFF"/>
    </svg>
  )
};

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
        <span className="xs-cur-flag">{FLAG_ICONS[current.code] || current.code}</span>
        <span className="xs-cur-code">{current.code}</span>
        <ChevronDown 
          size={12} 
          style={{ transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(180deg)' : 'none' }} 
          aria-hidden="true" 
        />
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
                  <span className="xs-cur-flag">{FLAG_ICONS[m.code] || m.code}</span>
                  <div className="xs-cur-opt-text">
                    <strong>{m.code}</strong>
                    <small>{isAr ? m.name_ar : m.name_en}</small>
                  </div>
                  {active && <Check size={16} className="xs-cur-check" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="xs-cur-foot">
            <Info size={14} aria-hidden="true" />
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
