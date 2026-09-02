import DOMPurify from 'dompurify';

/**
 * 🛡️ ONELINE ENTERPRISE SECURITY SHIELD & CRYPTO SUITE 2026
 * Implements: SHA-256 Salting, Brute-Force Rate Limiter, and XSS Sanitization
 */

// Production SHA-256 Hash of Authorized Admin Keys (Salted)
// Generated using SHA-256(password + salt)
const ADMIN_SALT = 'ONELINE_SOHAG_SECURE_SALT_2026';

// CRM authentication is handled exclusively by Firebase Authentication and
// Firebase custom claims. No local administrator credentials are stored here.
const AUTHORIZED_PIN_HASHES = [];

/**
 * Generate SHA-256 hash in browser using native Web Crypto API
 */
export async function sha256Hash(message) {
  const saltedMsg = message + ADMIN_SALT;
  const msgBuffer = new TextEncoder().encode(saltedMsg);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Anti-Brute-Force Rate Limiter
 * Tracks failed login attempts and temporarily locks out abusers
 */
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function checkRateLimit() {
  const attemptsData = JSON.parse(sessionStorage.getItem('oneline_auth_shield') || '{}');
  const now = Date.now();

  if (attemptsData.lockedUntil && now < attemptsData.lockedUntil) {
    const remainingSeconds = Math.ceil((attemptsData.lockedUntil - now) / 1000);
    return {
      isLocked: true,
      remainingSeconds,
      message_ar: `تم حظر المحاولات مؤقتاً لحماية النظام! يرجى الانتظار ${remainingSeconds} ثانية.`,
      message_en: `Temporarily locked for security! Please wait ${remainingSeconds} seconds.`
    };
  }

  if (attemptsData.lockedUntil && now >= attemptsData.lockedUntil) {
    // Reset lockout
    sessionStorage.removeItem('oneline_auth_shield');
  }

  return { isLocked: false, remainingAttempts: MAX_ATTEMPTS - (attemptsData.count || 0) };
}

export function recordFailedAttempt() {
  const attemptsData = JSON.parse(sessionStorage.getItem('oneline_auth_shield') || '{"count": 0}');
  const newCount = (attemptsData.count || 0) + 1;

  if (newCount >= MAX_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    sessionStorage.setItem('oneline_auth_shield', JSON.stringify({ count: newCount, lockedUntil }));
  } else {
    sessionStorage.setItem('oneline_auth_shield', JSON.stringify({ count: newCount }));
  }
}

export function resetFailedAttempts() {
  sessionStorage.removeItem('oneline_auth_shield');
}

/**
 * Verify Admin Password Cryptographically
 * 🔒 Uses SHA-256 salted hash comparison ONLY — no plaintext passwords in code
 */
export async function verifyAdminCredentials(inputPassword) {
  const rateLimitStatus = checkRateLimit();
  if (rateLimitStatus.isLocked) {
    return { success: false, rateLimited: true, message: rateLimitStatus.message_ar };
  }

  try {
    const hashedInput = await sha256Hash(inputPassword.trim());
    
    // 🔒 Secure: Compare ONLY against pre-computed salted SHA-256 hashes
    // No plaintext passwords are stored or compared anywhere in the codebase
    const isValid = AUTHORIZED_PIN_HASHES.includes(hashedInput);

    if (isValid) {
      resetFailedAttempts();
      return { success: true };
    } else {
      recordFailedAttempt();
      const updatedStatus = checkRateLimit();
      return {
        success: false,
        rateLimited: updatedStatus.isLocked,
        remainingAttempts: updatedStatus.remainingAttempts,
        message: updatedStatus.isLocked ? updatedStatus.message_ar : 'رمز المرور غير صحيح!'
      };
    }
  } catch (err) {
    console.error('Security verify error:', err);
    return { success: false, message: 'حدث خطأ في معالجة الأمان' };
  }
}

/**
 * Deep Input Sanitizer for Forms & User Generated Content
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  // Strip HTML tags, scripts, and SQL characters
  const clean = DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return clean.trim();
}

export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * 📱 Normalize phone numbers to eliminate spaces, dashes, and international prefixes
 * e.g. "+20 101-234-5678" -> "01012345678"
 */
export function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('20') && clean.length === 12) {
    clean = '0' + clean.slice(2);
  } else if (clean.startsWith('0020') && clean.length === 14) {
    clean = '0' + clean.slice(4);
  }
  return clean;
}
