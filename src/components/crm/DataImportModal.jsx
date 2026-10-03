import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X, FileSpreadsheet, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Lock, Download, Loader2 } from 'lucide-react';
import { readTableFile, ACCEPT_ATTR } from '../../utils/transfer/parseTable';
import { PROPERTY_FIELDS, IGNORE, INTERNAL_HINTS, autoMapColumns, propertyToRow } from '../../utils/transfer/propertySchema';
import { LEAD_FIELDS, leadToRow } from '../../utils/transfer/leadSchema';
import { planPropertyImport, planLeadImport, looksNative, planNativeProperties, planNativeLeads } from '../../utils/transfer/importPlan';
import { exportRows } from '../../utils/transfer/exportTable';
import './data-transfer.css';

const TYPE_AR = { apartment: 'شقة', villa: 'فيلا / منزل', commercial: 'تجاري', office: 'إداري / طبي', land: 'أرض' };
const STATUS_AR = { published: 'منشور', hidden: 'مخفي', under_negotiation: 'تفاوض', sold: 'مباع' };
const LEAD_TYPE_AR = { buyer: 'مشتري', seller: 'بائع / مالك', broker: 'وسيط', investor: 'مستثمر', request: 'طلب خاص' };
const LEAD_STATUS_AR = { new: 'جديد', contacted: 'تم التواصل', site_visit: 'معاينة', negotiating: 'تفاوض', closing: 'توقيع وحجز', closed: 'صفقة ناجحة' };
const fmt = (n) => (Number(n) ? Number(n).toLocaleString('en-US') : '—');

const ERRORS = {
  xls: 'ملفات Excel القديمة (.xls) غير مدعومة — افتحه في Excel واحفظه بصيغة .xlsx أو CSV.',
  unsupported: 'صيغة غير مدعومة. الصيغ المتاحة: Excel (.xlsx)، CSV، TSV، JSON.',
  empty: 'الملف فاضي أو مفيهوش صفوف بيانات تحت العناوين.',
  'json-shape': 'ملف JSON غير مفهوم — لازم يكون قائمة سجلات أو نسخة احتياطية من 1Line.'
};

/**
 * Import properties or clients from a spreadsheet:
 *   1) pick a file  2) check which column goes to which field  3) review the plan  4) save.
 * entity: 'properties' | 'leads'
 * onImport(plan) → Promise<{ ok, written, reason? }>; onImportOwners(leads) (properties only)
 */
