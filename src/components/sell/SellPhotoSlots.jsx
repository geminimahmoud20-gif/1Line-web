import { useRef, useState } from 'react';
import { Camera, Loader2, RefreshCw, X } from 'lucide-react';
import { photoSlotsFor, INLINE_PHOTO_BUDGET } from '../../utils/sellerListing';
import { uploadSellerPhoto } from '../../services/sellerPhotos';

const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** One labelled spot per photo; tapping a spot opens the camera / gallery for that spot only. */
export default function SellPhotoSlots({ isAr, propertyType, value = {}, onChange }) {
  const slots = photoSlotsFor(propertyType);
  const [busy, setBusy] = useState({});
  const [errors, setErrors] = useState({});
  const inputRef = useRef(null);
  const targetRef = useRef(null);
  const L = (ar, en) => (isAr ? ar : en);
  const filled = slots.filter((s) => value[s.id]).length;

  const inlineBytes = (except) => slots
    .filter((s) => s.id !== except && typeof value[s.id] === 'string' && value[s.id].startsWith('data:'))
    .reduce((sum, s) => sum + value[s.id].length, 0);

  const pick = (slotId) => {
    targetRef.current = slotId;
    inputRef.current?.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    const slotId = targetRef.current;
    e.target.value = '';
    if (!file || !slotId) return;
    const setError = (msg) => setErrors((prev) => ({ ...prev, [slotId]: msg }));
    setError('');
    if (!file.type.startsWith('image/')) return setError(L('ده مش ملف صورة', 'Not an image'));
    if (file.size > MAX_FILE_BYTES) return setError(L('الصورة كبيرة قوي', 'Image too large'));

    setBusy((prev) => ({ ...prev, [slotId]: true }));
    try {
      const res = await uploadSellerPhoto(file);
      if (res.inline && inlineBytes(slotId) + res.bytes > INLINE_PHOTO_BUDGET) {
        setError(L('مش قادرين نستقبل صور أكتر من هنا دلوقتي. ابعتها لنا واتساب بعد ما تبعت الطلب.', 'We can’t take more photos here right now. Send them on WhatsApp after submitting.'));
        return;
      }
      onChange({ ...value, [slotId]: res.url });
    } catch {
      setError(L('الصورة دي ما اتفتحتش، جرّب صورة تانية', 'Couldn’t read this photo, try another'));
    } finally {
      setBusy((prev) => ({ ...prev, [slotId]: false }));
    }
  };

  const remove = (slotId) => {
    const next = { ...value };
    delete next[slotId];
    onChange(next);
  };

  return (
    <div className="sw-photos">
      <div className="sw-photos__head">
        <span>{L('كل صورة في مكانها', 'One photo per spot')}</span>
        <span className="sw-count">{filled} / {slots.length}</span>
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
      <ul className="sw-slots">
        {slots.map((slot, i) => {
          const url = value[slot.id];
          const isBusy = busy[slot.id];
          const label = isAr ? slot.ar : slot.en;
          return (
            <li key={slot.id} className={`sw-slot ${url ? 'is-filled' : ''}`}>
              {url ? (
                <>
                  <img src={url} alt={label} />
                  <span className="sw-slot__tag">{label}</span>
                  <div className="sw-slot__actions">
                    <button type="button" onClick={() => pick(slot.id)} aria-label={L(`غيّر صورة ${label}`, `Replace ${label}`)}><RefreshCw size={15} /></button>
                    <button type="button" onClick={() => remove(slot.id)} aria-label={L(`امسح صورة ${label}`, `Remove ${label}`)}><X size={15} /></button>
                  </div>
                </>
              ) : (
                <button type="button" className="sw-slot__empty" onClick={() => pick(slot.id)} disabled={isBusy} aria-busy={isBusy}>
                  {isBusy ? <Loader2 size={22} className="sw-spin" aria-hidden="true" /> : <Camera size={22} aria-hidden="true" />}
                  <span className="sw-slot__label">{isBusy ? L('بنجهّز الصورة…', 'Preparing…') : label}</span>
                  {!isBusy && <span className="sw-slot__hint">{isAr ? slot.hint_ar : slot.hint_en}</span>}
                  {!isBusy && !slot.id.startsWith('extra') && <span className="sw-slot__num">{i + 1}</span>}
                </button>
              )}
              {errors[slot.id] && <p className="sw-slot__error" role="alert">{errors[slot.id]}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
