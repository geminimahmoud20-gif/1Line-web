import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import { identifyVisitor } from '../utils/visitorTracker';
import { sanitizeObject } from '../utils/securityShield';

const CLIENT_STORAGE_KEY = 'oneline_client_account';

const ClientAuthContext = createContext(null);

export function ClientAuthProvider({ children, triggerToast, lang = 'ar', handleAddNewLead }) {
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
   */
  const initiateClientRegistration = useCallback(({ name, email, whatsapp }) => {
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (whatsapp || '').trim().replace(/[^0-9+]/g, '');

    if (!cleanName || cleanName.length < 3) {
      throw new Error(isAr ? 'يرجى إدخال اسم صحيح لا يقل عن 3 أحرف' : 'Please enter a valid full name');
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error(isAr ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email address');
    }

    if (!cleanPhone || cleanPhone.length < 9) {
      throw new Error(isAr ? 'يرجى إدخال رقم واتساب صحيح' : 'Please enter a valid WhatsApp number');
    }

    // Generate a memorable 4-digit code (e.g. 7482)
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const token = `1L-${code}`;

    const session = {
      name: cleanName,
      email: cleanEmail,
      whatsapp: cleanPhone,
      code,
      token,
      createdAt: Date.now()
    };

    setVerificationSession(session);

    // Build the authentic WhatsApp verification message
    const msg = isAr
      ? `🔐 *تأكيد وتفعيل حساب عميل على منصة 1Line العقارية — سوهاج*\n` +
        `----------------------------------------\n` +
        `👤 *الاسم الكريم:* ${cleanName}\n` +
        `📧 *البريد الإلكتروني:* ${cleanEmail}\n` +
        `📱 *رقم الواتساب:* ${cleanPhone}\n` +
        `🔑 *كود التأكيد:* ${token}\n` +
        `----------------------------------------\n` +
        `أرجو تفعيل حسابي لحفظ العقارات المفضلة ومقارنتها واستلام إشعارات التحديثات العقارية بسوهاج.`
      : `🔐 *1Line Sohag Client Verification*\nName: ${cleanName}\nEmail: ${cleanEmail}\nWhatsApp: ${cleanPhone}\nCode: ${token}`;

    const waUrl = getWhatsAppUrl(msg);

    return {
      session,
      whatsappUrl: waUrl
    };
  }, [isAr]);

  /**
   * Step 2: Finalize Client Verification & Activate
   */
  const completeClientVerification = useCallback(async (codeEntered = '') => {
    if (!verificationSession) {
      throw new Error(isAr ? 'لا توجد جلسة تفعيل جارية، يرجى ملء البيانات' : 'No active verification session');
    }

    // If code is provided, verify it matches
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
      verified: true,
      verifiedAt: nowIso,
      verificationToken: verificationSession.token,
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

    // Register lead in CRM pipeline
    if (typeof handleAddNewLead === 'function') {
      try {
        await handleAddNewLead(sanitizeObject({
          name: verifiedAccount.name,
          email: verifiedAccount.email,
          whatsapp: verifiedAccount.whatsapp,
          phone: verifiedAccount.whatsapp,
          source: 'client_account_verified',
          type: 'buyer',
          notes: `حساب عميل موثق برمز (${verifiedAccount.verificationToken}) لتفعيل المفضلة والمقارنات الذكية`
        }));
      } catch (err) {
        console.warn('Auto CRM lead sync warning:', err);
      }
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
  }, [verificationSession, isAr, handleAddNewLead, triggerToast, pendingAction]);

  /**
   * Client Logout
   */
  const logoutClient = useCallback(() => {
    setClientUser(null);
    localStorage.removeItem(CLIENT_STORAGE_KEY);
    if (typeof triggerToast === 'function') {
      triggerToast(isAr ? 'تم تسجيل خروج حساب العميل بنجاح' : 'Client logged out', 'info');
    }
  }, [triggerToast, isAr]);

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
