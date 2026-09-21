import { useState } from 'react';
import { X, Check, Copy, MessageSquare, ExternalLink, Share2, Send } from 'lucide-react';

export default function ShareModal({ isOpen, onClose, lang = 'ar', triggerToast, shareData }) {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const url = shareData?.url || (typeof window !== 'undefined' ? (window.location.origin + window.location.pathname) : 'https://oneline-sohag.com');
  const modalTitle = shareData?.title 
    ? (isAr ? `مشاركة: ${shareData.title}` : `Share: ${shareData.title}`)
    : (isAr ? 'مشاركة منصة 1Line العقارية' : 'Share 1Line Platform');
  const modalSubtitle = shareData?.subtitle || (
    isAr 
      ? 'شارك أفضل الفرص العقارية المعتمدة بسوهاج مع أصدقائك وعائلتك' 
      : 'Share top verified real estate opportunities in Sohag with your network'
  );
  const waShareText = shareData?.text || (
    isAr
      ? `اكتشف أرقى العقارات والفرص الاستثمارية بسوهاج على منصة 1Line:\n${shareData?.title ? `📌 ${shareData.title}\n` : ''}${url}`
      : `Explore top verified properties in Sohag on 1Line:\n${shareData?.title ? `📌 ${shareData.title}\n` : ''}${url}`
  );

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: shareData?.title || '1Line Real Estate Solutions',
        text: waShareText,
        url: url
      });
    } catch (err) {
      if (err?.name !== 'AbortError') {
        handleCopy();
      }
    }
  };

  const handleCopy = async () => {
    let success = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        success = true;
      }
    } catch {
      // Fallback
    }

    if (!success) {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        success = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {
        console.error('Fallback copy failed', e);
      }
    }

    setCopied(true);
    if (triggerToast) {
      triggerToast(isAr ? 'تم نسخ الرابط بنجاح إلى الحافظة' : 'Link copied to clipboard', 'success');
    }
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="track-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="track-modal-card luxury-share-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'}>
          <X size={18} />
        </button>

        <div className="track-modal-header share-modal-header">
          <div className="share-icon-badge">
            <Share2 size={22} className="text-gold" />
          </div>
          <h3>{modalTitle}</h3>
          <p>{modalSubtitle}</p>
        </div>

        {/* Optional Property Mini Preview Strip */}
        {shareData?.image && (
          <div className="share-preview-strip">
            <img src={shareData.image} alt={shareData.title || 'Property'} className="share-preview-thumb" />
            <div className="share-preview-meta">
              <strong>{shareData.title}</strong>
              {shareData.subtitle && <span>{shareData.subtitle}</span>}
            </div>
          </div>
        )}

        {/* 1-Click Native Mobile Share (If Supported) */}
        {canNativeShare && (
          <div className="share-native-row">
            <button 
              type="button" 
              className="btn btn-native-share" 
              onClick={handleNativeShare}
              title={isAr ? 'مشاركة عبر تطبيقات هاتفك' : 'Share via Device Apps'}
            >
              <Share2 size={16} />
              <span>{isAr ? 'مشاركة مباشرة عبر تطبيقات هاتفك' : 'Share via Device Apps'}</span>
            </button>
          </div>
        )}

        {/* Multi-Platform Social Share Grid */}
        <div className="share-links-grid">
          {/* WhatsApp */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(waShareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="social-share-btn share-wa"
            title="WhatsApp"
          >
            <MessageSquare size={17} />
            <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
          </a>

          {/* Telegram */}
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(waShareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="social-share-btn share-tg"
            title="Telegram"
          >
            <Send size={16} />
            <span>{isAr ? 'تيليجرام' : 'Telegram'}</span>
          </a>

          {/* Facebook */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="social-share-btn share-fb"
            title="Facebook"
          >
            <ExternalLink size={16} />
            <span>فيسبوك</span>
          </a>

          {/* LinkedIn */}
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="social-share-btn share-in"
            title="LinkedIn"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
            </svg>
            <span>LinkedIn</span>
          </a>
        </div>

        {/* Copy Direct Link Box */}
        <div className="copy-link-box-wrapper">
          <label className="copy-link-label">
            {isAr ? 'أو انسخ رابط العقار المباشر:' : 'Or copy the direct link:'}
          </label>
          <div className="copy-link-box">
            <input 
              type="text" 
              readOnly 
              value={url} 
              onClick={(e) => e.target.select()}
              aria-label={isAr ? 'رابط المشاركة' : 'Share Link'}
            />
            <button 
              type="button" 
              className={`btn ${copied ? 'btn-copied' : 'btn-primary'}`} 
              onClick={handleCopy}
              title={isAr ? 'نسخ الرابط' : 'Copy Link'}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? (isAr ? 'تم النسخ' : 'Copied!') : (isAr ? 'نسخ' : 'Copy')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
