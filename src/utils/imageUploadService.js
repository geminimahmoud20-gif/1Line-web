/**
 * 📷 ONELINE PROPTECH - IMAGE COMPRESSION & CLOUD UPLOAD SERVICE
 * Compresses large mobile phone photos (8-15MB) into lightweight high-res WebP/JPEGs (~150-250KB)
 * and uploads them to Vercel Blob (via /api/cms-upload) with an offline fallback.
 */

import { uploadCmsMedia } from '../firebaseLazy';
import { applyWatermark, watermarkedName } from './watermark';
import { THUMB, thumbPathFor, withThumbMarker, needsThumb } from './imageThumbs';

/**
 * Compresses an image File or Blob using native HTML Canvas
 * @param {File} file - Original file from camera or file input
 * @param {Object} options - Compression configuration
 * @returns {Promise<{ blob: Blob, dataUrl: string, sizeKb: number }>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1600,
    maxHeight = 1200,
    quality = 0.82,
    outputType = 'image/jpeg',
    watermark = false // burn the brand logo in (listing photos); see utils/watermark.js
  } = options;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('الملف المحدد ليس صورة صالحة'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('تعذر تحميل بيانات الصورة'));
      img.onload = async () => {
        let { width, height } = img;

        // Calculate proportional dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        const watermarked = watermark ? await applyWatermark(ctx, width, height) : false;

        const dataUrl = canvas.toDataURL(outputType, quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve({ blob: file, dataUrl, sizeKb: Math.round(file.size / 1024), watermarked: false });
            }
            resolve({
              blob,
              dataUrl,
              sizeKb: Math.round(blob.size / 1024),
              watermarked
            });
          },
          outputType,
          quality
        );
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
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
 * Batch uploads multiple property images
 * @param {FileList|File[]} files - List of image files
 * @param {string} propertyId - Property ID
 * @param {Function} onProgress - Progress callback (index, total)
 * @returns {Promise<string[]>} List of image URLs; .inlineCount = how many stayed inside the listing
 */
export async function uploadMultipleImages(files, propertyId = 'general', onProgress = null) {
  const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
  const results = [];
  let inline = 0;

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    try {
      const uploadRes = await uploadPropertyImage(file, propertyId);
      results.push(uploadRes.url);
      if (!uploadRes.isCloud) inline += 1;
      if (onProgress) onProgress(i + 1, fileArray.length);
    } catch (err) {
      console.error(`Failed to process image ${file.name}:`, err);
    }
  }

  // Photos kept inside the listing (upload refused or offline) make it too big to publish
  results.inlineCount = import.meta.env.DEV ? 0 : inline;
  return results;
}
