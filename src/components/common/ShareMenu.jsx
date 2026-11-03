import { useEffect, useRef, useState } from 'react';
import { Share2, Link2, Check, MoreHorizontal } from 'lucide-react';
import { shareTargets } from '../../utils/shareLinks';
import './share-menu.css';

const ICONS = {
  facebook: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.4V14h2.7v8h3.4Z" /></svg>,
  whatsapp: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.13c-.24.68-1.42 1.3-1.95 1.35-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.93-4.66-4.11-.13-.18-1.1-1.47-1.1-2.8 0-1.33.7-1.99.95-2.26.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.47.24.56.8 1.94.87 2.08.07.14.12.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.27.14.43.11.59-.07.16-.18.68-.79.86-1.07.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.14.45.2.52.32.07.11.07.66-.17 1.33Z" /></svg>,
  telegram: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M21.9 4.3 18.7 19.4c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13.1l-4.8-1.5c-1-.3-1-1 .2-1.5L20.5 2.9c.9-.3 1.6.2 1.4 1.4Z" /></svg>,
  x: <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" /></svg>
};

/**
 * «مشاركة»: a small menu of the platforms (Facebook, WhatsApp, Telegram, X), copy link, and the
 * phone's own share sheet. Each link carries utm_source, so visitors it brings show in analytics.
 * Facebook builds its post from the page's link preview; the others get `text` with the link.
 */
export default function ShareMenu({ url, text = '', title = '', isAr = true, className = '', label }) {
  const L = (ar, en) => (isAr ? ar : en);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const targets = shareTargets({ url, text });
  const native = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(targets.copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* the link stays visible to copy by hand */ }
  };
  const more = async () => {
    try { await navigator.share({ title, text, url: targets.nativeUrl }); setOpen(false); } catch { /* closed */ }
  };

  return (
    <div className={`share-menu ${className}`} ref={ref}>
      <button type="button" className="share-menu-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        <Share2 size={15} aria-hidden="true" />
        <span>{label || L('مشاركة', 'Share')}</span>
      </button>
      {open && (
        <div className="share-menu-pop" role="menu" aria-label={L('شارك على', 'Share on')}>
          {[
            ['facebook', L('فيسبوك', 'Facebook')],
            ['whatsapp', L('واتساب', 'WhatsApp')],
            ['telegram', L('تليجرام', 'Telegram')],
            ['x', 'X']
          ].map(([id, name]) => (
            <a key={id} role="menuitem" className={`share-menu-item is-${id}`} href={targets[id]} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
              {ICONS[id]}<span>{name}</span>
            </a>
          ))}
          <button type="button" role="menuitem" className="share-menu-item" onClick={copy}>
            {copied ? <Check size={17} aria-hidden="true" /> : <Link2 size={17} aria-hidden="true" />}
            <span>{copied ? L('اتنسخ', 'Copied') : L('نسخ اللينك', 'Copy link')}</span>
          </button>
          {native && (
            <button type="button" role="menuitem" className="share-menu-item" onClick={more}>
              <MoreHorizontal size={17} aria-hidden="true" /><span>{L('تطبيقات تانية', 'More apps')}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
