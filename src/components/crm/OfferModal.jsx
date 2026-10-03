import { useEffect, useMemo, useState } from 'react';
import { Flame, X } from 'lucide-react';
import { toDayInput, addDays } from '../../utils/featuredSlots';
import { validateOffer, getActiveOffer, offerState, isExtension, OFFER_MAX_DAYS } from '../../utils/propertyOffers';
import './homepage-slots.css';

const fmt = (n) => (Number(n) || 0).toLocaleString('en-US');

/**
 * Create / edit / end a limited-time cash offer on one listing (CRM → العقارات → 🔥).
 * Saves `offer` on the property; the site shows it from `from` to `until` and drops it afterwards.
 */
export default function OfferModal({ property, isAr, onSave, onClose }) {
  const existing = property.offer || null;
  const listPrice = Number(property.price) || 0;
  const [price, setPrice] = useState(() => (existing?.price ? String(existing.price) : ''));
  const [from, setFrom] = useState(() => existing?.from || toDayInput(Date.now()));
  const [until, setUntil] = useState(() => existing?.until || addDays(6));
  const [termsAr, setTermsAr] = useState(existing?.terms_ar || '');
  const [termsEn, setTermsEn] = useState(existing?.terms_en || '');
  const [errors, setErrors] = useState([]);
  const [today] = useState(() => toDayInput(Date.now()));
  // Editing a field clears the previous save attempt's errors
  const edit = (setter) => (value) => { setErrors([]); setter(value); };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const draft = useMemo(() => ({
    type: 'cash_discount',
    price: Number(String(price).replace(/[^\d]/g, '')) || 0,
    from: from || null,
    until,
    // The "was" price shown to visitors stays at today's listing price even if it is raised later
    basePrice: existing?.basePrice && offerState(property) === 'active' ? Math.min(existing.basePrice, listPrice) : listPrice,
    terms_ar: termsAr.trim(),
    terms_en: termsEn.trim(),
    extended: !!existing?.extended
  }), [price, from, until, termsAr, termsEn, existing, listPrice, property]);

  // Same numbers visitors will see (dates aside)
  const preview = getActiveOffer({ ...property, offer: { ...draft, from: null, until: '2999-12-31' } });
  const presets = [3, 7, 14, 30];
  const startMs = new Date(`${from || today}T12:00:00`).getTime();

  const submit = (e) => {
    e.preventDefault();
    const problems = validateOffer(draft, draft.basePrice);
    if (problems.length) return setErrors(problems);
    const extended = draft.extended || isExtension(existing, draft);
    onSave({ offer: { ...draft, extended, updatedAt: new Date().toISOString() } }, extended);
  };

  const state = existing ? offerState(property) : 'none';
  const title = isAr ? property.title_ar : (property.title_en || property.title_ar);
  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <form className="crm-modal-card hs-modal" role="dialog" aria-modal="true" aria-labelledby="offer-modal-title" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ maxWidth: 520 }}>
        <div className="hs-modal-head">
          <div>
            <h3 id="offer-modal-title"><Flame size={18} color="var(--crm-warn)" /> {isAr ? 'عرض كاش لفترة محدودة' : 'Limited-time cash offer'}</h3>
            <small>{title} — {isAr ? 'السعر الحالي' : 'current price'} <bdi>{fmt(listPrice)}</bdi> {isAr ? 'ج.م' : 'EGP'}</small>
          </div>
          <button type="button" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} className="hs-icon-btn"><X size={18} /></button>
        </div>

        <div className="hs-grid">
          <label style={{ gridColumn: '1 / -1' }}>
            <span>{isAr ? 'سعر الكاش في العرض (ج.م)' : 'Offer cash price (EGP)'}</span>
            <input type="text" inputMode="numeric" dir="ltr" value={price ? fmt(String(price).replace(/[^\d]/g, '')) : ''} onChange={(e) => edit(setPrice)(e.target.value.replace(/[^\d]/g, ''))} placeholder={fmt(Math.round(listPrice * 0.93))} required />
          </label>
        </div>
        {preview && (
          <p className="hs-note" style={{ color: 'var(--crm-positive)', fontWeight: 700 }}>
            {isAr
              ? `خصم ${preview.pct}% — العميل يوفّر ${fmt(preview.savings)} ج.م. الزائر سيرى: ${fmt(preview.price)} بدلاً من ${fmt(preview.basePrice)}.`
              : `${preview.pct}% off — saves ${fmt(preview.savings)} EGP. Visitors see ${fmt(preview.price)} instead of ${fmt(preview.basePrice)}.`}
          </p>
        )}

        <div className="hs-presets" role="group" aria-label={isAr ? 'مدة سريعة' : 'Quick duration'}>
          {presets.map((d) => {
            const end = addDays(d - 1, startMs);
            return (
              <button type="button" key={d} className={`hs-chip ${until === end ? 'is-active' : ''}`} onClick={() => edit(setUntil)(end)}>
                {isAr ? `${d} ${d <= 10 ? 'أيام' : 'يوم'}` : `${d} days`}
              </button>
            );
          })}
        </div>

        <div className="hs-grid">
          <label>
            <span>{isAr ? 'يبدأ يوم' : 'Starts'}</span>
            <input type="date" value={from} onChange={(e) => edit(setFrom)(e.target.value)} required />
          </label>
          <label>
            <span>{isAr ? 'آخر يوم (شامل)' : 'Last day (inclusive)'}</span>
            <input type="date" value={until} min={from} onChange={(e) => edit(setUntil)(e.target.value)} required />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <span>{isAr ? 'الشروط (تظهر للعميل في صفحة العقار)' : 'Terms (Arabic, shown on the listing)'}</span>
            <textarea rows={2} value={termsAr} onChange={(e) => setTermsAr(e.target.value)} maxLength={300} placeholder={isAr ? 'مثال: السداد كاش بالكامل خلال 30 يوم من الحجز. لا يُجمع مع عروض أخرى.' : ''} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <span>{isAr ? 'الشروط بالإنجليزية (اختياري)' : 'Terms in English (optional)'}</span>
            <textarea rows={2} dir="ltr" value={termsEn} onChange={(e) => setTermsEn(e.target.value)} maxLength={300} />
          </label>
        </div>

        <p className="hs-note">
          {isAr
            ? `يظهر العرض في الصفحة الرئيسية وعلى كارت العقار بعدّاد تنازلي، وينتهي تلقائياً بعد آخر يوم ويرجع السعر كما كان. "السعر قبل" هو سعر العقار الحالي — لا يمكن تضخيمه. أقصى مدة ${OFFER_MAX_DAYS} يوم. لو مددت العرض بعد بدايته يظهر للعملاء "تم تمديد العرض".`
            : `Shown on the homepage and the listing card with a countdown; ends automatically after the last day and the price returns to normal. The "was" price is the current listing price and can't be inflated. Up to ${OFFER_MAX_DAYS} days. Extending a running offer shows "Offer extended".`}
        </p>
        {errors.length > 0 && (
          <ul className="hs-error" role="alert" style={{ margin: 0, paddingInlineStart: 18 }}>
            {errors.map((er) => <li key={er.en}>{isAr ? er.ar : er.en}</li>)}
          </ul>
        )}

        <div className="hs-modal-actions">
          {existing && (
            <button type="button" className="btn btn-ghost" style={{ marginInlineEnd: 'auto', color: 'var(--crm-danger)' }} onClick={() => onSave({ offer: null }, false, true)}>
              {state === 'active' ? (isAr ? 'إنهاء العرض الآن' : 'End offer now') : (isAr ? 'حذف العرض' : 'Remove offer')}
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</button>
          <button type="submit" className="btn btn-primary">{isAr ? 'حفظ العرض' : 'Save offer'}</button>
        </div>
      </form>
    </div>
  );
}
