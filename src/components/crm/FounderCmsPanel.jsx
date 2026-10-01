import { useState, useEffect, useRef } from 'react';
import { Building, User, Quote, TrendingUp, ShieldCheck, Save, RotateCcw, Sparkles, Award, Loader2, Film } from 'lucide-react';
import { getFounderSettings, saveFounderSettings, resetFounderSettings, DEFAULT_FOUNDER_CMS } from '../../utils/founderCmsData';
import { uploadCmsMedia, getCmsStorageStatus } from '../../firebaseLazy';
import HeroVideoSettings from './founder-cms/HeroVideoSettings';
import GoldStandardsSettings from './founder-cms/GoldStandardsSettings';

/**
 * DEV ONLY: send the file to the Vite dev-server endpoint (scripts/vite-local-media.mjs), which
 * compresses it with ffmpeg into public/videos and returns "/videos/<name>.mp4".
 * Same result shape as uploadCmsMedia. onOptimising fires once all bytes are sent.
 */
function uploadToLocalSite(file, onProgress, onStart, onOptimising) {
  return new Promise((resolve) => {
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) return resolve({ ok: false, reason: 'type' });
    if (file.size > 200 * 1024 * 1024) return resolve({ ok: false, reason: 'size' });
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/__local-media-upload');
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.upload.onload = () => onOptimising?.();
    xhr.onload = () => {
      let body = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* non-JSON */ }
      resolve(xhr.status === 200 && body.ok ? { ok: true, url: body.url, bytesOut: body.bytesOut, optimised: body.optimised } : { ok: false, reason: body.reason || `http-${xhr.status}` });
    };
    xhr.onerror = () => resolve({ ok: false, reason: 'local-server' });
    xhr.onabort = () => resolve({ ok: false, reason: 'storage/canceled' });
    onStart?.(() => xhr.abort());
    xhr.send(file);
  });
}

