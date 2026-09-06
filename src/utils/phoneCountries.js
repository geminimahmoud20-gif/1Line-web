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
