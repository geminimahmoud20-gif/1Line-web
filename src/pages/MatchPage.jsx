import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X, Info, MessageSquare, RotateCcw, Home, TrendingUp, Zap, Hourglass, Shuffle, Wallet, CalendarClock, Building2, Building, Store, Briefcase, LandPlot, Sprout, Factory, Wrench, MapPin } from 'lucide-react';
import Advisor from '../components/match/Advisor';
import MatchLeadForm from '../components/match/MatchLeadForm';
import { KINDS, kindOf, isKind, purposesFor, prioritiesFor, FAMILY_SIZES, rankUnits, answersMessage } from '../utils/buyerMatch';
import { liveListings } from '../utils/marketStats';
import { getAreas } from '../utils/areasData';
import { mainAreas, inArea, shortAreaName } from '../utils/areaLookup';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import { thumbUrl } from '../utils/imageThumbs';
import { updatePageSeo } from '../utils/seoHelper';
import '../styles/match-page.css';

const EMPTY = { kind: '', purpose: '', areas: [], anyArea: false, family: '', minSize: '', delivery: '', payment: 'installments', budget: '', down: '', monthly: '', priorities: [] };
const digits = (v) => String(v ?? '').replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/\D/g, '').slice(0, 11);
const money = (v) => (v ? Number(v).toLocaleString('en-US') : '');
const KIND_ICONS = { residential: Building2, villa: Home, commercial: Store, administrative: Briefcase, building: Building, land: LandPlot, agricultural: Sprout, industrial: Factory };
const roomsText = (n) => (n === 1 ? 'غرفة' : n === 2 ? 'غرفتين' : `${n} غرف`);

/**
 * The questions, in order, for the kind of property chosen: what the advisor asks, and one short
 * line under it saying what the answer changes in the recommendation.
 */
function stepsFor(a) {
  const kind = a.kind ? kindOf(a.kind) : null;
  const steps = [
    { id: 'kind', q: 'أهلاً بيك! أنا مستشارك في 1Line. بتدوّر على أنهي نوع عقار؟',
      hint: 'كل نوع ليه أسعاره، فهنقارنك بنفس النوع بس عشان النسبة تطلع دقيقة.' },
    { id: 'purpose', q: kind?.home ? 'بتشتري للسكن ولا للاستثمار؟' : 'هتستخدمه بنفسك ولا للاستثمار؟',
      hint: kind?.home
        ? 'للسكن هنفضّل الجاهز المريح لأسرتك، وللاستثمار اللي سعره هيزيد أو بيجيب إيجار.'
        : 'لو هتشغّله هنفضّل الجاهز تبدأ فيه على طول، ولو استثمار هنفضّل المؤجّر أو اللي بالتقسيط.' },
    { id: 'area', q: 'في أنهي منطقة؟',
      hint: 'الموقع أكتر حاجة بتفرق في السعر. اختار منطقة أو أكتر، أو «أي منطقة».' },
    kind?.home
      ? { id: 'space', q: 'عدد أفراد أسرتك كام؟',
        hint: 'عشان نرشّحلك عدد أوض مناسب: مايضيقش عليكم، ومتدفعش في مساحة زيادة.' }
      : { id: 'space', q: 'محتاج مساحة قد إيه تقريباً؟',
        hint: 'المساحة بتحدد السعر وإذا كان المكان هيكفيك. سيبها فاضية لو مش متأكد.' }
  ];
  if (!kind || kind.handover) {
    steps.push({ id: 'delivery', q: 'مستعجل على الاستلام، ولا ممكن تستنى؟',
      hint: 'تحت الإنشاء أرخص وتقسيطه أطول، والجاهز بتستلمه وتستخدمه على طول.' });
  }
  steps.push(
    { id: 'payment', q: 'حابب تدفع إزاي، وفي حدود كام؟',
      hint: 'عشان منوريكش حاجة فوق ميزانيتك. رقم تقريبي كفاية، ومش بيتبعت لحد.' },
    { id: 'priorities', q: 'آخر سؤال: إيه الحاجة اللي متقدرش تتنازل عنها؟',
      hint: 'العقارات اللي فيها الحاجة دي هتطلعلك الأول. ولو كله مهم، دوس «رشّحلي» على طول.' }
  );
  return steps;
}

