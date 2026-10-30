/**
 * 📷 ONELINE PROPTECH - IMAGE COMPRESSION & CLOUD UPLOAD SERVICE
 * Compresses large mobile phone photos (8-15MB) into lightweight high-res WebP/JPEGs (~150-250KB)
 * and uploads them to Vercel Blob (via /api/cms-upload) with an offline fallback.
 */

import { uploadCmsMedia } from '../firebaseLazy';
import { applyWatermark, watermarkedName } from './watermark';
import { THUMB, thumbPathFor, withThumbMarker, needsThumb } from './imageThumbs';

// Phone galleries sometimes hand over a photo with no MIME type (Google Photos, some file
// managers), and Samsung/iPhone cameras can save HEIC. Judge by the name when the type is empty.
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i;
export const isImageFile = (file) => Boolean(file) && (
  (file.type || '').startsWith('image/') || (!file.type && IMAGE_EXT.test(file.name || ''))
);
export const isHeic = (file) => /image\/hei[cf]/i.test(file?.type || '') || /\.hei[cf]$/i.test(file?.name || '');

/** Thrown when the browser can't open the picture (HEIC on Android Chrome, a broken file) */
export class ImageDecodeError extends Error {
  constructor(file) {
    super(isHeic(file) ? 'heic' : 'decode');
    this.heic = isHeic(file);
  }
}

// Decodes straight from the file: no base64 copy of a 10MB photo in memory, and the photo's
// EXIF rotation is applied (imageOrientation / the browser's default for <img>).
async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close?.() };
    } catch { /* older Safari: fall through to <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.decoding = 'async';
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageDecodeError(file);
  }
}

/**
 * Compresses an image File or Blob using native HTML Canvas
 * @param {File} file - Original file from camera or file input
 * @param {Object} options - Compression configuration
 * @returns {Promise<{ blob: Blob, dataUrl: string, sizeKb: number, watermarked: boolean }>}
 *   dataUrl is worked out only when read (it is only needed when the upload falls back)
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1600,
    maxHeight = 1200,
    quality = 0.82,
    outputType = 'image/jpeg',
    watermark = false // burn the brand logo in (listing photos); see utils/watermark.js
  } = options;

  if (!isImageFile(file)) throw new Error('الملف المحدد ليس صورة صالحة');

  const decoded = await decodeImage(file);
  let { width, height } = decoded;
  if (!width || !height) {
    decoded.release();
    throw new ImageDecodeError(file);
  }
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  try {
    ctx.drawImage(decoded.source, 0, 0, width, height);
  } finally {
    decoded.release();
  }
  const watermarked = watermark ? await applyWatermark(ctx, width, height) : false;

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, quality));
  let dataUrl = null;
  const out = {
    blob: blob || file,
    sizeKb: Math.round((blob || file).size / 1024),
    watermarked: blob ? watermarked : false
  };
  Object.defineProperty(out, 'dataUrl', {
    enumerable: true,
    get: () => (dataUrl ??= canvas.toDataURL(outputType, quality))
  });
  return out;
}

/**
 * Uploads a single property image to cloud storage (with offline base64 fallback)
 * @param {File} file - Image file
 * @param {string} propertyId - Property ID identifier
 * @returns {Promise<{ url: string, isCloud: boolean, sizeKb: number }>}
 */
export async function uploadPropertyImage(file, propertyId = 'general') {
  const compressed = await compressImage(file, { watermark: true });

  // The local dev server has no /api routes, so only production tries the cloud
  if (!import.meta.env.DEV) {
    const type = compressed.blob.type || 'image/jpeg';
    const base = (file.name || 'photo').replace(/\.[^.]+$/, '');
    const fileName = `${propertyId}-${base}.${type === 'image/webp' ? 'webp' : 'jpg'}`;
    const upload = new File([compressed.blob], compressed.watermarked ? watermarkedName(fileName) : fileName, { type });
    const res = await uploadCmsMedia(upload, 'image');
    if (res.ok) {
      const url = (await uploadThumb(compressed.blob, res.path)) ? withThumbMarker(res.url) : res.url;
      return { url, isCloud: true, sizeKb: compressed.sizeKb };
    }
    console.warn('Cloud image upload skipped (falling back to local data URL):', res.reason);
  }

  // Graceful Offline / Local fallback: Return the high-quality compressed Base64 Data URL
  return {
    url: compressed.dataUrl,
    isCloud: false,
    sizeKb: compressed.sizeKb
  };
}

/** Makes and uploads the 640px copy of an already-stored photo; false when it could not */
async function uploadThumb(source, storedPath) {
  try {
    const small = await compressImage(source, { maxWidth: THUMB.width, maxHeight: THUMB.height, quality: THUMB.quality });
    const file = new File([small.blob], 'thumb.jpg', { type: 'image/jpeg' });
    const res = await uploadCmsMedia(file, 'thumb', undefined, undefined, { path: thumbPathFor(storedPath) });
    if (!res.ok) console.warn('Small photo copy skipped:', res.reason);
    return res.ok;
  } catch (error) {
    console.warn('Small photo copy failed:', error?.message || error);
    return false;
  }
}

/**
 * A photo kept inside a listing (data: URL, from an upload that was refused or offline) → the
 * same picture on Blob, with its small copy. It was already shrunk and watermarked when it was
 * kept, so it is sent as is. Returns the new address, or null when the upload is refused.
 */
export async function uploadInlinePhoto(dataUrl, propertyId = 'general', index = 0) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const type = blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const name = watermarkedName(`${propertyId}-photo-${index + 1}.${type === 'image/webp' ? 'webp' : 'jpg'}`);
    const res = await uploadCmsMedia(new File([blob], name, { type }), 'image');
    if (!res.ok) {
      console.warn('Inline photo upload refused:', res.reason);
      return null;
    }
    return (await uploadThumb(blob, res.path)) ? withThumbMarker(res.url) : res.url;
  } catch (error) {
    console.warn('Inline photo upload failed:', error?.message || error);
    return null;
  }
}

