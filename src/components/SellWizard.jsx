import { useState, useMemo, useEffect } from 'react';
import { isAgriculturalType, isIndustrialType, isLandType, formatFeddan } from '../utils/propertyKinds';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Info, MessageCircle, Send } from 'lucide-react';
import PhoneInputField from './PhoneInputField';
import { SUPPORTED_COUNTRIES } from '../utils/phoneCountries';
import { getAreas } from '../utils/areasData';
import { useProperties } from '../context/PropertiesContext';
import { pricedListings, assetClass, median } from '../utils/marketStats';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import SubmissionSuccess from './common/SubmissionSuccess';
import { toLatinDigits } from '../utils/latinDigits';
import { featuresFor, featureLabels, orderedPhotos, sellerAssetClass } from '../utils/sellerListing';
import { PROPERTY_TYPES, CAIRO_AREAS, FALLBACK_M2, FINISHING, LEGAL_DOCS, SPEC_FIELDS, floorLabel } from './sell/sellOptions';
import { readSellLink } from '../utils/sellLink';
import SellPhotoSlots from './sell/SellPhotoSlots';
import './sell/sell-wizard.css';
import AreaOptions from './common/AreaOptions';
import { nameProblem, phoneProblem } from '../utils/contactValidation';

const STEPS = [
  { ar: 'العقار والعنوان', en: 'Property & address' },
  { ar: 'المواصفات والمميزات', en: 'Specs & features' },
  { ar: 'الصور', en: 'Photos' },
  { ar: 'السعر وبياناتك', en: 'Price & contact' }
];

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

