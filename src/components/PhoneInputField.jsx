// Supported country prefixes including Egypt (+20) and Saudi Arabia (+966) using phone format regex rules
import { SUPPORTED_COUNTRIES } from '../utils/phoneCountries';

export const PhoneInputField = ({ 
  value,
  onChange,
  phone, 
  setPhone, 
  country = '+20', 
  setCountry, 
  onCountryChange,
  error, 
  label,
  required = false
}) => {
  // Support both (value, onChange) and legacy (phone, setPhone)
  const currentVal = value !== undefined ? value : (phone || '');
  const handleValChange = (val) => {
    if (onChange) onChange(val);
    if (setPhone) setPhone(val);
  };

  const handleCountryChange = (c) => {
    if (onCountryChange) onCountryChange(c);
    if (setCountry) setCountry(c);
  };

  return (
    <div className="phone-input-field-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', textAlign: 'right' }}>
      {label && (
        <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          {String(label).replace(/\s*\*+\s*/g, ' ').trim()} {required && <span style={{ color: 'var(--rose)' }} aria-hidden="true">*</span>}
        </label>
      )}
      <div 
        className="phone-input-control-box"
        style={{
          display: 'flex',
          alignItems: 'center',
          border: error ? '1.5px solid var(--rose, #e11d48)' : '1px solid var(--border-color, rgba(20, 43, 73, 0.15))',
          borderRadius: 'var(--radius-sm, 8px)',
          background: 'var(--surface-card, #ffffff)',
          padding: '2px 10px',
          transition: 'all 0.2s ease',
          direction: 'ltr',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Country Flag Select */}
        <select
          value={country}
          onChange={(e) => handleCountryChange(e.target.value)}
          aria-label="كود الدولة"
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '0.92rem',
            cursor: 'pointer',
            padding: '8px 4px',
            color: 'var(--text-primary)',
            fontWeight: '800',
            fontFamily: 'inherit'
          }}
        >
          {SUPPORTED_COUNTRIES.map(c => (
            <option key={c.code} value={c.code} style={{ background: 'var(--surface-card, #ffffff)', color: 'var(--text-primary)' }}>
              {c.flag} {c.code}
            </option>
          ))}
        </select>
        
        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color, rgba(20, 43, 73, 0.12))', margin: '0 8px' }}></div>
        
        {/* Phone Input Field */}
        <input
          type="tel"
          value={currentVal}
          onChange={(e) => handleValChange(e.target.value)}
          placeholder={SUPPORTED_COUNTRIES.find(c => c.code === country)?.placeholder || '01XXXXXXXXX'}
          required={required}
          aria-label={label ? String(label).replace(/\s*\*+\s*/g, ' ').trim() : 'رقم الهاتف'}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            padding: '10px 4px',
            fontSize: '0.95rem',
            color: 'var(--text-primary)',
            fontWeight: '700',
            fontFamily: 'var(--font-en)'
          }}
        />
      </div>
      {error && (
        <span style={{ color: 'var(--rose, #e11d48)', fontSize: '0.78rem', fontWeight: '800', marginTop: '2px' }}>
          {error}
        </span>
      )}
    </div>
  );
};

export default PhoneInputField;
