import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { thumbUrl, thumbFallback } from '../../utils/imageThumbs';

// "All photos": every photo on one scrolling page, one wide then two side by side, the way the big
// listing sites do it. Tapping a photo opens it full screen (the gallery's viewer, drawn above this).
export default function PhotoTour({ images, title, isAr, startAt = 0, onPick, onClose, viewerOpen }) {
  const listRef = useRef(null);

  // Opens at the photo that was tapped, and locks the page underneath
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    listRef.current?.querySelector(`[data-i="${startAt}"]`)?.scrollIntoView({ block: 'start' });
    return () => { document.body.style.overflow = prev; };
  }, [startAt]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !viewerOpen) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, viewerOpen]);

  const Back = isAr ? ArrowRight : ArrowLeft;
  return createPortal(
    <div className="pt-tour" role="dialog" aria-modal="true" aria-label={isAr ? 'كل الصور' : 'All photos'}>
      <header className="pt-bar">
        <button type="button" className="pt-icon" onClick={onClose} aria-label={isAr ? 'رجوع' : 'Back'}>
          <Back size={20} aria-hidden="true" />
        </button>
        <div className="pt-title">
          <strong>{title}</strong>
          <span>{isAr ? `${images.length} صور` : `${images.length} photos`}</span>
        </div>
        <button type="button" className="pt-icon" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <div className="pt-scroll">
        <div className="pt-list" ref={listRef}>
        {images.map((url, i) => (
          <button
            key={url + i}
            type="button"
            data-i={i}
            className={`pt-photo ${i % 3 === 0 ? 'is-wide' : ''}`}
            onClick={() => onPick(i)}
            aria-label={isAr ? `افتح الصورة ${i + 1} من ${images.length}` : `Open photo ${i + 1} of ${images.length}`}
          >
            <img src={i % 3 === 0 ? url : thumbUrl(url)} onError={i % 3 === 0 ? undefined : thumbFallback(url)} alt={`${title} ${i + 1}`} loading={i < 3 ? 'eager' : 'lazy'} draggable={false} />
          </button>
        ))}
      </div>
      </div>
    </div>,
    document.body
  );
}
