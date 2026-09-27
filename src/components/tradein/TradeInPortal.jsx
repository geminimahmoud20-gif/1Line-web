import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Repeat2, Home, Target, Scale, ArrowLeft, ArrowRight, CheckCircle2, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { OFFER_TYPES, LEGAL_STATUSES, WANT_TYPES, DIFF_MODES, matchInventory, reachBudget, labelOf } from '../../utils/tradeInEngine';
import { GOVERNORATES } from '../../utils/propertyInsights';
import { EXPAT_COUNTRIES, getCountry, cleanText, normalizeLocalPhone } from '../../utils/expatIntake';
import { submitIntakeRecord } from '../../firebaseLazy';
import { getWhatsAppUrl } from '../../utils/founderCmsData';
import { checkFormSpamProtection } from '../../utils/securityShield';
import { updatePageSeo } from '../../utils/seoHelper';
import '../../styles/expat-suite.css';

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const numOrEmpty = (v) => (v === '' ? '' : Math.max(0, Number(String(v).replace(/[^\d.]/g, '')) || 0));

const STEPS = [
  { id: 1, icon: Home, ar: 'عقارك الحالي', en: 'Your property' },
  { id: 2, icon: Target, ar: 'العقار البديل', en: 'What you want' },
  { id: 3, icon: Scale, ar: 'الفارق والتواصل', en: 'Difference & contact' }
];

/**
 * بوابة البدل العقاري: a 3-step wizard for swapping a current property (apartment, land,
 * building…) for another, with a cash difference either way. Stored in trade_ins for the CRM
 * matching engine, plus a lead in the inbox.
 */
