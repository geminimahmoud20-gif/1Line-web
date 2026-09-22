/**
 * 🖼️ 1LINE CLIENT-SIDE IMAGE COMPRESSOR & OPTIMIZATION ENGINE
 * Resizes and compresses property and document images in the browser
 * before persistence to Firestore or LocalStorage.
 * Prevents exceeding Firestore document size limits (1MB) and speeds up uploads.
 */

/**
 * Compresses an image file or blob using Canvas API.
 * @param {File|Blob} file The input image file
 * @param {Object} options Compression configuration
 * @param {number} options.maxWidth Max width in pixels (default: 1600)
 * @param {number} options.maxHeight Max height in pixels (default: 1200)
 * @param {number} options.quality JPEG/WebP quality from 0.1 to 1.0 (default: 0.82)
 * @param {string} options.outputFormat 'image/webp' | 'image/jpeg' (default: 'image/jpeg')
 * @returns {Promise<{ dataUrl: string, blob: Blob, originalSize: number, compressedSize: number, compressionRatio: number }>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1600,
    maxHeight = 1200,
    quality = 0.82,
    outputFormat = 'image/jpeg'
  } = options;

  if (!file || !(file instanceof Blob)) {
    throw new Error('Valid File or Blob required for compression');
  }

  // If the file is SVG or non-image, skip canvas compression
  if (file.type === 'image/svg+xml' || (!file.type.startsWith('image/') && file.type !== '')) {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      dataUrl,
      blob: file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 1
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
          let { width, height } = img;

          // Calculate aspect ratio preserving dimensions
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback if canvas context fails
            return resolve({
              dataUrl: e.target.result,
              blob: file,
              originalSize: file.size,
              compressedSize: file.size,
              compressionRatio: 1
            });
          }

          // Use high quality image rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // For JPEG, fill background with white to handle transparent PNGs nicely
          if (outputFormat === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Export compressed dataUrl
          const dataUrl = canvas.toDataURL(outputFormat, quality);

          // Also convert to Blob
          canvas.toBlob(
            (compressedBlob) => {
              const finalBlob = compressedBlob || file;
              resolve({
                dataUrl,
                blob: finalBlob,
                originalSize: file.size,
                compressedSize: finalBlob.size || dataUrl.length,
                compressionRatio: Number((finalBlob.size / file.size).toFixed(2))
              });
            },
            outputFormat,
            quality
          );
        } catch (err) {
          console.warn('Image canvas compression fallback triggered:', err);
          resolve({
            dataUrl: e.target.result,
            blob: file,
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 1
          });
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Batch compress an array of image files
 */
export async function compressImages(files = [], options = {}) {
  if (!Array.isArray(files) || files.length === 0) return [];
  const results = [];
  for (const file of files) {
    try {
      const res = await compressImage(file, options);
      results.push(res);
    } catch (e) {
      console.error('Failed to compress one image in batch:', e);
    }
  }
  return results;
}

/**
 * Helper to read file as Data URL
 */
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
