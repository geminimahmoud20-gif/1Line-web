// =============================================================
//  Vercel Function: signed direct uploads to Vercel Blob for the CRM media box.
//  The browser sends the file straight to Blob; this route only hands out a short-lived
//  upload grant, and only to signed-in CRM staff allowed that kind of file (verified Firebase ID token).
//  Needs a *public* Blob store connected to the project. Two ways Vercel connects one:
//   - BLOB_STORE_ID (+ the project's OIDC identity) → presigned URLs   (current Vercel default)
//   - BLOB_READ_WRITE_TOKEN                          → client tokens    (older stores)
// =============================================================
import { issueSignedToken } from '@vercel/blob';
import { handleUpload, handleUploadPresigned } from '@vercel/blob/client';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const FIREBASE_PROJECT_ID = 'line-c9601';
const firebaseKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

// Keep in step with CMS_MEDIA_LIMITS in src/firebaseService.js
const LIMITS = {
  video: { maxBytes: 60 * 1024 * 1024, types: ['video/mp4', 'video/webm', 'video/quicktime'] },
  image: { maxBytes: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] }
};
const GRANT_TTL_MS = 30 * 60 * 1000;
const CACHE_SECONDS = 60 * 60 * 24 * 365;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
});

const uploadMode = () => {
  if (process.env.BLOB_STORE_ID) return 'presigned';
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'token';
  return null;
};

// Same tests as firestore.rules isAdmin() / isInventoryEditor() and ADMIN_USER_IDS in src/firebaseService.js
const ADMIN_USER_IDS = new Set(['dB6GM2RoPQRE0iksDnqcdvUKgXy2']);
const INVENTORY_ROLES = ['sales_manager', 'property_manager'];

// Videos (homepage hero): admins only. Images (property photos): admins + inventory editors.
const verifyUploader = async (idToken, kind) => {
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, firebaseKeys, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID
    }));
  } catch {
    throw new Error('not-admin'); // bad signature, expired, wrong project, malformed…
  }
  const isAdmin = ADMIN_USER_IDS.has(payload.sub) || payload.admin === true || payload.role === 'admin' || payload.role === 'super_admin';
  const allowed = isAdmin || (kind === 'image' && INVENTORY_ROLES.includes(payload.role));
  if (!allowed) throw new Error('not-admin');
  return payload.sub;
};

// Shared gate for both modes: valid kind, path inside that kind's folder, allowed uploader
const authorise = async (pathname, clientPayload) => {
  let payload = {};
  try { payload = JSON.parse(clientPayload || '{}'); } catch { /* checked below */ }
  const limits = LIMITS[payload.kind];
  if (!limits || !pathname.startsWith(`cms/${payload.kind}s/`) || !/^cms\/(videos|images)\/[\w.-]{1,120}$/.test(pathname)) throw new Error('bad-path');
  const uid = await verifyUploader(String(payload.idToken || ''), payload.kind);
  return { limits, uid };
};

// The CMS asks this before showing the upload box; `mode` tells the browser which SDK call to use
export function GET() {
  const mode = uploadMode();
  return json(200, { ok: Boolean(mode), mode });
}

export async function POST(request) {
  const mode = uploadMode();
  if (!mode) return json(503, { error: 'blob-not-configured' });
  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'bad-request' }); }

  try {
    const result = mode === 'presigned'
      ? await handleUploadPresigned({
        body,
        request,
        getSignedToken: async (pathname, clientPayload) => {
          const { limits } = await authorise(pathname, clientPayload);
          const validUntil = Date.now() + GRANT_TTL_MS;
          // Delegation covers this one path, uploads only, 30 minutes
          const token = await issueSignedToken({
            pathname,
            operations: ['put'],
            validUntil,
            allowedContentTypes: limits.types,
            maximumSizeInBytes: limits.maxBytes
          });
          return {
            token,
            urlOptions: {
              validUntil,
              allowedContentTypes: limits.types,
              maximumSizeInBytes: limits.maxBytes,
              addRandomSuffix: true,
              cacheControlMaxAge: CACHE_SECONDS
            }
          };
        }
      })
      : await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          const { limits, uid } = await authorise(pathname, clientPayload);
          return {
            allowedContentTypes: limits.types,
            maximumSizeInBytes: limits.maxBytes,
            addRandomSuffix: true,
            cacheControlMaxAge: CACHE_SECONDS,
            validUntil: Date.now() + GRANT_TTL_MS,
            tokenPayload: JSON.stringify({ uid })
          };
        }
      });
    return json(200, result);
  } catch (error) {
    const msg = String(error?.message || error);
    const denied = /not-admin/.test(msg);
    if (!denied && !/bad-path/.test(msg)) console.error('cms-upload:', msg);
    return json(denied ? 403 : 400, { error: denied ? 'unauthorized' : 'upload-refused' });
  }
}
