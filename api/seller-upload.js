// =============================================================
//  Vercel Function: signed direct uploads to Vercel Blob for owners' photos on /sell.
//  The photos used to ride inside the lead as base64, and two phone photos already passed
//  Firestore's 1 MB document limit, so the whole request was refused (release audit REL-DATA-01).
//  Now each photo goes straight to Blob and the lead keeps only its URL.
//  Same Blob store as /api/cms-upload (BLOB_STORE_ID + OIDC, or BLOB_READ_WRITE_TOKEN).
// =============================================================
import { issueSignedToken } from '@vercel/blob';
import { handleUpload, handleUploadPresigned } from '@vercel/blob/client';
import { SELLER_UPLOAD, validSellerPath, sameSite, createRateLimiter } from './_seller-upload-core.js';

const CACHE_SECONDS = 60 * 60 * 24 * 365;
const limited = createRateLimiter({ max: SELLER_UPLOAD.perIpMax, windowMs: SELLER_UPLOAD.windowMs });

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
});

const uploadMode = () => {
  if (process.env.BLOB_STORE_ID) return 'presigned';
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'token';
  return null;
};

export function GET() {
  const mode = uploadMode();
  return json(200, { ok: Boolean(mode), mode });
}

export async function POST(request) {
  const mode = uploadMode();
  if (!mode) return json(503, { error: 'blob-not-configured' });
  if (!sameSite(request.headers.get('origin'), request.headers.get('host'))) return json(403, { error: 'cross-site' });
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return json(429, { error: 'too-many' });

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
