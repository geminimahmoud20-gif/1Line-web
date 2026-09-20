import { useState } from 'react';
import { X, Check, Copy, MessageSquare, ExternalLink } from 'lucide-react';

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
      ? `اكتشف أرقى العقارات والفرص الاستثمارية بسوهاج على منصة 1Line: ${url}`
      : `Explore top verified properties in Sohag on 1Line: ${url}`
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    if (triggerToast) {
      triggerToast(isAr ? 'تم نسخ الرابط بنجاح' : 'Link copied to clipboard', 'success');
    }
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="track-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="track-modal-header">
          <h3>{modalTitle}</h3>
          <p>{modalSubtitle}</p>
        </div>

        <div className="share-links-row">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(waShareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp"
          >
            <MessageSquare size={16} />
            <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
          </a>

          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-call"
          >
            <ExternalLink size={16} />
            <span>Facebook</span>
          </a>
        </div>

        <div className="copy-link-box">
          <input type="text" readOnly value={url} />
          <button type="button" className="btn btn-primary" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

