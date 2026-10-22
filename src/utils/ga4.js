/**
 * 📊 ONELINE GA4 ANALYTICS ENGINE (Google Analytics 4)
 * 
 * Safety & Privacy Guarantees:
 * 1. Egyptian Data Protection Law No. 151/2020: Only activates after explicit user consent (oneline_consent_v1 === 'accepted').
 * 2. Private Path Isolation: Strictly disabled on /crm, /my-account, and internal workflows.
 * 3. Zero PII Guarantee: Never transmits phone numbers, names, email addresses, or message texts to Google.
 * 4. Deduplication: Prevents double counting of SPA route changes and lead conversion events.
 * 5. Safe Configuration: Disabled by default if VITE_GA4_MEASUREMENT_ID is missing or invalid.
 */

const CONSENT_KEY = 'oneline_consent_v1';
const RAW_MEASUREMENT_ID = (import.meta.env?.VITE_GA4_MEASUREMENT_ID || '').trim();
const MEASUREMENT_ID_REGEX = /^G-[A-Z0-9]+$/i;

export const hasAnalyticsConsent = () => {
  try {
    return typeof window !== 'undefined' && localStorage.getItem(CONSENT_KEY) === 'accepted';
  } catch {
    return false;
  }
};

export const GA4_ID = MEASUREMENT_ID_REGEX.test(RAW_MEASUREMENT_ID) ? RAW_MEASUREMENT_ID : null;

let isInitialized = false;
let lastPageView = { path: '', time: 0 };
const submittedLeadIds = new Set();

const isBrowser = typeof window !== 'undefined';
const isPrivatePath = () => isBrowser && (window.location.pathname.startsWith('/crm') || window.location.pathname.startsWith('/my-account'));

/**
 * Check if GA4 is configured and allowed to run
 */
export function isGa4Active() {
  return Boolean(isBrowser && GA4_ID && hasAnalyticsConsent() && !isPrivatePath());
}

/**
 * Initialize Google Analytics 4 (gtag.js)
 */
export function initGa4() {
  if (!isBrowser || !GA4_ID) return false;
  if (!hasAnalyticsConsent() || isPrivatePath()) return false;
  if (isInitialized) return true;

  try {
    // 1. Inject gtag script if not already present
    const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA4_ID}"]`);
    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
      document.head.appendChild(script);
    }

    // 2. Initialize dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };
    }

    // 3. Configure GA4 with disabled automatic page views (we manage SPA views manually)
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID, {
      send_page_view: false,
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure'
    });

    isInitialized = true;
    return true;
  } catch (err) {
    console.warn('GA4 init error:', err);
    return false;
  }
}

/**
 * Track SPA Page View with deduplication
 * @param {string} pathname - Route path (e.g. /properties)
 * @param {string} [title] - Optional document title
 */
export function trackGa4PageView(pathname, title) {
  if (!isGa4Active()) {
    // If not initialized yet but consent is present, try initializing
    if (GA4_ID && hasAnalyticsConsent() && !isPrivatePath() && !isInitialized) {
      initGa4();
    } else {
      return;
    }
  }

  const cleanPath = (pathname || window.location.pathname).split('?')[0].split('#')[0];
  const now = Date.now();

  // Deduplicate rapid identical page views (e.g. React strict mode or duplicate effects)
  if (lastPageView.path === cleanPath && now - lastPageView.time < 800) {
    return;
  }
  lastPageView = { path: cleanPath, time: now };

  try {
    window.gtag('event', 'page_view', {
      page_title: title || document.title,
      page_location: `${window.location.origin}${cleanPath}`,
      page_path: cleanPath
    });
  } catch {
    // Fail silently
  }
}

/**
 * Track contact button clicks (WhatsApp / Phone) without PII
 * @param {Object} params
 * @param {'whatsapp'|'phone'} params.channel
 * @param {string} [params.placement]
 */
export function trackGa4ContactClick({ channel, placement = 'general' }) {
  if (!isGa4Active()) return;
  try {
    window.gtag('event', 'contact_click', {
      contact_channel: channel === 'phone' ? 'phone' : 'whatsapp',
      contact_placement: String(placement || 'general').slice(0, 40)
    });
  } catch {
    // Fail silently
  }
}

/**
 * Track form interactions (form start) without PII
 * @param {Object} params
 * @param {string} params.form - Form identifier (e.g. 'sell', 'buy', 'trade_in')
 */
export function trackGa4FormStart({ form = 'general' }) {
  if (!isGa4Active()) return;
  try {
    window.gtag('event', 'form_start', {
      form_name: String(form || 'general').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40)
    });
  } catch {
    // Fail silently
  }
}

/**
 * Track lead submission / conversions with deduplication by leadId
 * @param {Object} params
 * @param {string} params.form - Form identifier
 * @param {string} [params.leadId] - Unique lead identifier for deduplication
 */
export function trackGa4LeadSubmitted({ form = 'website', leadId }) {
  if (!isGa4Active()) return;

  // Deduplication: Never count the same lead twice
  if (leadId) {
    const idKey = String(leadId);
    if (submittedLeadIds.has(idKey)) return;
    submittedLeadIds.add(idKey);
  }

  try {
    window.gtag('event', 'generate_lead', {
      form_name: String(form || 'website').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40),
      currency: 'EGP',
      value: 1
    });
  } catch {
    // Fail silently
  }
}

// Listen for storage changes to handle consent changes across tabs/components
if (isBrowser) {
  window.addEventListener('storage', (e) => {
    if (e.key === CONSENT_KEY && e.newValue === 'accepted') {
      initGa4();
    }
  });
}
