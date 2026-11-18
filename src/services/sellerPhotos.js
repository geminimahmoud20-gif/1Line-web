import { compressImage } from '../utils/imageUploadService.js';
import { watermarkedName } from '../utils/watermark.js';

// Owners' photos on /sell: shrunk in the browser, then sent straight to Vercel Blob through
// /api/seller-upload, so the lead keeps only URLs. If the route is missing (local dev) or refuses,
// the photo is kept as a smaller inline image instead; the form caps those (INLINE_PHOTO_BUDGET).

const ROUTE = '/api/seller-upload';
let uploadMode; // undefined = not asked yet, null = unavailable

const getUploadMode = async () => {
  if (uploadMode !== undefined) return uploadMode;
  try {
    const res = await fetch(ROUTE, { cache: 'no-store' });
    const info = res.ok ? await res.json() : null;
    uploadMode = info?.ok ? info.mode : null;
  } catch {
    uploadMode = null;
  }
  return uploadMode;
};

const inlineFallback = async (file) => {
  const small = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.62, watermark: true });
  return { url: small.dataUrl, inline: true, bytes: small.dataUrl.length };
};

/**
 * One photo → { url, inline, bytes }. inline=true means a data URL (counts against the lead size).
 * Throws only when the file is not a readable image.
 */
export async function uploadSellerPhoto(file) {
  const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.8, watermark: true });
  const mode = import.meta.env.DEV ? null : await getUploadMode();
  if (!mode) return inlineFallback(file);

  try {
    const blobClient = await import('@vercel/blob/client');
    const upload = mode === 'token' ? blobClient.upload : blobClient.uploadPresigned;
    const raw = `seller/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const name = compressed.watermarked ? watermarkedName(raw) : raw;
    const blob = await upload(name, new File([compressed.blob], 'photo.jpg', { type: 'image/jpeg' }), {
      access: 'public',
      handleUploadUrl: ROUTE,
      contentType: 'image/jpeg'
    });
    return { url: blob.url, inline: false, bytes: 0 };
  } catch (error) {
    console.warn('Seller photo upload failed, keeping a smaller copy in the request:', error?.message || error);
    return inlineFallback(file);
  }
}