export default function MatchPage({ properties = [], lang = 'ar' }) {
  const isAr = lang === 'ar';
  const [step, setStep] = useState(0);
  const [a, setA] = useState(EMPTY);
  const set = (patch) => setA((x) => ({ ...x, ...patch }));
  const toggle = (key, id) => setA((x) => ({ ...x, [key]: x[key].includes(id) ? x[key].filter((v) => v !== id) : [...x[key], id] }));
  const areas = useMemo(() => getAreas(), []);
  const steps = useMemo(() => stepsFor(a), [a]);
  const STEPS = steps.length;
  const cur = steps[step];
  const live = useMemo(() => liveListings(properties), [properties]);
  // How many listings each kind has, and only areas that have the chosen kind listed
  const kindCount = useMemo(() => Object.fromEntries(KINDS.map((k) => [k.id, live.filter((p) => isKind(p, k.id)).length])), [live]);
  const areaChoices = useMemo(() => {
    const list = live.filter((p) => isKind(p, a.kind));
    return mainAreas(areas).filter((m) => list.some((p) => inArea(p.areaKey, m.id, areas)));
  }, [areas, live, a.kind]);
  const results = useMemo(() => (step === STEPS ? rankUnits(properties, a, areas, 6) : []), [step, STEPS, properties, a, areas]);
  const kind = a.kind ? kindOf(a.kind) : null;

  useEffect(() => {
    updatePageSeo({
      title: isAr ? 'رشّحلي عقاري: أسئلة قليلة ونرشّحلك الأنسب | 1Line' : 'Find my property | 1Line',
      description: isAr ? 'شقة، فيلا، محل، مكتب أو أرض: جاوب على أسئلة قليلة عن احتياجك وميزانيتك، ونوريك العقارات المعروضة في سوهاج ومدى مطابقة كل واحد لطلبك.' : 'Answer a few questions and see how well each listed property in Sohag fits.',
      url: '/match',
      type: 'website'
    });
  }, [isAr]);

  // Each new question starts at the top; the first one opens there already (no scroll animation on arrival)
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const ready = {
    kind: Boolean(a.kind),
    purpose: Boolean(a.purpose),
    area: a.anyArea || a.areas.length > 0 || areaChoices.length === 0,
    space: kind?.home ? Boolean(a.family) : true,
    delivery: Boolean(a.delivery),
    payment: a.payment === 'cash' ? Number(a.budget) > 0 : Number(a.down) > 0 || Number(a.monthly) > 0,
    priorities: true
  };
  const canNext = cur ? ready[cur.id] : false;
  const areaName = (id) => shortAreaName(areas.find((x) => x.id === id), areas, true) || id;
  const mood = step === STEPS ? 'happy' : cur?.id === 'delivery' || cur?.id === 'payment' ? 'think' : 'talk';
  const Next = isAr ? ArrowLeft : ArrowRight;
  const Back = isAr ? ArrowRight : ArrowLeft;
  // Picking another kind clears the answers that depend on it
  const pickKind = (id) => setA((x) => (x.kind === id ? x : { ...EMPTY, payment: x.payment, budget: x.budget, down: x.down, monthly: x.monthly, kind: id }));
  const noun = kind?.home ? 'وحدة' : 'عقار';
  const countText = (n) => (n === 1 ? noun : n === 2 ? (kind?.home ? 'وحدتين' : 'عقارين') : `${n} ${kind?.home ? 'وحدات' : 'عقارات'}`);

  const option = (key, value, label, sub, Icon, extra) => (
    <button key={value} type="button" role="radio" aria-checked={a[key] === value}
      className={`mt-option${a[key] === value ? ' is-on' : ''}`}
      onClick={() => (key === 'kind' ? pickKind(value) : set({ [key]: value }))}>
      {Icon && <span className="mt-option-icon"><Icon size={20} aria-hidden="true" /></span>}
      <span className="mt-option-text"><strong>{label}</strong>{sub && <small>{sub}</small>}</span>
      {extra}
    </button>
  );
  const sizeField = (label) => (
    <label className="mt-sub mt-field">
      <span>{label}</span>
      <span className="mt-input"><input type="text" inputMode="numeric" dir="ltr" placeholder={kind?.home ? '120' : '100'} value={a.minSize}
        onChange={(e) => set({ minSize: digits(e.target.value).slice(0, 6) })} /><em>م²</em></span>
    </label>
  );

  return (
    <div className="mt-page" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mt-wrap">
        <nav className="mt-crumbs" aria-label="مسار الصفحة">
          <Link to="/">الرئيسية</Link><span aria-hidden="true">/</span><span aria-current="page">رشّحلي عقاري</span>
        </nav>

        {step < STEPS ? (
          <section className="mt-card" aria-labelledby="mt-q">
            <header className="mt-guide">
              <Advisor mood={mood} size={128} />
              <div className="mt-bubble" key={cur.id}>
                <p className="mt-count">سؤال {step + 1} من {STEPS}</p>
                <p id="mt-q" className="mt-question">{cur.q}</p>
                <p className="mt-hint">{cur.hint}</p>
              </div>
            </header>

            <ol className="mt-progress" aria-label={`السؤال ${step + 1} من ${STEPS}`}>
              {steps.map((x, i) => <li key={x.id} className={i < step ? 'is-done' : i === step ? 'is-now' : ''} />)}
            </ol>


            <div className="mt-answers">
              {cur.id === 'kind' && (
                <div className="mt-options is-grid is-kinds" role="radiogroup" aria-label="نوع العقار">
                  {KINDS.map((k) => option('kind', k.id, k.ar, k.sub, KIND_ICONS[k.id],
                    kindCount[k.id] > 0 ? <span className="mt-option-count">{kindCount[k.id]} معروض</span> : null))}
                </div>
              )}

              {cur.id === 'purpose' && (
                <div className="mt-options" role="radiogroup" aria-label="الغرض">
                  {purposesFor(a.kind).map((x, i) => option('purpose', x.id, x.ar, x.sub, i === 0 ? (kind?.home ? Home : Wrench) : TrendingUp))}
                </div>
              )}

              {cur.id === 'area' && (
                areaChoices.length ? (
                  <div className="mt-chips" role="group" aria-label="المنطقة">
                    <button type="button" aria-pressed={a.anyArea}
                      className={`mt-chip${a.anyArea ? ' is-on' : ''}`} onClick={() => set({ anyArea: !a.anyArea, areas: [] })}>
                      {a.anyArea && <Check size={15} aria-hidden="true" />}أي منطقة
                    </button>
                    {areaChoices.map((m) => (
                      <button key={m.id} type="button" aria-pressed={a.areas.includes(m.id)}
                        className={`mt-chip${a.areas.includes(m.id) ? ' is-on' : ''}`}
                        onClick={() => { toggle('areas', m.id); set({ anyArea: false }); }}>
                        {a.areas.includes(m.id) ? <Check size={15} aria-hidden="true" /> : <MapPin size={15} aria-hidden="true" />}{shortAreaName(m, areas, true)}
                      </button>
                    ))}
                  </div>
                ) : <p className="mt-empty-note">لسه مفيش {kind?.ar || 'عقارات'} معروضة في مناطق محددة، كمّل وهنرشّحلك من كل المعروض ونسجّل طلبك.</p>
              )}

              {cur.id === 'space' && (kind?.home ? (
                <>
                  <div className="mt-options is-grid" role="radiogroup" aria-label="عدد أفراد الأسرة">
                    {FAMILY_SIZES.map((f) => option('family', f.id, f.ar, `${roomsText(f.rooms)} أو أكتر`))}
                  </div>
                  {sizeField('أقل مساحة تناسبك (اختياري)')}
                </>
              ) : sizeField('أقل مساحة تنفعك (اختياري)'))}

              {cur.id === 'delivery' && (
                <div className="mt-options" role="radiogroup" aria-label="الاستلام">
                  {option('delivery', 'now', 'مستعجل', 'عايز أستلم وأستخدم فوراً', Zap)}
                  {option('delivery', 'wait', 'ممكن أستنى', 'لو ده هيدّيني سعر أقل وتقسيط أطول', Hourglass)}
                  {option('delivery', 'any', 'مش فارقة', 'اعرض عليّ الاتنين', Shuffle)}
                </div>
              )}

              {cur.id === 'payment' && (
                <>
                  <div className="mt-options is-grid" role="radiogroup" aria-label="طريقة الدفع">
                    {option('payment', 'installments', 'تقسيط', 'مقدم وقسط شهري', CalendarClock)}
                    {option('payment', 'cash', 'كاش', 'المبلغ كله مرة واحدة', Wallet)}
                  </div>
                  {a.payment === 'cash' ? (
                    <label className="mt-sub mt-field">
                      <span>الميزانية</span>
                      <span className="mt-input"><input type="text" inputMode="numeric" dir="ltr" placeholder="2,000,000" value={money(a.budget)}
                        onChange={(e) => set({ budget: digits(e.target.value) })} /><em>ج.م</em></span>
                    </label>
                  ) : (
                    <div className="mt-sub mt-two">
                      <label className="mt-field">
                        <span>المقدم اللي معاك</span>
                        <span className="mt-input"><input type="text" inputMode="numeric" dir="ltr" placeholder="300,000" value={money(a.down)}
                          onChange={(e) => set({ down: digits(e.target.value) })} /><em>ج.م</em></span>
                      </label>
                      <label className="mt-field">
                        <span>القسط الشهري المناسب</span>
                        <span className="mt-input"><input type="text" inputMode="numeric" dir="ltr" placeholder="15,000" value={money(a.monthly)}
                          onChange={(e) => set({ monthly: digits(e.target.value) })} /><em>ج.م</em></span>
                      </label>
                    </div>
                  )}
                </>
              )}

              {cur.id === 'priorities' && (
                <div className="mt-chips" role="group" aria-label="أهم حاجة">
                  {prioritiesFor(a.kind).map((p) => (
                    <button key={p.id} type="button" aria-pressed={a.priorities.includes(p.id)}
                      className={`mt-chip${a.priorities.includes(p.id) ? ' is-on' : ''}`} onClick={() => toggle('priorities', p.id)}>
                      {a.priorities.includes(p.id) && <Check size={15} aria-hidden="true" />}{p.ar}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <footer className="mt-nav">
              {step > 0 && (
                <button type="button" className="mt-btn is-ghost" onClick={() => setStep(step - 1)}><Back size={17} aria-hidden="true" />رجوع</button>
              )}
              <button type="button" className="mt-btn is-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
                {step === STEPS - 1 ? 'رشّحلي' : 'التالي'}<Next size={17} aria-hidden="true" />
              </button>
            </footer>
            <p className="mt-trust"><Info size={14} aria-hidden="true" />الترشيح من العقارات المعروضة فعلاً على 1Line، ومش محتاج رقم تليفون.</p>
          </section>
        ) : (
          <section aria-labelledby="mt-results">
            <header className="mt-card mt-guide is-results">
              <Advisor mood="happy" size={120} />
              <div className="mt-bubble">
                <p id="mt-results" className="mt-question">
                  {results.length ? `لقيتلك ${countText(results.length)}، مترتبين من الأنسب لطلبك` : `لسه مفيش ${kind?.ar || 'عقارات'} معروضة تناسب طلبك`}
                </p>
                <p className="mt-hint">نسبة المطابقة محسوبة من إجاباتك. ابعتلنا طلبك ونرشّحلك كمان من العقارات اللي لسه منزلتش على الموقع.</p>
              </div>
            </header>

            <ul className="mt-results">
              {results.map(({ property: p, score, matches, misses, notes }) => {
                const img = Array.isArray(p.images) ? p.images.find(Boolean) : '';
                const tone = score >= 80 ? 'is-high' : score >= 55 ? 'is-mid' : 'is-low';
                return (
                  <li key={p.id} className="mt-result">
                    <Link to={`/properties/${p.id}`} className="mt-result-media">
                      {img ? <img src={thumbUrl(img)} alt="" loading="lazy" decoding="async" /> : <span className="mt-noimg" />}
                      <span className={`mt-score ${tone}`} style={{ '--pct': score }}>
                        <b>{score}%</b><small>مطابقة</small>
                      </span>
                    </Link>
                    <div className="mt-result-body">
                      <Link to={`/properties/${p.id}`} className="mt-result-title">{p.title_ar}</Link>
                      <p className="mt-result-meta">
                        {[areaName(p.areaKey), Number(p.size) ? `${p.size} م²` : '', Number(p.price) ? `${Number(p.price).toLocaleString('en-US')} ج.م` : ''].filter(Boolean).join(' · ')}
                      </p>
                      <ul className="mt-reasons">
                        {matches.map((t) => <li key={t} className="is-ok"><Check size={15} aria-hidden="true" />{t}</li>)}
                        {misses.map((t) => <li key={t} className="is-miss"><X size={15} aria-hidden="true" />{t}</li>)}
                        {notes.map((t) => <li key={t} className="is-note"><Info size={15} aria-hidden="true" />{t}</li>)}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ul>

            <MatchLeadForm answers={a} message={answersMessage(a, areaName)} areaName={areaName} />

            <div className="mt-card mt-cta">
              <div>
                <h2>عايز ترشيحات أكتر؟</h2>
                <p>ابعت إجاباتك لفريق 1Line على واتساب، ونرشّحلك عقارات مناسبة ونرتّب معاينة.</p>
              </div>
              <div className="mt-cta-actions">
                <a className="mt-btn is-wa" href={getWhatsAppUrl(answersMessage(a, areaName))} target="_blank" rel="noopener noreferrer">
                  <MessageSquare size={17} aria-hidden="true" />ابعت طلبي على واتساب
                </a>
                <button type="button" className="mt-btn is-ghost" onClick={() => { setA(EMPTY); setStep(0); }}>
                  <RotateCcw size={16} aria-hidden="true" />ابدأ من جديد
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
