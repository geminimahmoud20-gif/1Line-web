// Still pictures taken from the hero videos. Phones never download the videos (they are several MB
// each and count against the Blob transfer limit), so on a phone the hero shows one still per
// video and changes between them on the same timer the videos use on a desktop.
// heroSlides is pure and unit-tested in tests/unit/video-poster.test.mjs.

const usable = (url) => {
  const u = String(url ?? '').trim();
  return u && !u.startsWith('data:') && (/^https:\/\//.test(u) || u.startsWith('/')) ? u : '';
};

/**
 * The stills the phone hero changes between: one per video that has its own picture, in the
 * playlist order, without repeats. When fewer than two exist there is nothing to change between,
 * and the single picture (the first still, else the fallback poster) is used.
 */
export function heroSlides(clips, fallbackPoster = '') {
  const seen = new Set();
  const slides = [];
  for (const clip of Array.isArray(clips) ? clips : []) {
    const poster = usable(clip?.poster);
    if (!poster || seen.has(poster)) continue;
    seen.add(poster);
    slides.push({ id: String(clip.id || poster), poster, title_ar: clip.title_ar || '', title_en: clip.title_en || clip.title_ar || '' });
  }
  if (slides.length > 1) return slides;
  const one = slides[0]?.poster || usable(fallbackPoster);
  return one ? [{ id: 'poster', poster: one, title_ar: '', title_en: '' }] : [];
}

/** Seconds between stills: the CMS interval, never faster than 5s */
export const slideIntervalMs = (sec) => Math.max(5, Number(sec) || 10) * 1000;

/**
 * A JPEG still from a video (a File just picked, or a video URL), taken a moment into the clip
 * so it isn't a black first frame. Resolves to a Blob, or null when the browser can't read it
 * (an unsupported codec, or a server that refuses cross-origin reads).
 */
export function captureVideoFrame(source, { maxWidth = 1280, quality = 0.82, timeoutMs = 20000 } = {}) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve(null);
    const isFile = typeof Blob !== 'undefined' && source instanceof Blob;
    const src = isFile ? URL.createObjectURL(source) : String(source || '');
    if (!src) return resolve(null);
    const video = document.createElement('video');
    let done = false;
    const finish = (blob) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      if (isFile) URL.revokeObjectURL(src);
      resolve(blob);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    if (!isFile) video.crossOrigin = 'anonymous';
    video.onerror = () => finish(null);
    video.onloadedmetadata = () => {
      const d = Number.isFinite(video.duration) ? video.duration : 0;
      video.currentTime = d > 0 ? Math.min(1.5, d * 0.25) : 0;
    };
    video.onseeked = () => {
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return finish(null);
        const scale = Math.min(1, maxWidth / w);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => finish(blob || null), 'image/jpeg', quality);
      } catch {
        finish(null); // a tainted canvas: the video server sends no CORS header
      }
    };
    video.src = src;
  });
}
