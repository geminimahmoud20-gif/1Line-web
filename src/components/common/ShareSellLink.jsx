import { useState } from 'react';
import { Link2, Check, Share2, Send } from 'lucide-react';
import { siteLink } from '../../config/siteConfig';
import { sellLinkPath, sellLinkMessage } from '../../utils/sellLink';
import './share-sell-link.css';

/**
 * «ابعت فورم تسجيل الوحدة»: the seller form link, ready for WhatsApp, the phone's share sheet or
 * the clipboard. `type` / `area` preselect the form; `refName` tells the CRM who sent it.
 */
export default function ShareSellLink({ isAr = true, type = '', area = '', refName = '', compact = false }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const L = (ar, en) => (isAr ? ar : en);
  const url = siteLink(sellLinkPath({ type, area, ref: refName }));
  const message = sellLinkMessage(url);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); } catch {
      const input = document.createElement('input');
      input.value = url; document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const share = async () => {
    try { await navigator.share({ title: L('سجّل وحدتك', 'List your property'), text: message.replace(url, '').trim(), url }); } catch { /* closed */ }
  };

  return (
    <div className={`ssl ${compact ? 'ssl--compact' : ''}`}>
      <button type="button" className="ssl-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Send size={16} aria-hidden="true" />
        <span>{L('ابعت فورم تسجيل الوحدة لصاحب العقار', 'Send the listing form to an owner')}</span>
      </button>
      {open && (
        <div className="ssl-panel">
          <p className="ssl-hint">{L('صاحب العقار يفتح اللينك ويكتب المواصفات والسعر ويرفع الصور، والطلب يوصل لكم في الـ CRM.', 'The owner opens the link, fills in the unit and photos, and it reaches the CRM.')}</p>
          <code className="ssl-url" dir="ltr">{url}</code>
          <div className="ssl-actions">
            <a className="ssl-btn ssl-btn--wa" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
              <span>{L('واتساب', 'WhatsApp')}</span>
            </a>
            {canShare && (
              <button type="button" className="ssl-btn" onClick={share}><Share2 size={16} aria-hidden="true" /><span>{L('مشاركة', 'Share')}</span></button>
            )}
            <button type="button" className="ssl-btn" onClick={copy} aria-live="polite">
              {copied ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
              <span>{copied ? L('اتنسخ', 'Copied') : L('نسخ اللينك', 'Copy link')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
