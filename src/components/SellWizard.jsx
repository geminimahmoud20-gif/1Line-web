import { useState, useMemo, useEffect, useRef } from 'react';
import { isAgriculturalType, isIndustrialType, isLandType, formatFeddan } from '../utils/propertyKinds';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Handshake, Info, MessageCircle, Send, UserRound } from 'lucide-react';
import PhoneInputField from './PhoneInputField';
import { SUPPORTED_COUNTRIES } from '../utils/phoneCountries';
import { getAreas } from '../utils/areasData';
import { useProperties } from '../context/PropertiesContext';
import { assetClass } from '../utils/marketStats';
import { areaReferencePrice } from '../utils/areaPricing';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import SubmissionSuccess from './common/SubmissionSuccess';
import ConsentNote from './common/ConsentNote';
import { toLatinDigits } from '../utils/latinDigits';
import { scrollToForm } from '../utils/scrollToForm';
import { featuresFor, featureLabels, orderedPhotos, sellerAssetClass } from '../utils/sellerListing';
import { PROPERTY_TYPES, CAIRO_AREAS, FINISHING, LEGAL_DOCS, SPEC_FIELDS, floorLabel } from './sell/sellOptions';
import { readSellLink } from '../utils/sellLink';
import SellPhotoSlots from './sell/SellPhotoSlots';
import './sell/sell-wizard.css';
import { nameProblem, phoneProblem } from '../utils/contactValidation';
import { sellProgress } from '../utils/sellProgress';
import { ringMessage } from '../utils/ringMessage';
import { sellWhatsappMessage, firstName } from '../utils/sellMessage';
import ProgressRing from './common/ProgressRing';
import { mainAreas, childrenOf, shortAreaName } from '../utils/areaLookup';

const STEPS = [
  { ar: 'العقار والعنوان', en: 'Property & address' },
  { ar: 'المواصفات والمميزات', en: 'Specs & features' },
  { ar: 'الصور', en: 'Photos' },
  { ar: 'السعر وبياناتك', en: 'Price & contact' }
];

// What the progress bar tells the guest to do next
const NEXT_HINT = {
  role: { ar: 'ابدأ بسؤال واحد: إنت مالك العقار ولا وسيط؟', en: 'First question: are you the owner or a broker?' },
  type: { ar: 'ابدأ باختيار نوع العقار', en: 'Start by choosing the property type' },
  area: { ar: 'الخطوة الجاية: اختار المنطقة', en: 'Next: choose the area' },
  size: { ar: 'الخطوة الجاية: اكتب المساحة', en: 'Next: enter the size' },
  address: { ar: 'الخطوة الجاية: اكتب العنوان', en: 'Next: enter the address' },
  continue: { ar: 'كمّل بزرار «التالي»', en: 'Continue with «Next»' },
  specs: { ar: 'اختار المواصفات والمميزات، وكلها اختيارية', en: 'Pick the specs and features, all optional' },
  photos: { ar: 'ضيف صور العقار، أو كمّل من غير صور', en: 'Add photos, or continue without' },
  name: { ar: 'اكتب اسمك', en: 'Enter your name' },
  phone: { ar: 'آخر حاجة: رقم موبايلك', en: 'Last: your phone number' },
  send: { ar: 'راجع بياناتك وابعت', en: 'Review and send' }
};

const num = (v) => parseInt(toLatinDigits(v || ''), 10) || 0;
const money = (n) => Number(n).toLocaleString('en-US');

// "+20 010…", "0020…", Arabic digits → local part + E.164
const splitPhone = (raw, countryCode = '+20') => {
  let clean = toLatinDigits(String(raw || '')).trim().replace(/[\s()-]/g, '');
  if (clean.startsWith('+')) clean = clean.slice(1);
  else if (clean.startsWith('00')) clean = clean.slice(2);
  const cc = countryCode.replace(/\D/g, '');
  if (cc && clean.startsWith(cc)) clean = clean.slice(cc.length);
  const local = clean;
  const full = `+${cc}${clean.startsWith('0') ? clean.slice(1) : clean}`;
  return { local, full: local ? full : '' };
};

function Disclaimer({ isAr, compact = false }) {
  return (
    <div className={`sw-note ${compact ? 'sw-note--compact' : ''}`}>
      <Info size={18} aria-hidden="true" />
      <p>
        {isAr
          ? <>الصور والسعر هنا <strong>مبدئيين</strong>. دورنا إننا نسوّق عقارك بأفضل شكل وبأنسب سعر{compact ? '.' : ': هنعاين العقار، ونصوّره تصوير احترافي، ونتفق معاك على السعر النهائي قبل أي إعلان.'}</>
          : <>Photos and price here are <strong>preliminary</strong>. Our job is to market your property at its best and at the right price{compact ? '.' : ': we visit, shoot professional photos and agree the final price with you before any listing.'}</>}
      </p>
    </div>
  );
}

