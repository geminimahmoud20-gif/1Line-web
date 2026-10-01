import { Loader2, Film, Upload, Trash2, Plus, Play, Maximize2 } from 'lucide-react';
import { DEFAULT_FOUNDER_CMS } from '../../../utils/founderCmsData';

export default function HeroVideoSettings({
  canCancelUpload,
  cancelUploadRef,
  formData,
  handleAddClip,
  handleAddVideoByUrl,
  handleKeepOnlyActiveClip,
  handleRemoveClip,
  handleUpdateClip,
  handleVideoFileUpload,
  isAr,
  pastedVideoUrl,
  setFormData,
  setPastedVideoUrl,
  storageStatus,
  uploadLocked,
  uploadPhase,
  uploadProgress
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        background: 'rgba(13, 72, 161, 0.05)',
        border: '1px solid rgba(13, 72, 161, 0.15)',
        borderRadius: '14px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <strong style={{ display: 'block', fontSize: 'var(--crm-text-md)', color: 'var(--crm-ink)', marginBottom: '4px' }}>
            {isAr ? 'تفعيل خلفية الفيديو السينمائي في الواجهة الرئيسية' : 'Enable Cinematic Background Video'}
          </strong>
          <span style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
            {isAr 
              ? 'عند تفعيله، سيتم تشغيل لقطات فيديو معمارية راقية بالخلفية مستوحاة من The Agency RE.' 
              : 'Display full luxury video loop behind the hero section.'}
          </span>
        </div>
        <label htmlFor="fcms-field-1" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700 }}>
          <input id="fcms-field-1"
            type="checkbox"
            checked={formData.heroVideoEnabled !== false}
            onChange={(e) => setFormData({ ...formData, heroVideoEnabled: e.target.checked })}
            style={{ width: '20px', height: '20px', accentColor: 'var(--crm-info-solid)' }}
          />
          <span>{formData.heroVideoEnabled !== false ? (isAr ? 'مفعّل 🟢' : 'Enabled') : (isAr ? 'معطّل ⚪' : 'Disabled')}</span>
        </label>
      </div>

      {/* 📁 Direct File Upload Box */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: uploadLocked ? '1.5px dashed var(--crm-line)' : '1.5px dashed rgba(212, 175, 55, 0.4)',
        borderRadius: '16px',
        padding: '24px 20px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        cursor: uploadLocked ? 'default' : 'pointer',
        position: 'relative'
      }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--crm-accent-text)' }}>
          <Upload size={24} />
        </div>
        <h4 style={{ margin: 0, color: 'var(--crm-ink)', fontSize: 'var(--crm-text-lg)', fontWeight: 700 }}>
          {isAr ? 'رفع فيديو قصير من جهازك مباشرة' : 'Upload Short Video from Your Device'}
        </h4>
        <p style={{ margin: 0, color: 'var(--crm-muted)', fontSize: 'var(--crm-text-sm)', maxWidth: '480px' }}>
          {import.meta.env.DEV
            ? (isAr
              ? 'MP4 أو WebM أو MOV. يُضغط تلقائياً (720p بدون صوت) ويُحفظ داخل ملفات الموقع في public/videos، ويظهر للزوار بعد نشر الموقع.'
              : 'MP4, WebM or MOV. Compressed (720p, muted) into public/videos; live after the next deploy.')
            : (isAr
              ? 'MP4 أو WebM أو MOV حتى 60 ميجابايت. يُرفع مباشرة إلى التخزين السحابي ويظهر للزوار فوراً. للخلفية يكفي مقطع 10–15 ثانية.'
              : 'MP4, WebM or MOV up to 60MB. Uploaded straight to cloud storage; live immediately.')}
        </p>
        {storageStatus === 'checking' && (
          <span role="status" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
            <Loader2 size={14} className="spin" />
            {isAr ? 'جاري التحقق من خدمة التخزين…' : 'Checking storage…'}
          </span>
        )}
        {uploadLocked && (
          <div role="alert" style={{ maxWidth: '520px', textAlign: 'start', background: 'var(--crm-card)', border: '1px solid var(--crm-warn)', borderRadius: '12px', padding: '12px 14px', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-ink)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--crm-warn)' }}>
              {isAr ? 'الرفع من الجهاز متوقف على الموقع المنشور' : 'Device upload is off on the live site'}
            </strong>
            <div>
              {isAr
                ? 'لم تُربط مساحة تخزين (Vercel Blob) بالمشروع بعد. من لوحة Vercel: Storage ← Create ← Blob (وصول Public) ← Connect بالمشروع، ثم أعد النشر. وحتى يتم ذلك:'
                : 'No Vercel Blob store is connected yet. In Vercel: Storage → Create → Blob (Public) → Connect to the project, then redeploy. Until then:'}
            </div>
            <ol style={{ margin: '4px 0 0', paddingInlineStart: '20px' }}>
              <li>{isAr ? 'الصق رابط الفيديو (https) أو مساره داخل الموقع مثل /videos/hero.mp4 في الخانة بالأسفل.' : 'Paste an https link or a site path like /videos/hero.mp4 below.'}</li>
              <li>{isAr ? 'أو ارفعه من نسخة التطوير على جهازك (npm run dev) فيُضغط ويُحفظ في public/videos، ثم انشر الموقع.' : 'Or upload it from the local dev build (npm run dev) into public/videos, then deploy.'}</li>
            </ol>
          </div>
        )}
        {uploadProgress !== null && (
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress} aria-label={isAr ? 'تقدّم رفع الفيديو' : 'Upload progress'} style={{ width: 'min(420px, 100%)' }}>
            <div style={{ height: '8px', borderRadius: '4px', background: 'var(--crm-line)', overflow: 'hidden' }}>
              <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--crm-accent)', transition: 'width 0.2s' }} />
            </div>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '6px', fontSize: 'var(--crm-text-sm)', fontWeight: 700, color: 'var(--crm-ink)' }}>
              <Loader2 size={14} className="spin" />
              {uploadPhase === 'optimising'
                ? (isAr ? 'جاري ضغط الفيديو وتجهيزه للويب… (قد يستغرق دقيقة)' : 'Optimising video for the web…')
                : (isAr ? `جاري الرفع… ${uploadProgress}%` : `Uploading… ${uploadProgress}%`)}
            </span>
          </div>
        )}
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleVideoFileUpload}
          disabled={uploadProgress !== null || uploadLocked || storageStatus === 'checking'}
          aria-label={isAr ? 'اختيار فيديو للرفع' : 'Choose a video to upload'}
          style={{
            display: uploadLocked ? 'none' : undefined,
            position: 'absolute',
            inset: 0,
            opacity: 0,
            cursor: 'pointer',
            width: '100%',
            height: '100%'
          }}
          title={isAr ? 'انقر لاختيار فيديو' : 'Choose video'}
        />
      </div>

      {/* Upload controls that must sit outside the click-to-choose overlay above */}
      <div className="fcms-video-tools">
        {uploadProgress !== null && (
          <button type="button" className="btn btn-sm btn-outline" onClick={() => cancelUploadRef.current?.()} disabled={!canCancelUpload}>
            {isAr ? 'إلغاء الرفع' : 'Cancel upload'}
          </button>
        )}
        {/* Not a <form>: this sits inside the panel's Save form, and nested forms are invalid HTML */}
        <div className="fcms-url-row" role="group" aria-labelledby="fcms-video-url-label">
          <label id="fcms-video-url-label" htmlFor="fcms-video-url">{isAr ? 'أو أضف فيديو من رابط مباشر:' : 'Or add a video by direct link:'}</label>
          <input
            id="fcms-video-url"
            type="url"
            dir="ltr"
            inputMode="url"
            placeholder="https://…/video.mp4"
            value={pastedVideoUrl}
            onChange={(e) => setPastedVideoUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddVideoByUrl(); } }}
          />
          <button type="button" className="btn btn-sm btn-primary" onClick={handleAddVideoByUrl} disabled={!pastedVideoUrl.trim()}>
            {isAr ? 'إضافة الرابط' : 'Add link'}
          </button>
        </div>
      </div>

      {/* 📐 Video Fit & Presentation Mode (طريقة ملاءمة الفيديو والأبعاد) */}
      <div style={{
        background: 'var(--crm-subtle)',
        border: '1px solid var(--border-light)',
        borderRadius: '16px',
        padding: '18px 20px',
        margin: '16px 0'
      }}>
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ margin: '0 0 4px 0', color: 'var(--crm-ink)', fontSize: 'var(--crm-text-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Maximize2 size={16} style={{ color: 'var(--crm-accent-text)' }} />
            <span>{isAr ? 'طريقة ظهور وأبعاد الفيديو على الواجهة' : 'Video Fit & Framing'}</span>
          </h4>
          <p style={{ margin: 0, fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
            {isAr 
              ? 'اختر ما إذا كنت تفضل أن يملأ الفيديو كامل خلفية الشاشة (Cover)، أو إظهار كامل إطار الفيديو الأصلي بدون أي قص نهائياً (Contain).' 
              : 'Choose between full-bleed cinematic fill (cover) or full-frame uncropped view (contain).'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          {/* Option 1: Cover */}
          <div
            onClick={() => setFormData({ ...formData, heroVideoFit: 'cover' })}
            style={{
              border: (formData.heroVideoFit || 'cover') === 'cover' ? '1.5px solid var(--crm-accent)' : '1px solid var(--border-light)',
              background: (formData.heroVideoFit || 'cover') === 'cover' ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <input
                type="radio"
                name="heroVideoFit"
                checked={(formData.heroVideoFit || 'cover') === 'cover'}
                onChange={() => setFormData({ ...formData, heroVideoFit: 'cover' })}
                style={{ accentColor: 'var(--accent-gold)' }}
              />
              <strong style={{ color: 'var(--crm-ink)', fontSize: 'var(--crm-text-md)' }}>
                {isAr ? '🔳 تغطية سينمائية كاملة (Cover)' : 'Cinematic Fill (Cover)'}
              </strong>
            </div>
            <small style={{ color: 'var(--crm-muted)', display: 'block', paddingInlineStart: '24px', lineHeight: 1.5 }}>
              {isAr ? 'يملأ كامل مساحة الهيرو كخلفية سينمائية فخمة بدون هوامش (قد تُقص أطراف الفيديو لتناسب الشاشة).' : 'Fills the entire hero section edge-to-edge as a background.'}
            </small>
          </div>

          {/* Option 2: Contain */}
          <div
            onClick={() => setFormData({ ...formData, heroVideoFit: 'contain' })}
            style={{
              border: formData.heroVideoFit === 'contain' ? '1.5px solid var(--crm-accent)' : '1px solid var(--border-light)',
              background: formData.heroVideoFit === 'contain' ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <input
                type="radio"
                name="heroVideoFit"
                checked={formData.heroVideoFit === 'contain'}
                onChange={() => setFormData({ ...formData, heroVideoFit: 'contain' })}
                style={{ accentColor: 'var(--accent-gold)' }}
              />
              <strong style={{ color: 'var(--crm-ink)', fontSize: 'var(--crm-text-md)' }}>
                {isAr ? '🖼️ إظهار كامل إطار الفيديو 100% (Contain)' : 'Full Frame (Contain)'}
              </strong>
            </div>
            <small style={{ color: 'var(--crm-muted)', display: 'block', paddingInlineStart: '24px', lineHeight: 1.5 }}>
              {isAr ? 'يظهر الفيديو بأبعاده الأصلية كاملة 100% بدون أي قص للأطراف نهائياً، مع خلفية كحلية داكنة فخمة.' : 'Shows 100% of the video frame uncropped with dark luxury borders.'}
            </small>
          </div>
        </div>

        {/* Sub-options: Focus position + Cycle options */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
          {/* Focus position (if cover) */}
          {(formData.heroVideoFit || 'cover') === 'cover' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
                {isAr ? 'موضع تركيز الفيديو:' : 'Focus Position:'}
              </span>
              <select
                value={formData.heroVideoPosition || 'center'}
                onChange={(e) => setFormData({ ...formData, heroVideoPosition: e.target.value })}
                style={{ padding: '4px 8px', borderRadius: '6px', fontSize: 'var(--crm-text-sm)', background: 'var(--crm-card)', color: 'var(--crm-ink)', border: '1px solid var(--border-light)' }}
              >
                <option value="center">{isAr ? 'الوسط (متوازن)' : 'Center'}</option>
                <option value="top">{isAr ? 'الأعلى (تركيز على الواجهة العلوية)' : 'Top'}</option>
                <option value="bottom">{isAr ? 'الأسفل' : 'Bottom'}</option>
              </select>
            </div>
          )}

          {/* Cycle mode: end of video vs seconds */}
          {formData.heroVideoAutoCycle !== false && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--crm-text-sm)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.heroVideoCycleOnEnd === true}
                  onChange={(e) => setFormData({ ...formData, heroVideoCycleOnEnd: e.target.checked })}
                  style={{ accentColor: 'var(--accent-gold)' }}
                />
                <span>{isAr ? 'انتظار نهاية المقطع بالكامل قبل التبديل (بدون قطعه)' : 'Wait for video to finish before cycling'}</span>
              </label>

              {!formData.heroVideoCycleOnEnd && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginInlineStart: '10px' }}>
                  <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>{isAr ? 'مدة المقطع (ثوانٍ):' : 'Seconds per clip:'}</span>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={formData.heroVideoIntervalSec || 10}
                    onChange={(e) => setFormData({ ...formData, heroVideoIntervalSec: Math.max(5, parseInt(e.target.value, 10) || 10) })}
                    style={{ width: '60px', padding: '2px 6px', fontSize: 'var(--crm-text-xs)', borderRadius: '6px', border: '1px solid var(--border-light)' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🎞️ Short Videos Playlist Engine */}
      <div style={{
        background: 'var(--crm-subtle)',
        border: '1px solid var(--border-light)',
        borderRadius: '16px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', color: 'var(--crm-accent-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Film size={18} />
              <span>{isAr ? 'قائمة الفيديوهات القصيرة المتعاقبة' : 'Short Videos Playlist'}</span>
            </h4>
            <p style={{ margin: 0, fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
              {isAr
                ? 'يمكنك إضافة عدة فيديوهات قصيرة (10-15 ثانية) ليقوم الموقع بالتبديل بينها بسلاسة وفخامة كأنها لقطات سينمائية مستمرة.'
                : 'Add multiple short clips to auto-cycle smoothly like a continuous luxury documentary.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {(formData.heroVideoClips || []).length > 1 && (
              <button
                type="button"
                className="btn btn-xs btn-outline"
                onClick={handleKeepOnlyActiveClip}
                title={isAr ? 'إلغاء المقاطع الافتراضية وتشغيل المقطع الأساسي فقط' : 'Keep only active clip'}
                style={{ color: 'var(--crm-accent-text)', borderColor: 'rgba(212, 175, 55, 0.4)' }}
              >
                {isAr ? '⭐ تشغيل مقطعي فقط (حذف الافتراضية)' : 'Keep My Video Only'}
              </button>
            )}

            <label htmlFor="fcms-field-2" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--crm-text-base)', cursor: 'pointer', fontWeight: 700 }}>
              <input id="fcms-field-2"
                type="checkbox"
                checked={formData.heroVideoAutoCycle !== false}
                onChange={(e) => setFormData({ ...formData, heroVideoAutoCycle: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--crm-info-solid)' }}
              />
              <span>{isAr ? 'تبديل تلقائي سلس' : 'Auto-cycle clips'}</span>
            </label>

            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={handleAddClip}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} />
              <span>{isAr ? 'إضافة مقطع فيديو' : 'Add Clip'}</span>
            </button>
          </div>
        </div>

        {/* Clips List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(formData.heroVideoClips || DEFAULT_FOUNDER_CMS.heroVideoClips || []).map((clip, idx) => {
            const isActive = formData.heroVideoUrl === clip.url;

            return (
              <div
                key={clip.id || idx}
                style={{
                  background: isActive ? 'rgba(13, 72, 161, 0.08)' : 'rgba(255,255,255,0.02)',
                  border: isActive ? '1.5px solid rgba(13, 72, 161, 0.4)' : '1px solid var(--border-light)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: 'rgba(212, 175, 55, 0.2)', color: 'var(--crm-accent-text)', padding: '2px 8px', borderRadius: '4px', fontSize: 'var(--crm-text-xs)', fontWeight: 700 }}>
                      #{idx + 1}
                    </span>
                    <strong style={{ fontSize: 'var(--crm-text-md)', color: 'var(--crm-ink)' }}>
                      {isAr ? clip.title_ar : (clip.title_en || clip.title_ar)}
                    </strong>
                    {isActive && (
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-positive)', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        {isAr ? '● المقطع النشط حالياً' : 'Active Clip'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {!isActive && (
                      <button
                        type="button"
                        className="btn btn-xs btn-primary"
                        onClick={() => setFormData({ ...formData, heroVideoUrl: clip.url })}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Play size={11} />
                        <span>{isAr ? 'تعيين كفيديو أساسي' : 'Set as Active'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost text-danger"
                      onClick={() => handleRemoveClip(idx)}
                      title={isAr ? 'حذف هذا المقطع' : 'Delete clip'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder={isAr ? 'عنوان المقطع (بالعربي)' : 'Clip Title'}
                    value={clip.title_ar || ''}
                    onChange={(e) => handleUpdateClip(idx, 'title_ar', e.target.value)}
                    style={{ fontSize: 'var(--crm-text-sm)' }}
                  />
                  <input
                    type="url"
                    placeholder={isAr ? 'رابط ملف الفيديو المباشر (MP4 URL أو Base64)' : 'Video URL'}
                    value={clip.url || ''}
                    onChange={(e) => handleUpdateClip(idx, 'url', e.target.value)}
                    style={{ fontSize: 'var(--crm-text-sm)' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="form-group-item" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="fcms-field-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'رابط الفيديو الأساسي الحالي:' : 'Current Active Video URL:'}</span>
            <small style={{ color: 'var(--crm-accent-text)' }}>{isAr ? 'فيديو مباشر عالي الوضوح' : 'HD direct stream'}</small>
          </label>
          <input id="fcms-field-3"
            type="url"
            value={formData.heroVideoUrl || ''}
            onChange={(e) => setFormData({ ...formData, heroVideoUrl: e.target.value })}
            placeholder="https://assets.mixkit.co/videos/preview/..."
            required
          />
          {/* Presets */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>{isAr ? 'مقترحات سريعة:' : 'Presets:'}</span>
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => setFormData({
                ...formData,
                heroVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-modern-architecture-buildings-and-skyscrapers-41551-large.mp4'
              })}
            >
              🏢 {isAr ? 'أبراج معمارية حديثة' : 'Modern Architecture'}
            </button>
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => setFormData({
                ...formData,
                heroVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-luxury-pool-resort-41553-large.mp4'
              })}
            >
              🏡 {isAr ? 'منتجع وقصور فاخرة' : 'Luxury Resort'}
            </button>
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => setFormData({
                ...formData,
                heroVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-drone-view-of-a-modern-residential-neighborhood-41555-large.mp4'
              })}
            >
              🏘️ {isAr ? 'حي سكني راقٍ دروني' : 'Drone Neighborhood'}
            </button>
          </div>
        </div>

        <div className="form-group-item" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="fcms-field-4">{isAr ? 'رابط صورة البوستر البديلة:' : 'Fallback Poster Image URL:'}</label>
          <input id="fcms-field-4"
            type="url"
            value={formData.heroPosterUrl || ''}
            onChange={(e) => setFormData({ ...formData, heroPosterUrl: e.target.value })}
            placeholder="https://images.unsplash.com/photo-..."
          />
          <small style={{ color: 'var(--crm-muted)', display: 'block', marginTop: '4px' }}>
            {isAr ? 'تظهر في أول أجزاء من الثانية لضمان سرعة التحميل أو على الأجهزة التي تعطل تشغيل الفيديو التلقائي.' : 'Shown before video loads or on power-save devices.'}
          </small>
        </div>

        {/* Overlay Opacity Slider */}
        <div className="form-group-item" style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'نسبة تعتيم التظليل الملكي:' : 'Dark Overlay Opacity:'}</span>
            <strong style={{ color: 'var(--crm-accent-text)' }}>
              {Math.round((Number(formData.heroOverlayOpacity ?? 0.65)) * 100)}%
            </strong>
          </label>
          <input
            type="range"
            min="0.20"
            max="0.85"
            step="0.05"
            value={formData.heroOverlayOpacity ?? 0.65}
            onChange={(e) => setFormData({ ...formData, heroOverlayOpacity: parseFloat(e.target.value) })}
            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--crm-info-solid)' }}
          />
          <small style={{ color: 'var(--crm-muted)' }}>
            {isAr ? 'زيادة النسبة تزيد من سواد وظلمة الفيديو لجعل النصوص البيضاء مقروءة وواضحة جداً.' : 'Higher opacity guarantees crisp text readability over bright footage.'}
          </small>
        </div>

        {/* Slogan and Highlight Titles */}
        <div className="form-group-item">
          <label htmlFor="fcms-field-5">{isAr ? 'شارة الهيرو العليا (بالعربية):' : 'Hero Badge (Arabic):'}</label>
          <input id="fcms-field-5"
            type="text"
            value={formData.heroBadge_ar || ''}
            onChange={(e) => setFormData({ ...formData, heroBadge_ar: e.target.value })}
          />
        </div>

        <div className="form-group-item">
          <label htmlFor="fcms-field-6">{isAr ? 'شارة الهيرو العليا (بالإنجليزية):' : 'Hero Badge (English):'}</label>
          <input id="fcms-field-6"
            type="text"
            value={formData.heroBadge_en || ''}
            onChange={(e) => setFormData({ ...formData, heroBadge_en: e.target.value })}
          />
        </div>

        <div className="form-group-item">
          <label htmlFor="fcms-field-7">{isAr ? 'العنوان الرئيسي السطر الأول (بالعربية):' : 'Main Title Line 1 (Arabic):'}</label>
          <input id="fcms-field-7"
            type="text"
            value={formData.heroTitle_ar || ''}
            onChange={(e) => setFormData({ ...formData, heroTitle_ar: e.target.value })}
          />
        </div>

        <div className="form-group-item">
          <label htmlFor="fcms-field-8">{isAr ? 'العبارة الذهبية المميزة (بالعربية):' : 'Golden Highlight (Arabic):'}</label>
          <input id="fcms-field-8"
            type="text"
            value={formData.heroHighlight_ar || ''}
            onChange={(e) => setFormData({ ...formData, heroHighlight_ar: e.target.value })}
          />
        </div>

        <div className="form-group-item" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="fcms-field-9">{isAr ? 'النص الوصفي للهيرو (بالعربية):' : 'Hero Subtitle (Arabic):'}</label>
          <textarea id="fcms-field-9"
            rows={2}
            value={formData.heroSubtitle_ar || ''}
            onChange={(e) => setFormData({ ...formData, heroSubtitle_ar: e.target.value })}
          />
        </div>
      </div>
    </div>

  );
}
