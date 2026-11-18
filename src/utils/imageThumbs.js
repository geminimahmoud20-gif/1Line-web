// Small copies of listing photos. Cards, thumbnails and pickers show a 640px copy instead of the
// full 1600px photo, which cuts Blob transfer to roughly a quarter.
// The copy's address is derived from the photo's own path, and a photo carries `?sm=1` only once
// its copy exists, so nothing else in the listing has to change.
// Pure helpers, unit-tested in tests/unit/image-thumbs.test.mjs.

export const THUMB = { width: 640, height: 640, quality: 0.74, ext: '.w640.jpg', folder: 'cms/thumbs/' };
const MARKER = 'sm';

const BLOB_HOST = /^[a-z0-9]+\.public\.blob\.vercel-storage\.com$/i;

const parse = (url) => {
  if (typeof url !== 'string' || !url.startsWith('https://')) return null;
  try {
    const u = new URL(url);
    return BLOB_HOST.test(u.hostname) ? u : null;
  } catch {
    return null;
  }
};

/** Path of the small copy for a stored photo path ("seller/a-x.jpg" → "cms/thumbs/seller_a-x.w640.jpg") */
export function thumbPathFor(pathname) {
  const flat = String(pathname || '')
    .replace(/^\/+/, '')
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[^\w.-]+/g, '_');
  return `${THUMB.folder}${flat}${THUMB.ext}`;
}

export const isThumbPath = (pathname) => String(pathname || '').replace(/^\/+/, '').startsWith(THUMB.folder);

/** A photo on our Blob store whose small copy exists */
export const hasThumb = (url) => parse(url)?.searchParams.get(MARKER) === '1';

/** A photo on our Blob store that has no small copy yet */
export function needsThumb(url) {
  const u = parse(url);
  return Boolean(u) && u.searchParams.get(MARKER) !== '1' && !isThumbPath(decodeURIComponent(u.pathname));
}

/** The photo's address once its small copy is uploaded */
export function withThumbMarker(url) {
  const u = parse(url);
  if (!u) return url;
  u.searchParams.set(MARKER, '1');
  return u.toString();
}

/** What a card or thumbnail should load: the small copy when there is one, else the photo itself */
export function thumbUrl(url) {
  const u = parse(url);
  if (!u || u.searchParams.get(MARKER) !== '1') return url;
  return `${u.origin}/${thumbPathFor(decodeURIComponent(u.pathname))}`;
}

/** onError for an <img> showing thumbUrl(full): falls back to the full photo once */
export const thumbFallback = (full) => (e) => {
  const el = e.currentTarget;
  if (!full || el.dataset.thumbFallback) return;
  el.dataset.thumbFallback = '1';
  el.src = full;
};
