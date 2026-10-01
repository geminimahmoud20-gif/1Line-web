// Supported country prefixes including Egypt (+20) and Saudi Arabia (+966) using phone format regex rules
import { SUPPORTED_COUNTRIES } from '../utils/phoneCountries';

/**
 * Normalizes Eastern Arabic-Indic numerals (٠-٩) and Persian numerals to standard ASCII digits (0-9).
 * Also strips accidental control chars while preserving valid phone chars (+, digits, spaces, hyphens).
 */
const normalizePhoneInput = (val) => {
  if (!val && val !== 0) return '';
  const str = String(val);
  const arabicIndic = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  const persianIndic = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  let res = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const arIdx = arabicIndic.indexOf(ch);
    if (arIdx !== -1) {
      res += arIdx;
      continue;
    }
    const perIdx = persianIndic.indexOf(ch);
    if (perIdx !== -1) {
      res += perIdx;
      continue;
    }
    // Allow digits, plus, hyphens, and spaces
    if (/[\d\s+\-]/.test(ch)) {
      res += ch;
    }
  }
  return res;
};

export const PhoneInputField = ({ 
  value,
  onChange,
  phone, 
  setPhone,
  onChangePhone, 
  country,
  countryCode,
  setCountry, 
  onCountryChange,
  onChangeCountry,
  error, 
  label,
  placeholder,
  required = false,
  disabled = false,
  autoFocus = false,
  id,
  name = 'phone',
  isAr = true
}) => {
  // Support value, phone, and all setter aliases
  const currentVal = value !== undefined ? value : (phone !== undefined ? phone : '');
  const activeCountry = country || countryCode || '+20';

  const handleValChange = (newVal) => {
    const clean = normalizePhoneInput(newVal);
    if (onChange) onChange(clean);
    if (setPhone) setPhone(clean);
    if (onChangePhone) onChangePhone(clean);
  };

  const handleCountryChange = (c) => {
    if (onCountryChange) onCountryChange(c);
    if (setCountry) setCountry(c);
    if (onChangeCountry) onChangeCountry(c);
  };

  const matchedCountry = SUPPORTED_COUNTRIES.find(c => c.code === activeCountry);
  const defaultPlaceholder = matchedCountry?.placeholder || '01XXXXXXXXX';

  return (
    <div className="phone-input-field-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', textAlign: 'right' }}>
      {label && (
        <label 
          htmlFor={id}
          style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-start' }}
        >
          <span>{String(label).replace(/\s*\*+\s*/g, ' ').trim()}</span>
          {required && <span style={{ color: 'var(--rose, #e11d48)' }} aria-hidden="true">*</span>}
        </label>
      )}
      <div 
        className="phone-input-control-box"
        style={{
          display: 'flex',
          alignItems: 'center',
          minHeight: '48px',
          border: error ? '1.5px solid var(--rose, #e11d48)' : '1px solid var(--border-color, rgba(20, 43, 73, 0.18))',
          borderRadius: 'var(--radius-sm, 10px)',
          background: 'var(--surface-card, #ffffff)',
          padding: '2px 12px',
          transition: 'all 0.2s ease',
          direction: 'ltr',
          boxShadow: error ? '0 0 0 2px rgba(225, 29, 72, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Country Flag Select */}
        <select
          value={activeCountry}
          onChange={(e) => handleCountryChange(e.target.value)}
          disabled={disabled}
          aria-label={isAr ? 'كود الدولة' : 'Country dial code'}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '0.92rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '8px 4px',
            color: 'var(--text-primary, #0f172a)',
            fontWeight: '800',
            fontFamily: 'inherit',
            flexShrink: 0
          }}
        >
          {SUPPORTED_COUNTRIES.map(c => (
            <option key={c.code} value={c.code} style={{ background: 'var(--surface-card, #ffffff)', color: 'var(--text-primary, #0f172a)' }}>
              {c.flag} {c.code}
            </option>
          ))}
        </select>
        
        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color, rgba(20, 43, 73, 0.15))', margin: '0 8px', flexShrink: 0 }} />
        
        {/* Phone Input Field */}
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={currentVal}
          onChange={(e) => handleValChange(e.target.value)}
          placeholder={placeholder || defaultPlaceholder}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-label={label ? String(label).replace(/\s*\*+\s*/g, ' ').trim() : (isAr ? 'رقم الهاتف' : 'Phone number')}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            padding: '12px 6px',
            fontSize: '1rem',
            color: 'var(--text-primary, #0f172a)',
            fontWeight: '700',
            fontFamily: 'var(--font-en, "Outfit", system-ui, sans-serif)',
            letterSpacing: '0.5px'
          }}
        />
      </div>
      {error && (
        <span style={{ color: 'var(--rose, #e11d48)', fontSize: '0.78rem', fontWeight: '800', marginTop: '2px', textAlign: 'right' }}>
          {error}
        </span>
      )}
    </div>
  );
};

export default PhoneInputField;
