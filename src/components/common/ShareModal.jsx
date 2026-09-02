import { useState } from 'react';
import { X, Check, Copy, MessageSquare } from 'lucide-react';

export default function ShareModal({ isOpen, onClose, lang, triggerToast }) {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const url = window.location.origin || 'https://oneline-sohag.com';

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    triggerToast(lang === 'ar' ? 'تم نسخ الرابط بنجاح' : 'Link copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="track-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="track-modal-header">
          <h3>{lang === 'ar' ? 'مشاركة منصة 1Line العقارية' : 'Share 1Line Platform'}</h3>
          <p>{lang === 'ar' ? 'شارك أفضل الفرص العقارية مع أصدقائك وعائلتك' : 'Share top real estate opportunities with your network'}</p>
        </div>

        <div className="share-links-row">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`اكتشف أرقى العقارات والفرص الاستثمارية بسوهاج على منصة 1Line: ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp"
          >
            <MessageSquare size={16} />
            <span>واتساب</span>
          </a>

          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-call"
          >
            <span>Facebook</span>
          </a>
        </div>

        <div className="copy-link-box">
          <input type="text" readOnly value={url} />
          <button type="button" className="btn btn-primary" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? (lang === 'ar' ? 'تم النسخ' : 'Copied') : (lang === 'ar' ? 'نسخ' : 'Copy')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
