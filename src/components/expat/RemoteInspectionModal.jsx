import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Video, Plane, Footprints, CalendarDays, Clock, ShieldCheck, CheckCircle2, MessageCircle, Globe2, Crown } from 'lucide-react';
import { submitIntakeRecord } from '../../firebaseLazy';
import { getWhatsAppUrl } from '../../utils/founderCmsData';
import { checkFormSpamProtection } from '../../utils/securityShield';
import { EXPAT_COUNTRIES, getCountry, cleanText, normalizeLocalPhone, clockIn } from '../../utils/expatIntake';
import '../../styles/expat-suite.css';

const COVERAGE = [
  { id: 'live_call', icon: Video, ar: 'مكالمة فيديو حية على واتساب', en: 'Live WhatsApp video call', desc_ar: 'تمشي مع الاستشاري جوه الوحدة وتسأل وقت ما تحب', desc_en: 'Walk the unit with the advisor and ask anything' },
  { id: 'street', icon: Footprints, ar: 'فيديو ميداني للشارع والمداخل', en: 'Street & entrance footage', desc_ar: 'الشارع، المدخل، السلم، ومستوى الجيران والمنطقة', desc_en: 'Street, entrance, stairs and the neighbourhood' },
  { id: 'drone', icon: Plane, ar: 'جولة درون جوية للمشروع', en: 'Aerial drone tour', desc_ar: 'لقطة جوية للموقع والمحيط — حسب توفر تصاريح التصوير', desc_en: 'Aerial view of the site — subject to filming permits' }
];

const SLOTS = [
  { id: 'morning', ar: 'صباحاً بتوقيتك', en: 'Your morning' },
  { id: 'afternoon', ar: 'بعد العصر', en: 'Afternoon' },
  { id: 'evening', ar: 'مساءً بعد العمل', en: 'Evening, after work' },
  { id: 'weekend', ar: 'الجمعة / السبت', en: 'Friday / Saturday' }
];

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * "معاينة الغربة": an expat books a live video / street / drone inspection of a listing.
 * Stores the request (remote_inspections + a VIP lead in the CRM inbox) and hands the visitor
 * straight to WhatsApp with a prepared message.
 */
