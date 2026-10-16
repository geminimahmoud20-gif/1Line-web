// Brand watermark burned into listing photos at upload, so a downloaded or re-posted photo still
// carries the logo (the CSS overlay on the site disappears the moment someone saves the file).
// Two marks, both light enough not to get in a buyer's way:
//   • the emblem in the bottom corner, clearly readable
//   • a very faint large emblem in the middle, so cropping the corner off doesn't remove the mark
// Files that carry it are named "…-wm…" so the site doesn't add its CSS overlay on top.

export const WATERMARK = {
  src: '/logo-emblem.png',
  cornerShare: 0.13, // emblem width as a share of the photo's shorter side
  cornerMin: 44, // px
  cornerMax: 150,
  cornerMargin: 0.035, // gap from the edges, share of the shorter side
  cornerOpacity: 0.72,
  centerShare: 0.36,
  centerOpacity: 0.045
};

/** Where to draw both marks on a width×height photo (pure, unit-tested). */
export function watermarkLayout(width, height, cfg = WATERMARK) {
  const short = Math.max(1, Math.min(width, height));
  const size = Math.round(Math.min(cfg.cornerMax, Math.max(cfg.cornerMin, short * cfg.cornerShare)));
  const margin = Math.round(short * cfg.cornerMargin);
  const center = Math.round(short * cfg.centerShare);
  return {
    corner: { x: width - size - margin, y: height - size - margin, size, opacity: cfg.cornerOpacity },
    center: { x: Math.round((width - center) / 2), y: Math.round((height - center) / 2), size: center, opacity: cfg.centerOpacity }
  };
}

/** True for files produced by applyWatermark (named "…-wm…"). */
export const isWatermarked = (url) => /-wm(?=[-_.]|$)/.test(String(url || '').split('?')[0]);

/** File name with the "-wm" marker, keeping the extension: "flat-1.jpg" → "flat-1-wm.jpg". */
export const watermarkedName = (name = 'photo.jpg') => {
  const m = /^(.*?)(\.[a-z0-9]+)?$/i.exec(name);
  return isWatermarked(name) ? name : `${m[1]}-wm${m[2] || ''}`;
};

let logoPromise = null;
const loadLogo = () => {
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { logoPromise = null; resolve(null); }; // no logo → upload still works, unmarked
      img.src = WATERMARK.src;
    });
  }
  return logoPromise;
};

/**
 * Draws both marks onto a canvas context already holding the photo. Resolves to true when the
 * logo was drawn (false if the logo file couldn't load: the photo is then uploaded without it).
 */
export async function applyWatermark(ctx, width, height) {
  const logo = await loadLogo();
  if (!logo) return false;
  const { corner, center } = watermarkLayout(width, height);
  ctx.save();
  ctx.globalAlpha = center.opacity;
  ctx.drawImage(logo, center.x, center.y, center.size, center.size);
  // A soft shadow keeps the corner emblem readable on white walls and bright skies
  ctx.globalAlpha = corner.opacity;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = Math.round(corner.size * 0.08);
  ctx.drawImage(logo, corner.x, corner.y, corner.size, corner.size);
  ctx.restore();
  return true;
}