export default function TradeInPortal({ lang = 'ar', properties = [], onCreateLead, triggerToast }) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const Next = isAr ? ArrowLeft : ArrowRight;
  const Back = isAr ? ArrowRight : ArrowLeft;

  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    offerType: 'apartment', offerGovernorate: 'sohag', offerLocation: '', offerSize: '', offerValue: '', offerLegal: 'registered',
    wantType: 'villa', wantArea: '', wantSize: '', wantNotes: '',
    diffMode: 'pay', diffAmount: '',
    name: '', phone: '', countryId: 'eg', notes: ''
  });
  const [hp, setHp] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    updatePageSeo({
      title: L('بدّل عقارك — منصة البدل العقاري في سوهاج والصعيد', 'Trade in your property — Sohag & Upper Egypt'),
      description: L('بدّل شقتك أو أرضك أو عمارتك بعقار أنسب لك، بفرق كاش أو رأس برأس، مع مطابقة ذكية بين عروض البدل ومراجعة قانونية للطرفين.', 'Swap your apartment, land or building for a better fit, with or without a cash difference, matched and legally reviewed.'),
      url: '/trade-in',
      type: 'website'
    });
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => matchInventory(f, properties, 3), [f, properties]);
  const budget = reachBudget(f);

  const validateStep = (s) => {
    if (s === 1) {
      if (!Number(f.offerValue)) return L('اكتب القيمة التقريبية لعقارك (حتى لو تقدير)', 'Enter an approximate value for your property');
      if (!Number(f.offerSize)) return L('اكتب مساحة عقارك', 'Enter your property size');
    }
    if (s === 3) {
      if (cleanText(f.name, 100).length < 2) return L('اكتب اسمك', 'Enter your name');
      const local = normalizeLocalPhone(f.phone);
      if (local.length < 6 || local.length > 13) return L('رقم الهاتف غير مكتمل', 'Phone number looks incomplete');
      if (f.diffMode !== 'even' && !Number(f.diffAmount)) return L('اكتب قيمة الفرق التقريبية أو اختر بدل رأس برأس', 'Enter the approximate difference or choose an even swap');
    }
    return '';
  };

  const go = (to) => {
    if (to > step) {
      const msg = validateStep(step);
      if (msg) { setError(msg); return; }
    }
    setError('');
    setStep(to);
  };

  const submit = (e) => {
    e.preventDefault();
    const msg = validateStep(3);
    if (msg) { setError(msg); return; }
    const spam = checkFormSpamProtection(hp, 'trade_in');
    if (!spam.allowed) { setError(isAr ? spam.message_ar : spam.message_en); return; }

    const country = getCountry(f.countryId);
    const cc = country.editableCode ? '' : country.code;
    const local = normalizeLocalPhone(f.phone);
    const phone = `${cc || '+'}${local}`.replace('++', '+');

    const record = {
      name: cleanText(f.name, 100),
      phone: phone.slice(0, 25),
      country: cleanText(isAr ? country.ar : country.en, 40),
      offerType: f.offerType,
      offerGovernorate: f.offerGovernorate,
      offerLocation: cleanText(f.offerLocation, 200),
      offerSize: Number(f.offerSize) || 0,
      offerValue: Number(f.offerValue) || 0,
      offerLegal: f.offerLegal,
      wantType: f.wantType,
      wantArea: cleanText(f.wantArea, 60),
      wantSize: Number(f.wantSize) || 0,
      wantNotes: cleanText(f.wantNotes, 500),
      diffMode: f.diffMode,
      diffAmount: f.diffMode === 'even' ? 0 : Number(f.diffAmount) || 0,
      notes: cleanText(f.notes, 1000),
      source: 'trade_in_portal',
      lang,
      submittedAt: new Date().toISOString()
    };

    const summaryAr = `🔁 طلب بدل: ${labelOf(OFFER_TYPES, record.offerType)} ${record.offerSize}م في ${labelOf(GOVERNORATES, record.offerGovernorate)}${record.offerLocation ? ` (${record.offerLocation})` : ''} بقيمة تقريبية ${fmt(record.offerValue)} ج.م — ${labelOf(LEGAL_STATUSES, record.offerLegal)} ⇄ مطلوب: ${labelOf(WANT_TYPES, record.wantType)}${record.wantArea ? ` في ${record.wantArea}` : ''} | ${labelOf(DIFF_MODES, record.diffMode)}${record.diffAmount ? ` ${fmt(record.diffAmount)} ج.م` : ''}`;

    submitIntakeRecord('trade_ins', record).catch(() => null);
    onCreateLead?.({
      name: record.name,
      phone: record.phone,
      whatsapp: record.phone,
      type: 'trade_in',
      source: 'trade_in_portal',
      temperature: 'hot',
      score: 90,
      budget: record.offerValue,
      area: record.offerGovernorate === 'sohag' ? 'new_sohag' : record.offerGovernorate,
      propertyType: record.offerType,
      notes: `${summaryAr}${record.notes ? ` | ${record.notes}` : ''}`,
      details: { tradeIn: true, ...record }
    });

    const wa = getWhatsAppUrl(`مرحباً 1Line 👋\nأرغب في بدل عقاري:\n${summaryAr}\n👤 ${record.name} — 📱 ${record.phone}`);
    setDone({ wa });
    triggerToast?.(L('تم تسجيل طلب البدل — فريق المطابقة هيتواصل معاك', 'Trade-in request saved — our matching team will contact you'), 'success');
  };

  if (done) {
    return (
      <div className="xs-trade" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="xs-success xs-success--page">
          <CheckCircle2 size={48} aria-hidden="true" />
          <h2>{L('طلب البدل وصلنا', 'We have your trade-in request')}</h2>
          <p>{L('فريق المطابقة بيقارن طلبك بعروض البدل المسجلة والعقارات المتاحة، وهيتواصل معاك بأنسب الاختيارات بعد مراجعة الموقف القانوني.', 'Our team compares it with registered swap offers and available listings, and will contact you after a legal check.')}</p>
          <a className="xs-btn xs-btn--wa" href={done.wa} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} aria-hidden="true" /> {L('كمّل مع المستشار على واتساب', 'Continue on WhatsApp')}</a>
          <Link className="xs-btn xs-btn--ghost" to="/properties">{L('تصفح العقارات المتاحة', 'Browse listings')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="xs-trade" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="xs-hub-hero xs-hub-hero--trade">
        <p className="xs-kicker"><Repeat2 size={14} aria-hidden="true" /> {L('منصة البدل العقاري', 'Property trade-in')}</p>
        <h1>{L(<>بدّل عقارك <em>بعقار أنسب</em> — من غير ما تبيع الأول</>, <>Swap your property <em>for a better fit</em> — without selling first</>)}</h1>
        <p>{L('شقة في أسيوط بفيلا في سوهاج الجديدة؟ أرض في قنا بعمارة للعيلة؟ قولنا عندك إيه وعايز إيه، ونطابقك مع عروض بدل حقيقية ومخزوننا — بفرق كاش أو رأس برأس.', 'An apartment in Assiut for a villa in New Sohag? Land in Qena for a family building? Tell us what you have and want; we match real swap offers and our inventory.')}</p>
      </header>

      <form className="xs-wizard" onSubmit={submit} noValidate>
        <div className="xs-hp" aria-hidden="true"><input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></div>

        <ol className="xs-steps">
          {STEPS.map(({ id, icon: Icon, ar, en }) => (
            <li key={id} className={`${step === id ? 'is-current' : ''} ${step > id ? 'is-done' : ''}`}>
              <button type="button" onClick={() => (id < step ? go(id) : null)} disabled={id > step} aria-current={step === id ? 'step' : undefined}>
                <span className="xs-step-dot">{step > id ? <CheckCircle2 size={16} /> : <Icon size={16} />}</span>
                <span>{isAr ? ar : en}</span>
              </button>
            </li>
          ))}
        </ol>

        {step === 1 && (
          <div className="xs-step-body" key="s1">
            <h2>{L('إيه العقار اللي عايز تبدّله؟', 'What are you trading in?')}</h2>
            <div className="xs-choice-grid">
              {OFFER_TYPES.map((o) => (
                <button key={o.id} type="button" className={`xs-choice ${f.offerType === o.id ? 'is-on' : ''}`} onClick={() => set('offerType', o.id)} aria-pressed={f.offerType === o.id}>{isAr ? o.ar : o.en}</button>
              ))}
            </div>
            <div className="xs-row">
              <label className="xs-field">
                <span>{L('المحافظة', 'Governorate')}</span>
                <select value={f.offerGovernorate} onChange={(e) => set('offerGovernorate', e.target.value)}>
                  {GOVERNORATES.map((g) => <option key={g.id} value={g.id}>{isAr ? g.ar : g.en}</option>)}
                </select>
              </label>
              <label className="xs-field">
                <span>{L('المركز / المدينة / الشارع', 'Town / street')}</span>
                <input type="text" maxLength={200} value={f.offerLocation} onChange={(e) => set('offerLocation', e.target.value)} placeholder={L('مثال: طهطا — شارع المحطة', 'e.g. Tahta — Station St.')} />
              </label>
            </div>
            <div className="xs-row">
              <label className="xs-field">
                <span>{L('المساحة', 'Size')} *</span>
                <div className="xs-input-suffix"><input type="number" min="1" value={f.offerSize} onChange={(e) => set('offerSize', numOrEmpty(e.target.value))} /><em>{f.offerType === 'agri_land' ? L('م² (القيراط 175م²)', 'm²') : L('م²', 'm²')}</em></div>
              </label>
              <label className="xs-field">
                <span>{L('القيمة التقريبية', 'Approximate value')} *</span>
                <div className="xs-input-suffix"><input type="number" min="0" step="50000" value={f.offerValue} onChange={(e) => set('offerValue', numOrEmpty(e.target.value))} /><em>{L('ج.م', 'EGP')}</em></div>
              </label>
            </div>
            <span className="xs-sub">{L('الموقف القانوني', 'Legal status')}</span>
            <div className="xs-choice-grid xs-choice-grid--sm">
              {LEGAL_STATUSES.map((o) => (
                <button key={o.id} type="button" className={`xs-choice ${f.offerLegal === o.id ? 'is-on' : ''}`} onClick={() => set('offerLegal', o.id)} aria-pressed={f.offerLegal === o.id}>{isAr ? o.ar : o.en}</button>
              ))}
            </div>
            <p className="xs-fin-note"><ShieldCheck size={13} aria-hidden="true" /> {L('مش لازم يكون مسجل — بنراجع الموقف القانوني للطرفين قبل أي اتفاق.', 'It need not be registered — we review both sides legally before any agreement.')}</p>
          </div>
        )}

        {step === 2 && (
          <div className="xs-step-body" key="s2">
            <h2>{L('عايز تبدّله بإيه؟', 'What do you want instead?')}</h2>
            <div className="xs-choice-grid">
              {WANT_TYPES.map((o) => (
                <button key={o.id} type="button" className={`xs-choice ${f.wantType === o.id ? 'is-on' : ''}`} onClick={() => set('wantType', o.id)} aria-pressed={f.wantType === o.id}>{isAr ? o.ar : o.en}</button>
              ))}
            </div>
            <div className="xs-row">
              <label className="xs-field">
                <span>{L('المنطقة المفضلة', 'Preferred area')}</span>
                <input type="text" maxLength={60} value={f.wantArea} onChange={(e) => set('wantArea', e.target.value)} placeholder={L('مثال: سوهاج الجديدة — الحي الأول', 'e.g. New Sohag — District 1')} />
              </label>
              <label className="xs-field">
                <span>{L('أقل مساحة مقبولة', 'Minimum size')}</span>
                <div className="xs-input-suffix"><input type="number" min="0" value={f.wantSize} onChange={(e) => set('wantSize', numOrEmpty(e.target.value))} /><em>{L('م²', 'm²')}</em></div>
              </label>
            </div>
            <label className="xs-field">
              <span>{L('مواصفات مهمة ليك', 'Must-haves')}</span>
              <input type="text" maxLength={500} value={f.wantNotes} onChange={(e) => set('wantNotes', e.target.value)} placeholder={L('مثال: دور أرضي، قريب من مدارس، جراج', 'e.g. ground floor, near schools, garage')} />
            </label>

            <div className="xs-preview" aria-live="polite">
              <Sparkles size={16} aria-hidden="true" />
              {preview.length > 0 ? (
                <span>{L(`عندنا دلوقتي ${preview.length === 3 ? '3+' : preview.length} عقار معروض يناسب طلبك في حدود ميزانيتك`, `${preview.length === 3 ? '3+' : preview.length} current listings fit what you want within budget`)}</span>
              ) : (
                <span>{L('مفيش عقار معروض مطابق حالياً — هندوّر لك في عروض البدل المسجلة والسوق.', 'No matching listing right now — we will search registered swap offers and the market.')}</span>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="xs-step-body" key="s3">
            <h2>{L('الفرق المالي', 'The cash difference')}</h2>
            <div className="xs-choice-grid xs-choice-grid--3">
              {DIFF_MODES.map((o) => (
                <button key={o.id} type="button" className={`xs-choice ${f.diffMode === o.id ? 'is-on' : ''}`} onClick={() => set('diffMode', o.id)} aria-pressed={f.diffMode === o.id}>{isAr ? o.ar : o.en}</button>
              ))}
            </div>
            {f.diffMode !== 'even' && (
              <label className="xs-field">
                <span>{f.diffMode === 'pay' ? L('أقدر أدفع فرق لحد', 'I can pay up to') : L('عايز أستلم فرق تقريباً', 'I want to receive about')}</span>
                <div className="xs-input-suffix"><input type="number" min="0" step="50000" value={f.diffAmount} onChange={(e) => set('diffAmount', numOrEmpty(e.target.value))} /><em>{L('ج.م', 'EGP')}</em></div>
              </label>
            )}
            {budget > 0 && (
              <p className="xs-budget">{L('قيمة العقار البديل اللي نقدر ندوّر عليه:', 'Target value for the new property:')} <b><bdi>{fmt(budget)}</bdi> {L('ج.م', 'EGP')}</b></p>
            )}

            <h2 className="xs-mt">{L('بيانات التواصل', 'Contact details')}</h2>
            <div className="xs-row">
              <label className="xs-field">
                <span>{L('الاسم', 'Name')} *</span>
                <input type="text" maxLength={100} autoComplete="name" value={f.name} onChange={(e) => set('name', e.target.value)} />
              </label>
              <label className="xs-field">
                <span>{L('مقيم في', 'Living in')}</span>
                <select value={f.countryId} onChange={(e) => set('countryId', e.target.value)}>
                  {EXPAT_COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.flag} {isAr ? c.ar : c.en}</option>)}
                </select>
              </label>
            </div>
            <label className="xs-field">
              <span>{L('رقم واتساب', 'WhatsApp number')} *</span>
              <div className="xs-phone" dir="ltr">
                <span className="xs-cc">{getCountry(f.countryId).editableCode ? '+' : getCountry(f.countryId).code}</span>
                <input type="tel" inputMode="tel" maxLength={16} value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder={getCountry(f.countryId).editableCode ? L('الرقم بكود الدولة', 'number with country code') : ''} />
              </div>
            </label>
            <label className="xs-field">
              <span>{L('ملاحظات إضافية', 'Anything else')}</span>
              <textarea rows={2} maxLength={1000} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
            </label>
          </div>
        )}

        {error && <p className="xs-error" role="alert">{error}</p>}

        <div className="xs-wizard-nav">
          {step > 1 ? (
            <button type="button" className="xs-btn xs-btn--ghost" onClick={() => go(step - 1)}><Back size={16} aria-hidden="true" /> {L('السابق', 'Back')}</button>
          ) : <span />}
          {step < 3 ? (
            <button type="button" className="xs-btn xs-btn--royal" onClick={() => go(step + 1)}>{L('التالي', 'Next')} <Next size={16} aria-hidden="true" /></button>
          ) : (
            <button type="submit" className="xs-btn xs-btn--royal"><Repeat2 size={17} aria-hidden="true" /> {L('سجّل طلب البدل', 'Submit trade-in')}</button>
          )}
        </div>
      </form>
    </div>
  );
}
