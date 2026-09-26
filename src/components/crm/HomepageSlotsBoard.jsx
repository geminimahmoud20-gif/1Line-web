import { useEffect, useMemo, useState } from 'react';
import { Star, ChevronUp, ChevronDown, CalendarClock, X, GripVertical, Eye, Pencil } from 'lucide-react';
import {
  HOME_FEATURED_SLOTS,
  getHomepageSlots,
  getFeaturedQueue,
  featuredState,
  featuredDaysLeft,
  toDayInput,
  addDays
} from '../../utils/featuredSlots';
import './homepage-slots.css';

const fmtDay = (v, isAr) => (v ? new Date(`${v}T12:00:00`).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' }) : '');

export function FeaturedPeriodLabel({ property, isAr }) {
  const state = featuredState(property);
  if (state === 'none') return null;
  const days = featuredDaysLeft(property);
  const text = {
    active: property.featuredUntil
      ? (isAr ? `باقي ${days} ${days === 1 ? 'يوم' : 'أيام'}` : `${days}d left`)
      : (isAr ? 'بدون تاريخ انتهاء' : 'No end date'),
    scheduled: isAr ? `يبدأ ${fmtDay(property.featuredFrom, true)}` : `Starts ${fmtDay(property.featuredFrom, false)}`,
    expired: isAr ? 'انتهت المدة' : 'Expired'
  }[state];
  return <span className={`hs-period hs-period--${state}`}>{text}</span>;
}

/** Schedule dialog used by the star button and the board */
export function FeaturedSlotModal({ property, isAr, onSave, onClose, nextOrder }) {
  const [from, setFrom] = useState(() => property.featuredFrom || toDayInput(Date.now()));
  const [until, setUntil] = useState(() => property.featuredUntil || addDays(29));
  const [openEnded, setOpenEnded] = useState(property.featured && !property.featuredUntil);
  const [order, setOrder] = useState(property.featuredOrder ?? nextOrder);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const presets = [7, 14, 30, 90];
  const submit = (e) => {
    e.preventDefault();
    if (!from) return setError(isAr ? 'حدد تاريخ البداية' : 'Pick a start date');
    if (!openEnded && until < from) return setError(isAr ? 'تاريخ النهاية قبل البداية' : 'End date is before start date');
    onSave({
      featured: true,
      featuredFrom: from,
      featuredUntil: openEnded ? null : until,
      featuredOrder: Number(order) || 1
    });
  };

  const title = isAr ? property.title_ar : (property.title_en || property.title_ar);
  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <form className="crm-modal-card hs-modal" role="dialog" aria-modal="true" aria-labelledby="hs-modal-title" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ maxWidth: 480 }}>
        <div className="hs-modal-head">
          <div>
            <h3 id="hs-modal-title"><Star size={18} fill="#D9B97E" color="#D9B97E" /> {isAr ? 'تمييز في الصفحة الرئيسية' : 'Feature on homepage'}</h3>
            <small>{title}</small>
          </div>
          <button type="button" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} className="hs-icon-btn"><X size={18} /></button>
        </div>

        <div className="hs-presets" role="group" aria-label={isAr ? 'مدة سريعة' : 'Quick duration'}>
          {presets.map((d) => (
            <button
              type="button"
              key={d}
              className={`hs-chip ${!openEnded && until === addDays(d - 1, new Date(`${from}T12:00:00`).getTime()) ? 'is-active' : ''}`}
              onClick={() => { setOpenEnded(false); setUntil(addDays(d - 1, new Date(`${from}T12:00:00`).getTime())); }}
            >
              {isAr ? `${d} يوم` : `${d} days`}
            </button>
          ))}
          <button type="button" className={`hs-chip ${openEnded ? 'is-active' : ''}`} onClick={() => setOpenEnded(true)}>
            {isAr ? 'مفتوح' : 'Open-ended'}
          </button>
        </div>

        <div className="hs-grid">
          <label>
            <span>{isAr ? 'من يوم' : 'From'}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
          </label>
          <label>
            <span>{isAr ? 'حتى يوم (شامل)' : 'Until (inclusive)'}</span>
            <input type="date" value={openEnded ? '' : until} min={from} disabled={openEnded} onChange={(e) => setUntil(e.target.value)} />
          </label>
          <label>
            <span>{isAr ? 'الترتيب في الواجهة' : 'Slot position'}</span>
            <input type="number" min="1" max="99" value={order} onChange={(e) => setOrder(e.target.value)} />
          </label>
        </div>

        <p className="hs-note">
          {isAr
            ? `يظهر في الصفحة الرئيسية ${HOME_FEATURED_SLOTS} عقارات فقط. العقار يخرج تلقائياً بعد آخر يوم، ولو الأماكن ممتلئة ينتظر في الطابور حسب الترتيب.`
            : `The homepage shows ${HOME_FEATURED_SLOTS} listings. Listings drop off automatically after the last day; extra ones wait in the queue by position.`}
        </p>
        {error && <p className="hs-error" role="alert">{error}</p>}

        <div className="hs-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</button>
          <button type="submit" className="btn btn-primary">{isAr ? 'حفظ التمييز' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

export default function HomepageSlotsBoard({ properties = [], onUpdateProperty, isAr = true, canEdit = true }) {
  const [editing, setEditing] = useState(null);
  const [dragId, setDragId] = useState(null);
  // Re-evaluate periods at midnight without a reload
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const slots = useMemo(() => getHomepageSlots(properties, HOME_FEATURED_SLOTS, now), [properties, now]);
  const queue = useMemo(() => getFeaturedQueue(properties, HOME_FEATURED_SLOTS, now), [properties, now]);
  const featuredLive = slots.filter((s) => s.source === 'featured').map((s) => s.property);
  const nextOrder = featuredLive.length + queue.overflow.length + 1;

  // Persist a new order for the live featured listings (1..n)
  const applyOrder = (ids) => ids.forEach((id, i) => {
    const p = properties.find((x) => x.id === id);
    if (p && Number(p.featuredOrder) !== i + 1) onUpdateProperty(id, { featuredOrder: i + 1 });
  });
  const liveIds = [...featuredLive, ...queue.overflow].map((p) => p.id);
  const move = (id, dir) => {
    const ids = [...liveIds];
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    applyOrder(ids);
  };
  const dropOn = (targetId) => {
    if (!dragId || dragId === targetId) return;
    const ids = liveIds.filter((x) => x !== dragId);
    ids.splice(ids.indexOf(targetId), 0, dragId);
    applyOrder(ids);
    setDragId(null);
  };

  const title = (p) => (isAr ? p.title_ar : (p.title_en || p.title_ar));

  return (
    <section className="hs-board" aria-labelledby="hs-board-title">
      <header className="hs-board-head">
        <div>
          <h4 id="hs-board-title"><Eye size={16} /> {isAr ? 'واجهة الموقع الآن' : 'Homepage right now'}</h4>
          <p>
            {isAr
              ? `${featuredLive.length} من ${HOME_FEATURED_SLOTS} أماكن مميزة مشغولة — الباقي يُملأ تلقائياً بأحدث العقارات المنشورة`
              : `${featuredLive.length} of ${HOME_FEATURED_SLOTS} featured slots taken — the rest fill with the newest listings`}
          </p>
        </div>
        <div className="hs-meter" aria-hidden="true">
          {Array.from({ length: HOME_FEATURED_SLOTS }).map((_, i) => <span key={i} className={i < featuredLive.length ? 'is-on' : ''} />)}
        </div>
      </header>

      <ol className="hs-slots">
        {slots.map(({ property: p, source }, idx) => {
          const isFeatured = source === 'featured';
          return (
            <li
              key={p.id}
              className={`hs-slot ${isFeatured ? 'is-featured' : 'is-auto'} ${dragId === p.id ? 'is-dragging' : ''}`}
              draggable={isFeatured && canEdit}
              onDragStart={() => setDragId(p.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => { if (isFeatured && dragId) e.preventDefault(); }}
              onDrop={() => isFeatured && dropOn(p.id)}
            >
              <span className="hs-slot-num">{idx + 1}</span>
              <img src={p.images?.[0]} alt="" loading="lazy" />
              <div className="hs-slot-body">
                <strong title={title(p)}>{title(p)}</strong>
                <div className="hs-slot-meta">
                  {isFeatured
                    ? <><span className="hs-tag hs-tag--featured"><Star size={11} fill="currentColor" /> {isAr ? 'مميز' : 'Featured'}</span><FeaturedPeriodLabel property={p} isAr={isAr} /></>
                    : <span className="hs-tag">{isAr ? 'تلقائي — أحدث عقار' : 'Auto — newest'}</span>}
                </div>
              </div>
              {canEdit && (
                <div className="hs-slot-actions">
                  {isFeatured ? (
                    <>
                      <GripVertical size={16} className="hs-grip" aria-hidden="true" />
                      <button type="button" className="hs-icon-btn" onClick={() => move(p.id, -1)} disabled={liveIds.indexOf(p.id) === 0} aria-label={isAr ? 'تقديم' : 'Move up'}><ChevronUp size={16} /></button>
                      <button type="button" className="hs-icon-btn" onClick={() => move(p.id, 1)} disabled={liveIds.indexOf(p.id) === liveIds.length - 1} aria-label={isAr ? 'تأخير' : 'Move down'}><ChevronDown size={16} /></button>
                      <button type="button" className="hs-icon-btn" onClick={() => setEditing(p)} aria-label={isAr ? 'تعديل المدة' : 'Edit period'}><Pencil size={15} /></button>
                    </>
                  ) : (
                    <button type="button" className="hs-link-btn" onClick={() => setEditing(p)}><Star size={13} /> {isAr ? 'ثبّته' : 'Pin'}</button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {(queue.overflow.length > 0 || queue.scheduled.length > 0 || queue.expired.length > 0) && (
        <div className="hs-queue">
          {queue.overflow.length > 0 && (
            <p><strong>{isAr ? 'في الانتظار (الأماكن ممتلئة):' : 'Waiting (slots full):'}</strong> {queue.overflow.map((p) => (
              <button type="button" key={p.id} className="hs-queue-item" onClick={() => setEditing(p)}>{title(p)}</button>
            ))}</p>
          )}
          {queue.scheduled.length > 0 && (
            <p><CalendarClock size={14} /> <strong>{isAr ? 'مجدول لاحقاً:' : 'Scheduled:'}</strong> {queue.scheduled.map((p) => (
              <button type="button" key={p.id} className="hs-queue-item" onClick={() => setEditing(p)}>{title(p)} <FeaturedPeriodLabel property={p} isAr={isAr} /></button>
            ))}</p>
          )}
          {queue.expired.length > 0 && (
            <p><strong>{isAr ? 'انتهت مدتها:' : 'Expired:'}</strong> {queue.expired.map((p) => (
              <button type="button" key={p.id} className="hs-queue-item is-expired" onClick={() => setEditing(p)}>{title(p)} — {isAr ? 'تجديد' : 'renew'}</button>
            ))}</p>
          )}
        </div>
      )}

      {editing && (
        <FeaturedSlotModal
          property={editing}
          isAr={isAr}
          nextOrder={nextOrder}
          onClose={() => setEditing(null)}
          onSave={(patch) => { onUpdateProperty(editing.id, patch); setEditing(null); }}
        />
      )}
    </section>
  );
}