export const SellWizard = ({ lang = 'ar', sellerAnswers = {}, setSellerAnswers, submitSellerJourney }) => {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const a = sellerAnswers;
  const type = a.propertyType || 'apartment';
  const set = (patch) => setSellerAnswers((prev) => ({ ...prev, ...patch }));

  const [step, setStep] = useState(0);
  const [phoneCountry, setPhoneCountry] = useState('+20');
  const [waCountry, setWaCountry] = useState('+20');
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const features = Array.isArray(a.features) ? a.features : [];
  const legalDocs = Array.isArray(a.legalDocs) ? a.legalDocs : [];

  // Indicative range from similar live listings in the district (3+), else the district's per-m² average
  const { properties: siteListings = [] } = useProperties();
  const estimate = useMemo(() => {
    const size = num(a.size);
    // No automatic estimate for farmland and industrial units yet: valued by hand
    if (!size || !area || isCairo || isAgriculturalType(type) || isIndustrialType(type)) return null;
    const cls = assetClass({ type }); // shops with shops, offices with offices, homes with homes
    const comps = pricedListings(siteListings)
      .filter((p) => p.areaKey === area && assetClass(p) === cls && Number(p.size) > 0)
      .map((p) => Number(p.price) / Number(p.size));
    let m2;
    let basis;
    if (comps.length >= 3) {
      m2 = median(comps);
      basis = 'comparables';
    } else {
      const base = districts.find((d) => d.id === area)?.avgPricePerMeter || FALLBACK_M2[area] || 21500;
      m2 = cls === 'commercial' ? base * 2.1 : cls === 'administrative' ? base * 1.45 : cls === 'land' ? base * 0.85 : base;
      basis = cls === 'residential' || cls === 'villa' ? 'area' : `benchmark_${cls}`;
    }
    const finish = cls === 'land' ? 1 : (FINISHING.find((f) => f.id === a.finishing)?.multiplier || 1);
    const avg = size * m2 * finish;
    const spread = basis === 'comparables' ? 0.08 : 0.1;
    const round = (v) => Math.round(v / 10000) * 10000;
    return { min: round(avg * (1 - spread)), max: round(avg * (1 + spread)), avg: Math.round(avg), basis, sample: comps.length };
  }, [a.size, a.finishing, type, area, isCairo, districts, siteListings]);

  // Land, farms and industrial land have no finishing
  const noFinishing = isLandType(type) || isAgriculturalType(type);

  const chooseType = (id) => {
    if (id === a.propertyType) return;
    // Features and photo spots differ per kind; keep only what still applies
    const keep = featuresFor(id).map((f) => f.id);
    set({ propertyType: id, features: features.filter((f) => keep.includes(f)), ...(sellerAssetClass(id) !== sellerAssetClass(type) ? { photoSlots: {} } : {}) });
  };

  const toggle = (field, list, id) => set({ [field]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });

  const stepError = [
    !a.propertyType ? L('اختار نوع العقار', 'Choose the property type')
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
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => { setErrors({}); setStep((s) => Math.max(s - 1, 0)); };

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const errs = {};
    const phone = splitPhone(a.phone, phoneCountry);
    const wa = sameAsPhone ? splitPhone(a.phone, phoneCountry) : splitPhone(a.whatsapp, waCountry);
    const fits = (country, local) => SUPPORTED_COUNTRIES.find((c) => c.code === country)?.regex.test(local) ?? true;
    const nameErr = nameProblem(a.name, isAr);
    if (nameErr) errs.name = nameErr;
    if (!phone.local || !fits(phoneCountry, phone.local)) errs.phone = phoneProblem(phone.local, phoneCountry, isAr) || L('رقم الموبايل مش مظبوط', 'Check the phone number');
    if (!sameAsPhone && (!wa.local || !fits(waCountry, wa.local))) errs.whatsapp = phoneProblem(wa.local, waCountry, isAr) || L('رقم الواتساب مش مظبوط', 'Check the WhatsApp number');
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
          title_ar="استلمنا بيانات عقارك"
          title_en="We have your property details"
          steps={[
            { ar: 'مستشار من 1Line هيكلمك خلال يوم عمل.', en: 'A 1Line advisor calls you within one business day.' },
            { ar: 'نحدد معاد معاينة ونصوّر العقار تصوير احترافي.', en: 'We book a visit and shoot professional photos.' },
            { ar: 'نتفق معاك على السعر وخطة التسويق قبل أي إعلان.', en: 'We agree the price and marketing plan before any listing.' }
          ]}
          whatsappText={isAr ? 'أهلاً 1Line، بعت بيانات عقاري وعاوز أتابع' : 'Hello 1Line, I sent my property details'}
          secondaryLink={{ to: '/demands', ar: 'شوف طلبات المشترين الحالية', en: 'See current buyer requests' }}
        />
      </div>
    );
  }

  const Next = isAr ? ArrowLeft : ArrowRight;
  const Prev = isAr ? ArrowRight : ArrowLeft;
  const specFields = SPEC_FIELDS[type] || [];

  return (
    <div className="sw" dir={isAr ? 'rtl' : 'ltr'}>
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
          <h3 className="sw-title">{L('عاوز تبيع إيه؟', 'What are you selling?')}</h3>
          <div className="sw-types" role="radiogroup" aria-label={L('نوع العقار', 'Property type')}>
            {PROPERTY_TYPES.map(({ id, ar, en, icon: Icon }) => (
              <button key={id} type="button" role="radio" aria-checked={a.propertyType === id} className={`sw-type ${a.propertyType === id ? 'is-active' : ''}`} onClick={() => chooseType(id)}>
                <Icon size={22} aria-hidden="true" />
                <span>{isAr ? ar : en}</span>
              </button>
            ))}
          </div>

          <div className="sw-grid">
            <label className="sw-field">
              <span>{L('المنطقة', 'Area')}</span>
              <select value={area} onChange={(e) => set({ area: e.target.value })} aria-invalid={Boolean(errors.step) && !area}>
                <option value="" disabled>{L('اختار المنطقة', 'Choose the area')}</option>
                <AreaOptions areas={districts} isAr={isAr} includeAll={false} />
                <optgroup label={L('القاهرة الكبرى', 'Greater Cairo')}>
                  {CAIRO_AREAS.map((c) => <option key={c.id} value={c.id}>{isAr ? c.ar : c.en}</option>)}
                </optgroup>
              </select>
            </label>
            <label className="sw-field">
              <span>{L('المساحة', 'Size')}</span>
              <div className="sw-suffix">
                <input type="text" inputMode="numeric" placeholder={isAgriculturalType(type) ? '4200' : '150'} value={a.size || ''} onChange={(e) => set({ size: toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 7) })} />
                <span>{L('م²', 'm²')}</span>
              </div>
              {isAgriculturalType(type) && (
                <small className="sw-hint">{num(a.size) > 0 ? `= ${formatFeddan(num(a.size), isAr)}` : L('الفدان = 4200 م² تقريباً، والقيراط = 175 م²', '1 feddan ≈ 4,200 m², 1 qirat ≈ 175 m²')}</small>
              )}
            </label>
            <label className="sw-field sw-field--wide">
              <span>{L('العنوان', 'Address')}</span>
              <input type="text" maxLength={200} placeholder={L('اسم الشارع وأقرب علامة مميزة', 'Street name and nearest landmark')} value={a.address || ''} onChange={(e) => set({ address: e.target.value })} />
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
            {specFields.map((f) => (
              <label key={f.field} className="sw-field">
                <span>{isAr ? f.ar : f.en}</span>
                <select value={a[f.field] || f.def} onChange={(e) => set({ [f.field]: e.target.value })}>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{isAr ? o.ar : o.en}</option>)}
                </select>
              </label>
            ))}
            {!noFinishing && (
              <label className="sw-field">
                <span>{L('التشطيب', 'Finishing')}</span>
                <select value={a.finishing || ''} onChange={(e) => set({ finishing: e.target.value })}>
                  <option value="">{L('اختار', 'Choose')}</option>
                  {FINISHING.map((f) => <option key={f.id} value={f.id}>{isAr ? f.ar : f.en}</option>)}
                </select>
              </label>
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
              <span>{L('اسمك', 'Your name')}</span>
              <input type="text" autoComplete="name" maxLength={100} value={a.name || ''} onChange={(e) => set({ name: e.target.value })} aria-invalid={Boolean(errors.name)} />
              {errors.name && <small className="sw-error" role="alert">{errors.name}</small>}
            </label>
            <div className="sw-field sw-field--wide">
              <PhoneInputField
                label={L('رقم الموبايل', 'Mobile number')}
                value={a.phone || ''}
                onChange={(phone) => set(sameAsPhone ? { phone, whatsapp: phone } : { phone })}
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
                  onChange={(whatsapp) => set({ whatsapp })}
                  country={waCountry}
                  onCountryChange={setWaCountry}
                  error={errors.whatsapp}
                  isAr={isAr}
                  required
                />
              </div>
            )}
          </div>

          <div className="sw-actions">
            <button type="button" className="sw-btn sw-btn--ghost" onClick={back}><Prev size={16} aria-hidden="true" />{L('رجوع', 'Back')}</button>
            <button type="submit" className="sw-btn sw-btn--primary" disabled={isSubmitting} aria-busy={isSubmitting}>
              <Send size={16} aria-hidden="true" />
              {isSubmitting ? L('بنبعت…', 'Sending…') : L('ابعت عقاري', 'Send my property')}
            </button>
          </div>
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
