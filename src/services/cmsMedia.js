import { auth } from '../firebase.js';

// ===================== CMS MEDIA (Firebase Storage) =====================
// Hero videos used to be read as base64 data URLs and stored inside the settings doc:
// a 15MB clip became ~20MB of text — over localStorage (~5MB) and Firestore (1MB per doc)
// limits, and it froze the CMS form. Files now go to Storage; settings keep only the URL.

export const CMS_MEDIA_LIMITS = {
  video: { maxBytes: 60 * 1024 * 1024, types: ['video/mp4', 'video/webm', 'video/quicktime'] },
  image: { maxBytes: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] }
};

// Files go to Vercel Blob (Firebase Storage was never enabled for this project: its bucket
// answers 404 and needs the Blaze plan). /api/cms-upload signs each upload for admins only.
const CMS_UPLOAD_ROUTE = '/api/cms-upload';

/**
 * For the CMS to decide up front whether the device-upload box can work at all.
 * 'ready' | 'unavailable' (no Blob store connected) | 'unknown' (offline / timeout).
 */
// 'presigned' (store connected via BLOB_STORE_ID + OIDC) or 'token' (BLOB_READ_WRITE_TOKEN)
let cmsUploadMode = null;

export const getCmsStorageStatus = async () => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(CMS_UPLOAD_ROUTE, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return res.status === 404 || res.status === 503 ? 'unavailable' : 'unknown';
    const info = await res.json();
    if (!info?.ok) return 'unavailable';
    cmsUploadMode = info.mode;
    return 'ready';
  } catch {
    return 'unknown';
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Upload a CMS media file. onProgress(0..100); onStart(cancel) hands back a cancel function.
 * Resolves { ok, url, path } or { ok: false, reason }: 'type' | 'size' | 'offline' |
 * 'unauthenticated' | 'storage/unauthorized' | 'bucket-unavailable' | 'stalled' | 'storage/canceled' | 'error'.
 */
export const uploadCmsMedia = async (file, kind = 'video', onProgress, onStart) => {
  const limits = CMS_MEDIA_LIMITS[kind];
  if (!file || !limits) return { ok: false, reason: 'type' };
  if (!limits.types.includes(file.type)) return { ok: false, reason: 'type' };
  if (file.size > limits.maxBytes) return { ok: false, reason: 'size' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, reason: 'offline' };
  // The route only signs uploads for signed-in admins; the local PIN session has no Firebase user
  if (!auth?.currentUser) return { ok: false, reason: 'unauthenticated' };

  let idToken;
  try { idToken = await auth.currentUser.getIdToken(); } catch { return { ok: false, reason: 'unauthenticated' }; }
  if (!cmsUploadMode) await getCmsStorageStatus();
  const blobClient = await import('@vercel/blob/client');
  const upload = cmsUploadMode === 'token' ? blobClient.upload : blobClient.uploadPresigned;
  const safeName = file.name.normalize('NFKD').replace(/[^\w.-]+/g, '-').slice(-80) || kind;
  const path = `cms/${kind}s/${Date.now()}-${safeName}`;
  const ctrl = new AbortController();
  let moved = false;
  let cancelled = false;
  onStart?.(() => { cancelled = true; ctrl.abort(); });
  // Watchdog: nothing transferred in 30s means the upload is not going to start
  const stallTimer = setTimeout(() => { if (!moved) ctrl.abort(); }, 30 * 1000);

  try {
    const blob = await upload(path, file, {
      access: 'public',
      handleUploadUrl: CMS_UPLOAD_ROUTE,
      clientPayload: JSON.stringify({ kind, idToken }),
      contentType: file.type,
      multipart: file.size > 8 * 1024 * 1024,
      abortSignal: ctrl.signal,
      onUploadProgress: ({ loaded, percentage }) => {
        if (loaded > 0) moved = true;
        onProgress?.(Math.min(100, Math.round(percentage)));
      }
    });
    return { ok: true, url: blob.url, path: blob.pathname };
  } catch (error) {
    if (cancelled) return { ok: false, reason: 'storage/canceled' };
    if (ctrl.signal.aborted) return { ok: false, reason: 'stalled' };
    const msg = String(error?.message || error);
    if (/unauthori[sz]ed|403/i.test(msg)) return { ok: false, reason: 'storage/unauthorized' };
    if (/not-configured|503|404/i.test(msg)) return { ok: false, reason: 'bucket-unavailable' };
    console.warn('CMS upload failed:', msg);
    return { ok: false, reason: 'error' };
  } finally {
    clearTimeout(stallTimer);
  }
};
