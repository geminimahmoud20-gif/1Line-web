import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { CURRENCIES } from '../../utils/currency';

export default function CurrencySwitcher({ currentCurrency = 'EGP', onSelectCurrency, lang = 'ar' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isAr = lang === 'ar';

  const selectedCurr = CURRENCIES[currentCurrency] || CURRENCIES.EGP;

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="currency-switcher-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="currency-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        title={isAr ? 'تغيير العملة للمغتربين' : 'Switch Currency'}
      >
        <span className="curr-flag">{selectedCurr.flag}</span>
        <span className="curr-code">{selectedCurr.code}</span>
        <ChevronDown size={13} className={`chevron-arrow ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="currency-dropdown-menu">
          <div className="currency-menu-header">
            <span>{isAr ? 'اختر العملة المفضلة' : 'Select Currency'}</span>
          </div>

          <div className="currency-options-list">
            {Object.values(CURRENCIES).map((curr) => (
              <button
                key={curr.code}
                type="button"
                className={`currency-option-item ${currentCurrency === curr.code ? 'active' : ''}`}
                onClick={() => {
                  onSelectCurrency(curr.code);
                  setIsOpen(false);
                }}
              >
                <div className="curr-option-left">
                  <span className="option-flag">{curr.flag}</span>
                  <div>
                    <strong className="option-code">{curr.code}</strong>
                    <span className="option-name">{isAr ? curr.name_ar : curr.name_en}</span>
                  </div>
                </div>

                {currentCurrency === curr.code && (
                  <Check size={15} className="text-gold" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