/**
 * For a photo already on the site: downloads it, uploads its small copy and returns the photo's
 * marked address, or null when it can't (not on our store, unreadable, upload refused).
 */
export async function makeThumbForUrl(url) {
  if (!needsThumb(url)) return null;
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
    const source = new File([blob], 'photo', { type });
    const path = decodeURIComponent(new URL(url).pathname);
    return (await uploadThumb(source, path)) ? withThumbMarker(url) : null;
  } catch (error) {
    console.warn('Small copy for existing photo failed:', error?.message || error);
    return null;
  }
}

/**
 * Batch uploads multiple property images, two at a time (a phone on mobile data spends most of
 * each upload waiting, and two keeps memory low on older phones).
 * @param {FileList|File[]} files - List of image files
 * @param {string} propertyId - Property ID
 * @param {Function} onProgress - Progress callback (done, total)
 * @returns {Promise<string[]>} Image URLs in the order picked; .inlineCount = how many stayed
 *   inside the listing, .failed = [{ name, heic }] for photos that could not be opened
 */
export async function uploadMultipleImages(files, propertyId = 'general', onProgress = null) {
  const fileArray = Array.from(files).filter(isImageFile);
  const slots = new Array(fileArray.length).fill(null);
  const failed = [];
  let inline = 0;
  let done = 0;
  let next = 0;

  const worker = async () => {
    while (next < fileArray.length) {
      const i = next++;
      const file = fileArray[i];
      try {
        const uploadRes = await uploadPropertyImage(file, propertyId);
        slots[i] = uploadRes.url;
        if (!uploadRes.isCloud) inline += 1;
      } catch (err) {
        console.error(`Failed to process image ${file.name}:`, err);
        failed.push({ name: file.name || 'photo', heic: Boolean(err?.heic) || isHeic(file) });
      }
      done += 1;
      if (onProgress) onProgress(done, fileArray.length);
    }
  };
  await Promise.all([worker(), worker()]);

  const results = slots.filter(Boolean);
  // Photos kept inside the listing (upload refused or offline) make it too big to publish
  results.inlineCount = import.meta.env.DEV ? 0 : inline;
  results.failed = failed;
  return results;
}

/**
 * A company photo for the About page (a team portrait or an office picture): shrunk, no watermark,
 * stored on Blob. No data: URL fallback, since these live inside one settings document that
 * must stay small. Returns { ok, url } or { ok: false, reason }.
 */
export async function uploadProfilePhoto(file, name = 'about', { maxWidth = 1200, maxHeight = 1200 } = {}) {
  if (import.meta.env.DEV) return { ok: false, reason: 'dev' };
  try {
    const compressed = await compressImage(file, { maxWidth, maxHeight, quality: 0.84 });
    const type = compressed.blob.type || 'image/jpeg';
    const upload = new File([compressed.blob], `${name}.${type === 'image/webp' ? 'webp' : 'jpg'}`, { type });
    const res = await uploadCmsMedia(upload, 'image');
    return res.ok ? { ok: true, url: res.url } : { ok: false, reason: res.reason || 'refused' };
  } catch (error) {
    return { ok: false, reason: error?.message || 'failed' };
  }
}

// Phone photos are shrunk before upload, so only a truly huge file is refused
export const MAX_PHOTO_MB = 40;

/** The toast for photos the phone could not open, or '' when every photo opened */
export function failedPhotosMessage(failed = [], isAr = true) {
  if (!failed.length) return '';
  const heic = failed.filter((f) => f.heic).length;
  if (isAr) {
    return heic
      ? `${failed.length} صورة ماتفتحتش لأنها بصيغة HEIC. من إعدادات الكاميرا اختار «JPEG / الأكثر توافقاً»، أو ابعت الصورة لنفسك على الواتساب واحفظها وارفعها تاني.`
      : `${failed.length} صورة ماتفتحتش (الملف بايظ أو صيغته مش مدعومة). جرّب تصورها تاني أو اختار صورة غيرها.`;
  }
  return heic
    ? `${failed.length} HEIC photo(s) could not be opened. Set the camera to JPEG / Most compatible, or send the photo to yourself and re-upload it.`
    : `${failed.length} photo(s) could not be opened (damaged or unsupported file).`;
}
