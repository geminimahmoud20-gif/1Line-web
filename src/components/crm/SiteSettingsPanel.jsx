import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Mail, Share2, CircleHelp, Quote, Search, Megaphone } from 'lucide-react';
import { PageHeader, Tabs, Card, CardHeader, Input, Textarea, Select, Button, IconButton, EmptyState, useConfirm } from '../ui';
import { saveSettings, loadSettings } from '../../firebaseLazy';
import {
  SITE_SETTINGS_KEY, SOCIAL_NETWORKS, SEO_PAGES, FAQ_CATEGORIES,
  getSiteSettings, normalizeSiteSettings, applySiteSettings
} from '../../utils/siteSettings';
import './site-settings-panel.css';

const FAQ_CATEGORY_LABELS = {
  services: { ar: 'الخدمات والمناطق', en: 'Services & areas' },
  valuation: { ar: 'التقييم والتسعير', en: 'Valuation' },
  legal: { ar: 'الفحص القانوني', en: 'Legal' },
  expats: { ar: 'المغتربين والأتعاب', en: 'Expats & fees' }
};

const EMPTY_FAQ = { q_ar: '', a_ar: '', q_en: '', a_en: '', category: 'services' };
const EMPTY_TESTIMONIAL = { name: '', role_ar: '', role_en: '', text_ar: '', text_en: '' };

// The form keeps every field as text (blank social links included) and is cleaned only on save
const toForm = (s) => ({
  contact: { ...s.contact },
  social: Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n.id, s.social[n.id] || ''])),
  faq: s.faq.map((f) => ({ ...f })),
  testimonials: s.testimonials.map((t) => ({ ...t })),
  seo: Object.fromEntries(SEO_PAGES.map((p) => [p.path, { title_ar: '', description_ar: '', title_en: '', description_en: '', ...(s.seo[p.path] || {}) }])),
  tracking: { metaPixelId: s.tracking?.metaPixelId || '' }
});

