import { useMemo, useState } from 'react';
import { ClipboardList, ChevronDown } from 'lucide-react';
import { Button } from '../../ui';
import { getAreas } from '../../../utils/areasData';
import { placeAreas } from '../../../utils/areaLookup';
import { KINDS, FAMILY_SIZES, purposesFor, cleanAnswers, kindOf } from '../../../utils/buyerMatch';
import { requestOf, missingInRequest } from '../../../utils/buyerRequest';
import './lead-request.css';

const DELIVERY = [
  { id: '', ar: 'مش فارقة', en: 'Any' },
  { id: 'now', ar: 'مستعجل (جاهز)', en: 'Ready now' },
  { id: 'wait', ar: 'ممكن يستنى', en: 'Can wait' }
];

/**
 * «طلب العميل»: what the client is looking for, written by the advisor (kind, areas, budget or down payment and
 * installment, size, rooms, handover, purpose). The matching reads it for the alerts, the matching screen and this
 * client's list, so the more of it is filled in, the closer the listings. Saved in details.matchAnswers.
 */
export default function LeadRequestEditor({ lead, isAr, onUpdateLead, triggerToast }) {
  const L = (ar, en) => (isAr ? ar : en);
  const current = useMemo(() => requestOf(lead).answers, [lead]);
  const gaps = missingInRequest(current);
  const [open, setOpen] = useState(gaps.length > 0);
  const [form, setForm] = useState(() => ({
    kind: current.kind || '',
    areas: current.areas || [],
    payment: current.payment === 'installments' ? 'installments' : 'cash',
    budget: current.budget || '',
    down: current.down || '',
    monthly: current.monthly || '',
    minSize: current.minSize || '',
    family: current.family || '',
    delivery: current.delivery || '',
    purpose: current.purpose || ''
  }));
  const [busy, setBusy] = useState(false);
  const areas = useMemo(() => placeAreas(getAreas()), []);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleArea = (id) => setForm((f) => ({ ...f, areas: f.areas.includes(id) ? f.areas.filter((x) => x !== id) : [...f.areas, id].slice(0, 8) }));
  const kind = form.kind ? kindOf(form.kind) : null;
  const num = (v) => String(v || '').replace(/[^\d.]/g, '');

  const save = async () => {
    if (busy || !onUpdateLead) return;
    setBusy(true);
    const clean = cleanAnswers({ ...form, budget: num(form.budget), down: num(form.down), monthly: num(form.monthly), minSize: num(form.minSize), priorities: lead.details?.matchAnswers?.priorities || [] });
    // `advisor`: written by hand, so what is left empty is «not asked yet», not «any»
    await onUpdateLead(lead.id, { details: { ...(lead.details || {}), matchAnswers: { ...clean, advisor: true } }, lastActivityAt: new Date().toISOString() }, lead.version);
    setBusy(false);
    triggerToast?.(L('اتحفظ طلب العميل، والترشيحات اتحدّثت', 'Request saved; matches updated'), 'success');
  };

  return (
    <section className="lre" aria-labelledby="lre-title">
      <button type="button" className="lre__head" onClick={() => setOpen((v) => !v)} aria-expanded={open} id="lre-title">
        <ClipboardList size={16} aria-hidden="true" />
        <strong>{L('طلب العميل', 'Client request')}</strong>
        {gaps.length > 0
          ? <span className="lre__gap">{L(`ناقص: ${gaps.join('، ')}`, `Missing: ${gaps.length}`)}</span>
          : <span className="lre__ok">{L('مكتمل', 'Complete')}</span>}
        <ChevronDown size={16} aria-hidden="true" className={open ? 'is-open' : ''} />
      </button>
      {open && (
        <div className="lre__body">
          <p className="lre__hint">{L('اكتب اللي العميل قاله. كل ما الطلب أدق، الترشيحات أقرب والتنبيه بيوصل للعميل الصح.', 'The more exact the request, the closer the matches.')}</p>
          <label className="lre__field">
            <span>{L('نوع العقار', 'Kind')}</span>
            <select value={form.kind} onChange={set('kind')}>
              <option value="">{L('لسه مش محدد', 'Not set')}</option>
              {KINDS.map((k) => <option key={k.id} value={k.id}>{k.ar}</option>)}
            </select>
          </label>
          <fieldset className="lre__field">
            <legend>{L('المنطقة (اختار واحدة أو أكتر)', 'Areas')}</legend>
            <div className="lre__chips">
              {areas.map((a) => (
                <button key={a.id} type="button" className={form.areas.includes(a.id) ? 'is-on' : ''} aria-pressed={form.areas.includes(a.id)} onClick={() => toggleArea(a.id)}>
                  {isAr ? (a.name_ar || a.label_ar) : (a.name_en || a.name_ar)}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="lre__seg" role="group" aria-label={L('طريقة الدفع', 'Payment')}>
            <button type="button" className={form.payment === 'cash' ? 'is-on' : ''} aria-pressed={form.payment === 'cash'} onClick={() => setForm((f) => ({ ...f, payment: 'cash' }))}>{L('كاش', 'Cash')}</button>
            <button type="button" className={form.payment === 'installments' ? 'is-on' : ''} aria-pressed={form.payment === 'installments'} onClick={() => setForm((f) => ({ ...f, payment: 'installments' }))}>{L('تقسيط', 'Installments')}</button>
          </div>
          {form.payment === 'cash' ? (
            <label className="lre__field"><span>{L('الميزانية (ج.م)', 'Budget (EGP)')}</span><input inputMode="numeric" value={form.budget} onChange={set('budget')} placeholder="2500000" /></label>
          ) : (
            <div className="lre__two">
              <label className="lre__field"><span>{L('أقصى مقدم', 'Max down payment')}</span><input inputMode="numeric" value={form.down} onChange={set('down')} placeholder="300000" /></label>
              <label className="lre__field"><span>{L('أقصى قسط شهري', 'Max monthly')}</span><input inputMode="numeric" value={form.monthly} onChange={set('monthly')} placeholder="25000" /></label>
            </div>
          )}
          <div className="lre__two">
            <label className="lre__field"><span>{L('أقل مساحة (م²)', 'Min size (m²)')}</span><input inputMode="numeric" value={form.minSize} onChange={set('minSize')} placeholder="100" /></label>
            {(!kind || kind.home) && (
              <label className="lre__field">
                <span>{L('عدد الأفراد', 'Family size')}</span>
                <select value={form.family} onChange={set('family')}>
                  <option value="">{L('مش محدد', 'Not set')}</option>
                  {FAMILY_SIZES.map((f) => <option key={f.id} value={f.id}>{f.ar}</option>)}
                </select>
              </label>
            )}
          </div>
          <div className="lre__two">
            <label className="lre__field">
              <span>{L('الاستلام', 'Handover')}</span>
              <select value={form.delivery} onChange={set('delivery')}>{DELIVERY.map((d) => <option key={d.id} value={d.id}>{d.ar}</option>)}</select>
            </label>
            <label className="lre__field">
              <span>{L('الغرض', 'Purpose')}</span>
              <select value={form.purpose} onChange={set('purpose')}>
                <option value="">{L('مش محدد', 'Not set')}</option>
                {purposesFor(form.kind || 'residential').map((p) => <option key={p.id} value={p.id}>{p.ar}</option>)}
              </select>
            </label>
          </div>
          <Button size="sm" onClick={save} disabled={busy || !onUpdateLead}>{busy ? L('بيحفظ…', 'Saving…') : L('احفظ الطلب', 'Save request')}</Button>
        </div>
      )}
    </section>
  );
}
