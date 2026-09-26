// =============================================================
//  Vercel Function: signed direct uploads to Vercel Blob for the CRM media box.
//  The browser sends the file straight to Blob; this route only hands out a short-lived
//  upload token, and only to signed-in CRM staff allowed that kind of file (verified Firebase ID token).
//  Needs a *public* Blob store connected to the project (adds BLOB_READ_WRITE_TOKEN).
// =============================================================
import { handleUpload } from '@vercel/blob/client';
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

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
});

// Same tests as firestore.rules isAdmin() / isInventoryEditor() and ADMIN_USER_IDS in src/firebaseService.js
const ADMIN_USER_IDS = new Set(['dB6GM2RoPQRE0iksDnqcdvUKgXy2']);
const INVENTORY_ROLES = ['sales_manager', 'property_manager'];

// Videos (homepage hero): admins only. Images (property photos): admins + inventory editors.
const verifyUploader = async (idToken, kind) => {
  const { payload } = await jwtVerify(idToken, firebaseKeys, {
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    audience: FIREBASE_PROJECT_ID
  });
  const isAdmin = ADMIN_USER_IDS.has(payload.sub) || payload.admin === true || payload.role === 'admin' || payload.role === 'super_admin';
  const allowed = isAdmin || (kind === 'image' && INVENTORY_ROLES.includes(payload.role));
  if (!allowed) throw new Error('not-admin');
  return payload.sub;
};

// The CMS asks this before showing the upload box
export function GET() {
  return json(200, { ok: Boolean(process.env.BLOB_READ_WRITE_TOKEN) });
}

export async function POST(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json(503, { error: 'blob-not-configured' });
  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'bad-request' }); }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload = {};
        try { payload = JSON.parse(clientPayload || '{}'); } catch { /* checked below */ }
        const limits = LIMITS[payload.kind];
        if (!limits || !pathname.startsWith(`cms/${payload.kind}s/`) || !/^cms\/(videos|images)\/[\w.-]{1,120}$/.test(pathname)) throw new Error('bad-path');
        const uid = await verifyUploader(String(payload.idToken || ''), payload.kind);
        return {
          allowedContentTypes: limits.types,
          maximumSizeInBytes: limits.maxBytes,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
          validUntil: Date.now() + 30 * 60 * 1000,
          tokenPayload: JSON.stringify({ uid })
        };
      }
    });
    return json(200, result);
  } catch (error) {
    const msg = String(error?.message || error);
    const denied = /not-admin|JWT|JWS|token|signature|exp/i.test(msg);
    return json(denied ? 403 : 400, { error: denied ? 'unauthorized' : 'upload-refused' });
  }
}
