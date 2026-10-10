/**
 * 🌐 ONELINE ENTERPRISE VISITOR INTELLIGENCE & TRACKING SUITE 2026
 * Handles Session Tracking, Dwell Time, Property View Counters, and Clickstream Analytics
 */

const STORAGE_KEYS = {
  SESSION: 'oneline_visitor_session',
  EVENTS: 'oneline_visitor_events',
  // v2: the old key holds seeded (invented) starting counts, so it is ignored
  PROPERTY_VIEWS: 'oneline_property_views_v2',
  SESSIONS_HISTORY: 'oneline_sessions_history'
};


/**
 * Initialize or retrieve active visitor session
 */
export function getOrCreateSession() {
  if (typeof window === 'undefined') return null;

  try {
    let session = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.SESSION) || 'null');
    const now = Date.now();

    if (!session || !session.sessionId) {
      session = {
        sessionId: 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + now.toString(36),
        startedAt: new Date().toISOString(),
        startTimeMs: now,
        lastActiveMs: now,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        cityGuess: 'سوهاج، مصر (Sohag, Egypt)',
        identifiedUser: null,
        pagesViewed: [],
        viewedPropertyIds: [],
        eventsCount: 0
      };
      sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));

      // Also append to global sessions history
      const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS_HISTORY) || '[]');
      history.unshift({ ...session, status: 'active' });
      localStorage.setItem(STORAGE_KEYS.SESSIONS_HISTORY, JSON.stringify(history.slice(0, 50)));
    } else {
      session.lastActiveMs = now;
      sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    }

    return session;
  } catch (err) {
    console.warn('Session init fallback:', err);
    return { sessionId: 'local_fallback', startedAt: new Date().toISOString() };
  }
}

/**
 * Track an interaction event (Clickstream)
 */
export function trackEvent(eventType, metadata = {}) {
  if (typeof window === 'undefined') return;
  // Staff activity inside the CRM is not visitor behaviour; recording it skews the analytics.
  if (window.location.pathname.startsWith('/crm')) return;

  try {
    const session = getOrCreateSession();
    const event = {
      id: 'evt_' + Math.random().toString(36).substring(2, 9),
      sessionId: session.sessionId,
      eventType, // 'page_view' | 'property_view' | 'whatsapp_click' | 'calculator_used' | 'filter_applied' | 'favorite_added' | 'compare_added' | 'brochure_request' (older: 'brochure_download')
      timestamp: new Date().toISOString(),
      url: window.location.pathname + window.location.search,
      metadata,
      identifiedUser: session.identifiedUser || null
    };

    // Store in session events
    const events = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    events.unshift(event);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events.slice(0, 300))); // Keep last 300 events

    // Update active session metadata
    if (eventType === 'property_view' && metadata.propertyId) {
      if (!session.viewedPropertyIds.includes(metadata.propertyId)) {
        session.viewedPropertyIds.push(metadata.propertyId);
      }
    }
    session.eventsCount = (session.eventsCount || 0) + 1;
    session.lastActiveMs = Date.now();
    sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));

    // Update history entry
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS_HISTORY) || '[]');
    const currentIdx = history.findIndex(s => s.sessionId === session.sessionId);
    if (currentIdx !== -1) {
      history[currentIdx] = { ...session, lastActiveMs: Date.now() };
      localStorage.setItem(STORAGE_KEYS.SESSIONS_HISTORY, JSON.stringify(history));
    }

    return event;
  } catch (err) {
    console.warn('Track event error:', err);
  }
}

/**
 * Link an anonymous visitor session to an identified user (e.g. on lead submit or whatsapp click)
 */
export function identifyVisitor(userData = {}) {
  if (typeof window === 'undefined') return;

  try {
    const session = getOrCreateSession();
    session.identifiedUser = {
      name: userData.name || session.identifiedUser?.name || 'مشتري مهتم',
      phone: userData.phone || session.identifiedUser?.phone || '',
      type: userData.type || 'buyer',
      cityOrExpat: userData.cityOrExpat || userData.city || 'سوهاج'
    };
    sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));

    // Also update history
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS_HISTORY) || '[]');
    const currentIdx = history.findIndex(s => s.sessionId === session.sessionId);
    if (currentIdx !== -1) {
      history[currentIdx].identifiedUser = session.identifiedUser;
      localStorage.setItem(STORAGE_KEYS.SESSIONS_HISTORY, JSON.stringify(history));
    }

    trackEvent('lead_identified', { user: session.identifiedUser });
  } catch (err) {
    console.warn('Identify visitor error:', err);
  }
}