const move = (list, i, dir) => {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

export default function SiteSettingsPanel({ lang = 'ar', triggerToast }) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const confirm = useConfirm();
  const [tab, setTab] = useState('contact');
  const [form, setForm] = useState(() => toForm(getSiteSettings()));
  const [saved, setSaved] = useState(() => JSON.stringify(toForm(getSiteSettings())));
  const [saving, setSaving] = useState(false);

  // Start from the stored document, not this browser's cached copy
  useEffect(() => {
    let cancelled = false;
    loadSettings(SITE_SETTINGS_KEY).then((data) => {
      if (cancelled || !data) return;
      const fresh = toForm(normalizeSiteSettings(data));
      setForm(fresh);
      setSaved(JSON.stringify(fresh));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const dirty = useMemo(() => JSON.stringify(form) !== saved, [form, saved]);
  const set = (section, key, value) => setForm((f) => ({ ...f, [section]: { ...f[section], [key]: value } }));
  const setItem = (section, i, key, value) => setForm((f) => ({ ...f, [section]: f[section].map((x, k) => (k === i ? { ...x, [key]: value } : x)) }));
  const setSeo = (path, key, value) => setForm((f) => ({ ...f, seo: { ...f.seo, [path]: { ...f.seo[path], [key]: value } } }));

  // Links that would be dropped on save (not https, or the wrong site for that network)
  const badSocial = SOCIAL_NETWORKS.filter((n) => form.social[n.id].trim() && !normalizeSiteSettings({ social: { [n.id]: form.social[n.id] } }).social[n.id]);

  const pixelInput = form.tracking.metaPixelId.trim();
  const badPixel = Boolean(pixelInput) && !normalizeSiteSettings({ tracking: { metaPixelId: pixelInput } }).tracking.metaPixelId;

  const handleSave = async () => {
    const clean = normalizeSiteSettings(form);
    setSaving(true);
    const ok = await saveSettings(SITE_SETTINGS_KEY, clean).catch(() => false);
    setSaving(false);
    if (!ok) {
      triggerToast?.(L('ما اتحفظش. اتأكد من النت وجرّب تاني.', 'Not saved. Check the connection and try again.'), 'error');
      return;
    }
    applySiteSettings(clean);
    const fresh = toForm(clean);
    setForm(fresh);
    setSaved(JSON.stringify(fresh));
    triggerToast?.(L('اتحفظ. الزوار هيشوفوا التعديل خلال دقيقة.', 'Saved. Visitors see it within a minute.'), 'success');
  };

  const removeItem = async (section, i, label) => {
    if (!(await confirm({ title: L(`حذف ${label}؟`, `Delete ${label}?`), confirmLabel: L('احذف', 'Delete') }))) return;
    setForm((f) => ({ ...f, [section]: f[section].filter((_, k) => k !== i) }));
  };

  const ItemTools = ({ section, i, label }) => (
    <div className="crm-ss__item-tools">
      <IconButton size="sm" label={L('لفوق', 'Move up')} icon={<ArrowUp size={16} />} disabled={i === 0} onClick={() => setForm((f) => ({ ...f, [section]: move(f[section], i, -1) }))} />
      <IconButton size="sm" label={L('لتحت', 'Move down')} icon={<ArrowDown size={16} />} disabled={i === form[section].length - 1} onClick={() => setForm((f) => ({ ...f, [section]: move(f[section], i, 1) }))} />
      <IconButton size="sm" label={L(`حذف ${label}`, `Delete ${label}`)} icon={<Trash2 size={16} />} onClick={() => removeItem(section, i, label)} />
    </div>
  );

  return (
    <div className="crm-ss">
      <PageHeader
        title={L('إعدادات الموقع', 'Site settings')}
        description={L('اللي بتكتبه هنا بيظهر للزوار على الموقع بعد الحفظ بدقيقة تقريباً.', 'What you write here shows on the public site about a minute after saving.')}
        actions={(
          <Button icon={<Save size={16} aria-hidden="true" />} loading={saving} disabled={!dirty} onClick={handleSave}>
            {dirty ? L('احفظ التعديلات', 'Save changes') : L('محفوظ', 'Saved')}
          </Button>
        )}
      />

      <Tabs
        label={L('أقسام الإعدادات', 'Settings sections')}
        value={tab}
        onChange={setTab}
        items={[
          { id: 'contact', label: L('التواصل', 'Contact'), icon: <Mail size={16} aria-hidden="true" /> },
          { id: 'social', label: L('السوشيال', 'Social'), icon: <Share2 size={16} aria-hidden="true" /> },
          { id: 'faq', label: L('الأسئلة الشائعة', 'FAQ'), icon: <CircleHelp size={16} aria-hidden="true" />, count: form.faq.length || null },
          { id: 'testimonials', label: L('آراء العملاء', 'Testimonials'), icon: <Quote size={16} aria-hidden="true" />, count: form.testimonials.length || null },
          { id: 'seo', label: L('جوجل', 'Google'), icon: <Search size={16} aria-hidden="true" /> },
          { id: 'ads', label: L('الإعلانات', 'Ads'), icon: <Megaphone size={16} aria-hidden="true" /> }
        ]}
      />

      <div className="crm-ss__body">
        {tab === 'contact' && (
          <Card>
            <CardHeader title={L('بيانات التواصل', 'Contact details')} description={L('بتظهر في آخر كل صفحة، وفي صفحة الخصوصية، والأسئلة الشائعة، وبيانات جوجل. التليفون والواتساب والعنوان بيتعدّلوا من "هوية الشركة والمؤسس".', 'Shown in the footer, privacy page, FAQ and Google data. Phone, WhatsApp and address are edited under "Founder & Corporate CMS".')} />
            <div className="crm-ss__grid">
              <Input label={L('البريد الإلكتروني', 'Email')} type="email" dir="ltr" value={form.contact.email} onChange={(e) => set('contact', 'email', e.target.value)} />
              <Input label={L('لينك جوجل ماب', 'Google Maps link')} type="url" dir="ltr" placeholder="https://maps.google.com/..." value={form.contact.mapsUrl} onChange={(e) => set('contact', 'mapsUrl', e.target.value)} />
              <Input label={L('مواعيد العمل (عربي)', 'Working hours (Arabic)')} value={form.contact.hours_ar} onChange={(e) => set('contact', 'hours_ar', e.target.value)} />
              <Input label={L('مواعيد العمل (إنجليزي)', 'Working hours (English)')} dir="ltr" value={form.contact.hours_en} onChange={(e) => set('contact', 'hours_en', e.target.value)} />
            </div>
          </Card>
        )}

        {tab === 'social' && (
          <Card>
            <CardHeader title={L('حسابات السوشيال ميديا', 'Social accounts')} description={L('حط لينك الصفحة كامل يبدأ بـ https. الحساب اللي تسيبه فاضي مش هيظهر.', 'Paste the full page link starting with https. Blank accounts are hidden.')} />
            <div className="crm-ss__grid">
              {SOCIAL_NETWORKS.map((n) => (
                <Input
                  key={n.id}
                  label={n.label}
                  type="url"
                  dir="ltr"
                  placeholder={`https://${n.hosts[0]}/...`}
                  value={form.social[n.id]}
                  error={badSocial.includes(n) ? L(`لازم يكون لينك https من ${n.hosts[0]}`, `Must be an https link on ${n.hosts[0]}`) : undefined}
                  onChange={(e) => set('social', n.id, e.target.value)}
                />
              ))}
            </div>
          </Card>
        )}

        {tab === 'ads' && (
          <Card>
            <CardHeader
              title={L('Meta Pixel (فيسبوك وإنستجرام)', 'Meta Pixel (Facebook & Instagram)')}
              description={L(
                'بيقيس الإعلانات: مين فتح وحدة، ومين داس واتساب أو اتصل، ومين بعت طلب، عشان فيسبوك يوصّل الإعلان للناس اللي بتتواصل فعلاً، وتعمل جمهور لإعادة الاستهداف. بيشتغل بس عند الزوار اللي وافقوا على القياس، ومش بيشتغل في الـCRM ولا في حساب العميل، ومش بيبعت أسماء ولا أرقام.',
                'Measures ads: who opened a listing, tapped WhatsApp or call, or sent a request, so Meta can deliver to people who actually get in touch and you can build retargeting audiences. Runs only for visitors who accept measurement, never in the CRM or a client account, and sends no names or numbers.'
              )}
            />
            <div className="crm-ss__grid">
              <Input
                label={L('رقم الـPixel', 'Pixel ID')}
                dir="ltr"
                inputMode="numeric"
                placeholder="123456789012345"
                value={form.tracking.metaPixelId}
                error={badPixel ? L('الرقم لازم يكون أرقام بس (من 8 لـ 20 رقم)', 'Digits only, 8 to 20') : undefined}
                onChange={(e) => set('tracking', 'metaPixelId', e.target.value)}
              />
            </div>
            <p className="crm-ss__hint">
              {L(
                'تلاقيه في Meta Events Manager ← مصادر البيانات ← الـPixel بتاعك (رقم طويل). سيبه فاضي عشان توقفه. الأحداث اللي بتتبعت: PageView، ViewContent (فتح وحدة)، Search، AddToWishlist، Contact (واتساب/اتصال)، Schedule (طلب معاينة)، Lead (طلب اتبعت).',
                'Find it in Meta Events Manager → Data sources → your Pixel (a long number). Leave blank to turn it off. Events sent: PageView, ViewContent (listing opened), Search, AddToWishlist, Contact (WhatsApp/call), Schedule (visit request), Lead (request sent).'
              )}
            </p>
          </Card>
        )}

        {tab === 'faq' && (
          <div className="crm-ss__stack">
            <p className="crm-ss__note">
              {L('طول ما القائمة فاضية، الموقع بيعرض الأسئلة الأصلية. أول ما تضيف سؤال، الموقع يعرض أسئلتك بس.', 'While this list is empty the site shows its built-in questions. Once you add one, only yours are shown.')}
            </p>
            {form.faq.length === 0 && (
              <EmptyState icon={<CircleHelp size={22} />} title={L('لسه مفيش أسئلة', 'No questions yet')} description={L('الموقع بيعرض الأسئلة الأصلية دلوقتي.', 'The site shows the built-in questions for now.')} />
            )}
            {form.faq.map((f, i) => (
              <Card key={i} padding="compact" className="crm-ss__item">
                <div className="crm-ss__item-head">
                  <span className="crm-ss__item-num">{L(`سؤال ${i + 1}`, `Question ${i + 1}`)}</span>
                  <ItemTools section="faq" i={i} label={L(`السؤال ${i + 1}`, `question ${i + 1}`)} />
                </div>
                <div className="crm-ss__grid">
                  <Input label={L('السؤال (عربي)', 'Question (Arabic)')} value={f.q_ar} onChange={(e) => setItem('faq', i, 'q_ar', e.target.value)} />
                  <Input label={L('السؤال (إنجليزي)', 'Question (English)')} dir="ltr" value={f.q_en} onChange={(e) => setItem('faq', i, 'q_en', e.target.value)} />
                  <Textarea label={L('الإجابة (عربي)', 'Answer (Arabic)')} rows={3} value={f.a_ar} onChange={(e) => setItem('faq', i, 'a_ar', e.target.value)} />
                  <Textarea label={L('الإجابة (إنجليزي)', 'Answer (English)')} dir="ltr" rows={3} value={f.a_en} onChange={(e) => setItem('faq', i, 'a_en', e.target.value)} />
                  <Select
                    label={L('القسم', 'Category')}
                    value={f.category}
                    onChange={(e) => setItem('faq', i, 'category', e.target.value)}
                    options={FAQ_CATEGORIES.map((c) => ({ value: c, label: isAr ? FAQ_CATEGORY_LABELS[c].ar : FAQ_CATEGORY_LABELS[c].en }))}
                  />
                </div>
              </Card>
            ))}
            <Button variant="secondary" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setForm((x) => ({ ...x, faq: [...x.faq, { ...EMPTY_FAQ }] }))} disabled={form.faq.length >= 30}>
              {L('أضف سؤال', 'Add question')}
            </Button>
          </div>
        )}

        {tab === 'testimonials' && (
          <div className="crm-ss__stack">
            <p className="crm-ss__note is-warn">
              {L('آراء حقيقية بس، وبعد موافقة العميل على نشر اسمه. القسم مش بيظهر على الموقع طول ما القائمة فاضية.', 'Real reviews only, with the client\'s permission to publish their name. The section stays hidden while this list is empty.')}
            </p>
            {form.testimonials.length === 0 && (
              <EmptyState icon={<Quote size={22} />} title={L('لسه مفيش آراء', 'No testimonials yet')} description={L('قسم آراء العملاء مخفي من الموقع.', 'The testimonials section is hidden on the site.')} />
            )}
            {form.testimonials.map((t, i) => (
              <Card key={i} padding="compact" className="crm-ss__item">
                <div className="crm-ss__item-head">
                  <span className="crm-ss__item-num">{t.name || L(`رأي ${i + 1}`, `Testimonial ${i + 1}`)}</span>
                  <ItemTools section="testimonials" i={i} label={t.name || L(`الرأي ${i + 1}`, `testimonial ${i + 1}`)} />
                </div>
                <div className="crm-ss__grid">
                  <Input label={L('اسم العميل', 'Client name')} value={t.name} onChange={(e) => setItem('testimonials', i, 'name', e.target.value)} />
                  <Input label={L('الوصف (اختياري)', 'Description (optional)')} hint={L('مثال: اشترى شقة في الكوثر', 'e.g. bought an apartment in El Kawthar')} value={t.role_ar} onChange={(e) => setItem('testimonials', i, 'role_ar', e.target.value)} />
                  <Textarea label={L('الرأي (عربي)', 'Review (Arabic)')} rows={3} value={t.text_ar} onChange={(e) => setItem('testimonials', i, 'text_ar', e.target.value)} />
                  <Textarea label={L('الرأي (إنجليزي، اختياري)', 'Review (English, optional)')} dir="ltr" rows={3} value={t.text_en} onChange={(e) => setItem('testimonials', i, 'text_en', e.target.value)} />
                </div>
              </Card>
            ))}
            <Button variant="secondary" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setForm((x) => ({ ...x, testimonials: [...x.testimonials, { ...EMPTY_TESTIMONIAL }] }))} disabled={form.testimonials.length >= 20}>
              {L('أضف رأي', 'Add testimonial')}
            </Button>
          </div>
        )}

        {tab === 'seo' && (
          <div className="crm-ss__stack">
            <p className="crm-ss__note">
              {L('العنوان والوصف اللي بيظهروا في نتايج جوجل ولما حد يشارك اللينك على واتساب. الخانة الفاضية بتسيب النص الأصلي.', 'The title and description shown in Google results and WhatsApp link previews. Blank fields keep the built-in text.')}
            </p>
            {SEO_PAGES.map((p) => {
              const v = form.seo[p.path];
              return (
                <Card key={p.path} padding="compact" className="crm-ss__item">
                  <CardHeader title={isAr ? p.ar : p.en} description={<bdi dir="ltr">{p.path}</bdi>} />
                  <div className="crm-ss__grid">
                    <Input label={L('العنوان (عربي)', 'Title (Arabic)')} hint={`${v.title_ar.length}/70`} maxLength={70} value={v.title_ar} onChange={(e) => setSeo(p.path, 'title_ar', e.target.value)} />
                    <Input label={L('العنوان (إنجليزي)', 'Title (English)')} hint={`${v.title_en.length}/70`} maxLength={70} dir="ltr" value={v.title_en} onChange={(e) => setSeo(p.path, 'title_en', e.target.value)} />
                    <Textarea label={L('الوصف (عربي)', 'Description (Arabic)')} hint={`${v.description_ar.length}/170`} maxLength={170} rows={2} value={v.description_ar} onChange={(e) => setSeo(p.path, 'description_ar', e.target.value)} />
                    <Textarea label={L('الوصف (إنجليزي)', 'Description (English)')} hint={`${v.description_en.length}/170`} maxLength={170} rows={2} dir="ltr" value={v.description_en} onChange={(e) => setSeo(p.path, 'description_en', e.target.value)} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