// After the contact details are complete the request goes by itself; the guest can stop it, fix a typo, or send now.
function AutoSend({ seconds = 6, isAr, onSend, onEdit }) {
  const [left, setLeft] = useState(seconds);
  const sent = useRef(false);
  useEffect(() => {
    const t = window.setInterval(() => setLeft((n) => n - 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (left <= 0 && !sent.current) { sent.current = true; onSend(); }
  }, [left, onSend]);
  const L = (ar, en) => (isAr ? ar : en);
  return (
    <div className="sw-auto" role="status" aria-live="polite">
      <div className="sw-auto__text">
        <strong>{L('بياناتك كاملة، هنبعت طلبك دلوقتي', 'Your details are complete, sending now')}</strong>
        <small>{left > 0 ? L(`هيتبعت بعد ${left} ثواني. لو في غلطة عدّل بياناتك.`, `Sending in ${left}s. Spot a typo? Edit your details.`) : L('بنبعت…', 'Sending…')}</small>
      </div>
      <span className="sw-auto__bar" aria-hidden="true"><span style={{ animationDuration: `${seconds}s` }} /></span>
      <div className="sw-auto__actions">
        <button type="button" className="sw-btn sw-btn--primary" onClick={() => { if (!sent.current) { sent.current = true; onSend(); } }}>
          <Send size={16} aria-hidden="true" />{L('ابعت دلوقتي', 'Send now')}
        </button>
        <button type="button" className="sw-btn sw-btn--ghost" onClick={onEdit}>{L('عدّل بياناتي', 'Edit my details')}</button>
      </div>
    </div>
  );
}

export const SellWizard = ({ lang = 'ar', sellerAnswers = {}, setSellerAnswers, submitSellerJourney }) => {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const a = sellerAnswers;
  const type = a.propertyType || 'apartment';
  const set = (patch) => setSellerAnswers((prev) => ({ ...prev, ...patch }));

  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [phoneCountry, setPhoneCountry] = useState('+20');
  const [waCountry, setWaCountry] = useState('+20');
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const [showCairo, setShowCairo] = useState(false);
  const nameRef = useRef(null);
  const [submittedRef, setSubmittedRef] = useState(null);
  const [districts, setDistricts] = useState(() => getAreas().filter((d) => d.id !== 'all'));

  // Opened from a shared «سجّل وحدتك» link: start with its kind and area, and remember who sent it
  useEffect(() => {
    const fromLink = readSellLink(window.location.search, {
      typeIds: PROPERTY_TYPES.map((t) => t.id),
      areaIds: [...getAreas().map((d) => d.id).filter((id) => id !== 'all'), ...CAIRO_AREAS.map((c) => c.id)]
    });
    const patch = {};
    if (fromLink.propertyType) patch.propertyType = fromLink.propertyType;
    if (fromLink.area) patch.area = fromLink.area;
    if (fromLink.sharedBy) patch.sharedBy = fromLink.sharedBy;
    if (Object.keys(patch).length) setSellerAnswers((prev) => ({ ...prev, ...patch }));
  }, [setSellerAnswers]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('oneline_wizard_started', { detail: { type: 'sell' } }));
    const refresh = () => setDistricts(getAreas().filter((d) => d.id !== 'all'));
    window.addEventListener('oneline_areas_updated', refresh);
    return () => window.removeEventListener('oneline_areas_updated', refresh);
  }, []);

  // The owner picks the area: preselecting the first one filed untouched forms under it
  const area = a.area || '';
  const isCairo = area.startsWith('cairo_');
  const areaLabel = (CAIRO_AREAS.find((c) => c.id === area)?.[isAr ? 'ar' : 'en']) || districts.find((d) => d.id === area)?.name_ar || '';
  const features = Array.isArray(a.features) ? a.features : [];
  const legalDocs = Array.isArray(a.legalDocs) ? a.legalDocs : [];

  // Indicative range from similar live listings in the district (3+), else the district's per-m² average
  const { properties: siteListings = [] } = useProperties();
  const estimate = useMemo(() => {
    const size = num(a.size);
    // No automatic estimate for farmland and industrial units yet: valued by hand
    if (!size || !area || isCairo || isAgriculturalType(type) || isIndustrialType(type)) return null;
    const cls = assetClass({ type }); // shops with shops, offices with offices, homes with homes
    // 3+ similar listings in the area (sub-areas included), or the area's price the team set by
    // hand for homes. Without one there is no automatic estimate: no built-in figures or multipliers.
    const ref = areaReferencePrice(districts.find((d) => d.id === area), siteListings, districts, cls);
    if (!ref || (ref.source === 'manual' && cls !== 'residential' && cls !== 'villa')) return null;
    const m2 = ref.ppm;
    const basis = ref.source === 'listings' ? 'comparables' : 'area';
    const finish = cls === 'land' ? 1 : (FINISHING.find((f) => f.id === a.finishing)?.multiplier || 1);
    const avg = size * m2 * finish;
    const spread = basis === 'comparables' ? 0.08 : 0.1;
    const round = (v) => Math.round(v / 10000) * 10000;
    return { min: round(avg * (1 - spread)), max: round(avg * (1 + spread)), avg: Math.round(avg), basis, sample: ref.sample };
  }, [a.size, a.finishing, type, area, isCairo, districts, siteListings]);

  // Land, farms and industrial land have no finishing
  const noFinishing = isLandType(type) || isAgriculturalType(type);

  const chooseType = (id) => {
    if (id === a.propertyType) return;
    // Features and photo spots differ per kind; keep only what still applies
    const keep = featuresFor(id).map((f) => f.id);
    set({ propertyType: id, features: features.filter((f) => keep.includes(f)), ...(sellerAssetClass(id) !== sellerAssetClass(type) ? { photoSlots: {} } : {}) });
  };

  // After a choice, bring the next question into view so the guest never hunts for it
  const sizeRef = useRef(null);
  const goTo = (target) => {
    window.setTimeout(() => {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = el.matches('input,select,textarea') ? el : el.querySelector('input,select,textarea');
      if (input) input.focus({ preventScroll: true });
    }, 120);
  };
  const pickRole = (role) => { set({ sellerRole: role }); goTo('.sw-types'); };
  const pickType = (id) => { chooseType(id); goTo('.sw-areas'); };
  const pickArea = (id, hasChildren) => {
    set({ area: id });
    goTo(hasChildren ? '.sw-areas__kids' : sizeRef.current);
  };
  const mains = mainAreas(districts);
  const activeMain = mains.find((m) => m.id === area || childrenOf(m.id, districts).some((c) => c.id === area));
  const kids = activeMain ? childrenOf(activeMain.id, districts) : [];

  const toggle = (field, list, id) => set({ [field]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });

  const stepError = [
    !(a.sellerRole === 'owner' || a.sellerRole === 'broker') ? L('اختار إنت مالك العقار ولا وسيط', 'Choose whether you are the owner or a broker')
      : !a.propertyType ? L('اختار نوع العقار', 'Choose the property type')
      : !area ? L('اختار المنطقة', 'Choose the area')
      : num(a.size) < 20 ? L('اكتب المساحة (20 م² على الأقل)', 'Enter the size (20 m² or more)')
        : String(a.address || '').trim().length < 3 ? L('اكتب العنوان', 'Enter the address') : '',
    '',
    '',
    ''
  ];

  const next = () => {
    if (stepError[step]) {
      setErrors({ step: stepError[step] });
      return;
    }
    setErrors({});
    setReached((r) => Math.max(r, Math.min(step + 1, STEPS.length - 1)));
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    scrollToForm('.sw');
  };
  const back = () => { setErrors({}); setStep((s) => Math.max(s - 1, 0)); scrollToForm('.sw'); };

  // Name and numbers the way the server will read them, and what is wrong with them (nothing when ready)
  const contactCheck = () => {
    const errs = {};
    const phone = splitPhone(a.phone, phoneCountry);
    const wa = sameAsPhone ? splitPhone(a.phone, phoneCountry) : splitPhone(a.whatsapp, waCountry);
    const fits = (country, local) => SUPPORTED_COUNTRIES.find((c) => c.code === country)?.regex.test(local) ?? true;
    const nameErr = nameProblem(a.name, isAr);
    if (nameErr) errs.name = nameErr;
    if (!phone.local || !fits(phoneCountry, phone.local)) errs.phone = phoneProblem(phone.local, phoneCountry, isAr) || L('رقم الموبايل مش مظبوط', 'Check the phone number');
    if (!sameAsPhone && (!wa.local || !fits(waCountry, wa.local))) errs.whatsapp = phoneProblem(wa.local, waCountry, isAr) || L('رقم الواتساب مش مظبوط', 'Check the WhatsApp number');
    return { errs, phone, wa };
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (isSubmitting) return;
    const { errs, phone, wa } = contactCheck();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const { images, photoLabels } = orderedPhotos(type, a.photoSlots);
    const finish = FINISHING.find((f) => f.id === a.finishing);
    const legalAr = legalDocs.map((id) => LEGAL_DOCS.find((d) => d.id === id)?.ar).filter(Boolean).join('، ');
    const rest = { ...a };
    delete rest.photoSlots;

    setIsSubmitting(true);
    try {
      const lead = await submitSellerJourney({
        ...rest,
        propertyType: type,
        area,
        address: String(a.address || '').trim().slice(0, 200),
        size: String(num(a.size)),
        floor: floorLabel({ ...a, propertyType: type }),
        rooms: type === 'apartment' || type === 'villa' ? (a.rooms || SPEC_FIELDS[type][1].def) : 0,
        ...(type === 'villa' ? { totalFloors: a.totalFloors || '2' } : {}),
        finishing: noFinishing ? '' : (a.finishing || ''),
        finishingLabelAr: noFinishing ? '' : (finish?.ar || ''),
        features,
        featuresAr: featureLabels(type, features),
        ...(isAgriculturalType(type) || isIndustrialType(type) ? {
          specsAr: (SPEC_FIELDS[type] || []).map((f) => `${f.ar}: ${f.options.find((o) => o.value === (a[f.field] || f.def))?.ar || ''}`)
        } : {}),
        legalDocs,
        legalSummaryAr: legalAr,
        askingPrice: num(a.askingPrice) || null,
        estimatedMin: estimate?.min || null,
        estimatedMax: estimate?.max || null,
        estimatedAvg: estimate?.avg || null,
        estimateBasis: estimate?.basis || null,
        images,
        photoLabels,
        name: String(a.name).trim(),
        phone: phone.full,
        whatsapp: wa.full
      });
      setSubmittedRef(lead?.id || `lead-${Date.now()}`);
      scrollToForm('.sw');
    } catch {
      // A failed send must not retry on its own in a loop: stop the automatic send and let the guest retry
      setAutoPaused(true);
      setErrors({ submit: L('حصلت مشكلة من عندنا وإحنا لسه بنظبط الفورم. بياناتك متحفوظة، جرّب تاني بعد شوية، أو ابعت التفاصيل على واتساب.', 'Something went wrong on our side while we finish the form. Your details are kept; try again shortly or send them on WhatsApp.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedRef) {
    return (
      <div className="sw">
        <SubmissionSuccess
          lang={lang}
          reference={submittedRef}
          title_ar={`تمام${firstName(a.name) ? ` يا ${firstName(a.name)}` : ''}، طلبك وصل لفريقنا`}
          title_en={`All set${firstName(a.name) ? `, ${firstName(a.name)}` : ''}, your request reached our team`}
          intro_ar="شكرًا إنك اخترت 1Line. بياناتك عندنا دلوقتي، ومفيش حاجة هتتنشر من غير ما نتفق معاك الأول."
          intro_en="Thank you for choosing 1Line. We have your details, and nothing is published until we agree it with you."
          stepsTitle_ar="إيه اللي هيحصل بعد كده؟"
          stepsTitle_en="What happens next?"
          steps={[
            { ar: 'فريقنا بيراجع بياناتك دلوقتي.', en: 'Our team is reviewing your details now.' },
            { ar: 'خلال يوم عمل مستشار من 1Line هيتصل بيك على الرقم اللي كتبته.', en: 'Within one business day a 1Line advisor calls you on the number you gave.' },
            { ar: 'بعدها نحدد معاد معاينة ونصوّر العقار تصوير احترافي.', en: 'Then we book a visit and shoot professional photos.' },
            a.sellerRole === 'broker'
              ? { ar: 'قبل أي إعلان، نراجع معاك تفويض المالك ونتفق على السعر وخطة التسويق.', en: "Before any listing, we review the owner's authorisation and agree the price and marketing plan." }
              : { ar: 'قبل أي إعلان، نتفق معاك على السعر وخطة التسويق.', en: 'Before any listing, we agree the price and marketing plan with you.' }
          ]}
          whatsappText={sellWhatsappMessage({
            name: a.name,
            role: a.sellerRole,
            typeLabel: PROPERTY_TYPES.find((t) => t.id === type)?.[isAr ? 'ar' : 'en'],
            areaLabel: areaLabel,
            size: a.size,
            address: a.address,
            askingPrice: a.askingPrice,
            isAr
          })}
          whatsappLabel_ar="ابعت تفاصيلك على واتساب عشان نسرّع الموضوع"
          whatsappLabel_en="Send your details on WhatsApp to speed things up"
          secondaryLink={{ to: '/demands', ar: 'شوف طلبات المشترين الحالية', en: 'See current buyer requests' }}
        />
      </div>
    );
  }

  const contact = contactCheck().errs;
  // Letters of another script than Arabic, with no Arabic at all: a gentle nudge, never a block
  const latinName = /[A-Za-z]/.test(a.name || '') && !/[\u0600-\u06FF]/.test(a.name || '');
  const progress = sellProgress(a, step, reached, { contactOk: { name: !contact.name, phone: !contact.phone && !contact.whatsapp } });
  const autoReady = step === 3 && !isSubmitting && !autoPaused && Object.keys(contact).length === 0;
  // Why the request is not going out yet: shown as soon as something was typed, never silently
  const contactHint = step === 3 && (a.name || a.phone) ? (contact.name || contact.phone || contact.whatsapp || '') : '';
  const Next = isAr ? ArrowLeft : ArrowRight;
  const Prev = isAr ? ArrowRight : ArrowLeft;
  const specFields = SPEC_FIELDS[type] || [];

  return (
    <div className="sw" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="sw-progress">
        <ProgressRing percent={progress.percent} label={L('نسبة إنجاز الفورم', 'Form completion')} />
        <span className="sw-progress__text">
          <em>{ringMessage(progress.percent, isAr)}</em>
          <strong>{progress.percent === 100 ? L('طلبك جاهز للإرسال', 'Your request is ready') : L(`الخطوة ${step + 1} من ${progress.total}`, `Step ${step + 1} of ${progress.total}`)}</strong>
          <small>{L(NEXT_HINT[progress.next].ar, NEXT_HINT[progress.next].en)}</small>
        </span>
      </div>
      <ol className="sw-steps" aria-label={L('خطوات الطلب', 'Steps')}>
        {STEPS.map((s, i) => (
          <li key={s.en} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
            <span className="sw-steps__dot">{i < step ? <Check size={14} aria-hidden="true" /> : i + 1}</span>
            <span className="sw-steps__label">{isAr ? s.ar : s.en}</span>
          </li>
        ))}
      </ol>
      <p className="sw-steps__mobile">{L(`خطوة ${step + 1} من ${STEPS.length}`, `Step ${step + 1} of ${STEPS.length}`)} · {isAr ? STEPS[step].ar : STEPS[step].en}</p>

      {step === 0 && (
        <section className="sw-step">
          <h3 className="sw-title">{L('إنت مين بالنسبة للعقار؟', 'Who are you for this property?')}</h3>
          <div className="sw-roles" role="radiogroup" aria-label={L('إنت مين بالنسبة للعقار', 'Your role')}>
            {[
              { id: 'owner', ar: 'أنا المالك', en: "I'm the owner", subAr: 'العقار ملكي', subEn: 'The property is mine', Icon: UserRound },
              { id: 'broker', ar: 'وسيط عقاري', en: 'Real estate broker', subAr: 'بعرضه لصالح مالكه', subEn: "I'm listing it for its owner", Icon: Handshake }
            ].map(({ id, ar, en, subAr, subEn, Icon }) => (
              <button key={id} type="button" role="radio" aria-checked={a.sellerRole === id} className={`sw-role ${a.sellerRole === id ? 'is-active' : ''}`} onClick={() => pickRole(id)}>
                <Icon size={22} aria-hidden="true" />
                <span><strong>{isAr ? ar : en}</strong><small>{isAr ? subAr : subEn}</small></span>
              </button>
            ))}
          </div>
          <h3 className="sw-title">{L('عاوز تبيع إيه؟', 'What are you selling?')}</h3>
          <div className="sw-types" role="radiogroup" aria-label={L('نوع العقار', 'Property type')}>
            {PROPERTY_TYPES.map(({ id, ar, en, icon: Icon }) => (
              <button key={id} type="button" role="radio" aria-checked={a.propertyType === id} className={`sw-type ${a.propertyType === id ? 'is-active' : ''}`} onClick={() => pickType(id)}>
                <Icon size={22} aria-hidden="true" />
                <span>{isAr ? ar : en}</span>
              </button>
            ))}
          </div>

          <div className="sw-grid">
            <div className="sw-field sw-field--wide sw-areas" role="group" aria-label={L('المنطقة', 'Area')}>
              <span>{L('المنطقة', 'Area')}</span>
              <small className="sw-areas__group">{L('سوهاج', 'Sohag')}</small>
              <div className="sw-chips">
                {mains.map((m) => {
                  const has = childrenOf(m.id, districts).length > 0;
                  return (
                    <button key={m.id} type="button" aria-pressed={activeMain?.id === m.id} className={`sw-chip ${activeMain?.id === m.id ? 'is-on' : ''}`} onClick={() => pickArea(m.id, has)}>{shortAreaName(m, districts, isAr)}</button>
                  );
                })}
              </div>
              {/* Greater Cairo stays folded: most owners are in Sohag, and 15 chips in one cloud push the form down */}
              <button type="button" className={`sw-areas__cairo${isCairo ? ' is-on' : ''}`} aria-expanded={showCairo || isCairo} onClick={() => setShowCairo((v) => !v)}>
                {isCairo ? `${L('القاهرة الكبرى', 'Greater Cairo')}: ${CAIRO_AREAS.find((c) => c.id === area)?.[isAr ? 'ar' : 'en'] || ''}` : L('العقار في القاهرة الكبرى؟', 'Property in Greater Cairo?')}
                <ChevronDown size={15} aria-hidden="true" className={showCairo || isCairo ? 'is-open' : ''} />
              </button>
              {(showCairo || isCairo) && (
                <div className="sw-chips sw-areas__cairo-list">
                  {CAIRO_AREAS.map((c) => (
                    <button key={c.id} type="button" aria-pressed={area === c.id} className={`sw-chip ${area === c.id ? 'is-on' : ''}`} onClick={() => pickArea(c.id, false)}>{isAr ? c.ar : c.en}</button>
                  ))}
                </div>
              )}
              {kids.length > 0 && (
                <div className="sw-areas__kids">
                  <small>{L('وفين بالظبط؟', 'Which part?')}</small>
                  <div className="sw-chips">
                    <button type="button" aria-pressed={area === activeMain.id} className={`sw-chip ${area === activeMain.id ? 'is-on' : ''}`} onClick={() => pickArea(activeMain.id, false)}>{L('مش متأكد / عام', 'Not sure / general')}</button>
                    {kids.map((c) => (
                      <button key={c.id} type="button" aria-pressed={area === c.id} className={`sw-chip ${area === c.id ? 'is-on' : ''}`} onClick={() => pickArea(c.id, false)}>{shortAreaName(c, districts, isAr)}</button>
                    ))}
                  </div>
                </div>
              )}
              {errors.step && !area && <small className="sw-error">{L('اختار المنطقة', 'Choose the area')}</small>}
            </div>
            <label className="sw-field">
              <span>{L('المساحة', 'Size')}</span>
              <div className="sw-suffix">
                <input ref={sizeRef} type="text" inputMode="numeric" enterKeyHint="next" placeholder={isAgriculturalType(type) ? '4200' : '150'} value={a.size || ''} onChange={(e) => set({ size: toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 7) })} />
                <span>{L('م²', 'm²')}</span>
              </div>
              {isAgriculturalType(type) && (
                <small className="sw-hint">{num(a.size) > 0 ? `= ${formatFeddan(num(a.size), isAr)}` : L('الفدان = 4200 م² تقريباً، والقيراط = 175 م²', '1 feddan ≈ 4,200 m², 1 qirat ≈ 175 m²')}</small>
              )}
            </label>
            <label className="sw-field sw-field--wide">
              <span>{L('العنوان', 'Address')}</span>
              <input type="text" maxLength={200} enterKeyHint="next" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); next(); } }} placeholder={L('اسم الشارع وأقرب علامة مميزة', 'Street name and nearest landmark')} value={a.address || ''} onChange={(e) => set({ address: e.target.value })} />
              <small>{L('للفريق بس، مش بيظهر في الإعلان.', 'For our team only, never shown in the listing.')}</small>
            </label>
          </div>

          <a className="sw-wa" href={getWhatsAppUrl(L('أهلاً 1Line، عاوز أعرض عقاري للبيع وأبعت الصور على واتساب', 'Hello 1Line, I want to list my property and send photos on WhatsApp'))} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={16} aria-hidden="true" />
            {L('تفضّل تبعت التفاصيل على واتساب؟', 'Prefer to send details on WhatsApp?')}
          </a>
        </section>
      )}

      {step === 1 && (
        <section className="sw-step">
          <h3 className="sw-title">{L('مواصفات العقار', 'Property details')}</h3>
          <div className="sw-grid">
            {specFields.map((f, i) => {
              const cur = a[f.field] || f.def;
              const many = f.options.length > 8;
              return many ? (
                <label key={f.field} className="sw-field sw-spec" data-spec={i}>
                  <span>{isAr ? f.ar : f.en}</span>
                  <select value={cur} onChange={(e) => { set({ [f.field]: e.target.value }); goTo(`[data-spec="${i + 1}"]`); }}>
                    {f.options.map((o) => <option key={o.value} value={o.value}>{isAr ? o.ar : o.en}</option>)}
                  </select>
                </label>
              ) : (
                <div key={f.field} className="sw-field sw-field--wide sw-spec" data-spec={i} role="group" aria-label={isAr ? f.ar : f.en}>
                  <span>{isAr ? f.ar : f.en}</span>
                  <div className="sw-chips">
                    {f.options.map((o) => (
                      <button key={o.value} type="button" aria-pressed={String(cur) === String(o.value)} className={`sw-chip ${String(cur) === String(o.value) ? 'is-on' : ''}`} onClick={() => { set({ [f.field]: o.value }); goTo(`[data-spec="${i + 1}"]`); }}>{isAr ? o.ar : o.en}</button>
                    ))}
                  </div>
                </div>
              );
            })}
            {!noFinishing && (
              <div className="sw-field sw-field--wide sw-spec" data-spec={specFields.length} role="group" aria-label={L('التشطيب', 'Finishing')}>
                <span>{L('التشطيب', 'Finishing')}</span>
                <div className="sw-chips">
                  {FINISHING.map((f) => (
                    <button key={f.id} type="button" aria-pressed={a.finishing === f.id} className={`sw-chip ${a.finishing === f.id ? 'is-on' : ''}`} onClick={() => { set({ finishing: f.id }); goTo('.sw-fieldset'); }}>{isAr ? f.ar : f.en}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <fieldset className="sw-fieldset">
            <legend>{L('المميزات', 'Features')} <small>{L('اختار كل اللي ينطبق', 'Pick all that apply')}</small></legend>
            <div className="sw-chips">
              {featuresFor(type).map((f) => {
                const on = features.includes(f.id);
                return (
                  <button key={f.id} type="button" aria-pressed={on} className={`sw-chip ${on ? 'is-on' : ''}`} onClick={() => toggle('features', features, f.id)}>
                    {on && <Check size={14} aria-hidden="true" />}{isAr ? f.ar : f.en}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <details className="sw-more" open={legalDocs.length > 0}>
            <summary>{L('الأوراق المتاحة', 'Documents')} <small>{L('اختياري', 'Optional')}</small><ChevronDown size={16} aria-hidden="true" /></summary>
            <div className="sw-chips">
              {LEGAL_DOCS.map((d) => {
                const on = legalDocs.includes(d.id);
                return (
                  <button key={d.id} type="button" aria-pressed={on} className={`sw-chip ${on ? 'is-on' : ''}`} onClick={() => toggle('legalDocs', legalDocs, d.id)}>
                    {on && <Check size={14} aria-hidden="true" />}{isAr ? d.ar : d.en}
                  </button>
                );
              })}
            </div>
            <small className="sw-help">{L('مش متأكد؟ سيبها، وهنراجع الورق معاك في المعاينة.', 'Not sure? Leave it; we review papers at the visit.')}</small>
          </details>
        </section>
      )}

      {step === 2 && (
        <section className="sw-step">
          <h3 className="sw-title">{L('صور العقار', 'Photos')}</h3>
          <p className="sw-lead">
            {sellerAssetClass(type) === 'commercial'
              ? L('للمحلات والمكاتب: صورتين للشارع، وصورة للواجهة، وصورة للمبنى، وصورتين من جوه.', 'For shops and offices: two of the street, the frontage, the building and two inside.')
              : L('صوّر كل مكان في الخانة بتاعته. لحد 8 صور، والصور اختيارية.', 'One photo per spot, up to 8. Photos are optional.')}
          </p>
          <SellPhotoSlots isAr={isAr} propertyType={type} value={a.photoSlots || {}} onChange={(photoSlots) => set({ photoSlots })} />
          <Disclaimer isAr={isAr} compact />
        </section>
      )}

      {step === 3 && (
        <form className="sw-step" onSubmit={submit} noValidate>
          <h3 className="sw-title">{L('السعر وبياناتك', 'Price & your details')}</h3>

          <div className="sw-price">
            <label className="sw-field">
              <span>{L('السعر اللي في دماغك', 'Your asking price')}</span>
              <div className="sw-suffix">
                <input type="text" inputMode="numeric" placeholder={estimate ? money(estimate.avg) : '2,500,000'} value={a.askingPrice ? money(num(a.askingPrice)) : ''} onChange={(e) => set({ askingPrice: toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 12) })} />
                <span>{L('ج.م', 'EGP')}</span>
              </div>
            </label>
            {estimate ? (
              <p className="sw-estimate">
                {L('السوق في منطقتك حوالي', 'Similar properties nearby:')} <strong>{money(estimate.min)} – {money(estimate.max)}</strong> {L('ج.م', 'EGP')}
                <small>{estimate.basis === 'comparables' ? L(`من ${estimate.sample} عروض مشابهة`, `from ${estimate.sample} similar listings`) : L('من متوسط سعر المتر في المنطقة', 'from the district average per m²')}</small>
              </p>
            ) : (
              <p className="sw-estimate"><small>{L('هنقيّمه بمقارنات حقيقية بعد المعاينة.', 'We’ll value it against real comparables after the visit.')}</small></p>
            )}
          </div>

          <Disclaimer isAr={isAr} />

          <div className="sw-grid">
            <label className="sw-field sw-field--wide">
              <span>{L('اسمك بالعربي', 'Your name')}</span>
              <input ref={nameRef} type="text" autoComplete="name" maxLength={100} placeholder={L('مثال: أحمد علي', 'e.g. Ahmed Ali')} value={a.name || ''} onChange={(e) => { set({ name: e.target.value }); setAutoPaused(false); }} aria-invalid={Boolean(errors.name)} />
              {errors.name && <small className="sw-error" role="alert">{errors.name}</small>}
              {!errors.name && latinName && <small className="sw-soft-note">{L('الأفضل تكتب اسمك بالعربي عشان فريقنا يكلمك صح. ومفيش مشكلة، هنبعت طلبك عادي.', 'Writing your name in Arabic helps our team reach you. No problem, your request still goes through.')}</small>}
            </label>
            <div className="sw-field sw-field--wide">
              <PhoneInputField
                label={L('رقم الموبايل', 'Mobile number')}
                value={a.phone || ''}
                onChange={(phone) => { set(sameAsPhone ? { phone, whatsapp: phone } : { phone }); setAutoPaused(false); }}
                country={phoneCountry}
                onCountryChange={(code) => { setPhoneCountry(code); if (sameAsPhone) setWaCountry(code); }}
                error={errors.phone}
                isAr={isAr}
                required
              />
              <label className="sw-check">
                <input type="checkbox" checked={sameAsPhone} onChange={(e) => setSameAsPhone(e.target.checked)} />
                <span>{L('نفس الرقم عليه واتساب', 'Same number on WhatsApp')}</span>
              </label>
            </div>
            {!sameAsPhone && (
              <div className="sw-field sw-field--wide">
                <PhoneInputField
                  label={L('رقم الواتساب', 'WhatsApp number')}
                  name="whatsapp"
                  value={a.whatsapp || ''}
                  onChange={(whatsapp) => { set({ whatsapp }); setAutoPaused(false); }}
                  country={waCountry}
                  onCountryChange={setWaCountry}
                  error={errors.whatsapp}
                  isAr={isAr}
                  required
                />
              </div>
            )}
          </div>

          {autoReady ? (
            <AutoSend
              key={`${a.name}|${a.phone}|${a.whatsapp}|${sameAsPhone}`}
              isAr={isAr}
              onSend={submit}
              onEdit={() => { setAutoPaused(true); nameRef.current?.focus(); }}
            />
          ) : (
            <p className={`sw-auto-hint${contactHint ? ' is-problem' : ''}`} role={contactHint ? 'alert' : undefined}>
              {contactHint ? contactHint : isSubmitting ? L('بنبعت طلبك…', 'Sending your request…') : autoPaused ? L('عدّلت بياناتك؟ هنبعت الطلب أول ما تكتب الاسم والرقم صح.', 'Fix your details and the request goes out automatically.') : L('اكتب اسمك ورقمك وطلبك هيتبعت لوحده، من غير ضغط على زرار.', 'Enter your name and number and the request is sent for you, no button needed.')}
            </p>
          )}
          {errors.submit && (
            <>
              <p className="sw-error" role="alert">{errors.submit}</p>
              <a className="sw-wa" href={getWhatsAppUrl(sellWhatsappMessage({ name: a.name, role: a.sellerRole, typeLabel: PROPERTY_TYPES.find((t) => t.id === type)?.[isAr ? 'ar' : 'en'], areaLabel, size: a.size, address: a.address, askingPrice: a.askingPrice, isAr }))} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={16} aria-hidden="true" />
                {L('ابعت بياناتك على واتساب', 'Send your details on WhatsApp')}
              </a>
            </>
          )}
          {autoPaused && (
            <div className="sw-actions sw-actions--solo">
              <button type="submit" className="sw-btn sw-btn--primary" disabled={isSubmitting} aria-busy={isSubmitting}>
                <Send size={16} aria-hidden="true" />{L('ابعت طلبي', 'Send my request')}
              </button>
            </div>
          )}
          <div className="sw-actions">
            <button type="button" className="sw-btn sw-btn--ghost" onClick={back}><Prev size={16} aria-hidden="true" />{L('رجوع', 'Back')}</button>
            <span />
          </div>
          <ConsentNote isAr={isAr} auto />
        </form>
      )}

      {step < 3 && (
        <>
          {errors.step && <p className="sw-error" role="alert">{errors.step}</p>}
          <div className="sw-actions">
            {step > 0 ? <button type="button" className="sw-btn sw-btn--ghost" onClick={back}><Prev size={16} aria-hidden="true" />{L('رجوع', 'Back')}</button> : <span />}
            <button type="button" className="sw-btn sw-btn--primary" onClick={next}>
              {step === 2 && !Object.keys(a.photoSlots || {}).length ? L('كمّل من غير صور', 'Continue without photos') : L('التالي', 'Next')}
              <Next size={16} aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SellWizard;