export default function RemoteInspectionModal({ property, isOpen, onClose, lang = 'ar', onCreateLead, triggerToast }) {
  const isAr = lang === 'ar';
  const [countryId, setCountryId] = useState('sa');
  const [customCode, setCustomCode] = useState('+');
  const [coverage, setCoverage] = useState(['live_call']);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('evening');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [hp, setHp] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);
  const [, setTick] = useState(0);
  const dialogRef = useRef(null);

  const country = getCountry(countryId);
  const dialCode = country.editableCode ? customCode : country.code;
  const title = property ? (isAr ? property.title_ar || property.title_en : property.title_en || property.title_ar) : '';
  const code = property?.id ? String(property.id).toUpperCase() : '';

  // Live clocks refresh every 30s while open
  useEffect(() => {
    if (!isOpen) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, [isOpen]);

  // Escape closes; focus the dialog. (App mounts a fresh instance per opening, so no state reset is needed.)
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, property?.id, onClose]);

  const cairoNow = clockIn('Africa/Cairo', lang);
  const localNow = country.tz && country.id !== 'eg' ? clockIn(country.tz, lang) : '';

  const toggleCoverage = (id) => {
    setCoverage((list) => (list.includes(id) ? (list.length > 1 ? list.filter((x) => x !== id) : list) : [...list, id]));
  };

  const coverageLabels = useMemo(
    () => COVERAGE.filter((c) => coverage.includes(c.id)).map((c) => (isAr ? c.ar : c.en)),
    [coverage, isAr]
  );

  if (!isOpen) return null;

  const buildWhatsApp = (fullPhone) => {
    const slotLabel = SLOTS.find((s) => s.id === slot);
    const lines = isAr
      ? [
        'مرحباً فريق 1Line 👋',
        'أرغب في حجز *معاينة الغربة* عن بُعد:',
        property ? `🏠 العقار: ${title} (كود #${code})` : '🏠 معاينة عقار',
        `🌍 مقيم في: ${country.ar}`,
        `🎥 نوع التغطية: ${coverageLabels.join(' + ')}`,
        date ? `📅 الموعد المفضل: ${date} — ${slotLabel?.ar || ''}` : `🕒 الوقت المفضل: ${slotLabel?.ar || ''}`,
        `👤 الاسم: ${cleanText(name, 100)}`,
        `📱 رقمي: ${fullPhone}`,
        notes ? `📝 ملاحظات: ${cleanText(notes, 300)}` : null
      ]
      : [
        'Hello 1Line team 👋',
        'I would like to book a *remote expat inspection*:',
        property ? `🏠 Property: ${title} (ID #${code})` : '🏠 Property inspection',
        `🌍 Living in: ${country.en}`,
        `🎥 Coverage: ${coverageLabels.join(' + ')}`,
        date ? `📅 Preferred: ${date} — ${slotLabel?.en || ''}` : `🕒 Preferred time: ${slotLabel?.en || ''}`,
        `👤 Name: ${cleanText(name, 100)}`,
        `📱 Phone: ${fullPhone}`,
        notes ? `📝 Notes: ${cleanText(notes, 300)}` : null
      ];
    return getWhatsAppUrl(lines.filter(Boolean).join('\n'));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const spam = checkFormSpamProtection(hp, 'remote_inspection');
    if (!spam.allowed) { setError(isAr ? spam.message_ar : spam.message_en); return; }

    const cleanName = cleanText(name, 100);
    if (cleanName.length < 2) { setError(isAr ? 'اكتب اسمك من فضلك' : 'Please enter your name'); return; }

    const local = normalizeLocalPhone(phone);
    const cc = dialCode.replace(/[^\d+]/g, '');
    if (!/^\+\d{1,4}$/.test(cc)) { setError(isAr ? 'اكتب كود الدولة، مثال: +44' : 'Enter a country code, e.g. +44'); return; }
    if (local.length < 6 || local.length > 13) { setError(isAr ? 'رقم الهاتف غير مكتمل' : 'Phone number looks incomplete'); return; }
    const fullPhone = `${cc}${local}`;

    // Open WhatsApp inside the click so popup blockers allow it; storage continues in the background
    const waUrl = buildWhatsApp(fullPhone);
    window.open(waUrl, '_blank', 'noopener');

    const record = {
      name: cleanName,
      phone: fullPhone,
      country: cleanText(isAr ? country.ar : country.en, 40),
      countryCode: cc.slice(0, 8),
      coverage: coverage.map((c) => cleanText(c, 20)),
      preferredDate: cleanText(date, 20),
      preferredSlot: cleanText(slot, 40),
      notes: cleanText(notes, 1000),
      propertyId: cleanText(property?.id || '', 80),
      propertyTitle: cleanText(title, 200),
      propertyArea: cleanText(property?.areaKey || '', 60),
      source: 'remote_inspection_modal',
      lang,
      vip: true,
      submittedAt: new Date().toISOString()
    };
    submitIntakeRecord('remote_inspections', record).catch(() => null);

    // Also land in the CRM leads inbox as a VIP expat, routed like every other lead
    onCreateLead?.({
      name: cleanName,
      phone: fullPhone,
      whatsapp: fullPhone,
      type: 'remote_inspection',
      source: 'expat_remote_inspection',
      temperature: 'hot',
      score: 95,
      isVip: true,
      area: property?.areaKey || 'new_sohag',
      propertyType: property?.type || 'apartment',
      propertyId: property?.id || '',
      notes: `🌍 عميل مغترب VIP (${country.ar}) — معاينة الغربة: ${COVERAGE.filter((c) => coverage.includes(c.id)).map((c) => c.ar).join(' + ')}${property ? ` | عقار #${code}` : ''}${date ? ` | ${date}` : ''} | ${SLOTS.find((s) => s.id === slot)?.ar || ''}${record.notes ? ` | ${record.notes}` : ''}`,
      details: { remoteInspection: true, country: country.id, coverage, preferredDate: date, preferredSlot: slot }
    });

    setSent({ waUrl, fullPhone });
    triggerToast?.(isAr ? 'تم تسجيل طلب معاينة الغربة — كمّل على واتساب' : 'Request saved — continue on WhatsApp', 'success');
  };

  return (
    <div className="xs-backdrop" onClick={onClose} role="presentation">
      <div
        className="xs-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="xs-ri-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <button type="button" className="xs-close" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'}>
          <X size={18} />
        </button>

        <header className="xs-modal-head">
          <span className="xs-crown" aria-hidden="true"><Crown size={20} /></span>
          <div>
            <p className="xs-kicker">{isAr ? 'خدمة المغتربين' : 'Expat service'}</p>
            <h2 id="xs-ri-title">{isAr ? 'معاينة الغربة' : 'Remote expat inspection'}</h2>
            <p className="xs-lede">
              {isAr
                ? 'شوف العقار كأنك واقف قدامه: فيديو حي، ولقطات للشارع والجيران، وجولة جوية للموقع.'
                : 'See the property as if you were there: live video, street footage and an aerial tour.'}
            </p>
          </div>
        </header>

        {property && (
          <div className="xs-prop">
            {property.images?.[0] && <img src={property.images[0]} alt="" loading="lazy" />}
            <div>
              <strong>{title}</strong>
              <span><bdi>#{code}</bdi></span>
            </div>
          </div>
        )}

        {sent ? (
          <div className="xs-success">
            <CheckCircle2 size={40} aria-hidden="true" />
            <h3>{isAr ? 'طلبك وصل لفريق المعاينات' : 'Your request reached our inspection team'}</h3>
            <p>
              {isAr
                ? 'فتحنا لك محادثة واتساب برسالة جاهزة فيها كل التفاصيل. لو ما اتفتحتش، اضغط الزرار.'
                : 'We opened WhatsApp with a ready message. If it did not open, use the button.'}
            </p>
            <a href={sent.waUrl} target="_blank" rel="noopener noreferrer" className="xs-btn xs-btn--wa">
              <MessageCircle size={17} aria-hidden="true" />
              <span>{isAr ? 'افتح واتساب الآن' : 'Open WhatsApp'}</span>
            </a>
            <button type="button" className="xs-btn xs-btn--ghost" onClick={onClose}>{isAr ? 'تم' : 'Done'}</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="xs-form" noValidate>
            <div className="xs-hp" aria-hidden="true">
              <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
            </div>

            <fieldset className="xs-fieldset">
              <legend><Globe2 size={15} aria-hidden="true" /> {isAr ? 'بلد الإقامة' : 'Where do you live?'}</legend>
              <div className="xs-country-grid">
                {EXPAT_COUNTRIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`xs-country ${countryId === c.id ? 'is-on' : ''}`}
                    onClick={() => setCountryId(c.id)}
                    aria-pressed={countryId === c.id}
                  >
                    <span aria-hidden="true">{c.flag}</span>
                    <span>{isAr ? c.ar : c.en}</span>
                    {!c.editableCode && <small dir="ltr">{c.code}</small>}
                  </button>
                ))}
              </div>
              {(cairoNow || localNow) && (
                <p className="xs-clock">
                  <Clock size={13} aria-hidden="true" />
                  {localNow && <span>{isAr ? `الساعة عندك ${localNow}` : `Your time ${localNow}`}</span>}
                  {localNow && <span aria-hidden="true">·</span>}
                  <span>{isAr ? `في سوهاج ${cairoNow}` : `Sohag ${cairoNow}`}</span>
                </p>
              )}
            </fieldset>

            <fieldset className="xs-fieldset">
              <legend><Video size={15} aria-hidden="true" /> {isAr ? 'نوع التغطية (اختر واحدة أو أكثر)' : 'Coverage (one or more)'}</legend>
              <div className="xs-cover-grid">
                {COVERAGE.map(({ id, icon: Icon, ar, en, desc_ar, desc_en }) => {
                  const on = coverage.includes(id);
                  return (
                    <button key={id} type="button" className={`xs-cover ${on ? 'is-on' : ''}`} onClick={() => toggleCoverage(id)} aria-pressed={on}>
                      <span className="xs-cover-icon"><Icon size={18} aria-hidden="true" /></span>
                      <strong>{isAr ? ar : en}</strong>
                      <small>{isAr ? desc_ar : desc_en}</small>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="xs-fieldset">
              <legend><CalendarDays size={15} aria-hidden="true" /> {isAr ? 'الموعد المفضل' : 'Preferred time'}</legend>
              <div className="xs-row">
                <label className="xs-field">
                  <span>{isAr ? 'اليوم (اختياري)' : 'Day (optional)'}</span>
                  <input type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
                <div className="xs-slots" role="radiogroup" aria-label={isAr ? 'الفترة' : 'Time slot'}>
                  {SLOTS.map((s) => (
                    <button key={s.id} type="button" role="radio" aria-checked={slot === s.id} className={`xs-slot ${slot === s.id ? 'is-on' : ''}`} onClick={() => setSlot(s.id)}>
                      {isAr ? s.ar : s.en}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>

            <div className="xs-row">
              <label className="xs-field">
                <span>{isAr ? 'الاسم' : 'Name'} *</span>
                <input type="text" value={name} maxLength={100} autoComplete="name" onChange={(e) => setName(e.target.value)} placeholder={isAr ? 'مثال: م. أحمد عبدالرحيم' : 'Your name'} />
              </label>
              <label className="xs-field">
                <span>{isAr ? 'رقم واتساب' : 'WhatsApp number'} *</span>
                <div className="xs-phone" dir="ltr">
                  {country.editableCode ? (
                    <input className="xs-cc" type="text" inputMode="tel" value={customCode} maxLength={5} onChange={(e) => setCustomCode(e.target.value.startsWith('+') ? e.target.value : `+${e.target.value}`)} aria-label={isAr ? 'كود الدولة' : 'Country code'} />
                  ) : (
                    <span className="xs-cc">{country.flag} {country.code}</span>
                  )}
                  <input type="tel" inputMode="tel" autoComplete="tel-national" value={phone} maxLength={16} onChange={(e) => setPhone(e.target.value)} placeholder="5X XXX XXXX" />
                </div>
              </label>
            </div>

            <label className="xs-field">
              <span>{isAr ? 'حاجة عايز تشوفها بالذات؟ (اختياري)' : 'Anything specific to show? (optional)'}</span>
              <textarea rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={isAr ? 'مثال: التشطيب، اتجاه الشمس، شكل الشارع بالليل' : 'e.g. finishing, sunlight, the street at night'} />
            </label>

            {error && <p className="xs-error" role="alert">{error}</p>}

            <button type="submit" className="xs-btn xs-btn--royal">
              <MessageCircle size={18} aria-hidden="true" />
              <span>{isAr ? 'احجز المعاينة وكمّل على واتساب' : 'Book & continue on WhatsApp'}</span>
            </button>
            <p className="xs-fine">
              <ShieldCheck size={13} aria-hidden="true" />
              {isAr ? 'بياناتك تُستخدم فقط لترتيب المعاينة، والطلب لا يُلزمك بأي شيء.' : 'Your details are used only to arrange the inspection. No obligation.'}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