/**
 * Get real-time views count for a property
 */
export function getPropertyViews(propertyId) {
  if (!propertyId || typeof window === 'undefined') return 0;

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROPERTY_VIEWS) || '{}');
    if (stored[propertyId] !== undefined) {
      return stored[propertyId];
    }
    return 0;
  } catch (err) {
    return 0;
  }
}

/**
 * Increment real-time views count for a property
 */
export function incrementPropertyView(propertyId, propertyData = {}) {
  if (!propertyId || typeof window === 'undefined') return;

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROPERTY_VIEWS) || '{}');
    const current = stored[propertyId] || 0;
    const updated = current + 1;
    stored[propertyId] = updated;
    localStorage.setItem(STORAGE_KEYS.PROPERTY_VIEWS, JSON.stringify(stored));

    // Track as event
    trackEvent('property_view', {
      propertyId,
      title: propertyData.title_ar || propertyData.title || propertyId,
      price: propertyData.price,
      area: propertyData.areaKey || propertyData.area
    });

    return updated;
  } catch (err) {
    console.warn('Increment view error:', err);
  }
}

/**
 * Get Top Viewed Properties with analytics
 */
export function getTopViewedProperties(properties = []) {
  const viewsMap = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROPERTY_VIEWS) || '{}');
  
  return properties.map(p => {
    const views = viewsMap[p.id] || 0;
    return {
      ...p,
      viewCount: views,
      isTrending: views >= 350
    };
  }).sort((a, b) => b.viewCount - a.viewCount);
}

/**
 * Get comprehensive Visitor Intelligence summary for CRM
 */
export function getLiveAnalyticsSummary() {
  if (typeof window === 'undefined') return {};

  try {
    const events = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS_HISTORY) || '[]');
    const viewsMap = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROPERTY_VIEWS) || '{}');

    const totalViews = Object.values(viewsMap).reduce((acc, v) => acc + v, 0);
    const whatsappClicks = events.filter(e => e.eventType === 'whatsapp_click').length;
    const calculatorUses = events.filter(e => e.eventType === 'calculator_used').length;
    const brochureDownloads = events.filter(e => e.eventType === 'brochure_request' || e.eventType === 'brochure_download').length;
    const compareEvents = events.filter(e => e.eventType === 'compare_added').length;

    // Calculate Average Dwell Time
    const durations = sessions.map(s => Math.max(1, Math.round(((s.lastActiveMs || Date.now()) - s.startTimeMs) / 1000)));
    const avgDurationSeconds = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // Real counts only (this browser's own log); no floors that inflate the numbers
    return {
      totalSessionsCount: sessions.length,
      totalPropertyViews: totalViews,
      totalEventsCount: events.length,
      whatsappClicks: whatsappClicks,
      calculatorUses: calculatorUses,
      brochureDownloads: brochureDownloads,
      compareEvents: compareEvents,
      avgDwellTimeFormatted: formatDuration(avgDurationSeconds),
      avgDwellTimeSeconds: avgDurationSeconds,
      recentEvents: events.slice(0, 50),
      recentSessions: sessions.slice(0, 20)
    };
  } catch (err) {
    return {
      totalSessionsCount: 0,
      totalPropertyViews: 0,
      totalEventsCount: 0,
      whatsappClicks: 0,
      calculatorUses: 0,
      brochureDownloads: 0,
      compareEvents: 0,
      avgDwellTimeFormatted: formatDuration(0),
      avgDwellTimeSeconds: 0,
      recentEvents: [],
      recentSessions: []
    };
  }
}

/**
 * Get the current visitor session's live events and calculated dwell time
 */
