import { useState, useMemo } from 'react';
import { MessageCircle, Link2, X, ExternalLink, RotateCcw } from 'lucide-react';
import { Card, Badge, Button, Chip, Input, EmptyState } from '../ui';

// Inbox → "واتساب من الموقع": one row per WhatsApp tap on the site (api/contact-intent.js). The chat
// itself arrives on the company's WhatsApp carrying the same reference (W-…); staff link the row to
// the person here, which creates the lead, or dismiss it.

const SOURCE_LABELS = {
  facebook: 'فيسبوك', instagram: 'إنستجرام', google: 'جوجل', tiktok: 'تيك توك', youtube: 'يوتيوب',
  whatsapp: 'واتساب', direct: 'دخول مباشر', referral: 'موقع آخر'
};

const toMillis = (t) => (t?.toMillis ? t.toMillis() : Date.parse(t || '') || 0);

function ago(ms, now, isAr) {
  const min = Math.max(0, Math.round((now - ms) / 60000));
  if (min < 1) return isAr ? 'دلوقتي' : 'just now';
  if (min < 60) return isAr ? `من ${min} دقيقة` : `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return isAr ? `من ${h} ساعة` : `${h} h ago`;
  return new Date(ms).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function WhatsAppIntentsList({ intents, properties = [], isAr, now, canEdit, onLink, onResolve }) {
  const L = (ar, en) => (isAr ? ar : en);
  const [show, setShow] = useState('open');
  const [linking, setLinking] = useState(null); // ref being linked
  const [form, setForm] = useState({ name: '', phone: '' });
  const [busy, setBusy] = useState(false);

  const byId = useMemo(() => new Map(properties.map((p) => [String(p.id), p])), [properties]);
  const list = useMemo(() => (intents || []).filter((i) => (show === 'open' ? (i.status || 'open') === 'open' : true)), [intents, show]);
  const openCount = (intents || []).filter((i) => (i.status || 'open') === 'open').length;

  if (intents === null) {
    return <EmptyState title={L('مقدرناش نجيب ضغطات الواتساب', "Couldn't load WhatsApp taps")} description={L('اتأكد إنك داخل بحساب موظف.', 'Check that you are signed in as staff.')} />;
  }

  const submitLink = async (intent) => {
    const phone = form.phone.replace(/[^\d+]/g, '');
    if (phone.replace(/\D/g, '').length < 8) return;
    setBusy(true);
    try {
      await onLink(intent, { name: form.name.trim(), phone });
      setLinking(null);
      setForm({ name: '', phone: '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="crm-wa-intents">
      <p className="crm-inbox__summary">
        {L(
          'كل مرة زائر بيدوس واتساب على الموقع بيتسجل هنا برقم مرجعي. الرسالة بتوصلكم على واتساب الشركة وفيها نفس الرقم: لما توصل، اربطها بالعميل هنا علشان تتحول لطلب وتتابعوه.',
          'Each WhatsApp tap on the site is listed with a reference. The chat reaches the company WhatsApp with the same reference: link it to the person here to turn it into a lead.'
        )}
      </p>
      <div className="crm-inbox__chips" role="group" aria-label={L('عرض', 'Show')}>
        <Chip pressed={show === 'open'} count={openCount} onClick={() => setShow('open')}>{L('مستنية ربط', 'Waiting')}</Chip>
        <Chip pressed={show === 'all'} count={(intents || []).length} onClick={() => setShow('all')}>{L('الكل', 'All')}</Chip>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={22} aria-hidden="true" />}
          title={show === 'open' ? L('مفيش ضغطات مستنية ربط', 'Nothing waiting') : L('لسه مفيش ضغطات واتساب', 'No WhatsApp taps yet')}
          description={L('أول ما زائر يدوس واتساب على أي وحدة أو صفحة هيظهر هنا.', 'Taps on WhatsApp buttons on the site show up here.')}
        />
      ) : (
        <ul className="crm-inbox__list">
          {list.map((i) => {
            const status = i.status || 'open';
            const unit = i.propertyId ? byId.get(String(i.propertyId)) : null;
            const unitTitle = unit ? (isAr ? unit.title_ar : unit.title_en || unit.title_ar) : '';
            const when = ago(toMillis(i.createdAt), now, isAr);
            return (
              <li key={i.id}>
                <Card padding="compact" className={`crm-inbox-item${status === 'open' ? ' is-new' : ''}`}>
                  <div className="crm-wa-intent__head">
                    <span className="crm-wa-intent__ref"><bdi dir="ltr">{i.ref || i.id}</bdi></span>
                    <span className="crm-wa-intent__when">{when}</span>
                    {status === 'linked' && <Badge tone="success">{L('اتربطت بعميل', 'Linked')}</Badge>}
                    {status === 'dismissed' && <Badge>{L('اتجاهلت', 'Dismissed')}</Badge>}
                  </div>
                  <dl className="crm-inbox-item__facts">
                    <div className="is-strong">
                      <dt>{L('من', 'From')}</dt>
                      <dd>
                        {i.propertyId ? (
                          <a href={`/properties/${encodeURIComponent(i.propertyId)}`} target="_blank" rel="noreferrer" className="crm-wa-intent__unit">
                            {unitTitle || L('وحدة', 'Unit')} <bdi dir="ltr">#{String(i.propertyId).toUpperCase()}</bdi>
                            <ExternalLink size={12} aria-hidden="true" />
                          </a>
                        ) : (
                          <bdi dir="ltr">{i.path || '/'}</bdi>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>{L('المصدر', 'Source')}</dt>
                      <dd>{SOURCE_LABELS[i.source] || i.source || L('دخول مباشر', 'Direct')}</dd>
                    </div>
                    <div>
                      <dt>{L('الجهاز', 'Device')}</dt>
                      <dd>{i.device === 'mobile' ? L('موبايل', 'Phone') : L('كمبيوتر', 'Computer')}</dd>
                    </div>
                  </dl>

                  {canEdit && status === 'open' && linking !== i.id && (
                    <div className="crm-inbox-item__actions">
                      <Button size="sm" icon={<Link2 size={14} aria-hidden="true" />} onClick={() => { setLinking(i.id); setForm({ name: '', phone: '' }); }}>
                        {L('ربط بعميل', 'Link to a client')}
                      </Button>
                      <Button size="sm" variant="ghost" icon={<X size={14} aria-hidden="true" />} onClick={() => onResolve(i, 'dismissed')}>
                        {L('تجاهل', 'Dismiss')}
                      </Button>
                    </div>
                  )}
                  {canEdit && status !== 'open' && (
                    <div className="crm-inbox-item__actions">
                      <Button size="sm" variant="ghost" icon={<RotateCcw size={14} aria-hidden="true" />} onClick={() => onResolve(i, 'open')}>
                        {L('رجّعها مستنية', 'Reopen')}
                      </Button>
                    </div>
                  )}

                  {linking === i.id && (
                    <form className="crm-wa-intent__link" onSubmit={(e) => { e.preventDefault(); submitLink(i); }}>
                      <Input label={L('اسم العميل', 'Client name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={L('زي ما ظهر على واتساب', 'As shown on WhatsApp')} />
                      <Input label={L('رقم الواتساب', 'WhatsApp number')} required type="tel" inputMode="tel" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" />
                      <div className="crm-inbox-item__actions">
                        <Button size="sm" type="submit" disabled={busy || form.phone.replace(/\D/g, '').length < 8}>{L('اربط واعمل طلب', 'Link & create lead')}</Button>
                        <Button size="sm" variant="ghost" type="button" onClick={() => setLinking(null)}>{L('إلغاء', 'Cancel')}</Button>
                      </div>
                    </form>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
