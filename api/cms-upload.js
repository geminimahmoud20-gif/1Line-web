// =============================================================
//  Vercel Function: signed direct uploads to Vercel Blob for the CRM media box.
//  The browser sends the file straight to Blob; this route only hands out a short-lived
//  upload grant, and only to signed-in CRM staff allowed that kind of file (verified Firebase ID token).
//  Needs a *public* Blob store connected to the project. Two ways Vercel connects one:
//   - BLOB_STORE_ID (+ the project's OIDC identity) → presigned URLs   (current Vercel default)
//   - BLOB_READ_WRITE_TOKEN                          → client tokens    (older stores)
//  On Cloudflare (worker/index.js) the bucket arrives as env.MEDIA and the browser posts the file
//  here instead ('r2' mode); the same checks decide who may upload what.
// =============================================================
import { issueSignedToken } from '@vercel/blob';
import { handleUpload, handleUploadPresigned } from '@vercel/blob/client';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { canUploadMedia } from '../src/utils/accessModel.js';
import { readUpload, putMedia, withRandomSuffix } from './_r2-core.js';

const FIREBASE_PROJECT_ID = 'line-c9601';
const firebaseKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

// Keep in step with CMS_MEDIA_LIMITS in src/services/cmsMedia.js
const LIMITS = {
  video: { maxBytes: 60 * 1024 * 1024, types: ['video/mp4', 'video/webm', 'video/quicktime'] },
  image: { maxBytes: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] },
  // 640px copies of listing photos (src/utils/imageThumbs.js): a fixed path, so no random suffix
  thumb: { maxBytes: 1024 * 1024, types: ['image/jpeg'] }
};
const THUMB_PATH = /^cms\/thumbs\/[\w.-]{1,200}\.w640\.jpg$/;
const GRANT_TTL_MS = 30 * 60 * 1000;
const CACHE_SECONDS = 60 * 60 * 24 * 365;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
});

const uploadMode = (env) => {
  if (env?.MEDIA) return 'r2';
  if (process.env.BLOB_STORE_ID) return 'presigned';
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'token';
  return null;
};

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
  // A role edited on the roles screen counts by its permissions, as in firestore.rules
  if (!canUploadMedia(payload, kind)) throw new Error('not-admin');
  return payload.sub;
};

// Shared gate for both modes: valid kind, path inside that kind's folder, allowed uploader
const authorise = async (pathname, clientPayload) => {
  let payload = {};
  try { payload = JSON.parse(clientPayload || '{}'); } catch { /* checked below */ }
  const limits = LIMITS[payload.kind];
  const pathOk = payload.kind === 'thumb'
    ? THUMB_PATH.test(pathname)
    : pathname.startsWith(`cms/${payload.kind}s/`) && /^cms\/(videos|images)\/[\w.-]{1,120}$/.test(pathname);
  if (!limits || !pathOk) throw new Error('bad-path');
  const uid = await verifyUploader(String(payload.idToken || ''), payload.kind);
  // A small copy is rewritten in place when it is made again
  const fixedPath = payload.kind === 'thumb';
  return { limits, uid, naming: { addRandomSuffix: !fixedPath, allowOverwrite: fixedPath } };
};

// The CMS asks this before showing the upload box; `mode` tells the browser which SDK call to use
export function GET(request, env) {
  const mode = uploadMode(env);
  return json(200, { ok: Boolean(mode), mode });
}

const refused = (error, label) => {
  const msg = String(error?.message || error);
  const denied = /not-admin/.test(msg);
  if (!denied && !/bad-path/.test(msg)) console.error(`${label}:`, msg);
  return json(denied ? 403 : 400, { error: denied ? 'unauthorized' : 'upload-refused' });
};

// 'r2': POST /api/cms-upload?kind=image&path=cms/images/… with the file as the body
async function uploadToR2(request, env) {
  const url = new URL(request.url);
  const kind = url.searchParams.get('kind');
  const pathname = url.searchParams.get('path') || '';
  const idToken = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  try {
    const { limits, naming } = await authorise(pathname, JSON.stringify({ kind, idToken }));
    const file = await readUpload(request, limits);
    if (!file.ok) return json(file.status, { error: file.error });
    const key = naming.addRandomSuffix ? withRandomSuffix(pathname) : pathname;
    return json(200, await putMedia(env.MEDIA, key, file.body, file.type, { baseUrl: env.MEDIA_BASE_URL, requestUrl: request.url }));
  } catch (error) {
    return refused(error, 'cms-upload');
  }
}

export async function POST(request, env) {
  const mode = uploadMode(env);
  if (!mode) return json(503, { error: 'blob-not-configured' });
  if (mode === 'r2') return uploadToR2(request, env);
  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'bad-request' }); }

  try {
    const result = mode === 'presigned'
      ? await handleUploadPresigned({
        body,
        request,
        getSignedToken: async (pathname, clientPayload) => {
          const { limits, naming } = await authorise(pathname, clientPayload);
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
              ...naming,
              cacheControlMaxAge: CACHE_SECONDS
            }
          };
        }
      })
      : await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          const { limits, uid, naming } = await authorise(pathname, clientPayload);
          return {
            allowedContentTypes: limits.types,
            maximumSizeInBytes: limits.maxBytes,
            ...naming,
            cacheControlMaxAge: CACHE_SECONDS,
            validUntil: Date.now() + GRANT_TTL_MS,
            tokenPayload: JSON.stringify({ uid })
          };
        }
      });
    return json(200, result);
  } catch (error) {
    return refused(error, 'cms-upload');
  }
}
