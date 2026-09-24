import { useEffect, useMemo, useState } from 'react';
import { Megaphone, Plus, Pencil, Trash2, Pause, Play, X, Eye, MousePointerClick, AlertTriangle, ExternalLink, Image as ImageIcon } from 'lucide-react';
import {
  useAdCampaigns,
  saveCampaigns,
  campaignStatus,
  pickHeroCampaign,
  isSafeAdUrl,
  isSafeImageUrl,
  onCampaignSyncFailed,
  newCampaignId
} from '../../utils/adCampaigns';
import { subscribeToAdStats } from '../../firebaseLazy';
import { toDayInput, addDays } from '../../utils/featuredSlots';
import './homepage-slots.css';

const PLACEMENTS = {
  hero: { ar: 'خلفية الصفحة الرئيسية', en: 'Homepage hero', hint_ar: 'صورة 1920×1080 للكمبيوتر + 900×1200 للموبايل، أقل من 400KB. العنوان والبحث يبقيان فوقها.' },
  inline: { ar: 'بانر بين الأقسام', en: 'In-page banner', hint_ar: 'صورة 1200×600، أقل من 250KB. تظهر بين العقارات وقسم أصحاب العقارات.' }
};
const STATUS_LABEL = { live: ['نشطة الآن', 'Live'], scheduled: ['مجدولة', 'Scheduled'], ended: ['انتهت', 'Ended'], paused: ['متوقفة', 'Paused'] };

const emptyCampaign = () => ({
  id: '',
  placement: 'hero',
  active: true,
  priority: 1,
  advertiser: '',
  title_ar: '',
  subtitle_ar: '',
  cta_ar: 'اكتشف المشروع',
  title_en: '',
  cta_en: '',
  url: '/projects',
  imageDesktop: '',
  imageMobile: '',
  startAt: toDayInput(Date.now()),
  endAt: addDays(29)
});

function CampaignModal({ initial, isAr, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    const f = { ...form, title_ar: form.title_ar.trim(), advertiser: form.advertiser.trim(), url: form.url.trim(), imageDesktop: form.imageDesktop.trim(), imageMobile: form.imageMobile.trim() };
    if (!f.title_ar) return setError('اكتب عنوان الإعلان');
    if (!f.advertiser) return setError('اكتب اسم المُعلِن — يظهر بجوار كلمة «مُموَّل»');
    if (!isSafeAdUrl(f.url)) return setError('الرابط يجب أن يبدأ بـ / (صفحة داخل الموقع) أو https://');
    if (!isSafeImageUrl(f.imageDesktop)) return setError('رابط صورة الكمبيوتر يجب أن يبدأ بـ https://');
    if (f.imageMobile && !isSafeImageUrl(f.imageMobile)) return setError('رابط صورة الموبايل يجب أن يبدأ بـ https://');
    if (!f.startAt || !f.endAt) return setError('حدد تاريخ البداية والنهاية');
    if (f.endAt < f.startAt) return setError('تاريخ النهاية قبل البداية');
    onSave({ ...f, id: f.id || newCampaignId(), priority: Number(f.priority) || 1, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <form className="crm-modal-card hs-modal" role="dialog" aria-modal="true" aria-labelledby="ad-modal-title" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ maxWidth: 640 }}>
        <div className="hs-modal-head">
          <div>
            <h3 id="ad-modal-title"><Megaphone size={18} color="#D9B97E" /> {initial.id ? 'تعديل الحملة' : 'حملة إعلانية جديدة'}</h3>
            <small>{PLACEMENTS[form.placement].hint_ar}</small>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="hs-icon-btn"><X size={18} /></button>
        </div>

        <div className="hs-presets" role="radiogroup" aria-label="مكان الإعلان">
          {Object.entries(PLACEMENTS).map(([id, p]) => (
            <button type="button" key={id} role="radio" aria-checked={form.placement === id} className={`hs-chip ${form.placement === id ? 'is-active' : ''}`} onClick={() => setForm({ ...form, placement: id })}>
              {isAr ? p.ar : p.en}
            </button>
          ))}
        </div>

        <div className="hs-grid ad-grid">
          <label><span>المُعلِن *</span><input value={form.advertiser} onChange={set('advertiser')} placeholder="مثال: شركة ... للتطوير" maxLength={60} /></label>
          <label><span>الأولوية (الأعلى يظهر أولاً)</span><input type="number" min="1" max="99" value={form.priority} onChange={set('priority')} /></label>
          <label className="ad-full"><span>عنوان الإعلان *</span><input value={form.title_ar} onChange={set('title_ar')} maxLength={80} placeholder="مثال: إطلاق المرحلة الثانية في سوهاج الجديدة" /></label>
          <label className="ad-full"><span>سطر وصفي (للبانر)</span><input value={form.subtitle_ar} onChange={set('subtitle_ar')} maxLength={140} /></label>
          <label><span>نص الزر</span><input value={form.cta_ar} onChange={set('cta_ar')} maxLength={28} /></label>
          <label><span>الرابط *</span><input value={form.url} onChange={set('url')} dir="ltr" placeholder="/projects أو https://..." /></label>
          <label className="ad-full"><span>صورة الكمبيوتر (https) *</span><input value={form.imageDesktop} onChange={set('imageDesktop')} dir="ltr" placeholder="https://..." /></label>
          <label className="ad-full"><span>صورة الموبايل (اختياري)</span><input value={form.imageMobile} onChange={set('imageMobile')} dir="ltr" placeholder="https://..." /></label>
          <label><span>من يوم</span><input type="date" value={form.startAt} onChange={set('startAt')} /></label>
          <label><span>حتى يوم (شامل)</span><input type="date" value={form.endAt} min={form.startAt} onChange={set('endAt')} /></label>
          <details className="ad-full ad-en">
            <summary>نسخة إنجليزية (اختياري)</summary>
            <div className="hs-grid">
              <label><span>Title (EN)</span><input value={form.title_en} onChange={set('title_en')} dir="ltr" /></label>
              <label><span>Button (EN)</span><input value={form.cta_en} onChange={set('cta_en')} dir="ltr" /></label>
            </div>
          </details>
          <label className="ad-full ad-check"><input type="checkbox" checked={form.active} onChange={set('active')} /> <span>مفعّلة (تظهر تلقائياً خلال الفترة المحددة)</span></label>
        </div>

        {isSafeImageUrl(form.imageDesktop) && (
          <div className={`ad-preview ad-preview--${form.placement}`}>
            <img src={form.imageDesktop} alt="" />
            <span className="ad-preview-tag">مُموَّل · {form.advertiser || 'المُعلِن'}</span>
            <strong>{form.title_ar || 'عنوان الإعلان'}</strong>
          </div>
        )}

        <p className="hs-note">كل إعلان يظهر للزوار بكلمة «مُموَّل» واسم المُعلِن. الروابط الخارجية تُعلَّم كإعلان لمحركات البحث.</p>
        {error && <p className="hs-error" role="alert">{error}</p>}
        <div className="hs-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          <button type="submit" className="btn btn-primary">حفظ الحملة</button>
        </div>
      </form>
    </div>
  );
}

