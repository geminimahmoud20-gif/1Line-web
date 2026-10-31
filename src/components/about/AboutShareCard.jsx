import { useState } from 'react';
import { Share2, Link2, Check } from 'lucide-react';
import { siteLink } from '../../config/siteConfig';
import SocialLinks from '../common/SocialIcons';
import './about-share.css';

const WhatsAppGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
  </svg>
);

/**
 * «ابعت صفحة الشركة»: for when a client asks «إنتوا مين؟». One tap shares the About page link
 * (phone share sheet, WhatsApp, or copy), with the company's social accounts under it.
 */
export default function AboutShareCard({ isAr = true, social = {} }) {
  const [copied, setCopied] = useState(false);
  const url = siteLink('/about');
  const L = (ar, en) => (isAr ? ar : en);
  const text = L(
    '1Line للوساطة والاستشارات العقارية في سوهاج. اتعرّف علينا، مين إحنا وإزاي بنشتغل:',
    '1Line, real estate brokerage and advisory in Sohag. Who we are and how we work:'
  );
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const share = async () => {
    try {
      await navigator.share({ title: '1Line', text, url });
    } catch {
      // closed the share sheet: nothing to do
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasSocial = Object.keys(social || {}).length > 0;

  return (
    <section className="about-share section-container" aria-labelledby="about-share-title">
      <div className="about-share-card">
        <div className="about-share-text">
          <h2 id="about-share-title" className="about-share-title">{L('ابعت صفحة الشركة', 'Share our company page')}</h2>
          <p className="about-share-sub">{L('لو حد سألك «إنتوا مين؟» ابعتله اللينك ده، فيه كل حاجة عننا.', 'If someone asks who we are, send them this page.')}</p>
        </div>

        <div className="about-share-actions">
          {canShare && (
            <button type="button" className="about-share-btn about-share-btn--primary" onClick={share}>
              <Share2 size={18} aria-hidden="true" />
              <span>{L('مشاركة', 'Share')}</span>
            </button>
          )}
          <a
            className="about-share-btn about-share-btn--wa"
            href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppGlyph />
            <span>{L('واتساب', 'WhatsApp')}</span>
          </a>
          <button type="button" className="about-share-btn" onClick={copy} aria-live="polite">
            {copied ? <Check size={18} aria-hidden="true" /> : <Link2 size={18} aria-hidden="true" />}
            <span>{copied ? L('اتنسخ', 'Copied') : L('نسخ اللينك', 'Copy link')}</span>
          </button>
        </div>

        {hasSocial && (
          <div className="about-share-follow">
            <span className="about-share-follow-label">{L('تابعنا', 'Follow us')}</span>
            <SocialLinks social={social} isAr={isAr} variant="page" />
          </div>
        )}
      </div>
    </section>
  );
}
