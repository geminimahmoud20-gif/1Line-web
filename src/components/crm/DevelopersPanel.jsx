import { useState } from 'react';
import { Plus, Edit3, Trash2, Building, Globe, Phone, X, Save, Loader2 } from 'lucide-react';
import { EMPTY_DEVELOPER, saveDevelopers, projectsOf } from '../../utils/developers';
import { projectPriceStats } from '../../utils/projectStats';
import { useConfirm } from '../ui';
import './developers.css';

/**
 * «المطورين»: one card per development company with its projects (and their average price per m²),
 * and a form for the company's details. Saving needs an admin account (settings are admin-only).
 */
export default function DevelopersPanel({ developers = [], projects = [], properties = [], isAr = true, canEdit = false, triggerToast = () => {} }) {
  const L = (ar, en) => (isAr ? ar : en);
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null); // developer being edited (a copy)
  const [saving, setSaving] = useState(false);

  const save = async (next) => {
    setSaving(true);
    try {
      await saveDevelopers(next);
      triggerToast(L('اتحفظ', 'Saved'), 'success');
      return true;
    } catch {
      triggerToast(L('مقدرناش نحفظ. حفظ المطورين للمدير بس.', 'Could not save. Only admins can save developers.'), 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!editing.name_ar.trim()) { triggerToast(L('اكتب اسم الشركة', 'Enter the company name'), 'error'); return; }
    const exists = developers.some((d) => d.id === editing.id);
    const next = exists ? developers.map((d) => (d.id === editing.id ? editing : d)) : [...developers, { ...editing, id: `dev-${Date.now()}` }];
    if (await save(next)) setEditing(null);
  };

  const remove = async (d) => {
    const count = projectsOf(d, projects).length;
    const ok = await confirm({ message: L(`تشيل «${d.name_ar}»؟${count ? ` مشروعاته (${count}) هتفضل، بس من غير مطوّر مربوط.` : ''}`, `Remove «${d.name_en || d.name_ar}»?`), tone: 'danger' });
    if (ok) await save(developers.filter((x) => x.id !== d.id));
  };

  const field = (key, label, props = {}) => (
    <label className="dvp-field">
      <span>{label}</span>
      <input value={editing[key] || ''} onChange={(e) => setEditing({ ...editing, [key]: e.target.value })} {...props} />
    </label>
  );

  return (
    <section className="dvp" aria-label={L('المطورين', 'Developers')}>
      <div className="dvp-head">
        <p>{L('سجّل كل شركة تطوير مرة واحدة، وبعدها اختارها في المشروع. كل مطوّر ليه صفحة على الموقع فيها مشروعاته.', 'Register each developer once, then pick it on its projects.')}</p>
        {canEdit && (
          <button type="button" className="crm-btn-primary-gold" onClick={() => setEditing({ ...EMPTY_DEVELOPER })}>
            <Plus size={16} aria-hidden="true" /> {L('مطوّر جديد', 'New developer')}
          </button>
        )}
      </div>

      {developers.length === 0 ? (
        <p className="dvp-empty">{L('لسه مفيش مطورين متسجلين.', 'No developers yet.')}</p>
      ) : (
        <div className="dvp-grid">
          {developers.map((d) => {
            const own = projectsOf(d, projects);
            return (
              <article key={d.id} className="dvp-card">
                <header>
                  {d.logo ? <img src={d.logo} alt="" className="dvp-logo" /> : <span className="dvp-logo is-empty"><Building size={20} aria-hidden="true" /></span>}
                  <div>
                    <h3>{d.name_ar}</h3>
                    {d.name_en && <small dir="ltr">{d.name_en}</small>}
                  </div>
                </header>
                <ul className="dvp-projects">
                  {own.length === 0 && <li className="is-muted">{L('مفيش مشروعات مربوطة', 'No linked projects')}</li>}
                  {own.map((p) => {
                    const s = projectPriceStats(p, properties);
                    return (
                      <li key={p.id}>
                        <span>{p.title_ar}</span>
                        {s.avgPricePerMeter > 0 && <b>{s.avgPricePerMeter.toLocaleString('en-US')} {L('ج.م/م²', 'EGP/m²')}</b>}
                      </li>
                    );
                  })}
                </ul>
                <footer>
                  {d.phone && <span><Phone size={13} aria-hidden="true" /> <bdi dir="ltr">{d.phone}</bdi></span>}
                  {d.website && <a href={d.website} target="_blank" rel="noopener noreferrer"><Globe size={13} aria-hidden="true" /> {L('الموقع', 'Website')}</a>}
                  {canEdit && (
                    <span className="dvp-actions">
                      <button type="button" onClick={() => setEditing({ ...EMPTY_DEVELOPER, ...d })} aria-label={L('تعديل', 'Edit')}><Edit3 size={15} /></button>
                      <button type="button" onClick={() => remove(d)} aria-label={L('حذف', 'Delete')}><Trash2 size={15} /></button>
                    </span>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="track-modal-backdrop" onClick={() => !saving && setEditing(null)}>
          <form className="dvp-form" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
            <header>
              <h3>{developers.some((d) => d.id === editing.id) ? L('تعديل المطوّر', 'Edit developer') : L('مطوّر جديد', 'New developer')}</h3>
              <button type="button" className="drawer-close-btn" onClick={() => setEditing(null)} aria-label={L('إغلاق', 'Close')}><X size={18} /></button>
            </header>
            <div className="dvp-form-grid">
              {field('name_ar', L('اسم الشركة *', 'Name (Arabic) *'), { required: true, maxLength: 120 })}
              {field('name_en', L('الاسم بالإنجليزي (لينك صفحتها)', 'Name (English)'), { dir: 'ltr', maxLength: 120 })}
              {field('logo', L('رابط اللوجو', 'Logo URL'), { dir: 'ltr', type: 'url', placeholder: 'https://' })}
              {field('founded', L('سنة التأسيس', 'Founded'), { inputMode: 'numeric', maxLength: 4 })}
              {field('deliveredProjects', L('عدد المشروعات المسلّمة', 'Delivered projects'), { inputMode: 'numeric', maxLength: 4 })}
              {field('phone', L('رقم التواصل', 'Phone'), { dir: 'ltr', type: 'tel' })}
              {field('website', L('الموقع الإلكتروني', 'Website'), { dir: 'ltr', type: 'url', placeholder: 'https://' })}
              {field('facebook', L('صفحة فيسبوك', 'Facebook page'), { dir: 'ltr', type: 'url', placeholder: 'https://' })}
              <label className="dvp-field is-wide">
                <span>{L('نبذة عن الشركة', 'About')}</span>
                <textarea rows={4} maxLength={2000} value={editing.about_ar || ''} onChange={(e) => setEditing({ ...editing, about_ar: e.target.value })} />
              </label>
            </div>
            <footer>
              <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>{L('إلغاء', 'Cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 size={16} className="spin-animation" /> : <Save size={16} />} {L('حفظ', 'Save')}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
