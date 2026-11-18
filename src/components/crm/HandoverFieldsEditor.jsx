import { KeyRound } from 'lucide-react';
import { hasBuildingFacts } from '../../utils/buildingFeatures';
import { FINISHING_LEVELS, HANDOVER_STATES, finishingIdOf, finishingPatch, handoverPatch } from '../../utils/unitHandover';
import './property-extras.css';

// The unit's condition when the buyer gets it: finishing level and handover date. Shown in the
// facts row under the listing title; "مش محدد" keeps it off the site.
export default function HandoverFieldsEditor({ form, setForm, isAr = true }) {
  if (!hasBuildingFacts(form.type)) return null;
  const L = (ar, en) => (isAr ? ar : en);
  const level = finishingIdOf(form);
  // Free text from before the picker, kept until the team picks a level
  const legacyText = !level && String(form.finishing_ar || '').trim();
  const status = form.completionStatus === 'off_plan' ? 'under_construction' : (form.completionStatus || '');

  return (
    <section className="pxe-sec is-open pxe-building">
      <div className="pxe-sec-head" role="presentation">
        <KeyRound size={16} aria-hidden="true" />
        <span className="pxe-sec-title">{L('حالة الوحدة عند التسليم', 'Condition at handover')}</span>
        <small>{L('تظهر تحت عنوان الوحدة', 'Shown under the listing title')}</small>
      </div>
      <div className="pxe-sec-body">
        <span className="pxe-sub">{L('التشطيب', 'Finishing')}</span>
        <div className="pxe-chips" role="radiogroup" aria-label={L('مستوى التشطيب', 'Finishing level')}>
          <button type="button" role="radio" className={`pxe-chip ${!level ? 'is-on' : ''}`} aria-checked={!level} onClick={() => setForm((f) => ({ ...f, ...finishingPatch('') }))}>
            {L('مش محدد', 'Not set')}
          </button>
          {FINISHING_LEVELS.map((l) => (
            <button key={l.id} type="button" role="radio" className={`pxe-chip ${level === l.id ? 'is-on' : ''}`} aria-checked={level === l.id} onClick={() => setForm((f) => ({ ...f, ...finishingPatch(l.id) }))}>
              {isAr ? l.ar : l.en}
            </button>
          ))}
        </div>
        {legacyText && (
          <p className="pxe-note">{L(`مكتوب حالياً: «${legacyText}». اختار المستوى الصح عشان يظهر بشكل موحد.`, `Currently: "${legacyText}". Pick the matching level.`)}</p>
        )}

        <div className="pxe-grid">
          <label className="pxe-field">
            <span>{L('الاستلام', 'Handover')}</span>
            <select value={status} onChange={(e) => setForm((f) => ({ ...f, ...handoverPatch(e.target.value, f.deliveryYear) }))}>
              <option value="">{L('مش محدد', 'Not set')}</option>
              {HANDOVER_STATES.map((s) => <option key={s.id} value={s.id}>{isAr ? s.ar : s.en}</option>)}
            </select>
          </label>
          {status === 'under_construction' && (
            <label className="pxe-field">
              <span>{L('سنة التسليم (اختياري)', 'Handover year (optional)')}</span>
              <input type="number" min="2000" max="2100" value={form.deliveryYear || ''} placeholder="2028" onChange={(e) => setForm((f) => ({ ...f, ...handoverPatch('under_construction', e.target.value) }))} />
            </label>
          )}
        </div>
      </div>
    </section>
  );
}
