import { phoneProblem } from './contactValidation.js';

// Each country's `regex.test(local)` checks the number the visitor typed after picking the
// country: the right shape for that country AND not a placeholder (01000000000, 0501234567…).
// The forms call it as before; the rule lives in utils/contactValidation.js.
const mobileOf = (code) => ({ test: (local) => phoneProblem(String(local ?? ''), code) === '' });

export const SUPPORTED_COUNTRIES = [
  { 
    code: '+20', 
    name: 'Egypt', 
    flag: '🇪🇬', 
    regex: mobileOf('+20'), 
    placeholder: '010 1234 5678' 
  },
  { 
    code: '+966', 
    name: 'Saudi Arabia', 
    flag: '🇸🇦', 
    regex: mobileOf('+966'), 
    placeholder: '050 123 4567' 
  },
  { 
    code: '+971', 
    name: 'UAE', 
    flag: '🇦🇪', 
    regex: mobileOf('+971'), 
    placeholder: '050 123 4567' 
  },
  { 
    code: '+965', 
    name: 'Kuwait', 
    flag: '🇰🇼', 
    regex: mobileOf('+965'), 
    placeholder: '5123 4567' 
  },
  { 
    code: '+974', 
    name: 'Qatar', 
    flag: '🇶🇦', 
    regex: mobileOf('+974'), 
    placeholder: '3123 4567' 
  },
  { 
    code: '+968', 
    name: 'Oman', 
    flag: '🇴🇲', 
    regex: mobileOf('+968'), 
    placeholder: '9123 4567' 
  },
  { 
    code: '+973', 
    name: 'Bahrain', 
    flag: '🇧🇭', 
    regex: mobileOf('+973'), 
    placeholder: '3123 4567' 
  }
];
