import { useState } from 'react';
import { Building2, Calculator, Home, Image as ImageIcon, Loader2, Save, Store, Upload, X } from 'lucide-react';
import PhotoManager from './PhotoManager';
import { uploadMultipleImages } from '../../utils/imageUploadService';
import { arYears, planExample } from '../../utils/projectFacts';
import './project-form.css';

const MAX_FILE_MB = 15;
const STAGES = [
  { key: 'concrete', ar: 'الخرسانات', en: 'Structure' },
  { key: 'masonry', ar: 'المباني والحوائط', en: 'Masonry' },
  { key: 'finishing', ar: 'التشطيبات', en: 'Finishing' },
  { key: 'infrastructure', ar: 'المرافق والبنية التحتية', en: 'Infrastructure' }
];

/**
 * Add / edit a project in the CRM, in sections: basics, photos (upload + the same photo manager as
 * listings), price & plan with a worked example, construction stages, units, amenities, description.
 * The panel owns the data and saving; this draws the form.
 */
export default function ProjectFormModal({ formData, setFormData, onSubmit, onClose, isSaving, editing, isAr = true, triggerToast = () => {} }) {
  const L = (ar, en) => (isAr ? ar : en);
  const [uploading, setUploading] = useState('');
  const [dragging, setDragging] = useState(false);
  const [featureDraft, setFeatureDraft] = useState('');
  const set = (patch) => setFormData((f) => ({ ...f, ...patch }));
  const images = (formData.images || []).filter(Boolean);
  const stages = formData.progressBreakdown || {};
  const features = Array.isArray(formData.features_ar)
    ? formData.features_ar
    : String(formData.features_ar || '').split(',').map((s) => s.trim()).filter(Boolean);
  const example = planExample(formData);
  const money = (n) => `${Math.round(n).toLocaleString('en-US')} ${L('ج.م', 'EGP')}`;
  const total = Number(formData.totalUnits) || 0;
  const available = Number(formData.availableUnits) || 0;
  const stageAverage = Math.round(STAGES.reduce((s, st) => s + (Number(stages[st.key]) || 0), 0) / STAGES.length);

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    const tooBig = files.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    const ok = files.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024);
    if (tooBig.length) triggerToast(L(`${tooBig.length} صورة أكبر من ${MAX_FILE_MB}MB واترفضت`, `${tooBig.length} photo(s) over ${MAX_FILE_MB}MB were skipped`), 'error');
    if (!ok.length) return;
    setUploading(L(`جاري رفع ${ok.length} صورة...`, `Uploading ${ok.length} photos...`));
    try {
      const urls = await uploadMultipleImages(ok, `project_${formData.id || Date.now()}`, (done, n) => setUploading(L(`اترفع ${done} من ${n}...`, `Uploaded ${done}/${n}...`)));
      if (urls.inlineCount > 0) {
        triggerToast(L(`${urls.inlineCount} صورة ماترفعتش على السيرفر. اخرج وادخل تاني وارفعها من جديد.`, `${urls.inlineCount} photo(s) did not reach the server; sign in again and re-upload.`), 'error');
      }
      // New photos go after the current ones, so the cover stays the cover
      if (urls.length) setFormData((f) => ({ ...f, images: [...(f.images || []).filter(Boolean), ...urls] }));
    } catch (err) {
      console.error('Project photo upload failed:', err);
      triggerToast(L('حصلت مشكلة في رفع الصور', 'Photo upload failed'), 'error');
    } finally {
      setUploading('');
    }
  };

  const setImages = (list) => set({ images: list });
  const makeCover = (i) => setImages([images[i], ...images.filter((_, j) => j !== i)]);
  const removeImage = (i) => setImages(images.filter((_, j) => j !== i));

  const addFeature = () => {
    const v = featureDraft.trim();
    if (!v || features.includes(v)) { setFeatureDraft(''); return; }
    set({ features_ar: [...features, v] });
    setFeatureDraft('');
  };
  const setStage = (key, value) => set({ progressBreakdown: { ...stages, [key]: Number(value) || 0 } });

  return (
    <div className="track-modal-backdrop pjf-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="pjf-card" role="dialog" aria-modal="true" aria-labelledby="pjf-title" onMouseDown={(e) => e.stopPropagation()}>
        <header className="pjf-head">
          <span className="pjf-head-icon"><Building2 size={22} aria-hidden="true" /></span>
          <div>
            <h3 id="pjf-title">{editing ? L('تعديل المشروع', 'Edit project') : L('إضافة مشروع / كمبوند', 'Add a project')}</h3>
            <p>{L('البيانات دي بتظهر في صفحة المشروع على الموقع.', 'This is what the project page shows.')}</p>
          </div>
          <button type="button" className="pjf-x" onClick={onClose} aria-label={L('إغلاق', 'Close')}><X size={20} aria-hidden="true" /></button>
        </header>

        <form className="pjf-body" onSubmit={onSubmit}>
          {/* 1. Basics */}
          <section className="pjf-sec">
            <h4>{L('البيانات الأساسية', 'Basics')}</h4>
            <div className="pjf-kind" role="radiogroup" aria-label={L('نوع المشروع', 'Project kind')}>
              {[['residential', Home, L('سكني', 'Residential')], ['commercial', Store, L('تجاري / إداري / طبي', 'Commercial')]].map(([v, Icon, label]) => (
                <button key={v} type="button" role="radio" aria-checked={(formData.category || 'residential') === v} className={(formData.category || 'residential') === v ? 'is-on' : ''} onClick={() => set({ category: v })}>
                  <Icon size={16} aria-hidden="true" />{label}
                </button>
              ))}
            </div>
            <div className="pjf-grid">
              <label className="pjf-field is-wide">
                <span>{L('اسم المشروع *', 'Project name *')}</span>
                <input type="text" required value={formData.title_ar || ''} onChange={(e) => set({ title_ar: e.target.value })} placeholder={L('مثال: كمبوند جوانا سكوير', 'e.g. Joanna Square')} />
              </label>
              <label className="pjf-field">
                <span>{L('الاسم التجاري (إنجليزي)', 'Brand name')}</span>
                <input type="text" dir="ltr" value={formData.brandTag || ''} onChange={(e) => set({ brandTag: e.target.value })} placeholder="Joanna Square" />
              </label>
              <label className="pjf-field">
                <span>{L('تصنيف المشروع', 'Project type')}</span>
                <input type="text" value={formData.type_ar || ''} onChange={(e) => set({ type_ar: e.target.value })} placeholder={L('كمبوند سكني / مول تجاري / برج إداري', 'Compound / mall / office tower')} />
              </label>
              <label className="pjf-field">
                <span>{L('الشركة المطورة', 'Developer')}</span>
                <input type="text" value={formData.developer_ar || ''} onChange={(e) => set({ developer_ar: e.target.value })} />
              </label>
              <label className="pjf-field">
                <span>{L('الموقع', 'Location')}</span>
                <input type="text" value={formData.location_ar || ''} onChange={(e) => set({ location_ar: e.target.value })} placeholder={L('سوهاج الجديدة - الحي الثالث', 'New Sohag - District 3')} />
              </label>
              <label className="pjf-field">
                <span>{L('مساحة المشروع', 'Project area')}</span>
                <input type="text" value={formData.area_sqm || ''} onChange={(e) => set({ area_sqm: e.target.value })} placeholder={L('مثال: 38,000 م²', 'e.g. 38,000 m²')} />
              </label>
            </div>
          </section>

          {/* 2. Photos */}
          <section className="pjf-sec">
            <h4>{L('صور المشروع', 'Photos')} <small>{images.length ? L(`${images.length} صورة`, `${images.length} photos`) : ''}</small></h4>
            <label
              className={`pjf-drop${dragging ? ' is-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer?.files); }}
            >
              <input type="file" accept="image/*" multiple hidden disabled={Boolean(uploading)} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
              {uploading
                ? <><Loader2 size={24} className="spin-animation" aria-hidden="true" /><span>{uploading}</span></>
                : <><Upload size={24} aria-hidden="true" /><span>{L('اسحب صور المشروع هنا أو اضغط للاختيار', 'Drop project photos here or click to choose')}</span><small>{L('رندر، صور الموقع، الواجهات، الماستر بلان', 'Renders, site photos, facades, master plan')}</small></>}
            </label>
            {images.length > 0
              ? <PhotoManager images={images} setImages={setImages} onMakeCover={makeCover} onRemove={removeImage} isAr={isAr} />
              : <p className="pjf-note"><ImageIcon size={14} aria-hidden="true" />{L('من غير صور الكارت بيظهر بأيقونة رمادي. أول صورة هتبقى الغلاف.', 'Without photos the card shows a grey icon. The first photo is the cover.')}</p>}
          </section>

          {/* 3. Price & plan */}
          <section className="pjf-sec">
            <h4>{L('السعر ونظام السداد', 'Price & plan')}</h4>
            <div className="pjf-grid is-4">
              <label className="pjf-field">
                <span>{L('سعر الوحدة يبدأ من (ج.م) *', 'Units from (EGP) *')}</span>
                <input type="number" min="0" inputMode="numeric" required value={formData.startPrice || ''} onChange={(e) => set({ startPrice: e.target.value })} />
              </label>
              <label className="pjf-field">
                <span>{L('المقدم %', 'Down %')}</span>
                <input type="number" min="0" max="100" inputMode="numeric" value={formData.downPaymentPercent || ''} onChange={(e) => set({ downPaymentPercent: e.target.value })} />
              </label>
              <label className="pjf-field">
                <span>{L('سنين التقسيط', 'Years')}</span>
                <input type="number" min="0" max="20" step="0.5" inputMode="decimal" value={formData.installmentYears || ''} onChange={(e) => set({ installmentYears: e.target.value })} />
              </label>
              <label className="pjf-field">
                <span>{L('موعد التسليم', 'Delivery')}</span>
                <input type="text" value={formData.deliveryDate_ar || ''} onChange={(e) => set({ deliveryDate_ar: e.target.value })} placeholder={L('ديسمبر 2027', 'Dec 2027')} />
              </label>
            </div>
            {example && (
              <p className="pjf-example">
                <Calculator size={15} aria-hidden="true" />
                {L(
                  `مثال هيظهر للعميل: وحدة بـ ${money(example.price)} ← مقدم ${money(example.down)} ثم ${money(example.monthly)} شهرياً لمدة ${arYears(Number(formData.installmentYears))}`,
                  `Shown to buyers: ${money(example.price)} → ${money(example.down)} down, then ${money(example.monthly)}/month for ${formData.installmentYears} years`
                )}
              </p>
            )}
          </section>

          {/* 4. Construction */}
          <section className="pjf-sec">
            <h4>{L('نسب التنفيذ على الأرض', 'Construction progress')}</h4>
            <div className="pjf-stages">
              {STAGES.map((st) => (
                <label key={st.key} className="pjf-stage">
                  <span>{isAr ? st.ar : st.en}<b>{Number(stages[st.key]) || 0}%</b></span>
                  <input type="range" min="0" max="100" step="5" value={Number(stages[st.key]) || 0} onChange={(e) => setStage(st.key, e.target.value)} />
                </label>
              ))}
            </div>
            <div className="pjf-overall">
              <label className="pjf-stage">
                <span>{L('نسبة الإنجاز الإجمالية (الدايرة اللي على الكارت)', 'Overall progress (the ring on the card)')}<b>{Number(formData.progress) || 0}%</b></span>
                <input type="range" min="0" max="100" value={Number(formData.progress) || 0} onChange={(e) => set({ progress: Number(e.target.value) || 0 })} />
              </label>
              <button type="button" className="pjf-ghost" onClick={() => set({ progress: stageAverage })}>
                {L(`احسبها من المراحل (${stageAverage}%)`, `From the stages (${stageAverage}%)`)}
              </button>
            </div>
          </section>

          {/* 5. Units */}
          <section className="pjf-sec">
            <h4>{L('الوحدات', 'Units')}</h4>
            <div className="pjf-grid is-4">
              <label className="pjf-field">
                <span>{L('إجمالي الوحدات', 'Total units')}</span>
                <input type="number" min="0" inputMode="numeric" value={formData.totalUnits || ''} onChange={(e) => set({ totalUnits: e.target.value })} />
              </label>
              <label className="pjf-field">
                <span>{L('المتاح للبيع دلوقتي', 'Available now')}</span>
                <input type="number" min="0" inputMode="numeric" value={formData.availableUnits || ''} onChange={(e) => set({ availableUnits: e.target.value })} />
              </label>
            </div>
            {total > 0 && available > total && <p className="pjf-warn">{L('المتاح أكبر من الإجمالي، راجع الرقمين.', 'Available is more than the total.')}</p>}
            <p className="pjf-note">{L('الوحدات نفسها بتظهر في صفحة المشروع لما تختار المشروع ده من خانة «المشروع» في فورم الوحدة.', 'Units show on the project page once their form picks this project.')}</p>
          </section>

          {/* 6. Amenities */}
          <section className="pjf-sec">
            <h4>{L('مميزات المشروع', 'Amenities')}</h4>
            <div className="pjf-chips">
              {features.map((f) => (
                <span key={f} className="pjf-chip">
                  {f}
                  <button type="button" onClick={() => set({ features_ar: features.filter((x) => x !== f) })} aria-label={L(`احذف ${f}`, `Remove ${f}`)}><X size={12} aria-hidden="true" /></button>
                </span>
              ))}
              <input
                type="text"
                value={featureDraft}
                onChange={(e) => setFeatureDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',' || e.key === '،') { e.preventDefault(); addFeature(); } }}
                onBlur={addFeature}
                placeholder={features.length ? L('ميزة تانية...', 'Another...') : L('اكتب ميزة واضغط Enter (أمن 24 ساعة، نادي، حمام سباحة...)', 'Type an amenity and press Enter')}
              />
            </div>
          </section>

          {/* 7. Description & brochure */}
          <section className="pjf-sec">
            <h4>{L('الوصف والكتالوج', 'Description & brochure')}</h4>
            <label className="pjf-field">
              <span>{L('وصف المشروع', 'Description')}</span>
              <textarea rows="5" value={formData.description_ar || ''} onChange={(e) => set({ description_ar: e.target.value })} placeholder={L('الموقع، المساحات المتاحة، التشطيب، الخدمات، ونظام السداد...', 'Location, unit sizes, finishing, services, plan...')} />
            </label>
            <label className="pjf-field">
              <span>{L('رابط الكتالوج PDF (اختياري)', 'Brochure PDF link (optional)')}</span>
              <input type="url" dir="ltr" value={formData.brochureUrl || ''} onChange={(e) => set({ brochureUrl: e.target.value.trim() })} placeholder="https://…/brochure.pdf" />
            </label>
          </section>

          <footer className="pjf-foot">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSaving}>{L('إلغاء', 'Cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving || Boolean(uploading)}>
              <Save size={16} aria-hidden="true" />
              <span>{isSaving ? L('جاري الحفظ...', 'Saving...') : editing ? L('حفظ التعديلات', 'Save changes') : L('إضافة المشروع', 'Add project')}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
