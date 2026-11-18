// =============================================================
//  A photo from a phone can be 5 MB or more: before it is uploaded it is scaled down (the longest side to
//  MAX_SIDE) and saved as JPEG, which is plenty to read a document or see a property. PDFs and small images
//  are sent as they are. Browser only; anything that goes wrong sends the original file.
// =============================================================
const MAX_SIDE = 1800;
const SHRINK_ABOVE = 1.5 * 1024 * 1024;

export async function prepareAttachment(file) {
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type) || file.size <= SHRINK_ABOVE) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.\w+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