export default function DataImportModal({ entity = 'properties', existing = [], existingLeads = [], areas = [], canImportOwners = false, onImport, onImportOwners, onClose }) {
  const isProps = entity === 'properties';
  const fields = isProps ? PROPERTY_FIELDS : LEAD_FIELDS;
  const exclude = isProps ? INTERNAL_HINTS : [];
  const [step, setStep] = useState('file'); // file | map | review | done
  const [table, setTable] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [mapping, setMapping] = useState({});
  const [native, setNative] = useState(false);
  const [statusMode, setStatusMode] = useState('review');
  const [duplicates, setDuplicates] = useState('update');
  const [withOwners, setWithOwners] = useState(true);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [savedPlan, setSavedPlan] = useState(null); // the plan as it was saved (the lists change after)
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const openFile = async (file) => {
    if (!file) return;
    setError('');
    setReading(true);
    try {
      const t = await readTableFile(file);
      setTable(t);
      setFileName(file.name);
      const isNative = t.kind === 'json' && looksNative(t.objects, entity);
      setNative(isNative);
      setMapping(autoMapColumns(t.headers, fields, { exclude }));
      setStep(isNative ? 'review' : 'map');
    } catch (e) {
      setError(ERRORS[e?.message] || `تعذّرت قراءة الملف: ${e?.message || ''}`);
    } finally {
      setReading(false);
    }
  };

  const mappedCount = Object.values(mapping).filter((k) => k !== IGNORE).length;
  const samples = useMemo(() => {
    if (!table) return {};
    return Object.fromEntries(table.headers.map((h, i) => [h, table.rows.map((r) => String(r[i] ?? '').trim()).filter(Boolean).slice(0, 2)]));
  }, [table]);

  const livePlan = useMemo(() => {
    if (!table || step !== 'review') return null;
    if (native) return isProps ? planNativeProperties(table.objects, existing) : planNativeLeads(table.objects, existingLeads);
    return isProps
      ? planPropertyImport({ headers: table.headers, rows: table.rows, mapping, existing, existingLeads, areas, statusMode, duplicates, withOwners: withOwners && canImportOwners })
      : planLeadImport({ headers: table.headers, rows: table.rows, mapping, existingLeads, areas });
  }, [table, step, native, isProps, mapping, existing, existingLeads, areas, statusMode, duplicates, withOwners, canImportOwners]);
  const plan = step === 'done' ? savedPlan : livePlan;

  const setField = (header, key) => setMapping((m) => {
    const next = { ...m, [header]: key };
    // A field takes one column: picking it here frees it elsewhere
    if (key !== IGNORE) for (const h of Object.keys(next)) if (h !== header && next[h] === key) next[h] = IGNORE;
    return next;
  });

  const save = async () => {
    if (!plan) return;
    setSavedPlan(plan);
    setSaving(true);
    try {
      const res = await onImport(plan);
      let ownersRes = null;
      if (isProps && plan.owners?.length && onImportOwners) ownersRes = await onImportOwners(plan.owners);
      setResult({ main: res, owners: ownersRes });
      setStep('done');
    } catch (e) {
      setResult({ main: { ok: false, reason: e?.message || 'error' } });
      setStep('done');
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = async () => {
    const sample = isProps
      ? propertyToRow({ unitCode: '101', title_ar: 'شقة 150 م - كمبوند النخيل', type: 'apartment', areaKey: 'new_sohag', locationName_ar: 'كمبوند النخيل', price: 2500000, size: 150, bedrooms: 3, bathrooms: 2, floor: 3, finishing_ar: 'تشطيب كامل', status: 'published', paymentMethod: 'cash' })
      : leadToRow({ name: 'أحمد محمد', phone: '01000000000', type: 'buyer', status: 'new', budget: 2000000, propertyType: 'apartment', area: 'new_sohag', source: 'فيسبوك' });
    const row = isProps ? { ...sample, 'اسم المالك (خاص)': 'اسم المالك', 'هاتف المالك (خاص)': '01000000000' } : sample;
    await exportRows([row], { format: 'excel', baseName: isProps ? '1Line_Properties_Import_Template' : '1Line_Clients_Import_Template', sheetName: isProps ? 'العقارات' : 'العملاء' });
  };

  const visibleItems = plan ? plan.items.filter((x) => !onlyFlagged || x.warnings.length || x.action === 'skip') : [];
  const title = isProps ? 'استيراد عقارات من ملف' : 'استيراد عملاء من ملف';

  return (
    <div className="crm-modal-backdrop" onClick={() => !saving && onClose()}>
      <div className="dx-modal" role="dialog" aria-modal="true" aria-labelledby="dx-title" onClick={(e) => e.stopPropagation()}>
        <header className="dx-head">
          <div>
            <h3 id="dx-title"><FileSpreadsheet size={19} aria-hidden="true" /> {title}</h3>
            <ol className="dx-steps" aria-label="الخطوات">
              {[['file', 'الملف'], ['map', 'مطابقة الأعمدة'], ['review', 'المراجعة'], ['done', 'تم']].map(([k, label], i) => (
                <li key={k} className={step === k ? 'is-current' : ''}><b>{i + 1}</b>{label}</li>
              ))}
            </ol>
          </div>
          <button type="button" className="dx-icon-btn" onClick={onClose} disabled={saving} aria-label="إغلاق"><X size={18} /></button>
        </header>

        {step === 'file' && (
          <div className="dx-body">
            <label
              className={`dx-drop ${dragOver ? 'is-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); openFile(e.dataTransfer.files?.[0]); }}
            >
              {reading ? <Loader2 size={30} className="dx-spin" aria-hidden="true" /> : <Upload size={30} aria-hidden="true" />}
              <strong>{reading ? 'جاري قراءة الملف…' : 'اسحب الملف هنا أو اضغط لاختياره'}</strong>
              <span>Excel (.xlsx) · CSV · TSV · JSON — من Notion أو Google Sheets أو Excel أو أي نظام تاني</span>
              <input ref={inputRef} type="file" accept={ACCEPT_ATTR} onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ''; }} hidden />
            </label>
            {error && <p className="dx-error" role="alert"><AlertTriangle size={16} aria-hidden="true" />{error}</p>}
            <div className="dx-hints">
              <p>النظام بيتعرّف على الأعمدة بأسمائها بالعربي والإنجليزي (السعر، المساحة، الحي، Price، Status…) وينسّق القيم: الأرقام والتواريخ وأرقام الموبايل والنوع والمنطقة والحالة.</p>
              {isProps && <p><Lock size={14} aria-hidden="true" /> أرقام وأسماء الملاك <b>مش بتتحط على صفحة العقار</b> — بتتسجّل كعملاء «بائعين» في قسم العملاء بس.</p>}
              <button type="button" className="dx-link" onClick={downloadTemplate}><Download size={15} aria-hidden="true" /> تحميل قالب Excel جاهز</button>
            </div>
          </div>
        )}

        {step === 'map' && table && (
          <div className="dx-body">
            <p className="dx-lead">
              <b>{fileName}</b> — {table.rows.length} صف، {table.headers.length} عمود. اتطابق تلقائياً <b>{mappedCount}</b> عمود؛ راجع واختار الحقل الصح لأي عمود.
            </p>
            <div className="dx-table-wrap">
              <table className="dx-table">
                <thead><tr><th>العمود في الملف</th><th>أمثلة من الملف</th><th>يدخل في</th></tr></thead>
                <tbody>
                  {table.headers.map((h) => {
                    const key = mapping[h] || IGNORE;
                    const f = fields.find((x) => x.key === key);
                    return (
                      <tr key={h} className={key === IGNORE ? 'is-ignored' : ''}>
                        <td><b>{h}</b></td>
                        <td className="dx-samples">{samples[h]?.length ? samples[h].map((s, i) => <span key={i}>{s.length > 40 ? `${s.slice(0, 40)}…` : s}</span>) : <em>فاضي</em>}</td>
                        <td>
                          <select value={key} onChange={(e) => setField(h, e.target.value)} aria-label={`الحقل لعمود ${h}`}>
                            <option value={IGNORE}>— تجاهل —</option>
                            {fields.map((x) => <option key={x.key} value={x.key}>{x.private ? '🔒 ' : ''}{x.label}</option>)}
                          </select>
                          {f?.private && <small className="dx-private"><Lock size={12} aria-hidden="true" /> خاص — لا يظهر على الموقع</small>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(step === 'review' || step === 'done') && plan && (
          <div className="dx-body">
            {step === 'review' && (
              <>
                {native && <p className="dx-lead">نسخة احتياطية من 1Line: السجلات هترجع زي ما هي{isProps ? ' (بالصور والبيانات كاملة)' : ''}.</p>}
                <div className="dx-stats">
                  <div className="is-new"><b>{plan.counts.new}</b><span>{isProps ? 'عقار جديد' : 'عميل جديد'}</span></div>
                  {isProps && <div className="is-update"><b>{plan.counts.update}</b><span>تحديث لعقار موجود</span></div>}
                  <div className="is-skip"><b>{plan.counts.skip}</b><span>هيتخطّى</span></div>
                  <div className="is-warn"><b>{plan.counts.warnings}</b><span>فيه ملاحظات</span></div>
                  {isProps && canImportOwners && <div className="is-owner"><b>{plan.counts.owners}</b><span>مالك → عميل بائع</span></div>}
                </div>

                {isProps && !native && (
                  <div className="dx-options">
                    <fieldset>
                      <legend>حالة العقارات الجديدة</legend>
                      <label><input type="radio" name="dx-status" checked={statusMode === 'review'} onChange={() => setStatusMode('review')} /> مخفية لحد ما تراجعها وتضيف الصور <em>(مستحسن)</em></label>
                      <label><input type="radio" name="dx-status" checked={statusMode === 'file'} onChange={() => setStatusMode('file')} /> حسب الحالة في الملف (المعروض يتنشر فوراً)</label>
                    </fieldset>
                    <fieldset>
                      <legend>عقار بنفس الكود موجود بالفعل</legend>
                      <label><input type="radio" name="dx-dup" checked={duplicates === 'update'} onChange={() => setDuplicates('update')} /> حدّث بياناته من الملف (الصور والعروض تفضل زي ما هي)</label>
                      <label><input type="radio" name="dx-dup" checked={duplicates === 'skip'} onChange={() => setDuplicates('skip')} /> سيبه زي ما هو</label>
                    </fieldset>
                    {canImportOwners && Object.values(mapping).includes('ownerPhone') && (
                      <label className="dx-check"><input type="checkbox" checked={withOwners} onChange={(e) => setWithOwners(e.target.checked)} /> سجّل الملاك اللي ليهم رقم كعملاء «بائعين» في قسم العملاء <Lock size={13} aria-hidden="true" /></label>
                    )}
                  </div>
                )}

                <label className="dx-check dx-filter"><input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} /> اعرض الصفوف اللي فيها ملاحظات بس</label>
              </>
            )}

            {step === 'done' && result && (
              <div className={`dx-result ${result.main?.ok ? 'is-ok' : 'is-fail'}`} role="status">
                {result.main?.ok ? <CheckCircle2 size={22} aria-hidden="true" /> : <AlertTriangle size={22} aria-hidden="true" />}
                <div>
                  {result.main?.ok
                    ? <p><b>تم الحفظ:</b> {result.main.written} {isProps ? 'عقار' : 'عميل'} اتسجّلوا على النظام{isProps && plan.counts.new && statusMode === 'review' && !native ? ' — الجديد مخفي لحد ما تراجعه (فلتر «المخفية مؤقتاً»).' : '.'}</p>
                    : <p><b>ما اتحفظش على السحابة</b> ({result.main?.reason || 'خطأ'}). {isProps ? 'العقارات محفوظة على الجهاز ده؛ جرّب تاني لما الاتصال يرجع.' : 'جرّب تاني.'}</p>}
                  {result.main?.skipped?.length > 0 && <p>{result.main.skipped.length} سجل أكبر من الحجم المسموح ما اتحفظش.</p>}
                  {result.owners && (result.owners.ok
                    ? <p>{result.owners.written} مالك اتسجّلوا كعملاء بائعين في قسم العملاء.</p>
                    : <p>تسجيل الملاك كعملاء ما نجحش ({result.owners.reason || 'خطأ'}).</p>)}
                </div>
              </div>
            )}

            <div className="dx-table-wrap">
              <table className="dx-table dx-preview">
                <thead>
                  {isProps
                    ? <tr><th>#</th><th>الإجراء</th><th>الكود</th><th>العقار</th><th>النوع</th><th>المنطقة</th><th>السعر</th><th>المساحة</th><th>الحالة</th><th>ملاحظات</th></tr>
                    : <tr><th>#</th><th>الإجراء</th><th>الاسم</th><th>الهاتف</th><th>النوع</th><th>المرحلة</th><th>الميزانية</th><th>ملاحظات</th></tr>}
                </thead>
                <tbody>
                  {visibleItems.slice(0, 300).map((it) => {
                    const action = it.action === 'new' ? 'جديد' : it.action === 'update' ? 'تحديث' : 'تخطّي';
                    const notes = [it.reason, ...it.warnings, it.inferredArea ? 'المنطقة من صفوف مشابهة' : ''].filter(Boolean);
                    if (isProps) {
                      const p = { ...(it.existing || {}), ...it.property };
                      const area = areas.find((a) => (a.id ?? a.key) === p.areaKey);
                      return (
                        <tr key={it.rowIndex} className={`is-${it.action}`}>
                          <td>{it.rowIndex + 2}</td>
                          <td><span className={`dx-badge is-${it.action}`}>{action}</span></td>
                          <td>{p.unitCode || '—'}</td>
                          <td className="dx-title-cell">{p.title_ar}</td>
                          <td>{TYPE_AR[p.type] || p.type}</td>
                          <td>{area?.name_ar || p.areaKey || '—'}</td>
                          <td>{fmt(p.price)}</td>
                          <td>{p.size ? `${p.size} م²` : '—'}</td>
                          <td>{STATUS_AR[p.status] || '—'}</td>
                          <td className="dx-notes">{notes.map((n, i) => <span key={i}>{n}</span>)}</td>
                        </tr>
                      );
                    }
                    const l = it.lead;
                    return (
                      <tr key={it.rowIndex} className={`is-${it.action}`}>
                        <td>{it.rowIndex + 2}</td>
                        <td><span className={`dx-badge is-${it.action}`}>{action}</span></td>
                        <td>{l.name || '—'}</td>
                        <td dir="ltr">{l.phone || '—'}</td>
                        <td>{LEAD_TYPE_AR[l.type] || l.type || '—'}</td>
                        <td>{LEAD_STATUS_AR[l.status] || l.status || '—'}</td>
                        <td>{fmt(l.budget)}</td>
                        <td className="dx-notes">{notes.map((n, i) => <span key={i}>{n}</span>)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visibleItems.length > 300 && <p className="dx-more">+ {visibleItems.length - 300} صف تاني</p>}
            </div>
          </div>
        )}

        <footer className="dx-foot">
          {step === 'map' && (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setStep('file')}><ArrowRight size={16} aria-hidden="true" /> ملف تاني</button>
              <button type="button" className="btn btn-primary" onClick={() => setStep('review')} disabled={!mappedCount}>مراجعة قبل الحفظ <ArrowLeft size={16} aria-hidden="true" /></button>
            </>
          )}
          {step === 'review' && (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(native ? 'file' : 'map')} disabled={saving}><ArrowRight size={16} aria-hidden="true" /> رجوع</button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !(plan?.counts.new || plan?.counts.update)}>
                {saving ? <Loader2 size={16} className="dx-spin" aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
                {saving ? 'جاري الحفظ…' : `احفظ ${(plan?.counts.new || 0) + (plan?.counts.update || 0)} ${isProps ? 'عقار' : 'عميل'}`}
              </button>
            </>
          )}
          {(step === 'file' || step === 'done') && <button type="button" className="btn btn-primary" onClick={onClose}>{step === 'done' ? 'تمام' : 'إلغاء'}</button>}
        </footer>
      </div>
    </div>
  );
}