export function getCurrentSessionJourney() {
  if (typeof window === 'undefined') return { events: [], dwellTimeSeconds: 0, dwellTimeFormatted: '0 ثانية' };

  try {
    const session = getOrCreateSession();
    const events = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    const sessionEvents = events.filter(e => e.sessionId === session.sessionId);
    const startMs = new Date(session.startedAt || Date.now()).getTime();
    const elapsedSeconds = Math.max(15, Math.round((Date.now() - startMs) / 1000));

    return {
      sessionId: session.sessionId,
      events: sessionEvents,
      dwellTimeSeconds: elapsedSeconds,
      dwellTimeFormatted: formatDuration(elapsedSeconds)
    };
  } catch (err) {
    return { events: [], dwellTimeSeconds: 0, dwellTimeFormatted: '0 ثانية' };
  }
}

// Helpers
function formatDuration(seconds) {
  if (!seconds || seconds < 60) return `${seconds || 0} ثانية`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}د ${s}ث`;
}


/**
 * 🎯 UTM & Marketing Attribution Engine
 * Extracts UTM parameters (source, medium, campaign, content, term) + Referrer
 */
const STORAGE_KEY_ATTRIBUTION = 'oneline_lead_attribution';

export function captureMarketingAttribution() {
  if (typeof window === 'undefined') return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source');
    const utmCampaign = urlParams.get('utm_campaign');
    const utmMedium = urlParams.get('utm_medium');
    const utmTerm = urlParams.get('utm_term');
    const utmContent = urlParams.get('utm_content');
    const referrer = document.referrer || '';

    // If new UTM found, record it as current attribution
    if (utmSource || utmCampaign) {
      const attribution = {
        source: utmSource || 'direct',
        medium: utmMedium || 'none',
        campaign: utmCampaign || 'organic',
        term: utmTerm || '',
        content: utmContent || '',
        referrer: referrer ? new URL(referrer).hostname : 'مباشر (Direct)',
        landingPage: window.location.pathname,
        capturedAt: new Date().toISOString()
      };
      sessionStorage.setItem(STORAGE_KEY_ATTRIBUTION, JSON.stringify(attribution));
      return attribution;
    }

    // Fallback: check existing
    const existing = sessionStorage.getItem(STORAGE_KEY_ATTRIBUTION);
    if (existing) return JSON.parse(existing);

    // Initial organic referral guess
    if (referrer) {
      let sourceName = 'موقع خارجي';
      try {
        const hostname = new URL(referrer).hostname;
        if (hostname.includes('facebook') || hostname.includes('fb.')) sourceName = 'Facebook';
        else if (hostname.includes('instagram')) sourceName = 'Instagram';
        else if (hostname.includes('google')) sourceName = 'Google Search';
        else if (hostname.includes('tiktok')) sourceName = 'TikTok';
        else if (hostname.includes('linkedin')) sourceName = 'LinkedIn';
        else sourceName = hostname;
      } catch { /* storage unavailable — non-fatal */ }

      const organicAttribution = {
        source: sourceName,
        medium: 'referral',
        campaign: 'organic_referral',
        referrer: referrer,
        landingPage: window.location.pathname,
        capturedAt: new Date().toISOString()
      };
      sessionStorage.setItem(STORAGE_KEY_ATTRIBUTION, JSON.stringify(organicAttribution));
      return organicAttribution;
    }

    return {
      source: 'مباشر (Direct / Organic)',
      medium: 'none',
      campaign: 'direct_visit',
      landingPage: window.location.pathname,
      capturedAt: new Date().toISOString()
    };
  } catch (err) {
    return { source: 'مباشر', medium: 'none', campaign: 'direct' };
  }
}

export function getAttributionData() {
  if (typeof window === 'undefined') return { source: 'direct', campaign: 'none' };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_ATTRIBUTION);
    return raw ? JSON.parse(raw) : captureMarketingAttribution();
  } catch (e) {
    return { source: 'direct', campaign: 'none' };
  }
}

// Auto-run attribution capture on load
if (typeof window !== 'undefined') {
  try {
    captureMarketingAttribution();
  } catch { /* storage unavailable — non-fatal */ }
}
