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

        {/* WhatsApp Direct Share Action */}
        <div className="share-single-wa-action" style={{ margin: '18px 0 16px' }}>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(waShareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="social-share-btn share-wa"
            style={{
              width: '100%',
              height: '48px',
              fontSize: '0.96rem',
              fontWeight: 800,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              textDecoration: 'none',
              background: '#25D366',
              color: '#ffffff',
              boxShadow: '0 4px 16px rgba(37, 211, 102, 0.32)'
            }}
            title={isAr ? 'مشاركة عبر واتساب' : 'Share via WhatsApp'}
          >
            <MessageSquare size={19} />
            <span>{isAr ? 'مشاركة عبر تطبيق واتساب 💬' : 'Share via WhatsApp'}</span>
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
