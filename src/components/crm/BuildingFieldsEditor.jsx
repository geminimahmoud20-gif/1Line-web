import { Building2 } from 'lucide-react';
import { BUILDING_FIELDS, hasBuildingFacts } from '../../utils/buildingFeatures';
import './property-extras.css';

// Elevator, garage, garden and land share for the unit page's key specs. "مش محدد" leaves a fact
// off the site, so nothing is published that the owner didn't confirm.
export default function BuildingFieldsEditor({ form, setForm, isAr = true }) {
  if (!hasBuildingFacts(form.type)) return null;
  const b = form.building || {};
  const set = (k, v) => setForm((f) => {
    const next = { ...(f.building || {}), [k]: v };
    if (k === 'garden' && (v === 'no' || !v)) delete next.gardenSize;
    if (k === 'landShare' && v !== 'yes') delete next.landShareNote;
    for (const key of Object.keys(next)) if (next[key] === '' || next[key] === undefined) delete next[key];
    return { ...f, building: Object.keys(next).length ? next : null };
  });
  const L = (ar, en) => (isAr ? ar : en);

  return (
    <section className="pxe-sec is-open pxe-building">
      <div className="pxe-sec-head" role="presentation">
        <Building2 size={16} aria-hidden="true" />
        <span className="pxe-sec-title">{L('المبنى والمميزات', 'Building & features')}</span>
        <small>{L('تظهر في المواصفات الرئيسية', 'Shown in the key specs')}</small>
      </div>
      <div className="pxe-sec-body">
        <p className="pxe-note">{L('اختار «مش محدد» لو المالك لسه ماأكدش، ومش هيظهر على الموقع.', 'Pick "Not set" until the owner confirms; it stays off the site.')}</p>
        <div className="pxe-grid">
          {BUILDING_FIELDS.map((field) => (
            <label className="pxe-field" key={field.key}>
              <span>{isAr ? field.ar : field.en}</span>
              <select value={b[field.key] || ''} onChange={(e) => set(field.key, e.target.value)}>
                <option value="">{L('مش محدد', 'Not set')}</option>
                {field.options.map((o) => <option key={o.v} value={o.v}>{isAr ? o.ar : o.en}</option>)}
              </select>
            </label>
          ))}
          {b.garden && b.garden !== 'no' && (
            <label className="pxe-field">
              <span>{L('مساحة الحديقة (اختياري)', 'Garden area (optional)')}</span>
              <div className="pxe-input-wrap">
                <input type="number" min="0" value={b.gardenSize ?? ''} onChange={(e) => set('gardenSize', e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0))} />
                <em>{L('م²', 'm²')}</em>
              </div>
            </label>
          )}
          {b.landShare === 'yes' && (
            <label className="pxe-field">
              <span>{L('قيمة الحصة (اختياري)', 'Share (optional)')}</span>
              <input type="text" maxLength={60} value={b.landShareNote ?? ''} placeholder={L('مثال: 1/8 أو 25 م²', 'e.g. 1/8 or 25 m²')} onChange={(e) => set('landShareNote', e.target.value)} />
            </label>
          )}
        </div>
      </div>
    </section>
  );
}
