import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X, Info, MessageSquare, RotateCcw, Home, TrendingUp, Zap, Hourglass, Shuffle, Wallet, CalendarClock } from 'lucide-react';
import Beto from '../components/match/Beto';
import { PRIORITIES, FAMILY_SIZES, rankHomes, answersMessage, isHome } from '../utils/buyerMatch';
import { liveListings } from '../utils/marketStats';
import { getAreas } from '../utils/areasData';
import { mainAreas, inArea, shortAreaName } from '../utils/areaLookup';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import { thumbUrl } from '../utils/imageThumbs';
import { updatePageSeo } from '../utils/seoHelper';
import '../styles/match-page.css';

const EMPTY = { priorities: [], areas: [], minSize: '', purpose: '', family: '', delivery: '', payment: 'installments', budget: '', down: '', monthly: '' };
const STEPS = 5;
const digits = (v) => String(v ?? '').replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/\D/g, '').slice(0, 11);
const money = (v) => (v ? Number(v).toLocaleString('en-US') : '');

// What «بيتو» says on each step: the question first, then a line that helps the buyer answer
const LINES = [
  ['أهلاً، أنا بيتو! إيه أهم حاجة لازم تكون في شقتك؟', 'اختار حاجة أو أكتر، ولو الموقع أو المساحة مهمين قولّي تفاصيلهم.'],
  ['حضرتك بتفكر في الشقة سكن ولا استثمار؟', 'للسكن بندوّر على الأنسب لأسرتك، وللاستثمار على أعلى عائد وارتفاع في السعر.'],
  ['عدد أفراد أسرتك كام؟', 'عشان نعرف تحتاج كام غرفة.'],
  ['مستعجل على الاستلام، ولا ممكن تستنى شوية بسعر وتقسيط أحسن؟', 'المشروع في أوله بيكون أقل سعر وأطول تقسيط، وكل ما بيتحرك السعر بيزيد.'],
  ['آخر سؤال: حابب تدفع إزاي، وفي حدود كام؟', 'كده نقدر نختار لك الأنسب إن شاء الله.']
];