export default function AdCampaignsPanel({ lang = 'ar', triggerToast }) {
  const isAr = lang === 'ar';
  const { campaigns, now } = useAdCampaigns();
  const [stats, setStats] = useState({});
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => subscribeToAdStats(setStats), []);
  useEffect(() => onCampaignSyncFailed(() => {
    if (triggerToast) triggerToast('تم الحفظ على هذا الجهاز فقط — تعذّرت المزامنة السحابية، تحقق من الاتصال والصلاحية', 'error');
  }), [triggerToast]);

  const sorted = useMemo(() => {
    const rank = { live: 0, scheduled: 1, paused: 2, ended: 3 };
    return [...campaigns].sort((a, b) => rank[campaignStatus(a, now)] - rank[campaignStatus(b, now)] || (Number(b.priority) || 0) - (Number(a.priority) || 0));
  }, [campaigns, now]);
  const heroNow = pickHeroCampaign(campaigns, now);
  const liveHeroCount = campaigns.filter((c) => c.placement === 'hero' && campaignStatus(c, now) === 'live').length;
  const liveInline = campaigns.filter((c) => c.placement === 'inline' && campaignStatus(c, now) === 'live').length;
  const totals = Object.values(stats).reduce((t, s) => ({ v: t.v + (s.impressions || 0), c: t.c + (s.clicks || 0) }), { v: 0, c: 0 });

  const persist = (list, msg) => {
    saveCampaigns(list);
    if (msg && triggerToast) triggerToast(msg, 'success');
  };
  const upsert = (c) => {
    const exists = campaigns.some((x) => x.id === c.id);
    persist(exists ? campaigns.map((x) => (x.id === c.id ? c : x)) : [c, ...campaigns], exists ? 'تم تحديث الحملة' : 'تمت إضافة الحملة');
    setEditing(null);
  };

  const fmt = (v) => (v ? new Date(`${v}T12:00:00`).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

  return (
    <div className="ad-panel">
      <div className="panel-top-bar">
        <div>
          <h3><Megaphone size={20} /> الإعلانات والحملات</h3>
          <p className="panel-sub">حملات بمواعيد على خلفية الصفحة الرئيسية وبانرات بين الأقسام — تظهر وتختفي تلقائياً</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing(emptyCampaign())}>
          <Plus size={16} /> <span>حملة جديدة</span>
        </button>
      </div>

      <div className="ad-kpis">
        <div><span>الخلفية الآن</span><strong>{heroNow ? heroNow.advertiser : 'الصورة الافتراضية'}</strong></div>
        <div><span>بانرات نشطة</span><strong>{liveInline}</strong></div>
        <div><span>مشاهدات (كل الحملات)</span><strong>{totals.v.toLocaleString('en-US')}</strong></div>
        <div><span>نقرات</span><strong>{totals.c.toLocaleString('en-US')}</strong></div>
      </div>

      {liveHeroCount > 1 && (
        <p className="ad-warning" role="status">
          <AlertTriangle size={15} /> يوجد {liveHeroCount} حملات خلفية نشطة في نفس الوقت — تظهر حملة «{heroNow?.advertiser}» فقط (الأعلى أولوية).
        </p>
      )}

      {sorted.length === 0 ? (
        <div className="ad-empty">
          <ImageIcon size={32} />
          <p>لا توجد حملات بعد. أضف أول حملة لتظهر في الموعد الذي تحدده ثم تختفي تلقائياً.</p>
        </div>
      ) : (
        <div className="ad-list">
          {sorted.map((c) => {
            const status = campaignStatus(c, now);
            const s = stats[c.id] || {};
            const ctr = s.impressions ? ((s.clicks || 0) / s.impressions * 100).toFixed(1) : null;
            const isShown = status === 'live' && (c.placement === 'inline' || heroNow?.id === c.id);
            return (
              <article key={c.id} className={`ad-row ad-row--${status}`}>
                <img src={c.imageDesktop} alt="" loading="lazy" />
                <div className="ad-row-main">
                  <div className="ad-row-tags">
                    <span className={`hs-period hs-period--${status === 'live' ? 'active' : status === 'scheduled' ? 'scheduled' : 'expired'}`}>{STATUS_LABEL[status][0]}</span>
                    <span className="hs-tag">{PLACEMENTS[c.placement]?.ar}</span>
                    {status === 'live' && !isShown && <span className="hs-tag">في الانتظار (أولوية أقل)</span>}
                  </div>
                  <strong>{c.title_ar}</strong>
                  <small>{c.advertiser} · {fmt(c.startAt)} ← {fmt(c.endAt)}</small>
                </div>
                <div className="ad-row-stats" aria-label="الإحصائيات">
                  <span title="مشاهدات"><Eye size={14} /> {(s.impressions || 0).toLocaleString('en-US')}</span>
                  <span title="نقرات"><MousePointerClick size={14} /> {(s.clicks || 0).toLocaleString('en-US')}</span>
                  <span title="نسبة النقر">{ctr !== null ? `${ctr}%` : '—'}</span>
                </div>
                <div className="ad-row-actions">
                  <a className="hs-icon-btn" href={c.url} target="_blank" rel="noopener noreferrer" aria-label="فتح الرابط"><ExternalLink size={15} /></a>
                  <button type="button" className="hs-icon-btn" onClick={() => persist(campaigns.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)), c.active ? 'تم إيقاف الحملة' : 'تم تفعيل الحملة')} aria-label={c.active ? 'إيقاف' : 'تفعيل'}>
                    {c.active ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                  <button type="button" className="hs-icon-btn" onClick={() => setEditing(c)} aria-label="تعديل"><Pencil size={15} /></button>
                  <button type="button" className="hs-icon-btn ad-danger" onClick={() => setConfirmDelete(c)} aria-label="حذف"><Trash2 size={15} /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && <CampaignModal initial={editing} isAr={isAr} onSave={upsert} onClose={() => setEditing(null)} />}

      {confirmDelete && (
        <div className="crm-modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="crm-modal-card" role="alertdialog" aria-modal="true" aria-labelledby="ad-del-title" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center' }}>
            <h3 id="ad-del-title" style={{ color: '#fff', marginTop: 0 }}>حذف حملة «{confirmDelete.title_ar}»؟</h3>
            <p style={{ color: '#cbd5e1' }}>تختفي من الموقع فوراً. إحصائياتها تبقى محفوظة. لإيقافها مؤقتاً استخدم زر الإيقاف بدلاً من الحذف.</p>
            <div className="hs-modal-actions" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>تراجع</button>
              <button
                type="button"
                className="btn"
                style={{ background: '#dc2626', color: '#fff', border: 0 }}
                onClick={() => { persist(campaigns.filter((x) => x.id !== confirmDelete.id), 'تم حذف الحملة'); setConfirmDelete(null); }}
              >
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
