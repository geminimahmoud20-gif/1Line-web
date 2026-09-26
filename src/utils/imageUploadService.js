/**
 * 📷 ONELINE PROPTECH - IMAGE COMPRESSION & CLOUD UPLOAD SERVICE
 * Compresses large mobile phone photos (8-15MB) into lightweight high-res WebP/JPEGs (~150-250KB)
 * and uploads them to Vercel Blob (via /api/cms-upload) with an offline fallback.
 */

import { uploadCmsMedia } from '../firebaseLazy';

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
    outputType = 'image/jpeg'
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
      img.onload = () => {
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

        const dataUrl = canvas.toDataURL(outputType, quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve({ blob: file, dataUrl, sizeKb: Math.round(file.size / 1024) });
            }
            resolve({
              blob,
              dataUrl,
              sizeKb: Math.round(blob.size / 1024)
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
  const compressed = await compressImage(file);

  // The local dev server has no /api routes, so only production tries the cloud
  if (!import.meta.env.DEV) {
    const type = compressed.blob.type || 'image/jpeg';
    const base = (file.name || 'photo').replace(/\.[^.]+$/, '');
    const upload = new File([compressed.blob], `${propertyId}-${base}.${type === 'image/webp' ? 'webp' : 'jpg'}`, { type });
    const res = await uploadCmsMedia(upload, 'image');
    if (res.ok) return { url: res.url, isCloud: true, sizeKb: compressed.sizeKb };
    console.warn('Cloud image upload skipped (falling back to local data URL):', res.reason);
  }

  // Graceful Offline / Local fallback: Return the high-quality compressed Base64 Data URL
  return {
    url: compressed.dataUrl,
    isCloud: false,
    sizeKb: compressed.sizeKb
  };
}

/**
 * Batch uploads multiple property images
 * @param {FileList|File[]} files - List of image files
 * @param {string} propertyId - Property ID
 * @param {Function} onProgress - Progress callback (index, total)
 * @returns {Promise<string[]>} List of image URLs
 */
export async function uploadMultipleImages(files, propertyId = 'general', onProgress = null) {
  const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
  const results = [];

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    try {
      const uploadRes = await uploadPropertyImage(file, propertyId);
      results.push(uploadRes.url);
      if (onProgress) onProgress(i + 1, fileArray.length);
    } catch (err) {
      console.error(`Failed to process image ${file.name}:`, err);
    }
  }

  return results;
}