export default function MatchPage({ properties = [], lang = 'ar' }) {
  const isAr = lang === 'ar';
  const [step, setStep] = useState(0); // 0..4 questions, 5 = results
  const [a, setA] = useState(EMPTY);
  const set = (patch) => setA((x) => ({ ...x, ...patch }));
  const toggle = (key, id) => setA((x) => ({ ...x, [key]: x[key].includes(id) ? x[key].filter((v) => v !== id) : [...x[key], id] }));
  const areas = useMemo(() => getAreas(), []);
  const homes = useMemo(() => liveListings(properties).filter(isHome), [properties]);
  // Only areas that have homes listed are offered
  const areaChoices = useMemo(() => mainAreas(areas).filter((m) => homes.some((p) => inArea(p.areaKey, m.id, areas))), [areas, homes]);
  const results = useMemo(() => (step === STEPS ? rankHomes(properties, a, areas, 6) : []), [step, properties, a, areas]);

  useEffect(() => {
    updatePageSeo({
      title: isAr ? 'رشّحلي شقتي: 5 أسئلة ونرشّحلك الأنسب | 1Line' : 'Find my home: 5 questions | 1Line',
      description: isAr ? 'جاوب على 5 أسئلة بسيطة عن احتياجك وميزانيتك، ونوريك الشقق المعروضة في سوهاج ومدى مطابقة كل واحدة لطلبك.' : 'Answer 5 short questions and see how well each listed home in Sohag fits.',
      url: '/match',
      type: 'website'
    });
  }, [isAr]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  const canNext = [
    a.priorities.length > 0,
    Boolean(a.purpose),
    Boolean(a.family),
    Boolean(a.delivery),
    a.payment === 'cash' ? Number(a.budget) > 0 : Number(a.down) > 0 || Number(a.monthly) > 0
  ][step];
  const areaName = (id) => shortAreaName(areas.find((x) => x.id === id), areas, true) || id;
  const [line, hint] = LINES[step] || [];
  const mood = step === STEPS ? 'happy' : step === 3 ? 'think' : 'talk';
  const Next = isAr ? ArrowLeft : ArrowRight;
  const Back = isAr ? ArrowRight : ArrowLeft;

  const option = (key, value, label, sub, Icon) => (
    <button key={value} type="button" role="radio" aria-checked={a[key] === value}
      className={`mt-option${a[key] === value ? ' is-on' : ''}`}
      onClick={() => set({ [key]: value })}>
      {Icon && <span className="mt-option-icon"><Icon size={20} aria-hidden="true" /></span>}
      <span className="mt-option-text"><strong>{label}</strong>{sub && <small>{sub}</small>}</span>
    </button>
  );

  return (
    <div className="mt-page" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mt-wrap">
        <nav className="mt-crumbs" aria-label="مسار الصفحة">
          <Link to="/">الرئيسية</Link><span aria-hidden="true">/</span><span aria-current="page">رشّحلي شقتي</span>
        </nav>

        {step < STEPS ? (
          <section className="mt-card" aria-labelledby="mt-q">
            <header className="mt-guide">
              <Beto mood={mood} size={128} />
              <div className="mt-bubble" key={step}>
                <p id="mt-q" className="mt-question">{line}</p>
                <p className="mt-hint">{hint}</p>
              </div>
            </header>

            <ol className="mt-progress" aria-label={`السؤال ${step + 1} من ${STEPS}`}>
              {Array.from({ length: STEPS }, (_, i) => <li key={i} className={i < step ? 'is-done' : i === step ? 'is-now' : ''} />)}
            </ol>

            <div className="mt-answers">
              {step === 0 && (
                <>
                  <div className="mt-chips" role="group" aria-label="أهم المواصفات">
                    {PRIORITIES.map((p) => (
                      <button key={p.id} type="button" aria-pressed={a.priorities.includes(p.id)}
                        className={`mt-chip${a.priorities.includes(p.id) ? ' is-on' : ''}`} onClick={() => toggle('priorities', p.id)}>
                        {a.priorities.includes(p.id) && <Check size={15} aria-hidden="true" />}{p.ar}
                      </button>
                    ))}
                  </div>
                  {a.priorities.includes('area') && areaChoices.length > 0 && (
                    <fieldset className="mt-sub">
                      <legend>في أنهي منطقة؟</legend>
                      <div className="mt-chips">
                        {areaChoices.map((m) => (
                          <button key={m.id} type="button" aria-pressed={a.areas.includes(m.id)}
                            className={`mt-chip is-small${a.areas.includes(m.id) ? ' is-on' : ''}`} onClick={() => toggle('areas', m.id)}>
                            {shortAreaName(m, areas, true)}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  {a.priorities.includes('size') && (
                    <label className="mt-sub mt-field">
                      <span>أقل مساحة تناسبك</span>
                      <span className="mt-input"><input type="text" inputMode="numeric" dir="ltr" placeholder="120" value={a.minSize}
                        onChange={(e) => set({ minSize: digits(e.target.value).slice(0, 4) })} /><em>م²</em></span>
                    </label>
                  )}
                </>
              )}

              {step === 1 && (
                <div className="mt-options" role="radiogroup" aria-label="الغرض">
                  {option('purpose', 'home', 'سكن', 'الأنسب لظروف أسرتي وفي حدود إمكانياتي', Home)}
                  {option('purpose', 'invest', 'استثمار', 'أعلى عائد: ارتفاع في السعر أو إيجار مستمر', TrendingUp)}
                </div>
              )}

              {step === 2 && (
                <div className="mt-options is-grid" role="radiogroup" aria-label="عدد أفراد الأسرة">
                  {FAMILY_SIZES.map((f) => option('family', f.id, f.ar, `${f.rooms === 1 ? 'غرفة' : f.rooms === 2 ? 'غرفتين' : `${f.rooms} غرف`} أو أكتر`))}
                </div>
              )}

              {step === 3 && (
                <div className="mt-options" role="radiogroup" aria-label="الاستلام">
                  {option('delivery', 'now', 'مستعجل', 'عايز أستلم فوراً', Zap)}
                  {option('delivery', 'wait', 'ممكن أستنى', 'لو ده هيدّيني سعر أقل وتقسيط أطول', Hourglass)}
                  {option('delivery', 'any', 'مش فارقة', 'اعرض عليّ الاتنين', Shuffle)}
                </div>
              )}

              {step === 4 && (
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
            </div>

            <footer className="mt-nav">
              {step > 0 && (
                <button type="button" className="mt-btn is-ghost" onClick={() => setStep(step - 1)}><Back size={17} aria-hidden="true" />رجوع</button>
              )}
              <button type="button" className="mt-btn is-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
                {step === STEPS - 1 ? 'رشّحلي' : 'التالي'}<Next size={17} aria-hidden="true" />
              </button>
            </footer>
          </section>
        ) : (
          <section aria-labelledby="mt-results">
            <header className="mt-card mt-guide is-results">
              <Beto mood="happy" size={120} />
              <div className="mt-bubble">
                <p id="mt-results" className="mt-question">
                  {results.length ? `لقيتلك ${results.length === 1 ? 'وحدة' : results.length === 2 ? 'وحدتين' : `${results.length} وحدات`}، مترتبين من الأنسب لطلبك` : 'لسه مفيش شقق معروضة تناسب طلبك'}
                </p>
                <p className="mt-hint">نسبة المطابقة محسوبة من إجاباتك. ابعتلنا طلبك ونرشّحلك كمان من الوحدات اللي لسه منزلتش.</p>
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

            <div className="mt-card mt-cta">
              <div>
                <h2>عايز ترشيحات أكتر؟</h2>
                <p>ابعت إجاباتك لفريق 1Line على واتساب، ونرشّحلك وحدات مناسبة ونرتّب معاينة.</p>
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