export default function FounderCmsPanel({ lang = 'ar', triggerToast }) {
  const isAr = lang === 'ar';
  const [formData, setFormData] = useState(() => getFounderSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('founder'); // 'founder' | 'quote' | 'stats' | 'pillars'

  // Sync state if remote cloud update arrives
  useEffect(() => {
    const handleUpdate = () => {
      setFormData(getFounderSettings());
    };
    window.addEventListener('oneline_founder_cms_updated', handleUpdate);
    return () => window.removeEventListener('oneline_founder_cms_updated', handleUpdate);
  }, []);

  const handleSave = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    try {
      const success = await saveFounderSettings(formData);
      if (success) {
        triggerToast(
          isAr 
            ? 'تم حفظ وتحديث بيانات المؤسس والشركة ونشرها سحابياً على كامل الموقع فوراً! 🚀' 
            : 'Corporate & Founder profile updated and published live to cloud!', 
          'success'
        );
      } else {
        triggerToast(isAr ? 'حدث خطأ أثناء الحفظ' : 'Failed to save changes', 'error');
      }
    } catch (err) {
      console.error('Founder CMS save error:', err);
      triggerToast(isAr ? 'تعذر حفظ البيانات' : 'Save failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm(isAr ? 'هل أنت متأكد من استعادة النصوص والإعدادات الافتراضية؟' : 'Reset all corporate text to defaults?')) {
      await resetFounderSettings();
      setFormData(DEFAULT_FOUNDER_CMS);
      triggerToast(isAr ? 'تمت استعادة الإعدادات الافتراضية بنجاح' : 'Reset to default settings', 'info');
    }
  };

  // Helper for updating nested stats
  const handleStatChange = (idx, field, value) => {
    const updatedStats = [...(formData.stats || [])];
    if (!updatedStats[idx]) updatedStats[idx] = {};
    updatedStats[idx][field] = value;
    setFormData({ ...formData, stats: updatedStats });
  };

  // Helper for updating Hero stats (top of homepage)
  const handleHeroStatChange = (idx, field, value) => {
    const updatedHeroStats = [...(formData.heroStats || DEFAULT_FOUNDER_CMS.heroStats)];
    if (!updatedHeroStats[idx]) updatedHeroStats[idx] = {};
    updatedHeroStats[idx][field] = value;
    setFormData({ ...formData, heroStats: updatedHeroStats });
  };

  // Helper for updating nested pillars
  const handlePillarChange = (idx, field, value) => {
    const updatedPillars = [...(formData.pillars || [])];
    if (!updatedPillars[idx]) updatedPillars[idx] = {};
    updatedPillars[idx][field] = value;
    setFormData({ ...formData, pillars: updatedPillars });
  };

  // Helper for updating the 4 Gold Standards
  const handleGoldStandardChange = (idx, field, value) => {
    const updated = [...(formData.goldStandards || DEFAULT_FOUNDER_CMS.goldStandards)];
    if (!updated[idx]) updated[idx] = {};
    updated[idx][field] = value;
    setFormData({ ...formData, goldStandards: updated });
  };

  // Upload short video to Vercel Blob (via /api/cms-upload); settings keep only the resulting https URL.
  // (The old version embedded the whole file as a base64 data URL in the settings: a WhatsApp
  // clip became ~20MB of text, froze the form, and could not be saved to localStorage or Firestore.)
  const [uploadProgress, setUploadProgress] = useState(null); // null | 0..100
  const cancelUploadRef = useRef(null);
  const [uploadPhase, setUploadPhase] = useState('uploading'); // 'uploading' | 'optimising'
  const [canCancelUpload, setCanCancelUpload] = useState(false);
  const [pastedVideoUrl, setPastedVideoUrl] = useState('');
  // DEV saves into public/videos; production needs a Blob store connected in Vercel, so check before offering the picker
  const [storageStatus, setStorageStatus] = useState(import.meta.env.DEV ? 'local' : 'checking'); // local | checking | ready | unknown | unavailable
  useEffect(() => {
    if (import.meta.env.DEV) return undefined;
    let alive = true;
    getCmsStorageStatus()
      .then((s) => { if (alive) setStorageStatus(s); })
      .catch(() => { if (alive) setStorageStatus('unknown'); });
    return () => { alive = false; };
  }, []);
  const uploadLocked = storageStatus === 'unavailable';

  // Works without any upload service: any public https video (mp4/webm) can be added by URL
  const handleAddVideoByUrl = async () => {
    const url = pastedVideoUrl.trim();
    // https URLs, or files shipped with the site itself (public/videos → "/videos/name.mp4")
    let valid = /^\/videos\/[\w.-]+\.(mp4|webm)$/i.test(url);
    if (!valid) {
      try { valid = new URL(url).protocol === 'https:'; } catch { valid = false; }
    }
    if (!valid) {
      if (triggerToast) triggerToast(isAr ? 'اكتب رابطاً يبدأ بـ https:// أو مسار فيديو من ملفات الموقع مثل /videos/hero.mp4' : 'Enter an https:// URL or a site path like /videos/hero.mp4', 'error');
      return;
    }
    const name = decodeURIComponent(url.split('/').pop()?.split('?')[0] || '').replace(/\.[^/.]+$/, '') || (isAr ? 'فيديو من رابط' : 'Linked video');
    const newClip = { id: `link-${Date.now()}`, title_ar: name, title_en: name, url, poster: formData.heroPosterUrl || '' };
    const currentClips = formData.heroVideoClips || DEFAULT_FOUNDER_CMS.heroVideoClips;
    const next = { ...formData, heroVideoUrl: url, heroVideoClips: [newClip, ...currentClips] };
    setFormData(next);
    setPastedVideoUrl('');
    await saveFounderSettings(next);
    if (triggerToast) triggerToast(isAr ? 'تمت إضافة الفيديو من الرابط وحفظه ✔' : 'Video added from URL and saved', 'success');
  };
  const handleVideoFileUpload = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file after an error
    if (!file || uploadProgress !== null) return;

    const mb = (file.size / 1024 / 1024).toFixed(1);
    setUploadProgress(0);
    // Local dev server (no /api routes): save into the site's own public/videos.
    // Production uploads straight from the browser to Vercel Blob.
    const res = import.meta.env.DEV
      ? await uploadToLocalSite(file, (p) => setUploadProgress(p), (cancel) => { cancelUploadRef.current = cancel; setCanCancelUpload(true); }, () => setUploadPhase('optimising'))
      : await uploadCmsMedia(file, 'video', (p) => setUploadProgress(p), (cancel) => { cancelUploadRef.current = cancel; setCanCancelUpload(true); });
    setUploadPhase('uploading');
    cancelUploadRef.current = null;
    setCanCancelUpload(false);
    setUploadProgress(null);

    if (!res.ok) {
      const reasons = {
        'bucket-unavailable': isAr
          ? 'مساحة التخزين (Vercel Blob) غير مربوطة بالمشروع. أنشئها من لوحة Vercel ← Storage ← Blob واربطها بالمشروع، أو الصق رابط فيديو جاهز في الخانة أدناه.'
          : 'No Vercel Blob store is connected to this project. Connect one in Vercel, or paste a video URL below.',
        unauthenticated: isAr
          ? 'رفع الملفات يتطلب تسجيل الدخول بحساب المدير في Firebase (الدخول برمز المرور المحلي لا يكفي). يمكنك لصق رابط فيديو بدلاً من ذلك.'
          : 'Uploading requires signing in with the admin Firebase account. You can paste a video URL instead.',
        offline: isAr ? 'لا يوجد اتصال بالإنترنت — أعد المحاولة بعد عودة الاتصال.' : 'You are offline.',
        stalled: isAr
          ? 'لم يبدأ الرفع خلال 30 ثانية فتم إلغاؤه. غالباً الاتصال ضعيف جداً — أعد المحاولة.'
          : 'The upload did not start within 30s and was cancelled.',
        'storage/canceled': isAr ? 'تم إلغاء الرفع.' : 'Upload cancelled.',
        'local-server': isAr ? 'تعذّر الاتصال بخادم التطوير المحلي — تأكد أن npm run dev ما زال يعمل.' : 'Local dev server not reachable.',
        'needs-ffmpeg': isAr ? 'هذا النوع يحتاج تحويلاً إلى MP4 لكن ffmpeg غير متاح. ارفع ملف MP4 أو شغّل npm install.' : 'Needs ffmpeg to convert — upload an MP4.',
        type: isAr ? 'نوع الملف غير مدعوم — استخدم MP4 أو WebM أو MOV.' : 'Unsupported file — use MP4, WebM or MOV.',
        size: isAr ? `حجم الفيديو ${mb} ميجابايت والحد الأقصى 60. اختر مقطعاً أقصر (10–15 ثانية تكفي للخلفية).` : `Video is ${mb}MB; the limit is 60MB.`,
        'storage/unauthorized': isAr ? 'حسابك لا يملك صلاحية رفع الملفات — الرفع متاح لحساب المدير فقط.' : 'Not authorised to upload — admin accounts only.',
        'storage/unauthenticated': isAr ? 'سجّل الدخول بحساب المدير أولاً لرفع الفيديو.' : 'Sign in as admin to upload.'
      };
      const msg = reasons[res.reason] || (isAr
        ? `تعذّر رفع الفيديو (${res.reason}). تأكد من الاتصال بالإنترنت وأعد المحاولة.`
        : `Upload failed (${res.reason}). Check your connection and retry.`);
      if (triggerToast) triggerToast(msg, 'error');
      return;
    }

    const newClip = {
      id: `uploaded-${Date.now()}`,
      title_ar: file.name.replace(/\.[^/.]+$/, ''),
      title_en: file.name.replace(/\.[^/.]+$/, ''),
      url: res.url,
      storagePath: res.path,
      poster: formData.heroPosterUrl || ''
    };
    const currentClips = formData.heroVideoClips || DEFAULT_FOUNDER_CMS.heroVideoClips;
    const next = { ...formData, heroVideoUrl: res.url, heroVideoClips: [newClip, ...currentClips] };
    setFormData(next);
    // Persist straight away so a finished upload is never lost if the admin forgets to press Save
    await saveFounderSettings(next);
    if (triggerToast) {
      const outMb = res.bytesOut ? (res.bytesOut / 1024 / 1024).toFixed(1) : null;
      triggerToast(res.url.startsWith('/videos/')
        ? (isAr
          ? `تم حفظ الفيديو في ملفات الموقع (${res.url})${outMb ? ` — تم ضغطه من ${mb} إلى ${outMb} ميجابايت` : ''}. سيظهر للزوار بعد نشر الموقع.`
          : `Saved to the site at ${res.url}. Visible after the next deploy.`)
        : (isAr ? `تم رفع الفيديو (${mb} ميجابايت) وحفظه ✔` : `Video uploaded (${mb}MB) and saved`), 'success');
    }
  };

  useEffect(() => {
    const onSyncFailed = () => {
      if (triggerToast) triggerToast(isAr ? 'تم الحفظ على هذا الجهاز فقط — تعذّرت المزامنة السحابية. تحقق من الاتصال وصلاحية حسابك.' : 'Saved on this device only — cloud sync failed.', 'error');
    };
    window.addEventListener('oneline_founder_cms_sync_failed', onSyncFailed);
    return () => window.removeEventListener('oneline_founder_cms_sync_failed', onSyncFailed);
  }, [triggerToast, isAr]);

  // Add new clip to playlist
  const handleAddClip = () => {
    const newClip = {
      id: `clip-${Date.now()}`,
      title_ar: isAr ? 'فيديو قصير جديد' : 'New Short Clip',
      title_en: 'New Short Clip',
      url: '',
      poster: ''
    };
    const currentClips = formData.heroVideoClips || DEFAULT_FOUNDER_CMS.heroVideoClips;
    setFormData({ ...formData, heroVideoClips: [...currentClips, newClip] });
  };

  const handleUpdateClip = (idx, field, value) => {
    const currentClips = [...(formData.heroVideoClips || DEFAULT_FOUNDER_CMS.heroVideoClips)];
    if (!currentClips[idx]) currentClips[idx] = {};
    currentClips[idx][field] = value;
    setFormData({ ...formData, heroVideoClips: currentClips });
  };

  const handleRemoveClip = (idx) => {
    const currentClips = [...(formData.heroVideoClips || DEFAULT_FOUNDER_CMS.heroVideoClips)];
    currentClips.splice(idx, 1);
    setFormData({ ...formData, heroVideoClips: currentClips });
  };

  const handleKeepOnlyActiveClip = () => {
    const active = (formData.heroVideoClips || []).find((c) => c.url === formData.heroVideoUrl) || {
      id: `clip-${Date.now()}`,
      title_ar: isAr ? 'الفيديو الأساسي' : 'Main Video',
      title_en: 'Main Video',
      url: formData.heroVideoUrl
    };
    setFormData({
      ...formData,
      heroVideoClips: [active],
      heroVideoAutoCycle: false
    });
    if (triggerToast) {
      triggerToast(isAr ? 'تم الإبقاء على الفيديو الحالي فقط وتعطيل التبديل للمقاطع الافتراضية ✔' : 'Set active video as sole hero clip', 'success');
    }
  };

  return (
    <div className="crm-table-container animate-fadeIn">
      {/* Top Header & Save Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid var(--border-light)',
        paddingBottom: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--crm-accent-text)' }}>
            <Building size={20} />
            <span>{isAr ? 'إدارة قسم الشركة وملف المؤسس (د. محمود الباز)' : 'Corporate & Founder CMS'}</span>
          </h3>
          <p className="section-subtitle" style={{ margin: '4px 0 0 0' }}>
            {isAr 
              ? 'تعديل سيرة المؤسس، كلمته الرسمية، أرقام وإحصائيات المنصة، وركائز الأمان القانوني لحظياً على الموقع.' 
              : 'Manage founder bio, quote, live stats, and corporate trust pillars.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={handleReset}
            title={isAr ? 'استعادة النصوص الأصلية' : 'Reset defaults'}
          >
            <RotateCcw size={14} />
            <span>{isAr ? 'استعادة الافتراضي' : 'Reset'}</span>
          </button>

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleSave}
            disabled={isSaving}
            style={{ background: 'var(--gradient-gold)', fontWeight: 'bold' }}
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            <span>{isSaving ? (isAr ? 'جاري الحفظ سحابياً...' : 'Saving...') : (isAr ? 'حفظ ونشر التعديلات فوراً' : 'Save & Publish Live')}</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-light)',
        paddingBottom: '12px',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          className={`btn btn-sm ${activeSubTab === 'hero_video' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveSubTab('hero_video')}
        >
          <Film size={14} />
          <span>{isAr ? '🎬 الفيديو والهيرو السينمائي' : 'Hero Video & Media'}</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeSubTab === 'founder' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveSubTab('founder')}
        >
          <User size={14} />
          <span>{isAr ? 'هوية وبيانات المؤسس' : 'Founder Info'}</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeSubTab === 'quote' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveSubTab('quote')}
        >
          <Quote size={14} />
          <span>{isAr ? 'كلمة ورسالة المؤسس' : 'Founder Quote'}</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeSubTab === 'stats' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveSubTab('stats')}
        >
          <TrendingUp size={14} />
          <span>{isAr ? 'أرقام وإحصائيات المنصة (4 مؤشرات)' : 'Platform Stats'}</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeSubTab === 'pillars' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveSubTab('pillars')}
        >
          <ShieldCheck size={14} />
          <span>{isAr ? 'ركائز وقيم الشركة' : 'Company Pillars'}</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeSubTab === 'gold_standards' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveSubTab('gold_standards')}
        >
          <Award size={14} />
          <span>{isAr ? '🛡️ معايير الأمان الأربعة (الرئيسية)' : '4 Golden Standards'}</span>
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave}>
        {/* SUBTAB 0: CINEMATIC HERO VIDEO & VISUALS (THE AGENCY RE) */}
        {activeSubTab === 'hero_video' && (
          <HeroVideoSettings
            canCancelUpload={canCancelUpload}
            cancelUploadRef={cancelUploadRef}
            formData={formData}
            handleAddClip={handleAddClip}
            handleAddVideoByUrl={handleAddVideoByUrl}
            handleKeepOnlyActiveClip={handleKeepOnlyActiveClip}
            handleRemoveClip={handleRemoveClip}
            handleUpdateClip={handleUpdateClip}
            handleVideoFileUpload={handleVideoFileUpload}
            isAr={isAr}
            pastedVideoUrl={pastedVideoUrl}
            setFormData={setFormData}
            setPastedVideoUrl={setPastedVideoUrl}
            storageStatus={storageStatus}
            uploadLocked={uploadLocked}
            uploadPhase={uploadPhase}
            uploadProgress={uploadProgress}
          />
        )}

        {/* SUBTAB 1: FOUNDER INFO */}
        {activeSubTab === 'founder' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div className="form-group-item">
              <label htmlFor="fcms-field-10">{isAr ? 'اسم المؤسس (بالعربية):' : 'Founder Name (Arabic):'}</label>
              <input id="fcms-field-10"
                type="text"
                value={formData.founderName_ar || ''}
                onChange={(e) => setFormData({ ...formData, founderName_ar: e.target.value })}
                required
              />
            </div>

            <div className="form-group-item">
              <label htmlFor="fcms-field-11">{isAr ? 'اسم المؤسس (بالإنجليزية):' : 'Founder Name (English):'}</label>
              <input id="fcms-field-11"
                type="text"
                value={formData.founderName_en || ''}
                onChange={(e) => setFormData({ ...formData, founderName_en: e.target.value })}
              />
            </div>

            <div className="form-group-item">
              <label htmlFor="fcms-field-12">{isAr ? 'المنصب والصفة (بالعربية):' : 'Founder Role (Arabic):'}</label>
              <input id="fcms-field-12"
                type="text"
                value={formData.founderRole_ar || ''}
                onChange={(e) => setFormData({ ...formData, founderRole_ar: e.target.value })}
              />
            </div>

            <div className="form-group-item">
              <label htmlFor="fcms-field-13">{isAr ? 'اللقب المهني الإضافي (بالعربية):' : 'Professional Title (Arabic):'}</label>
              <input id="fcms-field-13"
                type="text"
                value={formData.founderSub_ar || ''}
                onChange={(e) => setFormData({ ...formData, founderSub_ar: e.target.value })}
              />
            </div>

            <div className="form-group-item">
              <label htmlFor="fcms-field-14">{isAr ? 'رابط الصورة الشخصية للمؤسس:' : 'Founder Photo URL:'}</label>
              <input id="fcms-field-14"
                type="text"
                placeholder="/founder-dr-mahmoud-elbaz.jpg"
                value={formData.founderPhoto || ''}
                onChange={(e) => setFormData({ ...formData, founderPhoto: e.target.value })}
              />
              {/* Photo Live Preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                <div style={{
                  width: '56px',
                  height: '68px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1.5px solid rgba(212, 175, 55, 0.6)',
                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
                  background: 'var(--crm-surface-ink-deep)',
                  flexShrink: 0
                }}>
                  <img
                    src={formData.founderPhoto || '/founder-dr-mahmoud-elbaz.jpg'}
                    alt="Founder Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 12%' }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/founder-dr-mahmoud-elbaz.jpg";
                    }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-positive)', fontWeight: 700, display: 'block' }}>
                    {isAr ? '✓ صورة المؤسس د. محمود الباز معتمدة' : '✓ Accredited Founder Portrait'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => setFormData({ ...formData, founderPhoto: '/founder-dr-mahmoud-elbaz.jpg' })}
                    style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-accent-text)', marginTop: '2px', padding: '0' }}
                  >
                    {isAr ? 'استعادة الصورة الرسمية' : 'Restore Official Photo'}
                  </button>
                </div>
              </div>
            </div>

            <div className="form-group-item">
              <label htmlFor="fcms-field-15">{isAr ? 'رقم واتساب استشارات المؤسس:' : 'Founder WhatsApp Number:'}</label>
              <input id="fcms-field-15"
                type="text"
                placeholder="مثال: 01223222956"
                value={formData.whatsappNumber || ''}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
              />
            </div>

            <div className="form-group-item">
              <label htmlFor="fcms-field-16">{isAr ? 'رقم هاتف مكتب الإدارة:' : 'Office Phone Number:'}</label>
              <input id="fcms-field-16"
                type="text"
                placeholder="+201223222956 أو 01223222956"
                value={formData.phoneNumber || ''}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>

            <div className="form-group-item">
              <label htmlFor="fcms-field-17">{isAr ? 'عنوان المقر الرئيسي والسجل التجاري:' : 'HQ & Commercial Reg Title:'}</label>
              <input id="fcms-field-17"
                type="text"
                value={formData.headquarters_ar || ''}
                onChange={(e) => setFormData({ ...formData, headquarters_ar: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* SUBTAB 2: FOUNDER QUOTE & VISION */}
        {activeSubTab === 'quote' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group-item">
              <label htmlFor="fcms-field-18" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{isAr ? 'نص كلمة ورسالة المؤسس (بالعربية):' : 'Founder Statement / Quote (Arabic):'}</span>
                <small style={{ color: 'var(--crm-muted)' }}>{(formData.founderQuote_ar || '').length} حرف</small>
              </label>
              <textarea id="fcms-field-18"
                rows={5}
                style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.25)', color: 'var(--crm-on-dark)', border: '1px solid var(--border-light)', lineHeight: 1.8, fontSize: 'var(--crm-text-md)' }}
                value={formData.founderQuote_ar || ''}
                onChange={(e) => setFormData({ ...formData, founderQuote_ar: e.target.value })}
              />
            </div>

            <div className="form-group-item">
              <label htmlFor="fcms-field-19" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{isAr ? 'نص كلمة المؤسس (بالإنجليزية):' : 'Founder Statement / Quote (English):'}</span>
              </label>
              <textarea id="fcms-field-19"
                rows={4}
                style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.25)', color: 'var(--crm-on-dark)', border: '1px solid var(--border-light)', lineHeight: 1.8, fontSize: 'var(--crm-text-md)' }}
                value={formData.founderQuote_en || ''}
                onChange={(e) => setFormData({ ...formData, founderQuote_en: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* SUBTAB 3: 4 TOP STATS & HERO STATS */}
        {activeSubTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* 1. HERO STATS CARDS (TOP OF HOMEPAGE) */}
            <div style={{ background: 'rgba(217, 119, 6, 0.05)', border: '1px solid rgba(217, 119, 6, 0.25)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={18} style={{ color: 'var(--crm-accent-text)' }} />
                <h4 style={{ margin: 0, color: 'var(--crm-on-dark)', fontSize: 'var(--crm-text-md)' }}>
                  {isAr ? 'أرقام شريط الواجهة الرئيسية (Hero Stats Strip - أعلى الموقع)' : 'Hero Stats Strip (Top of Homepage)'}
                </h4>
              </div>
              <p style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-sm)', margin: '0 0 16px 0' }}>
                {isAr 
                  ? 'هذه هي الأرقام الأربعة الظاهرة مباشرة أسفل شريط البحث الرئيسي في صدر الصفحة الرئيسية (قابلة للتعديل بالكامل):' 
                  : 'These are the 4 cards displayed directly below the main search bar on the homepage:'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                {(formData.heroStats || DEFAULT_FOUNDER_CMS.heroStats).map((hs, idx) => (
                  <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-accent-text)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                      البطاقة #{idx + 1}
                    </span>

                    <div className="form-group-item" style={{ marginBottom: '8px' }}>
                      <label htmlFor="fcms-field-20" style={{ fontSize: 'var(--crm-text-xs)' }}>{isAr ? 'الرقم / النسبة الظاهرة:' : 'Value:'}</label>
                      <input id="fcms-field-20"
                        type="text"
                        value={hs.num_ar || ''}
                        onChange={(e) => handleHeroStatChange(idx, 'num_ar', e.target.value)}
                        placeholder="مثال: +150"
                      />
                    </div>

                    <div className="form-group-item">
                      <label htmlFor="fcms-field-21" style={{ fontSize: 'var(--crm-text-xs)' }}>{isAr ? 'التسمية والوصف:' : 'Label:'}</label>
                      <input id="fcms-field-21"
                        type="text"
                        value={hs.label_ar || ''}
                        onChange={(e) => handleHeroStatChange(idx, 'label_ar', e.target.value)}
                        placeholder="مثال: عقار مفحوص ومعتمد"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. FOUNDER STATS */}
            <div>
              <h4 style={{ margin: '0 0 6px 0', color: 'var(--crm-on-dark)', fontSize: 'var(--crm-text-md)' }}>
                {isAr ? 'المؤشرات الرقمية لقسم المؤسس د. محمود الباز' : 'Founder Section Stats'}
              </h4>
              <p style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-sm)', marginBottom: '16px' }}>
                {isAr ? 'تعديل المؤشرات الرقمية الأربعة التي تظهر في أسفل قسم المؤسس لتعزيز ثقة المستثمرين:' : 'Edit the 4 key statistical achievement metrics:'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {(formData.stats || []).map((st, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--crm-accent-text)', fontWeight: 'bold' }}>
                      <span>المؤشر #{idx + 1}</span>
                    </div>

                    <div className="form-group-item" style={{ marginBottom: '8px' }}>
                      <label htmlFor="fcms-field-22" style={{ fontSize: 'var(--crm-text-xs)' }}>{isAr ? 'الرقم / النسبة:' : 'Number / Metric:'}</label>
                      <input id="fcms-field-22"
                        type="text"
                        value={st.num_ar || ''}
                        onChange={(e) => handleStatChange(idx, 'num_ar', e.target.value)}
                      />
                    </div>

                    <div className="form-group-item" style={{ marginBottom: '8px' }}>
                      <label htmlFor="fcms-field-23" style={{ fontSize: 'var(--crm-text-xs)' }}>{isAr ? 'العنوان الرئيسي:' : 'Label (Arabic):'}</label>
                      <input id="fcms-field-23"
                        type="text"
                        value={st.label_ar || ''}
                        onChange={(e) => handleStatChange(idx, 'label_ar', e.target.value)}
                      />
                    </div>

                    <div className="form-group-item">
                      <label htmlFor="fcms-field-24" style={{ fontSize: 'var(--crm-text-xs)' }}>{isAr ? 'النص التوضيحي:' : 'Subtitle (Arabic):'}</label>
                      <input id="fcms-field-24"
                        type="text"
                        value={st.sub_ar || ''}
                        onChange={(e) => handleStatChange(idx, 'sub_ar', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: 3 CORPORATE PILLARS */}
        {activeSubTab === 'pillars' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(formData.pillars || []).map((pl, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: 'var(--crm-accent-text)' }}>
                    {isAr ? `الركيزة #${idx + 1}:` : `Pillar #${idx + 1}:`} {pl.title_ar}
                  </h4>

                  <div className="form-group-item" style={{ marginBottom: '12px' }}>
                    <label htmlFor="fcms-field-25">{isAr ? 'عنوان الركيزة:' : 'Title:'}</label>
                    <input id="fcms-field-25"
                      type="text"
                      value={pl.title_ar || ''}
                      onChange={(e) => handlePillarChange(idx, 'title_ar', e.target.value)}
                    />
                  </div>

                  <div className="form-group-item">
                    <label htmlFor="fcms-field-26">{isAr ? 'الوصف والتفاصيل:' : 'Description:'}</label>
                    <textarea id="fcms-field-26"
                      rows={3}
                      style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.25)', color: 'var(--crm-on-dark)', border: '1px solid var(--border-light)' }}
                      value={pl.desc_ar || ''}
                      onChange={(e) => handlePillarChange(idx, 'desc_ar', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 5: 4 GOLDEN STANDARDS */}
        {activeSubTab === 'gold_standards' && (
          <GoldStandardsSettings
            formData={formData}
            handleGoldStandardChange={handleGoldStandardChange}
            isAr={isAr}
            setFormData={setFormData}
          />
        )}

        {/* Bottom Save Action Bar */}
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSaving}
            style={{ background: 'var(--gradient-gold)', padding: '10px 24px', fontSize: 'var(--crm-text-md)', fontWeight: 'bold' }}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{isSaving ? (isAr ? 'جاري الحفظ سحابياً...' : 'Saving to Cloud...') : (isAr ? 'حفظ ونشر التعديلات فوراً على الموقع' : 'Save & Publish Live')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
