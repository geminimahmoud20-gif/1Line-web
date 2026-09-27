import { useState } from 'react';
import { Receipt, Users, Stethoscope, ChevronDown, Scale, Zap, Compass } from 'lucide-react';
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

  const legal = form.legalStatus || {};
  // Empty legal record = null, so the listing shows "review not published" instead of a badge
  const setLegal = (k, v) => setForm((f) => {
    const next = { ...(f.legalStatus || {}), [k]: v };
    const hasAny = Object.values(next).some((x) => String(x ?? '').trim() !== '');
    return { ...f, legalStatus: hasAny ? next : null };
  });
  const setFinance = (k, v) => setForm((f) => ({ ...f, finance: { ...(f.finance || {}), [k]: v } }));
  const utilities = form.utilities || {};
  const setUtility = (k, v) => setForm((f) => ({ ...f, utilities: { ...(f.utilities || {}), [k]: v } }));
  const orientation = form.orientation || {};
  const setOrientation = (k, v) => setForm((f) => {
    const next = { ...(f.orientation || {}), [k]: v };
    return { ...f, orientation: String(next.direction_ar || '').trim() ? next : (Object.values(next).some((x) => String(x ?? '').trim()) ? next : null) };
  });
  const setFamily = (k, v) => setForm((f) => ({ ...f, family: { ...(f.family || {}), [k]: v } }));
  const setCommercial = (k, v) => setForm((f) => ({ ...f, commercial: { ...(f.commercial || {}), [k]: v } }));

  const toggleTraffic = (id) => {
    const list = Array.isArray(commercial.traffic) ? commercial.traffic : [];
    setCommercial('traffic', list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const L = (ar, en) => (isAr ? ar : en);
  const EGP = L('ج.م', 'EGP');

  // Live check: does down + installments + handover add up to the listed price?
  const planCheck = (() => {
    const price = Number(form.price) || 0;
    const months = (Number(form.installmentYears) || 0) * 12;
    const monthly = Number(form.monthlyInstallment) || 0;
    const quarterly = Number(finance.quarterlyInstallment) || 0;
    if (!price || !months || !(monthly || quarterly)) return null;
    const handover = Number(finance.handoverPayment) || 0;
    const total = (Number(form.downPayment) || 0) + monthly * months + quarterly * Math.floor(months / 3) + handover;
    return { price, months, handover, total, pct: Math.round((total / price) * 100), gap: Math.max(0, price - total), ok: total >= price * 0.98 };
  })();

  return (
    <div className="pxe">
      <Section icon={Scale} title={L('الموقف القانوني (بعد المراجعة الفعلية فقط)', 'Legal status (after an actual review only)')} hint={form.legalStatus ? L('يظهر كـ«مستندات مراجَعة»', 'Shows as "Documents reviewed"') : L('فارغ = «المراجعة لم تُنشر بعد»', 'Empty = "review not published"')}>
        <p className="pxe-note">{L('اكتب فقط ما راجعته فعلاً من مستندات. أي خانة فارغة لا تظهر، ولو كل الخانات فاضية العقار يظهر بدون شارة «مستندات مراجَعة».', 'Only record what you actually reviewed. Empty fields stay hidden; if all are empty the listing shows no "Documents reviewed" badge.')}</p>
        <div className="pxe-grid">
          <TextField label={L('سند الملكية', 'Title')} value={legal.ownershipType_ar} onChange={(v) => setLegal('ownershipType_ar', v)} placeholder={L('مثال: عقد مسجل شهر عقاري', 'e.g. Registered deed')} />
          <TextField label={L('ترخيص البناء', 'Building licence')} value={legal.licenseStatus_ar} onChange={(v) => setLegal('licenseStatus_ar', v)} placeholder={L('مثال: ترخيص رقم … صادر من الحي', 'e.g. Licence no. … from the district')} />
          <TextField label={L('موقف التصالح (نموذج 10)', 'Reconciliation (Form 10)')} value={legal.reconciliationStatus_ar} onChange={(v) => setLegal('reconciliationStatus_ar', v)} />
          <TextField label={L('حصة الأرض', 'Land share')} value={legal.landShare_ar} onChange={(v) => setLegal('landShare_ar', v)} />
          <TextField label={L('جهاز المدينة والضرائب', 'Municipality & taxes')} value={legal.municipalityStatus_ar} onChange={(v) => setLegal('municipalityStatus_ar', v)} />
          <TextField label={L('تمت المراجعة بمعرفة', 'Reviewed by')} value={legal.reviewedBy} onChange={(v) => setLegal('reviewedBy', v)} placeholder={L('اسم المحامي/المراجع الفعلي', 'Actual lawyer / reviewer')} />
          <TextField label={L('تاريخ المراجعة', 'Review date')} value={legal.reviewDate} onChange={(v) => setLegal('reviewDate', v)} placeholder="2026-09-27" maxLength={20} />
          <TextField label={L('مرجع ملف المراجعة (اختياري)', 'Review file reference (optional)')} value={legal.reportRef} onChange={(v) => setLegal('reportRef', v)} maxLength={40} />
        </div>
      </Section>

      <Section icon={Zap} title={L('المرافق والخدمات (كما عاينتها)', 'Utilities (as checked)')} hint={L('تظهر في صفحة العقار', 'Shown on the listing')}>
        <p className="pxe-note">{L('اكتب الحالة الفعلية فقط، مثال: «عداد كودي» أو «متصل بالشبكة» أو «لا يوجد». الخانات الفارغة لا تظهر.', 'Record the actual state only, e.g. "coded meter", "connected", "none". Empty fields stay hidden.')}</p>
        <div className="pxe-grid">
          <TextField label={L('الكهرباء', 'Electricity')} value={utilities.electricity_ar} onChange={(v) => setUtility('electricity_ar', v)} placeholder={L('مثال: عداد كودي مسجل', 'e.g. registered meter')} />
          <TextField label={L('المياه', 'Water')} value={utilities.water_ar} onChange={(v) => setUtility('water_ar', v)} />
          <TextField label={L('الغاز', 'Gas')} value={utilities.gas_ar} onChange={(v) => setUtility('gas_ar', v)} placeholder={L('متصل / غير متصل', 'connected / not')} />
          <TextField label={L('المصعد', 'Elevator')} value={utilities.elevator_ar} onChange={(v) => setUtility('elevator_ar', v)} placeholder={L('اتركه فارغاً لو لا يوجد', 'leave empty if none')} />
          <TextField label={L('الجراج / الركن', 'Parking')} value={utilities.parking_ar} onChange={(v) => setUtility('parking_ar', v)} />
          <TextField label={L('تاريخ المعاينة الميدانية', 'Site check date')} value={utilities.verifiedDate} onChange={(v) => setUtility('verifiedDate', v)} placeholder="2026-09-27" maxLength={20} />
        </div>
        <label className="pxe-check-row">
          <input type="checkbox" checked={Boolean(utilities.verifiedOnSite)} onChange={(e) => setUtility('verifiedOnSite', e.target.checked)} />
          <span>{L('عاينّا المرافق ميدانياً (يظهر للعميل «تمت المعاينة ميدانياً»)', 'We checked these on site (shows "Checked on site")')}</span>
        </label>
      </Section>

      <Section icon={Compass} title={L('اتجاه الوحدة والإضاءة', 'Orientation & light')} hint={L('يُظهر بطاقة البوصلة', 'Shows the compass card')}>
        <div className="pxe-grid">
          <TextField label={L('اتجاه الواجهة', 'Facing')} value={orientation.direction_ar} onChange={(v) => setOrientation('direction_ar', v)} placeholder={L('مثال: بحري شرقي', 'e.g. north-east')} />
          <NumField label={L('ساعات الشمس المباشرة', 'Direct sun hours')} value={orientation.sunlightHours} onChange={(v) => setOrientation('sunlightHours', v)} />
          <TextField label={L('التهوية', 'Ventilation')} value={orientation.ventilationRating_ar} onChange={(v) => setOrientation('ventilationRating_ar', v)} placeholder={L('مثال: تهوية من واجهتين', 'e.g. cross ventilation')} />
        </div>
      </Section>

      <Section icon={Receipt} title={L('مصفوفة التكاليف الشفافة', 'Transparent cost breakdown')} hint={L('تظهر في صفحة العقار', 'Shown on the listing page')}>
        <p className="pxe-note">{L('اترك أي خانة فارغة لو البند غير موجود — لن يظهر للعميل.', 'Leave a field empty if it does not apply — it stays hidden.')}</p>
        {planCheck && (
          <div className={`pxe-check ${planCheck.ok ? 'is-ok' : 'is-warn'}`} role="status">
            <strong>{L('مراجعة خطة السداد:', 'Plan check:')}</strong>{' '}
            {L(
              `المقدم + ${planCheck.months} قسط${planCheck.handover ? ' + الاستلام' : ''} = ${planCheck.total.toLocaleString('en-US')} ج.م من سعر ${planCheck.price.toLocaleString('en-US')} (${planCheck.pct}%)`,
              `Down + ${planCheck.months} installments${planCheck.handover ? ' + handover' : ''} = ${planCheck.total.toLocaleString('en-US')} of ${planCheck.price.toLocaleString('en-US')} (${planCheck.pct}%)`
            )}
            {!planCheck.ok && (
              <span> — {L(`ناقص ${planCheck.gap.toLocaleString('en-US')} ج.م هيظهر للعميل كـ«رصيد غير مجدول». أضف دفعة الاستلام أو صحّح القسط/المدة.`, `${planCheck.gap.toLocaleString('en-US')} missing will show as "unscheduled balance". Add a handover payment or fix the installment/term.`)}</span>
            )}
          </div>
        )}
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
