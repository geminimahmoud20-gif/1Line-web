// =============================================================
//  Vercel Function: signed direct uploads to Vercel Blob for owners' photos on /sell.
//  The photos used to ride inside the lead as base64, and two phone photos already passed
//  Firestore's 1 MB document limit, so the whole request was refused (release audit REL-DATA-01).
//  Now each photo goes straight to Blob and the lead keeps only its URL.
//  Same Blob store as /api/cms-upload (BLOB_STORE_ID + OIDC, or BLOB_READ_WRITE_TOKEN).
//  On Cloudflare the photo is posted here and stored in R2 (env.MEDIA), behind the same checks.
// =============================================================
import { issueSignedToken } from '@vercel/blob';
import { handleUpload, handleUploadPresigned } from '@vercel/blob/client';
import { SELLER_UPLOAD, validSellerPath, sameSite, createRateLimiter } from './_seller-upload-core.js';
import { readUpload, putMedia, withRandomSuffix } from './_r2-core.js';

const CACHE_SECONDS = 60 * 60 * 24 * 365;
const limited = createRateLimiter({ max: SELLER_UPLOAD.perIpMax, windowMs: SELLER_UPLOAD.windowMs });

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

export function GET(request, env) {
  const mode = uploadMode(env);
  return json(200, { ok: Boolean(mode), mode });
}

// 'r2': POST /api/seller-upload?path=seller/… with the photo as the body
async function uploadToR2(request, env) {
  const pathname = new URL(request.url).searchParams.get('path') || '';
  if (!validSellerPath(pathname)) return json(400, { error: 'upload-refused' });
  const file = await readUpload(request, { types: SELLER_UPLOAD.types, maxBytes: SELLER_UPLOAD.maxBytes });
  if (!file.ok) return json(file.status, { error: file.error });
  try {
    return json(200, await putMedia(env.MEDIA, withRandomSuffix(pathname), file.body, file.type, { baseUrl: env.MEDIA_BASE_URL, requestUrl: request.url }));
  } catch (error) {
    console.error('seller-upload:', error?.message || error);
    return json(500, { error: 'upload-failed' });
  }
}

export async function POST(request, env) {
  const mode = uploadMode(env);
  if (!mode) return json(503, { error: 'blob-not-configured' });
  if (!sameSite(request.headers.get('origin'), request.headers.get('host'))) return json(403, { error: 'cross-site' });
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return json(429, { error: 'too-many' });
  if (mode === 'r2') return uploadToR2(request, env);

  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'bad-request' }); }

  const check = (pathname) => {
    if (!validSellerPath(pathname)) throw new Error('bad-path');
  };

  try {
    const result = mode === 'presigned'
      ? await handleUploadPresigned({
        body,
        request,
        getSignedToken: async (pathname) => {
          check(pathname);
          const validUntil = Date.now() + SELLER_UPLOAD.grantTtlMs;
          const token = await issueSignedToken({
            pathname,
            operations: ['put'],
            validUntil,
            allowedContentTypes: SELLER_UPLOAD.types,
            maximumSizeInBytes: SELLER_UPLOAD.maxBytes
          });
          return {
            token,
            urlOptions: {
              validUntil,
              allowedContentTypes: SELLER_UPLOAD.types,
              maximumSizeInBytes: SELLER_UPLOAD.maxBytes,
              addRandomSuffix: true,
              cacheControlMaxAge: CACHE_SECONDS
            }
          };
        }
      })
      : await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname) => {
          check(pathname);
          return {
            allowedContentTypes: SELLER_UPLOAD.types,
            maximumSizeInBytes: SELLER_UPLOAD.maxBytes,
            addRandomSuffix: true,
            cacheControlMaxAge: CACHE_SECONDS,
            validUntil: Date.now() + SELLER_UPLOAD.grantTtlMs
          };
        }
      });
    return json(200, result);
  } catch (error) {
    const msg = String(error?.message || error);
    if (!/bad-path/.test(msg)) console.error('seller-upload:', msg);
    return json(400, { error: 'upload-refused' });
  }
}
