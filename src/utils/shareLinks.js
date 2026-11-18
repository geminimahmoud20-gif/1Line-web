// =============================================================
//  Share links for the platforms, each tagged with utm_source=<platform>&utm_medium=social_share so
//  the visitors a share brings back show by platform in the site's analytics (src/utils/analytics.js
//  reads utm_source). Pure: tests/unit/share-links.test.mjs.
// =============================================================

/** url with utm_source / utm_medium added (an existing hash stays at the end) */
export function tagged(url, source, medium = 'social_share') {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', source);
    u.searchParams.set('utm_medium', medium);
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * { facebook, whatsapp, telegram, x, copy, nativeUrl }: the address to open for each platform.
 * Facebook takes only the link (it builds the post from the page's link preview); the rest also get
 * `text`. `copy` is the text with the link, for pasting anywhere.
 */
export function shareTargets({ url, text = '' }) {
  const enc = encodeURIComponent;
  const withLink = (src) => `${text ? `${text}\n` : ''}${tagged(url, src)}`;
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(tagged(url, 'facebook'))}`,
    whatsapp: `https://wa.me/?text=${enc(withLink('whatsapp'))}`,
    telegram: `https://t.me/share/url?url=${enc(tagged(url, 'telegram'))}${text ? `&text=${enc(text)}` : ''}`,
    x: `https://twitter.com/intent/tweet?url=${enc(tagged(url, 'x'))}${text ? `&text=${enc(text.slice(0, 200))}` : ''}`,
    copy: withLink('copy_link'),
    nativeUrl: tagged(url, 'share_sheet')
  };
}
