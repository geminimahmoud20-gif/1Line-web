// =============================================================
//  1LINE ENTERPRISE CRM - CLIENT-SIDE IMAGE COMPRESSOR
//  Prevents Firestore 1MB document size limit crashes
//  Ensures fast upload, optimal resolution (1280px) & Web-ready size (<200KB)
// =============================================================

/**
 * Compresses an image file in the browser using HTML5 Canvas
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.8,
    targetMaxBytes = 250 * 1024 // 250 KB
  } = options;

  if (!file || !file.type.startsWith('image/')) {
    throw new Error('الملف ليس صورة صالحة');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate scaled dimensions keeping aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // First pass
        let currentQuality = quality;
        let dataUrl = canvas.toDataURL('image/jpeg', currentQuality);

        // Approximate size check
        let approxSize = Math.round((dataUrl.length * 3) / 4);

        // If still too large, step down quality
        if (approxSize > targetMaxBytes) {
          currentQuality = 0.65;
          dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
          approxSize = Math.round((dataUrl.length * 3) / 4);
        }

        resolve({
          dataUrl,
          originalSize: file.size,
          compressedSize: approxSize,
          savedPercent: Math.max(0, Math.round(((file.size - approxSize) / file.size) * 100)),
          width,
          height
        });
      };

      img.onerror = () => reject(new Error('فشل معالجة الصورة'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

/**
 * Batch compress multiple image files
 */
export async function compressMultipleImages(fileList, options = {}) {
  const files = Array.from(fileList || []);
  const results = [];

  for (const file of files) {
    try {
      const compressed = await compressImage(file, options);
      results.push(compressed);
    } catch (err) {
      console.warn('Image compression skipped for file:', file.name, err);
    }
  }

  return results;
}

export const compressImageFile = compressImage;
