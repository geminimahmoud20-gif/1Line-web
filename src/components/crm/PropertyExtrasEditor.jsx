import { useState } from 'react';
import { Receipt, Users, Stethoscope, ChevronDown } from 'lucide-react';
import { FAMILY_KINDS, FOOT_TRAFFIC_TAGS, ACCESS_POINTS, PARKING_OPTIONS } from '../../utils/propertyInsights';
import './property-extras.css';

const toNum = (v) => (v === '' || v === null || v === undefined ? '' : Math.max(0, Number(v) || 0));

function Section({ icon: Icon, title, hint, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`pxe-sec ${open ? 'is-open' : ''}`}>
      <button type="button" className="pxe-sec-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon size={16} aria-hidden="true" />
        <span className="pxe-sec-title">{title}</span>
        {hint && <small>{hint}</small>}
        <ChevronDown size={15} className="pxe-chev" aria-hidden="true" />
      </button>
      {open && <div className="pxe-sec-body">{children}</div>}
    </section>
  );
}

function NumField({ label, value, onChange, placeholder, suffix }) {
  return (
    <label className="pxe-field">
      <span>{label}</span>
      <div className="pxe-input-wrap">
        <input type="number" min="0" value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(toNum(e.target.value))} />
        {suffix && <em>{suffix}</em>}
      </div>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder, maxLength = 200 }) {
  return (
    <label className="pxe-field">
      <span>{label}</span>
      <input type="text" value={value ?? ''} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/**
 * Optional listing data behind the public "financial transparency" matrix, the family hub
 * and the commercial/medical hub. Empty fields stay hidden on the site.
 */
export default function PropertyExtrasEditor({ form, setForm, isAr = true }) {
  const finance = form.finance || {};
  const family = form.family || {};
  const commercial = form.commercial || {};
  const isCommercial = ['commercial', 'office'].includes(form.type);

  const setFinance = (k, v) => setForm((f) => ({ ...f, finance: { ...(f.finance || {}), [k]: v } }));
  const setFamily = (k, v) => setForm((f) => ({ ...f, family: { ...(f.family || {}), [k]: v } }));
  const setCommercial = (k, v) => setForm((f) => ({ ...f, commercial: { ...(f.commercial || {}), [k]: v } }));

  const toggleTraffic = (id) => {
    const list = Array.isArray(commercial.traffic) ? commercial.traffic : [];
    setCommercial('traffic', list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const L = (ar, en) => (isAr ? ar : en);
  const EGP = L('ج.م', 'EGP');

  return (
    <div className="pxe">
      <Section icon={Receipt} title={L('مصفوفة التكاليف الشفافة', 'Transparent cost breakdown')} hint={L('تظهر في صفحة العقار', 'Shown on the listing page')}>
        <p className="pxe-note">{L('اترك أي خانة فارغة لو البند غير موجود — لن يظهر للعميل.', 'Leave a field empty if it does not apply — it stays hidden.')}</p>
        <div className="pxe-grid">
          <NumField label={L('سعر الكاش الصافي (بعد الخصم)', 'Net cash price (after discount)')} value={finance.cashPrice} onChange={(v) => setFinance('cashPrice', v)} placeholder={L('نفس السعر الإجمالي لو مفيش خصم', 'Same as total price if no discount')} suffix={EGP} />
          <NumField label={L('قسط ربع سنوي (إن وجد)', 'Quarterly installment (if any)')} value={finance.quarterlyInstallment} onChange={(v) => setFinance('quarterlyInstallment', v)} suffix={EGP} />
          <NumField label={L('دفعة الاستلام', 'Handover payment')} value={finance.handoverPayment} onChange={(v) => setFinance('handoverPayment', v)} suffix={EGP} />
          <NumField label={L('وديعة الصيانة (مبلغ)', 'Maintenance deposit (amount)')} value={finance.maintenanceDeposit} onChange={(v) => setFinance('maintenanceDeposit', v)} suffix={EGP} />
          <NumField label={L('أو نسبة وديعة الصيانة', 'Or maintenance %')} value={finance.maintenancePct} onChange={(v) => setFinance('maintenancePct', v)} suffix="%" />
          <TextField label={L('موعد تحصيل الصيانة', 'Maintenance due')} value={finance.maintenanceDue_ar} onChange={(v) => setFinance('maintenanceDue_ar', v)} placeholder={L('مثال: عند الاستلام', 'e.g. at handover')} />
          <NumField label={L('الأوفر برايس (للقرعة والإسكان)', 'Over-price (lottery / housing units)')} value={finance.overPrice} onChange={(v) => setFinance('overPrice', v)} suffix={EGP} />
          <NumField label={L('المدفوع لجهاز المدينة', 'Paid to the city authority')} value={finance.paidToAuthority} onChange={(v) => setFinance('paidToAuthority', v)} suffix={EGP} />
          <TextField label={L('ملاحظة الأوفر برايس', 'Over-price note')} value={finance.overPriceNote_ar} onChange={(v) => setFinance('overPriceNote_ar', v)} placeholder={L('مثال: متبقي 3 أقساط لجهاز المدينة', 'e.g. 3 authority installments left')} />
          <NumField label={L('تكاليف المرافق (عدادات/غاز) استرشادي', 'Utilities (meters/gas), indicative')} value={finance.utilitiesCost} onChange={(v) => setFinance('utilitiesCost', v)} suffix={EGP} />
          <NumField label={L('تكلفة نقل الملكية/التسجيل استرشادي', 'Transfer/registration, indicative')} value={finance.transferCost} onChange={(v) => setFinance('transferCost', v)} suffix={EGP} />
          <TextField label={L('ملاحظة التكاليف', 'Fees note')} value={finance.feesNote_ar} onChange={(v) => setFinance('feesNote_ar', v)} placeholder={L('مثال: التسجيل بالشهر العقاري على المشتري', 'e.g. registry fees paid by buyer')} />
        </div>
      </Section>

      <Section icon={Users} title={L('بيت العيلة واستثمار المستقبل', 'Family legacy hub')} hint={L('يضيف العقار لبوابة بيت العيلة', 'Lists it in the family hub')}>
        <div className="pxe-chips" role="radiogroup" aria-label={L('تصنيف بيت العيلة', 'Family category')}>
          <button type="button" className={`pxe-chip ${!family.kind ? 'is-on' : ''}`} onClick={() => setFamily('kind', '')} aria-pressed={!family.kind}>
            {L('غير مصنف', 'Not in hub')}
          </button>
          {FAMILY_KINDS.map((k) => (
            <button key={k.id} type="button" className={`pxe-chip ${family.kind === k.id ? 'is-on' : ''}`} onClick={() => setFamily('kind', k.id)} aria-pressed={family.kind === k.id}>
              {isAr ? k.ar : k.en}
            </button>
          ))}
        </div>
        {family.kind && (
          <div className="pxe-grid">
            <NumField label={L('عدد الوحدات القابلة للفرز', 'Units that can be split')} value={family.units} onChange={(v) => setFamily('units', v)} placeholder="4" />
            <TextField label={L('ملاحظة للعائلة', 'Note for families')} value={family.note_ar} onChange={(v) => setFamily('note_ar', v)} placeholder={L('مثال: 4 أدوار × شقتين، مدخل مستقل', 'e.g. 4 floors × 2 units, separate entrance')} />
          </div>
        )}
      </Section>

      {isCommercial && (
        <Section icon={Stethoscope} title={L('مؤشرات الاستثمار التجاري والطبي', 'Commercial & medical indicators')} hint={L('تظهر في المركز التجاري وصفحة العقار', 'Shown in the hub and listing')} defaultOpen>
          <span className="pxe-sub">{L('الكثافة والتردد', 'Foot traffic')}</span>
          <div className="pxe-chips">
            {FOOT_TRAFFIC_TAGS.map((t) => {
              const on = (commercial.traffic || []).includes(t.id);
              return (
                <button key={t.id} type="button" className={`pxe-chip ${on ? 'is-on' : ''}`} onClick={() => toggleTraffic(t.id)} aria-pressed={on}>
                  {isAr ? t.ar : t.en}
                </button>
              );
            })}
          </div>
          <TextField label={L('وصف الكثافة', 'Traffic note')} value={commercial.trafficNote_ar} onChange={(v) => setCommercial('trafficNote_ar', v)} placeholder={L('مثال: 3 مستشفيات و12 عيادة في نطاق 500م', 'e.g. 3 hospitals and 12 clinics within 500m')} />

          <span className="pxe-sub">{L('سهولة الوصول (بالدقائق)', 'Access (minutes)')}</span>
          <div className="pxe-grid">
            {ACCESS_POINTS.map((a) => (
              <NumField
                key={a.id}
                label={isAr ? a.ar : a.en}
                value={commercial.access?.[a.id]}
                onChange={(v) => setCommercial('access', { ...(commercial.access || {}), [a.id]: v })}
                suffix={L('د', 'min')}
              />
            ))}
          </div>
          <TextField label={L('وصف الوصول من المراكز المجاورة', 'Access from nearby towns')} value={commercial.accessNote_ar} onChange={(v) => setCommercial('accessNote_ar', v)} placeholder={L('مثال: مواقف طهطا وجرجا على بعد 5 دقائق', 'e.g. Tahta & Girga microbus stops 5 min away')} />

          <span className="pxe-sub">{L('الركن والاصطفاف', 'Parking')}</span>
          <div className="pxe-chips">
            {PARKING_OPTIONS.map((o) => (
              <button key={o.id} type="button" className={`pxe-chip ${commercial.parking === o.id ? 'is-on' : ''}`} onClick={() => setCommercial('parking', commercial.parking === o.id ? '' : o.id)} aria-pressed={commercial.parking === o.id}>
                {isAr ? o.ar : o.en}
              </button>
            ))}
          </div>

          <div className="pxe-grid">
            <NumField label={L('الإيجار الشهري المتوقع للمتر', 'Expected monthly rent per m²')} value={commercial.rentPerSqm} onChange={(v) => setCommercial('rentPerSqm', v)} placeholder={L('من إيجارات فعلية في نفس الشارع', 'From real rents on the same street')} suffix={`${EGP}/م²`} />
          </div>
        </Section>
      )}
    </div>
  );
}
