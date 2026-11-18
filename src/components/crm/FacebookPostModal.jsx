import { useEffect, useMemo, useState } from 'react';
import { X, Download, Copy, Check, Share2, Loader2, Megaphone } from 'lucide-react';
import { drawListingPost, POST_FORMATS } from '../../utils/listingPostCard';
import { facebookCaption } from '../../utils/listingShare';
import { getDynamicPhone } from '../../utils/founderCmsData';
import { readablePhone } from '../../utils/phoneDisplay';
import { siteLink } from '../../config/siteConfig';
import './facebook-post.css';

/**
 * «منشور فيسبوك» for a listing: a ready image (post 4:5, square or story) and an editable caption
 * written to get comments. Download the image and copy the caption on a computer; on a phone the
 * share button hands both to Facebook / Instagram / WhatsApp.
 */
export default function FacebookPostModal({ property, areas = [], isAr = true, onClose, triggerToast }) {
  const L = (ar, en) => (isAr ? ar : en);
  const [format, setFormat] = useState('post');
  // The drawn image for one format: «drawing» until the result for the chosen format arrives
  const [drawn, setDrawn] = useState({ format: '', blob: null });
  const drawing = drawn.format !== format;
  const blob = drawing ? null : drawn.blob;
  const [copied, setCopied] = useState(false);
  const areaName = useMemo(() => {
    const a = areas.find((x) => x.id === property.areaKey);
    return a ? a.name_ar : '';
  }, [areas, property.areaKey]);
  const phone = readablePhone(getDynamicPhone());
  const url = siteLink(`/properties/${encodeURIComponent(property.id)}`);
  const [caption, setCaption] = useState(() => facebookCaption(property, { url, phone, areaName }));
  const preview = useMemo(() => (blob ? URL.createObjectURL(blob) : ''), [blob]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  useEffect(() => {
    let live = true;
    drawListingPost({ property, format, areaName, phone }).then((b) => {
      if (live) setDrawn({ format, blob: b });
    });
    return () => { live = false; };
  }, [property, format, areaName, phone]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fileName = `1line-${String(property.unitCode || property.id).replace(/[^\w-]+/g, '_')}-${format}.png`;
  const download = () => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = preview;
    a.download = fileName;
    a.click();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      triggerToast?.(L('مقدرناش ننسخ، حدد الكلام وانسخه يدوي', 'Copy failed, select and copy by hand'), 'error');
    }
  };
  const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null;
  const canShareFile = Boolean(file && typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] }));
  const share = async () => {
    try {
      // Facebook drops shared text, so the caption is copied first, ready to paste
      await navigator.clipboard?.writeText(caption).catch(() => {});
      await navigator.share({ files: [file], text: caption });
    } catch (err) {
      if (err?.name !== 'AbortError') triggerToast?.(L('المشاركة مش متاحة هنا، حمّل الصورة وانسخ الكلام', 'Sharing is not available here'), 'error');
    }
  };

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="fbp" role="dialog" aria-modal="true" aria-labelledby="fbp-title" onClick={(e) => e.stopPropagation()}>
        <header className="fbp-head">
          <h3 id="fbp-title"><Megaphone size={18} aria-hidden="true" /> {L('منشور فيسبوك', 'Facebook post')}</h3>
          <button type="button" className="drawer-close-btn" onClick={onClose} aria-label={L('إغلاق', 'Close')}><X size={18} /></button>
        </header>

        <div className="fbp-body">
          <div className="fbp-preview">
            <div className="fbp-formats" role="radiogroup" aria-label={L('مقاس الصورة', 'Image size')}>
              {Object.entries(POST_FORMATS).map(([id, f]) => (
                <button key={id} type="button" role="radio" aria-checked={format === id} className={format === id ? 'is-on' : ''} onClick={() => setFormat(id)}>
                  {isAr ? f.label_ar : f.label_en}
                </button>
              ))}
            </div>
            <div className={`fbp-image is-${format}`}>
              {drawing && <span className="fbp-loading"><Loader2 size={22} className="spin-animation" aria-hidden="true" /> {L('بنجهّز الصورة…', 'Drawing…')}</span>}
              {!drawing && preview && <img src={preview} alt={property.title_ar || ''} />}
              {!drawing && !preview && <span className="fbp-loading">{L('المتصفح ده مش بيرسم الصورة', 'This browser cannot draw the image')}</span>}
            </div>
            <p className="fbp-tip">{L('«منشور 4:5» بياخد أكبر مساحة في الفيد على فيسبوك وإنستجرام. لو الصورة طلعت من غير صورة الوحدة، ارفع صور الوحدة تاني من التعديل.', 'The 4:5 post takes the most room in the feed.')}</p>
          </div>

          <div className="fbp-caption">
            <label htmlFor="fbp-text">{L('الكلام (تقدر تعدّل فيه)', 'Caption (editable)')}</label>
            <textarea id="fbp-text" value={caption} onChange={(e) => setCaption(e.target.value)} rows={16} dir="rtl" />
            <p className="fbp-tip">{L('سطر «اكتب تفاصيل في الكومنت» بيزوّد التفاعل، ورد على كل كومنت بسرعة علشان فيسبوك يوصّل المنشور لناس أكتر.', 'Reply to every comment quickly: it widens the reach.')}</p>
          </div>
        </div>

        <footer className="fbp-actions">
          {canShareFile && (
            <button type="button" className="btn btn-primary" onClick={share} disabled={!blob}>
              <Share2 size={16} aria-hidden="true" /> {L('مشاركة (الصورة + الكلام)', 'Share image + caption')}
            </button>
          )}
          <button type="button" className={canShareFile ? 'btn btn-outline' : 'btn btn-primary'} onClick={download} disabled={!blob}>
            <Download size={16} aria-hidden="true" /> {L('تحميل الصورة', 'Download image')}
          </button>
          <button type="button" className="btn btn-outline" onClick={copy}>
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copied ? L('اتنسخ', 'Copied') : L('نسخ الكلام', 'Copy caption')}
          </button>
        </footer>
      </div>
    </div>
  );
}
