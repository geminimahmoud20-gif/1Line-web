// A listing reaches the public site only when it is complete: a title, at least one real photo
// (not the old stock picture or the "no photo" image), a price, a size and an area. Status
// (published / sold / hidden…) is still decided by each page; this only keeps half-filled
// listings off the site. The CRM shows the same gaps as "ناقص" on each row. Pure; tested.
import { withoutStockPhotos } from './sampleDataFlags.js';

const NO_PHOTO = ['/no-photo.svg', 'no-photo', 'placeholder'];

export const realPhotoCount = (p) => (Array.isArray(p?.images) ? p.images : [])
  .filter((src) => typeof src === 'string' && src.trim() && !NO_PHOTO.some((s) => src.includes(s))).length;

/** What a listing lacks before the site may show it: 'title' | 'photo' | 'price' | 'size' | 'area' */
export function siteGaps(p) {
  const shown = withoutStockPhotos(p);
  const out = [];
  if (!String(shown?.title_ar || shown?.title_en || '').trim()) out.push('title');
  if (realPhotoCount(shown) === 0) out.push('photo');
  if (!(Number(shown?.price) > 0)) out.push('price');
  if (!(Number(shown?.size) > 0)) out.push('size');
  if (!shown?.areaKey) out.push('area');
  return out;
}

/** Bundled samples (isDemo, only shown while the catalogue loads) are exempt */
export const isSiteReady = (p) => !!p && (p.isDemo || siteGaps(p).length === 0);

/** The list the public pages get: stock photos removed, incomplete listings left out */
export const forSite = (list = []) => list.map(withoutStockPhotos).filter(isSiteReady);
