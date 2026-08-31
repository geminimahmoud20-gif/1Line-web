import React from 'react';

export const SUPPORTED_COUNTRIES = [
  { 
    code: '+20', 
    name: 'Egypt', 
    flag: '🇪🇬', 
    regex: /^(01|1)[0125][0-9]{8}$/, 
    placeholder: '01XXXXXXXXX أو 1XXXXXXXXX' 
  },
  { 
    code: '+966', 
    name: 'Saudi Arabia', 
    flag: '🇸🇦', 
    regex: /^(05|5)[0-9]{8}$/, 
    placeholder: '05XXXXXXXX أو 5XXXXXXXX' 
  },
  { 
    code: '+971', 
    name: 'UAE', 
    flag: '🇦🇪', 
    regex: /^(05|5)[0-9]{8}$/, 
    placeholder: '05XXXXXXXX أو 5XXXXXXXX' 
  },
  { 
    code: '+965', 
    name: 'Kuwait', 
    flag: '🇰🇼', 
    regex: /^[569][0-9]{7}$/, 
    placeholder: 'XXXXXXXX' 
  },
  { 
    code: '+974', 
    name: 'Qatar', 
    flag: '🇶🇦', 
    regex: /^[3567][0-9]{7}$/, 
    placeholder: 'XXXXXXXX' 
  },
  { 
    code: '+968', 
    name: 'Oman', 
    flag: '🇴🇲', 
    regex: /^[79][0-9]{7}$/, 
    placeholder: 'XXXXXXXX' 
  }
];

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', textAlign: 'right' }}>
      {label && (
        <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          {label} {required && <span style={{ color: 'var(--rose)' }}>*</span>}
        </label>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        border: error ? '1.5px solid var(--rose)' : '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        background: '#ffffff',
        padding: '2px 10px',
        transition: 'all 0.2s ease',
        direction: 'ltr'
      }}>
        {/* Country Flag Select */}
        <select
          value={country}
          onChange={(e) => handleCountryChange(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '0.95rem',
            cursor: 'pointer',
            padding: '8px 4px',
            color: 'var(--text-primary)',
            fontWeight: '800',
            fontFamily: 'inherit'
          }}
        >
          {SUPPORTED_COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code}
            </option>
          ))}
        </select>
        
        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'var(--border-light)', margin: '0 8px' }}></div>
        
        {/* Phone Input Field */}
        <input
          type="tel"
          value={currentVal}
          onChange={(e) => handleValChange(e.target.value)}
          placeholder={SUPPORTED_COUNTRIES.find(c => c.code === country)?.placeholder || '01XXXXXXXXX'}
          required={required}
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
        <span style={{ color: 'var(--rose)', fontSize: '0.78rem', fontWeight: '800', marginTop: '2px' }}>
          {error}
        </span>
      )}
    </div>
  );
};

export default PhoneInputField;
