import { useState } from 'react';
import { Eye, EyeOff, Plus, Trash2, ArrowUp, ArrowDown, Upload, Loader2, Users, Building2, Image as ImageIcon, LayoutList } from 'lucide-react';
import { ABOUT_SECTIONS, COMPANY_FIELDS, TEAM_GROUPS, LIMITS, normalizeAbout, blankMember, blankPhoto, moveItem, initials } from '../../../utils/aboutProfile';
import { uploadProfilePhoto } from '../../../utils/imageUploadService';
import ImageUploadField from '../ImageUploadField';
import './about-profile.css';

function Switch({ checked, onChange, label }) {
  return (
    <label className={`ap-switch ${checked ? 'is-on' : ''}`}>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {checked ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
      <span>{label}</span>
    </label>
  );
}

function Field({ label, value, onChange, placeholder, multiline = false, maxLength = 120, dir }) {
  return (
    <label className="ap-field">
      <span>{label}</span>
      {multiline
        ? <textarea rows={3} value={value || ''} maxLength={maxLength} placeholder={placeholder} dir={dir} onChange={(e) => onChange(e.target.value)} />
        : <input type="text" value={value || ''} maxLength={maxLength} placeholder={placeholder} dir={dir} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

const UPLOAD_ERRORS = {
  dev: { ar: 'الرفع شغال على الموقع الحقيقي بس، مش على نسخة التجربة.', en: 'Uploads work on the live site only.' }
};

/**
 * About page content: which sections show, the company's facts, the team and partners and the
 * company photos. Edits `formData.about`; the panel's Save button publishes it.
 */
export default function AboutProfileSettings({ formData, setFormData, isAr = true, triggerToast }) {
  const L = (ar, en) => (isAr ? ar : en);
  const about = normalizeAbout(formData.about);
  const [busy, setBusy] = useState(''); // id of the card whose photo is uploading, or 'gallery'

  const update = (patch) => setFormData((f) => ({ ...f, about: { ...normalizeAbout(f.about), ...patch(normalizeAbout(f.about)) } }));
  const setSection = (id, v) => update((a) => ({ sections: { ...a.sections, [id]: v } }));
  const setCompany = (key, field, v) => update((a) => ({ company: { ...a.company, [key]: { ...a.company[key], [field]: v } } }));
  const setMember = (id, patch) => update((a) => ({ team: a.team.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  const setShow = (id, key, v) => update((a) => ({ team: a.team.map((m) => (m.id === id ? { ...m, show: { ...m.show, [key]: v } } : m)) }));
  const setPhoto = (id, patch) => update((a) => ({ gallery: a.gallery.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));

  const failed = (reason) => {
    const msg = UPLOAD_ERRORS[reason];
    triggerToast?.(msg ? L(msg.ar, msg.en) : L('الصورة مارفعتش. اتأكد من النت وجرّب تاني.', 'Upload failed. Check the connection and try again.'), 'error');
  };

  const uploadGallery = async (files) => {
    const list = [...(files || [])].slice(0, LIMITS.gallery - about.gallery.length);
    if (!list.length) return;
    setBusy('gallery');
    const added = [];
    for (const file of list) {
      const res = await uploadProfilePhoto(file, `about-${Date.now()}`, { maxWidth: 1600, maxHeight: 1200 });
      if (res.ok) added.push(blankPhoto(res.url));
      else { failed(res.reason); break; }
    }
    setBusy('');
    if (added.length) update((a) => ({ gallery: [...a.gallery, ...added].slice(0, LIMITS.gallery) }));
  };


  return (
    <div className="ap">
      <p className="ap-save-hint">{L('أي تعديل هنا بيظهر على الموقع بعد ما تضغط «حفظ ونشر التعديلات فوراً» فوق.', 'Changes go live after you press Save & Publish above.')}</p>

      {/* Sections */}
      <section className="ap-card">
        <h4><LayoutList size={16} aria-hidden="true" /> {L('أقسام صفحة «عن الشركة»', 'About page sections')}</h4>
        <p className="ap-note">{L('اقفل أي قسم مش عايزه يظهر. القسم الفاضي مابيظهرش أصلاً.', 'Switch off any section. An empty section never shows.')}</p>
        <div className="ap-switch-grid">
          {ABOUT_SECTIONS.map((s) => (
            <Switch key={s.id} checked={about.sections[s.id]} onChange={(v) => setSection(s.id, v)} label={isAr ? s.ar : s.en} />
          ))}
        </div>
      </section>

      {/* Company facts */}
      <section className="ap-card">
        <h4><Building2 size={16} aria-hidden="true" /> {L('بيانات الشركة', 'Company facts')}</h4>
        <p className="ap-note">{L('اكتب البيانات الحقيقية بس. أي خانة فاضية أو مقفولة مابتظهرش.', 'Real facts only. Empty or switched-off rows stay hidden.')}</p>
        <div className="ap-rows">
          {COMPANY_FIELDS.map((f) => {
            const v = about.company[f.key];
            return (
              <div key={f.key} className={`ap-row ${v.visible ? '' : 'is-off'}`}>
                <Field label={isAr ? f.ar : f.en} value={v.value_ar} placeholder={f.hint_ar} onChange={(x) => setCompany(f.key, 'value_ar', x)} />
                <Field label={L('بالإنجليزي (اختياري)', 'English (optional)')} value={v.value_en} dir="ltr" onChange={(x) => setCompany(f.key, 'value_en', x)} />
                <Switch checked={v.visible} onChange={(x) => setCompany(f.key, 'visible', x)} label={L('يظهر', 'Shown')} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Team */}
      <section className="ap-card">
        <h4><Users size={16} aria-hidden="true" /> {L('فريق العمل والشركاء', 'Team & partners')}</h4>
        <p className="ap-note">{L('اعرض بس اللي وافق إن صورته وبياناته تظهر. رقم الواتساب مقفول لحد ما تفتحه.', 'Only show people who agreed. WhatsApp stays off until you switch it on.')}</p>
        <div className="ap-add-row">
          {TEAM_GROUPS.map((g) => (
            <button key={g.id} type="button" className="btn btn-sm btn-outline" disabled={about.team.length >= LIMITS.team}
              onClick={() => update((a) => ({ team: [...a.team, blankMember(g.id)] }))}>
              <Plus size={14} aria-hidden="true" /> {L(`إضافة في ${g.ar}`, `Add to ${g.en}`)}
            </button>
          ))}
        </div>

        {about.team.length === 0 && <p className="ap-empty">{L('لسه مفيش حد. ابدأ بإضافة أول شخص.', 'No one yet. Add the first person.')}</p>}

        <div className="ap-team">
          {about.team.map((m, i) => (
            <article key={m.id} className={`ap-member ${m.visible ? '' : 'is-off'}`}>
              <div className="ap-member-head">
                <div className="ap-avatar">
                  {m.photo ? <img src={m.photo} alt="" /> : <span>{initials(m.name_ar) || '؟'}</span>}
                </div>
                <div className="ap-member-title">
                  <strong>{m.name_ar || L('اسم جديد', 'New person')}</strong>
                  <select value={m.group} onChange={(e) => setMember(m.id, { group: e.target.value })} aria-label={L('المجموعة', 'Group')}>
                    {TEAM_GROUPS.map((g) => <option key={g.id} value={g.id}>{isAr ? g.ar : g.en}</option>)}
                  </select>
                </div>
                <div className="ap-tools">
                  <button type="button" className="btn btn-icon btn-ghost" onClick={() => update((a) => ({ team: moveItem(a.team, i, -1) }))} disabled={i === 0} aria-label={L('لفوق', 'Up')}><ArrowUp size={15} /></button>
                  <button type="button" className="btn btn-icon btn-ghost" onClick={() => update((a) => ({ team: moveItem(a.team, i, 1) }))} disabled={i === about.team.length - 1} aria-label={L('لتحت', 'Down')}><ArrowDown size={15} /></button>
                  <button type="button" className="btn btn-icon btn-ghost ap-del" onClick={() => update((a) => ({ team: a.team.filter((x) => x.id !== m.id) }))} aria-label={L('مسح', 'Delete')}><Trash2 size={15} /></button>
                </div>
              </div>

              <Switch checked={m.visible} onChange={(v) => setMember(m.id, { visible: v })} label={L('يظهر على الموقع', 'Shown on the site')} />

              <div className="ap-grid">
                <Field label={L('الاسم', 'Name')} value={m.name_ar} onChange={(v) => setMember(m.id, { name_ar: v })} placeholder={L('مثال: م. أحمد علي', 'e.g. Eng. Ahmed Ali')} />
                <Field label={L('الاسم بالإنجليزي', 'Name (English)')} value={m.name_en} dir="ltr" onChange={(v) => setMember(m.id, { name_en: v })} />
                <Field label={L('المسمى', 'Role')} value={m.role_ar} onChange={(v) => setMember(m.id, { role_ar: v })} placeholder={L('مثال: مستشار مبيعات', 'e.g. Sales advisor')} />
                <Field label={L('المسمى بالإنجليزي', 'Role (English)')} value={m.role_en} dir="ltr" onChange={(v) => setMember(m.id, { role_en: v })} />
              </div>
              <Field label={L('نبذة قصيرة (سطرين)', 'Short bio (two lines)')} value={m.bio_ar} multiline maxLength={220} onChange={(v) => setMember(m.id, { bio_ar: v })} />
              <div className="ap-grid">
                <Field label={L('رقم الواتساب (اختياري)', 'WhatsApp (optional)')} value={m.whatsapp} dir="ltr" maxLength={20} onChange={(v) => setMember(m.id, { whatsapp: v })} placeholder="01xxxxxxxxx" />
              </div>
              {/* Photos are uploaded from the device only, never pasted as a link */}
              <ImageUploadField label={L('الصورة', 'Photo')} value={m.photo} onChange={(url) => setMember(m.id, { photo: url })} name={`team-${m.id}`} maxWidth={800} maxHeight={800} previewShape="round" isAr={isAr} />

              <div className="ap-switch-row">
                <span>{L('يظهر في الكارت:', 'On the card:')}</span>
                <Switch checked={m.show.photo} onChange={(v) => setShow(m.id, 'photo', v)} label={L('الصورة', 'Photo')} />
                <Switch checked={m.show.role} onChange={(v) => setShow(m.id, 'role', v)} label={L('المسمى', 'Role')} />
                <Switch checked={m.show.bio} onChange={(v) => setShow(m.id, 'bio', v)} label={L('النبذة', 'Bio')} />
                <Switch checked={m.show.whatsapp} onChange={(v) => setShow(m.id, 'whatsapp', v)} label={L('زرار الواتساب', 'WhatsApp')} />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section className="ap-card">
        <h4><ImageIcon size={16} aria-hidden="true" /> {L('صور الشركة', 'Company photos')}</h4>
        <p className="ap-note">{L(`المكتب، الفريق في الشغل، تسليم وحدة… لحد ${LIMITS.gallery} صورة.`, `Office, team at work, a handover… up to ${LIMITS.gallery} photos.`)}</p>
        <div className="ap-add-row">
          <label className="btn btn-sm btn-primary ap-upload">
            {busy === 'gallery' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            <span>{busy === 'gallery' ? L('جاري الرفع…', 'Uploading…') : L('ارفع صور', 'Upload photos')}</span>
            <input type="file" accept="image/*" multiple hidden disabled={Boolean(busy) || about.gallery.length >= LIMITS.gallery} onChange={(e) => { uploadGallery(e.target.files); e.target.value = ''; }} />
          </label>
        </div>

        {about.gallery.length === 0 && <p className="ap-empty">{L('لسه مفيش صور.', 'No photos yet.')}</p>}
        <div className="ap-gallery">
          {about.gallery.map((g, i) => (
            <figure key={g.id} className={`ap-photo ${g.visible ? '' : 'is-off'}`}>
              <img src={g.url} alt="" loading="lazy" />
              <Field label={L('تعليق (اختياري)', 'Caption (optional)')} value={g.caption_ar} maxLength={80} onChange={(v) => setPhoto(g.id, { caption_ar: v })} />
              <div className="ap-photo-tools">
                <Switch checked={g.visible} onChange={(v) => setPhoto(g.id, { visible: v })} label={L('تظهر', 'Shown')} />
                <button type="button" className="btn btn-icon btn-ghost" onClick={() => update((a) => ({ gallery: moveItem(a.gallery, i, -1) }))} disabled={i === 0} aria-label={L('قبل', 'Earlier')}><ArrowUp size={15} /></button>
                <button type="button" className="btn btn-icon btn-ghost" onClick={() => update((a) => ({ gallery: moveItem(a.gallery, i, 1) }))} disabled={i === about.gallery.length - 1} aria-label={L('بعد', 'Later')}><ArrowDown size={15} /></button>
                <button type="button" className="btn btn-icon btn-ghost ap-del" onClick={() => update((a) => ({ gallery: a.gallery.filter((x) => x.id !== g.id) }))} aria-label={L('مسح', 'Delete')}><Trash2 size={15} /></button>
              </div>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
