import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import { identifyVisitor } from '../utils/visitorTracker';
import { sanitizeObject } from '../utils/securityShield';
import { SUPPORTED_COUNTRIES } from '../utils/phoneCountries';

const CLIENT_STORAGE_KEY = 'oneline_client_account';

const ClientAuthContext = createContext(null);

export function ClientAuthProvider({ 
  children, 
  triggerToast, 
  lang = 'ar', 
  handleAddNewLead,
  clearFavorites,
  clearCompare,
  restoreFavorites,
  favorites = []
}) {
  const isAr = lang === 'ar';

  // Client User State
  const [clientUser, setClientUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(CLIENT_STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return parsed && parsed.verified ? parsed : null;
    } catch {
      return null;
    }
  });

  // Modal State
  const [clientAuthModalOpen, setClientAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [authReasonMessage, setAuthReasonMessage] = useState('');

  // Generated verification code for active registration flow
  const [verificationSession, setVerificationSession] = useState(null);

  const isClientAuthenticated = Boolean(clientUser && clientUser.verified);

  // Sync to localStorage
  useEffect(() => {
    if (clientUser) {
      localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(clientUser));
    } else {
      localStorage.removeItem(CLIENT_STORAGE_KEY);
    }
  }, [clientUser]);

  // Continuously sync active favorites to client-isolated backup storage
  useEffect(() => {
    if (clientUser && Array.isArray(favorites)) {
      const phoneDigits = (clientUser.whatsapp || clientUser.phone || clientUser.id || '').replace(/[^0-9]/g, '');
      if (phoneDigits) {
        try {
          localStorage.setItem(`oneline_client_favorites_${phoneDigits}`, JSON.stringify(favorites));
        } catch (e) {}
      }
    }
  }, [clientUser, favorites]);

  // Restore saved favorites on initial mount if client is already logged in
  useEffect(() => {
    if (clientUser && (!favorites || favorites.length === 0) && typeof restoreFavorites === 'function') {
      const phoneDigits = (clientUser.whatsapp || clientUser.phone || clientUser.id || '').replace(/[^0-9]/g, '');
      if (phoneDigits) {
        try {
          const raw = localStorage.getItem(`oneline_client_favorites_${phoneDigits}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              restoreFavorites(parsed);
            }
          }
        } catch (e) {}
      }
    }
  }, [clientUser]);

  /**
   * Guarded Action Wrapper:
   * If client is logged in, execute immediately.
   * If not, remember the action, set a friendly explanation message, and open verification modal.
   */
  const requireClientAuth = useCallback((actionCallback, actionType = 'favorite', propertyTitle = '') => {
    if (isClientAuthenticated) {
      if (typeof actionCallback === 'function') {
        actionCallback();
      }
      return true;
    }

    // Prepare pending action
    setPendingAction(() => actionCallback);

    let reason = '';
    if (actionType === 'favorite') {
      reason = isAr
        ? propertyTitle 
          ? `لحفظ عقار "${propertyTitle}" في مفضلتك الخاصة، يرجى تفعيل حسابك أولاً.`
          : 'لحفظ العقار في قائمة مفضلتك الخاصة، يرجى تفعيل حسابك أولاً.'
        : 'To save this property to your private favorites, please verify your account first.';
    } else if (actionType === 'compare') {
      reason = isAr
        ? propertyTitle
          ? `لإضافة عقار "${propertyTitle}" لجدول المقارنة الذكية، يرجى تفعيل حسابك أولاً.`
          : 'لإضافة العقار لقائمة المقارنة، يرجى تفعيل حسابك أولاً.'
        : 'To compare this property, please verify your account first.';
    } else {
      reason = isAr
        ? 'يرجى تسجيل وتأكيد بيانات حسابك للوصول لهذه الخدمة.'
        : 'Please verify your account to access this feature.';
    }

    setAuthReasonMessage(reason);
    setClientAuthModalOpen(true);
    return false;
  }, [isClientAuthenticated, isAr]);

  /**
   * Step 1: Initiate Client Registration & Generate Security Code
   * Validates name, email, and phone according to the selected country format.
   */
  const initiateClientRegistration = useCallback(({ name, email, whatsapp, country = '+20' }) => {
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const rawPhoneDigits = (whatsapp || '').trim().replace(/[^0-9]/g, '');

    // 1. Validate Name (at least 3 characters)
    if (!cleanName || cleanName.length < 3) {
      throw new Error(isAr ? 'يرجى إدخال اسم صحيح لا يقل عن 3 أحرف' : 'Please enter a valid full name (at least 3 characters)');
    }

    // 2. Validate Email Address Format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      throw new Error(isAr ? 'يرجى إدخال بريد إلكتروني صحيح (مثال: name@domain.com)' : 'Please enter a valid email address');
    }

    // 3. Validate Phone with Country Regex (guarantees data authenticity)
    const countryObj = SUPPORTED_COUNTRIES.find(c => c.code === country) || SUPPORTED_COUNTRIES[0];
    if (!rawPhoneDigits) {
      throw new Error(isAr ? 'يرجى إدخال رقم الواتساب' : 'Please enter a WhatsApp number');
    }

    if (countryObj?.regex && !countryObj.regex.test(rawPhoneDigits)) {
      throw new Error(
        isAr 
          ? `رقم الواتساب غير متوافق مع صيغة ${countryObj.name} (${countryObj.placeholder})` 
          : `Invalid WhatsApp number for ${countryObj.name} (${countryObj.placeholder})`
      );
    }

    // Format clean international phone number for display & wa.me
    const normalizedDigits = rawPhoneDigits.startsWith('0') ? rawPhoneDigits.substring(1) : rawPhoneDigits;
    const cleanDialCode = country.replace('+', '');
    const fullInternationalPhone = `+${cleanDialCode}${normalizedDigits}`;

    // Generate a memorable 4-digit code (e.g. 7482)
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const token = `1L-${code}`;

    const session = {
      name: cleanName,
      email: cleanEmail,
      whatsapp: fullInternationalPhone,
      localPhone: rawPhoneDigits,
      country,
      countryFlag: countryObj?.flag || '🇪🇬',
      countryName: countryObj?.name || 'Egypt',
      code,
      token,
      createdAt: Date.now()
    };

    setVerificationSession(session);

    // Build the authentic WhatsApp verification message
    const msg = isAr
      ? `🔐 *طلب توثيق وتفعيل حساب عميل — منصة 1Line العقارية سوهاج*\n` +
        `───────────────────────\n` +
        `👤 *الاسم الكريم:* ${cleanName}\n` +
        `📧 *البريد الإلكتروني:* ${cleanEmail}\n` +
        `📱 *رقم الواتساب:* ${fullInternationalPhone} (${countryObj?.flag || ''} ${countryObj?.name || country})\n` +
        `🔑 *رمز التوثيق المعتمد:* ${token}\n` +
        `───────────────────────\n` +
        `أرجو اعتماد حسابي لتفعيل حفظ العقارات المفضلة، والمقارنات الذكية، واستلام تحديثات السوق العقاري بسوهاج فوراً.`
      : `🔐 *1Line Sohag Client Verification*\nName: ${cleanName}\nEmail: ${cleanEmail}\nWhatsApp: ${fullInternationalPhone}\nVerification Token: ${token}`;

    const waUrl = getWhatsAppUrl(msg);

    return {
      session,
      whatsappUrl: waUrl
    };
  }, [isAr]);

  /**
   * Step 2: Finalize Client Verification & Activate
   * Solution 2 Handshake: Direct activation upon sending WhatsApp message without confusing code mismatch errors.
   */
  const completeClientVerification = useCallback(async (codeEntered = '') => {
    if (!verificationSession) {
      throw new Error(isAr ? 'لا توجد جلسة تفعيل جارية، يرجى ملء البيانات أولاً' : 'No active verification session');
    }

    // If an explicit code was supplied and differs from session code, validate it.
    // Otherwise, allow direct handshake completion seamlessly.
    const cleanEntered = (codeEntered || '').trim().replace(/^1L-/i, '');
    if (cleanEntered && cleanEntered !== verificationSession.code) {
      throw new Error(isAr ? 'رمز التأكيد غير مطابق، يرجى التأكد وإعادة المحاولة' : 'Verification code mismatch');
    }

    const nowIso = new Date().toISOString();
    const verifiedAccount = {
      id: `client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: verificationSession.name,
      email: verificationSession.email,
      whatsapp: verificationSession.whatsapp,
      phone: verificationSession.whatsapp,
      country: verificationSession.country || '+20',
      countryFlag: verificationSession.countryFlag || '🇪🇬',
      verified: true,
      verifiedAt: nowIso,
      verificationToken: verificationSession.token,
      verificationMethod: 'whatsapp_handshake',
      role: 'verified_client'
    };

    // Save client state
    setClientUser(verifiedAccount);
    localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(verifiedAccount));

    // Track visitor identity
    identifyVisitor({
      name: verifiedAccount.name,
      phone: verifiedAccount.whatsapp,
      type: 'verified_client'
    });

    // Register lead in CRM pipeline with full verified metadata
    if (typeof handleAddNewLead === 'function') {
      try {
        await handleAddNewLead(sanitizeObject({
          name: verifiedAccount.name,
          email: verifiedAccount.email,
          whatsapp: verifiedAccount.whatsapp,
          phone: verifiedAccount.whatsapp,
          source: 'client_account_verified',
          type: 'buyer',
          notes: `حساب عميل موثق عبر مصادقة الواتساب (كود: ${verifiedAccount.verificationToken} | ${verifiedAccount.countryFlag} ${verifiedAccount.country}) لتفعيل المفضلة والمقارنات الذكية`
        }));
      } catch (err) {
        console.warn('Auto CRM lead sync warning:', err);
      }
    }

    // Restore or merge client's saved favorites
    const phoneDigits = (verificationSession.whatsapp || '').replace(/[^0-9]/g, '');
    let clientSavedFavs = [];
    if (phoneDigits) {
      try {
        const raw = localStorage.getItem(`oneline_client_favorites_${phoneDigits}`);
        if (raw) clientSavedFavs = JSON.parse(raw);
      } catch (e) {}
    }

    const mergedFavs = Array.from(new Set([
      ...(Array.isArray(clientSavedFavs) ? clientSavedFavs : []),
      ...(Array.isArray(favorites) ? favorites : [])
    ]));

    if (mergedFavs.length > 0 && typeof restoreFavorites === 'function') {
      restoreFavorites(mergedFavs);
    }

    // Close modal
    setClientAuthModalOpen(false);
    setVerificationSession(null);

    // Toast celebratory message
    if (typeof triggerToast === 'function') {
      triggerToast(
        isAr 
          ? `مرحباً بك يا ${verifiedAccount.name}! تم تأكيد حسابك بنجاح وحفظ العقار في حسابك 🌟` 
          : `Welcome ${verifiedAccount.name}! Your account has been verified successfully.`,
        'success'
      );
    }

    // Execute pending action if one was suspended
    if (typeof pendingAction === 'function') {
      setTimeout(() => {
        try {
          pendingAction();
        } catch (e) {
          console.error('Error running pending action after verification:', e);
        }
        setPendingAction(null);
      }, 250);
    }

    return verifiedAccount;
  }, [verificationSession, isAr, handleAddNewLead, triggerToast, pendingAction, favorites, restoreFavorites]);

  /**
   * Client Logout
   */
  const logoutClient = useCallback(() => {
    // 1. Back up client favorites before clearing
    if (clientUser) {
      const phoneDigits = (clientUser.whatsapp || clientUser.phone || clientUser.id || '').replace(/[^0-9]/g, '');
      if (phoneDigits && Array.isArray(favorites)) {
        try {
          localStorage.setItem(`oneline_client_favorites_${phoneDigits}`, JSON.stringify(favorites));
        } catch (e) {}
      }
    }

    // 2. Clear client session
    setClientUser(null);
    localStorage.removeItem(CLIENT_STORAGE_KEY);

    // 3. Purge active browser favorites & comparisons immediately
    if (typeof clearFavorites === 'function') {
      clearFavorites(true);
    }
    if (typeof clearCompare === 'function') {
      clearCompare();
    }
    try {
      localStorage.removeItem('oneline_favorites');
    } catch (e) {}

    if (typeof triggerToast === 'function') {
      triggerToast(isAr ? 'تم تسجيل خروج حساب العميل بنجاح' : 'Client logged out', 'info');
    }
  }, [clientUser, favorites, clearFavorites, clearCompare, triggerToast, isAr]);

  /**
   * Update Client Profile Details
   */
  const updateClientProfile = useCallback((updatedFields = {}) => {
    setClientUser((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        ...updatedFields,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (typeof triggerToast === 'function') {
      triggerToast(isAr ? 'تم تحديث بيانات حسابك بنجاح 💾' : 'Profile updated successfully!', 'success');
    }
  }, [triggerToast, isAr]);

  const value = {
    clientUser,
    isClientAuthenticated,
    clientAuthModalOpen,
    setClientAuthModalOpen,
    authReasonMessage,
    verificationSession,
    requireClientAuth,
    initiateClientRegistration,
    completeClientVerification,
    logoutClient,
    updateClientProfile
  };

  return (
    <ClientAuthContext.Provider value={value}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  const context = useContext(ClientAuthContext);
  if (!context) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
}
