// =============================================================
//  ONE LINE REAL ESTATE - CLIENT IMAGE COMPRESSOR & OPTIMIZER
//  Downsamples large camera/phone photos before storage
//  Reduces typical 5MB-10MB photos to ~100KB-150KB without visual loss
// =============================================================

/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * @param {File} file The original file from input[type=file]
 * @param {Object} options Compression configuration
 * @returns {Promise<{dataUrl: string, originalSize: number, compressedSize: number, compressionRatio: string}>}
 */
export function compressImageFile(file, options = {}) {
  const {
    maxWidth = 1400,
    maxHeight = 1400,
    quality = 0.8,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('الملف المرفوع ليس صورة صالحة'));
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = (err) => reject(err);

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        // Draw to Off-screen Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Apply smooth downsampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export compressed Data URL
        const dataUrl = canvas.toDataURL(mimeType, quality);
        
        // Approximate compressed size in bytes from base64 string
        const head = `data:${mimeType};base64,`;
        const base64Length = dataUrl.length - head.length;
        const compressedBytes = Math.round((base64Length * 3) / 4);

        const originalBytes = file.size;
        const ratio = ((1 - compressedBytes / originalBytes) * 100).toFixed(1) + '%';

        resolve({
          dataUrl,
          originalSize: originalBytes,
          compressedSize: compressedBytes,
          compressionRatio: ratio,
          width,
          height
        });
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Batch compresses an array of image files with progress callback
 * @param {Array<File>} files
 * @param {Object} options
 * @returns {Promise<Array<string>>} Array of compressed Data URLs
 */
export async function compressImageFilesBatch(files, options = {}) {
  const results = [];
  for (const file of files) {
    try {
      const compressed = await compressImageFile(file, options);
      results.push(compressed.dataUrl);
    } catch (err) {
      console.warn(`Skipping file compression for ${file.name}:`, err);
    }
  }
  return results;
}
