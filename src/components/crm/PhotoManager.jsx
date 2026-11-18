import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Eye, GripVertical, Image as ImageIcon, LayoutGrid, Monitor, Smartphone, Star, Trash2, X } from 'lucide-react';
import { moveItem } from '../../utils/listOrder';
import './photo-manager.css';

/**
 * The listing's photos in the CRM form: large numbered tiles you drag (or nudge with the arrows)
 * into order, a full-size viewer, and a preview of how the unit page will lay them out.
 * The first photo is the cover; the first five fill the photo grid at the top of the unit page.
 */
export default function PhotoManager({ images = [], setImages, onMakeCover, onRemove, isAr = true }) {
  const L = (ar, en) => (isAr ? ar : en);
  const [view, setView] = useState('arrange'); // 'arrange' | 'preview'
  const [device, setDevice] = useState('desktop');
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [viewing, setViewing] = useState(null); // index open in the viewer
  const count = images.length;

  const move = (from, to) => {
    if (to < 0 || to >= count || from === to) return;
    setImages(moveItem(images, from, to));
    if (viewing === from) setViewing(to);
  };

  // Viewer keys: arrows step through, Esc closes
  useEffect(() => {
    if (viewing === null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setViewing(null);
      if (e.key === 'ArrowLeft') setViewing((i) => (isAr ? Math.min(count - 1, i + 1) : Math.max(0, i - 1)));
      if (e.key === 'ArrowRight') setViewing((i) => (isAr ? Math.max(0, i - 1) : Math.min(count - 1, i + 1)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewing, count, isAr]);

  if (count === 0) return null;
  // In RTL the "earlier" direction is to the right
  const Earlier = isAr ? ArrowRight : ArrowLeft;
  const Later = isAr ? ArrowLeft : ArrowRight;

  return (
    <div className="phm">
      <div className="phm-bar">
        <div className="phm-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={view === 'arrange'} className={view === 'arrange' ? 'is-on' : ''} onClick={() => setView('arrange')}>
            <LayoutGrid size={15} aria-hidden="true" />{L('ترتيب الصور', 'Arrange')}
          </button>
          <button type="button" role="tab" aria-selected={view === 'preview'} className={view === 'preview' ? 'is-on' : ''} onClick={() => setView('preview')}>
            <Eye size={15} aria-hidden="true" />{L('معاينة على الموقع', 'Site preview')}
          </button>
        </div>
        <p className="phm-hint">
          {view === 'arrange'
            ? L('اسحب الصورة لمكانها أو استخدم الأسهم. أول صورة هي الغلاف، وأول 5 بيظهروا في واجهة صفحة الوحدة.', 'Drag a photo or use the arrows. The first is the cover; the first five fill the top of the unit page.')
            : L('ده بالظبط شكل الصور أعلى صفحة الوحدة.', 'Exactly how the photos sit at the top of the unit page.')}
        </p>
      </div>

      {view === 'arrange' ? (
        <ol className="phm-grid">
          {images.map((src, i) => (
            <li
              key={`${src}-${i}`}
              className={`phm-tile${i === 0 ? ' is-cover' : ''}${i < 5 ? ' is-front' : ''}${dragOver === i && dragFrom !== i ? ' is-target' : ''}${dragFrom === i ? ' is-dragging' : ''}`}
              draggable
              onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(i); }}
              onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragFrom !== null) move(dragFrom, i); setDragFrom(null); setDragOver(null); }}
              onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
            >
              <button type="button" className="phm-img" onClick={() => setViewing(i)} aria-label={L(`عرض الصورة ${i + 1} كبيرة`, `View photo ${i + 1}`)}>
                <img src={src} alt="" loading="lazy" draggable={false} />
                <span className="phm-num">{i + 1}</span>
                {i === 0 && <span className="phm-cover"><Star size={11} fill="currentColor" aria-hidden="true" />{L('الغلاف', 'Cover')}</span>}
                <span className="phm-grip" aria-hidden="true"><GripVertical size={14} /></span>
              </button>
              <div className="phm-actions">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={L('قدّمها خطوة', 'Move earlier')} title={L('قدّمها خطوة', 'Move earlier')}>
                  <Earlier size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === count - 1} aria-label={L('أخّرها خطوة', 'Move later')} title={L('أخّرها خطوة', 'Move later')}>
                  <Later size={15} aria-hidden="true" />
                </button>
                {i !== 0 && (
                  <button type="button" onClick={() => onMakeCover(i)} aria-label={L('اجعلها الغلاف', 'Make cover')} title={L('اجعلها الغلاف', 'Make cover')}>
                    <Star size={15} aria-hidden="true" />
                  </button>
                )}
                <button type="button" className="is-danger" onClick={() => onRemove(i)} aria-label={L('احذف الصورة', 'Remove photo')} title={L('احذف الصورة', 'Remove photo')}>
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="phm-preview">
          <div className="phm-devices" role="radiogroup" aria-label={L('الجهاز', 'Device')}>
            <button type="button" role="radio" aria-checked={device === 'desktop'} className={device === 'desktop' ? 'is-on' : ''} onClick={() => setDevice('desktop')}>
              <Monitor size={15} aria-hidden="true" />{L('كمبيوتر', 'Desktop')}
            </button>
            <button type="button" role="radio" aria-checked={device === 'mobile'} className={device === 'mobile' ? 'is-on' : ''} onClick={() => setDevice('mobile')}>
              <Smartphone size={15} aria-hidden="true" />{L('موبايل', 'Phone')}
            </button>
          </div>
          {device === 'desktop' ? (
            <div className={`phm-mosaic has-${Math.min(4, count - 1)}`}>
              {images.slice(0, 5).map((src, i) => (
                <button type="button" key={`${src}-${i}`} className={`phm-mtile${i === 0 ? ' is-cover' : ''}`} onClick={() => setViewing(i)}>
                  <img src={src} alt="" />
                </button>
              ))}
              <span className="phm-all"><ImageIcon size={14} aria-hidden="true" />{L(`كل الصور (${count})`, `All photos (${count})`)}</span>
            </div>
          ) : (
            <div className="phm-phone">
              <div className="phm-phone-shot">
                <img src={images[0]} alt="" />
                <span className="phm-phone-count" dir="ltr">1 / {count}</span>
                {count > 1 && (
                  <span className="phm-phone-dots" aria-hidden="true">
                    {images.slice(0, 8).map((_, i) => <i key={i} className={i === 0 ? 'is-on' : ''} />)}
                  </span>
                )}
              </div>
              <p>{L('على الموبايل العميل بيشوف الغلاف الأول، ويسحب بصباعه للصور اللي بعده بنفس الترتيب.', 'On phones the cover shows first; the rest follow in this order as the buyer swipes.')}</p>
            </div>
          )}
        </div>
      )}

      {/* On <body>: the CRM form sits in a modal that would clip a fixed overlay */}
      {viewing !== null && images[viewing] && createPortal(
        <div className="phm-viewer" role="dialog" aria-modal="true" aria-label={L('عرض الصورة', 'Photo')} onClick={() => setViewing(null)}>
          <div className="phm-viewer-inner" onClick={(e) => e.stopPropagation()}>
            <div className="phm-viewer-top">
              <span dir="ltr">{viewing + 1} / {count}</span>
              {viewing === 0 && <span className="phm-cover is-inline"><Star size={11} fill="currentColor" aria-hidden="true" />{L('الغلاف', 'Cover')}</span>}
              <button type="button" className="phm-x" onClick={() => setViewing(null)} aria-label={L('إغلاق', 'Close')}><X size={20} aria-hidden="true" /></button>
            </div>
            <div className="phm-viewer-stage">
              <button type="button" className="phm-nav" onClick={() => setViewing(Math.max(0, viewing - 1))} disabled={viewing === 0} aria-label={L('السابقة', 'Previous')}>
                {isAr ? <ChevronRight size={26} /> : <ChevronLeft size={26} />}
              </button>
              <img src={images[viewing]} alt="" />
              <button type="button" className="phm-nav" onClick={() => setViewing(Math.min(count - 1, viewing + 1))} disabled={viewing === count - 1} aria-label={L('التالية', 'Next')}>
                {isAr ? <ChevronLeft size={26} /> : <ChevronRight size={26} />}
              </button>
            </div>
            <div className="phm-viewer-actions">
              <button type="button" onClick={() => move(viewing, viewing - 1)} disabled={viewing === 0}><Earlier size={15} aria-hidden="true" />{L('قدّمها', 'Earlier')}</button>
              <button type="button" onClick={() => move(viewing, viewing + 1)} disabled={viewing === count - 1}>{L('أخّرها', 'Later')}<Later size={15} aria-hidden="true" /></button>
              {viewing !== 0 && <button type="button" onClick={() => { onMakeCover(viewing); setViewing(0); }}><Star size={15} aria-hidden="true" />{L('اجعلها الغلاف', 'Make cover')}</button>}
              <button type="button" className="is-danger" onClick={() => { onRemove(viewing); setViewing(count > 1 ? Math.min(viewing, count - 2) : null); }}><Trash2 size={15} aria-hidden="true" />{L('حذف', 'Remove')}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
