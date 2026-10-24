import { useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Building2, CalendarClock, Check, FileDown, Layers, MapPin, Maximize2,
  Flame, MessageSquare, Navigation, Phone, Sparkles, Wallet, Home as HomeIcon
} from 'lucide-react';
import { MEGA_PROJECTS } from '../data/projectsData';
import PropertyGallery from '../components/properties/PropertyGallery';
import PropertyCard from '../components/properties/PropertyCard';
import { ProgressRing } from '../components/projects/ProjectCard';
import NotFoundPage from './NotFoundPage';
import { formatCurrencyPrice } from '../utils/currencyAndBenchmark';
import { getWhatsAppUrl, getPhoneCallUrl } from '../utils/founderCmsData';
import { updatePageSeo, buildBreadcrumbSchema } from '../utils/seoHelper';
import useClientDownload from '../hooks/useClientDownload';
import { arYears, pct, planExample, projectStages, projectUnits, projectOffer } from '../utils/projectFacts';
import OfferCountdown from '../components/properties/OfferCountdown';
import '../styles/property-detail-polish.css';
import '../styles/projects-modern.css';
import '../styles/project-detail.css';

// Brochure links are typed in the CRM: only web links are opened
const safeUrl = (url) => (/^https?:\/\/\S+$/i.test(String(url || '').trim()) ? String(url).trim() : null);

/**
 * One project (/projects/:id): photos, the plan, how far construction has got, the units listed
 * in it, and the two ways to ask. Sample projects say so at the top and ask about similar ones.
 */
export default function ProjectDetailPage({ projects = [], properties = [], lang = 'ar', currency = 'EGP', favorites = [], onToggleFavorite, onQuickView }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const download = useClientDownload();
  const isAr = lang === 'ar';
  const all = projects && projects.length > 0 ? projects : MEGA_PROJECTS;
  const project = all.find((p) => String(p.id) === String(id));
  const units = useMemo(() => projectUnits(project, properties), [project, properties]);

  const title = project ? (isAr ? project.title_ar : project.title_en || project.title_ar) : '';
  const description = project ? (isAr ? project.description_ar : project.description_en || project.description_ar) : '';

  useEffect(() => {
    if (!project) return;
    updatePageSeo({
      title: isAr ? `${title} — المقدم ونظام السداد ونسبة التنفيذ` : `${title} — payment plan and progress`,
      description: description || (isAr ? `تفاصيل مشروع ${title} في سوهاج.` : `Details of ${title} in Sohag.`),
      url: `/projects/${encodeURIComponent(project.id)}`,
      image: Array.isArray(project.images) ? project.images.find(Boolean) : undefined,
      type: 'website',
      noindex: Boolean(project.isDemo),
      schemaId: 'breadcrumb-schema',
      schema: buildBreadcrumbSchema([
        { name: isAr ? 'الرئيسية' : 'Home', url: '/' },
        { name: isAr ? 'المشروعات' : 'Projects', url: '/projects' },
        { name: title, url: `/projects/${encodeURIComponent(project.id)}` }
      ])
    });
  }, [project, isAr, title, description]);

  if (!project) return <NotFoundPage lang={lang} />;

  const location = isAr ? project.location_ar : project.location_en || project.location_ar;
  const dev = isAr ? project.developer_ar : project.developer_en || project.developer_ar;
  const type = isAr ? project.type_ar : project.type_en || project.type_ar;
  const delivery = isAr ? project.deliveryDate_ar : project.deliveryDate_en || project.deliveryDate_ar;
  const features = ((isAr ? project.features_ar : project.features_en) || []).filter(Boolean);
  const progress = pct(project.progress);
  const stages = projectStages(project, isAr);
  const plan = planExample(project);
  const years = Number(project.installmentYears) || 0;
  const downPct = Number(project.downPaymentPercent) || 0;
  const price = formatCurrencyPrice(project.startPrice, currency, lang);
  const offer = projectOffer(project);
  const offerPrice = offer ? formatCurrencyPrice(offer.price, currency, lang) : null;
  const offerEndDay = offer ? new Date(offer.endsAt).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  const offerTerms = offer ? (isAr ? offer.terms_ar : (offer.terms_en || offer.terms_ar)) : '';
  const money = (n) => { const d = formatCurrencyPrice(n, currency, lang); return `${d.primary} ${d.symbol}`; };
  const brochureUrl = safeUrl(project.brochureUrl);
  const available = Number(project.availableUnits) || 0;
  const total = Number(project.totalUnits) || 0;
  const mapsUrl = location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location} سوهاج`)}` : null;
  const Back = isAr ? ArrowRight : ArrowLeft;
  const categoryLabel = project.category === 'commercial' ? (isAr ? 'تجاري' : 'Commercial') : (isAr ? 'سكني' : 'Residential');

  const waText = project.isDemo
    ? (isAr ? `مرحباً 1Line، أبحث عن ${type || 'مشروع'} في سوهاج زي «${title}». ما المشروعات المتاحة حالياً؟` : `Hello 1Line, I'm looking for a project like "${title}" in Sohag. What is available now?`)
    : offer
      ? (isAr ? `مرحباً 1Line، أريد الحجز بسعر عرض الكاش (−${offer.pct}%) في مشروع: ${title}` : `Hello 1Line, I'd like to book at the cash-offer price (−${offer.pct}%) in: ${title}`)
      : (isAr ? `مرحباً 1Line، أريد معرفة الوحدات المتاحة وحجز معاينة في مشروع: ${title}` : `Hello 1Line, I'd like unit availability and a site visit for: ${title}`);

  const facts = [
    downPct > 0 && { key: 'down', Icon: Wallet, label: isAr ? 'المقدم' : 'Down payment', value: `${pct(downPct)}%` },
    years > 0 && { key: 'plan', Icon: Layers, label: isAr ? 'التقسيط' : 'Plan', value: isAr ? arYears(years) : `${years} yrs` },
    delivery && { key: 'delivery', Icon: CalendarClock, label: isAr ? 'التسليم' : 'Delivery', value: delivery },
    project.area_sqm && { key: 'area', Icon: Maximize2, label: isAr ? 'مساحة المشروع' : 'Project area', value: String(project.area_sqm) },
    total > 0 && { key: 'units', Icon: HomeIcon, label: isAr ? 'عدد الوحدات' : 'Units', value: total.toLocaleString('en-US') }
  ].filter(Boolean);

  return (
    <div className={`pj-page pjd-page ${isAr ? 'rtl-dir' : 'ltr-dir'}`} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="pj-wrap">
        <div className="pjd-top">
          <nav className="pjd-crumbs" aria-label={isAr ? 'مسار الصفحة' : 'Breadcrumb'}>
            <Link to="/">{isAr ? 'الرئيسية' : 'Home'}</Link>
            <span aria-hidden="true">/</span>
            <Link to="/projects">{isAr ? 'المشروعات' : 'Projects'}</Link>
            <span aria-hidden="true">/</span>
            <span className="pjd-crumb-current" title={title}>{title}</span>
          </nav>
          <button type="button" className="pjd-back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/projects'))}>
            <Back size={16} aria-hidden="true" />
            <span>{isAr ? 'رجوع' : 'Back'}</span>
          </button>
        </div>

        {project.isDemo && (
          <div className="pd-demo-banner pjd-demo" role="note">
            <Sparkles size={16} aria-hidden="true" />
            <span>{isAr ? 'ده مشروع توضيحي بيعرض شكل الصفحة، ومش معروض للبيع. اسألنا عن المشروعات المتاحة فعلاً.' : 'A sample project showing the page layout; it is not for sale. Ask us about real projects.'}</span>
          </div>
        )}

        {Array.isArray(project.images) && project.images.some(Boolean) ? (
          <PropertyGallery images={project.images.filter(Boolean)} title={title} lang={lang} />
        ) : (
          <div className="pjd-noimg" aria-hidden="true"><Building2 size={72} strokeWidth={1} /></div>
        )}

        <div className="pjd-grid">
          <main className="pjd-main">
            <header className="pjd-head">
              <div className="pjd-chips">
                <span className="pjd-chip">{categoryLabel}</span>
                {type && <span className="pjd-chip is-gold">{type}</span>}
                {project.isDemo && <span className="pjd-chip is-sample">{isAr ? 'مثال توضيحي' : 'Sample'}</span>}
              </div>
              <h1 className="pjd-title">{title}</h1>
              <div className="pjd-meta">
                {location && <span><MapPin size={16} aria-hidden="true" />{location}</span>}
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noreferrer" className="pjd-maps">
                    <Navigation size={13} aria-hidden="true" />{isAr ? 'على الخريطة' : 'Map'}
                  </a>
                )}
              </div>
              {dev && (
                <p className="pjd-dev">
                  <Building2 size={15} aria-hidden="true" /><span>{isAr ? 'المطوّر: ' : 'Developer: '}{dev}</span>
                  {project.brandTag && <span className="pj-brand" dir="ltr">{project.brandTag}</span>}
                </p>
              )}
              {facts.length > 0 && (
                <ul className="pd-keyfacts">
                  {facts.map(({ key, Icon, label, value }) => (
                    <li key={key}><Icon size={18} aria-hidden="true" /><span><strong>{value}</strong><small>{label}</small></span></li>
                  ))}
                </ul>
              )}
            </header>

            {description && (
              <section className="pjd-card">
                <h2>{isAr ? 'عن المشروع' : 'About the project'}</h2>
                <p className="pjd-desc">{description}</p>
              </section>
            )}

            {plan && (
              <section className="pjd-card">
                <h2>{isAr ? 'نظام السداد' : 'Payment plan'}</h2>
                <div className="pjd-plan">
                  <div><small>{isAr ? 'سعر الوحدة يبدأ من' : 'Units from'}</small><strong>{money(plan.price)}</strong></div>
                  <div><small>{isAr ? `المقدم ${pct(downPct)}%` : `${pct(downPct)}% down`}</small><strong>{money(plan.down)}</strong></div>
                  <div className="is-key"><small>{isAr ? 'القسط الشهري' : 'Monthly'}</small><strong>{money(plan.monthly)}</strong></div>
                  <div><small>{isAr ? 'المدة' : 'Term'}</small><strong>{isAr ? `${plan.months} شهر (${arYears(years)})` : `${plan.months} months`}</strong></div>
                </div>
                <p className="pjd-note">{isAr ? 'مثال محسوب على أقل سعر في المشروع. السعر والقسط الفعلي حسب الوحدة والدور، ونأكدهولك كتابياً قبل الحجز.' : 'Worked out on the lowest price. The actual figures depend on the unit; we confirm them in writing before booking.'}</p>
              </section>
            )}

            {(stages.length > 0 || progress > 0) && (
              <section className="pjd-card">
                <h2>{isAr ? 'نسبة التنفيذ' : 'Construction progress'}</h2>
                <div className="pjd-progress">
                  <ProgressRing value={progress} label={isAr ? `نسبة الإنجاز ${progress}%` : `${progress}% built`} />
                  <div className="pj-stages pjd-stages">
                    {stages.map((s) => (
                      <div key={s.key} className="pj-stage">
                        <span className="pj-stage-head"><span>{s.label}</span><b>{s.value}%</b></span>
                        <span className="pj-stage-bar"><span style={{ width: `${s.value}%` }} /></span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {features.length > 0 && (
              <section className="pjd-card">
                <h2>{isAr ? 'مميزات المشروع' : 'Amenities'}</h2>
                <ul className="pjd-feats">
                  {features.map((f) => <li key={f}><Check size={16} aria-hidden="true" />{f}</li>)}
                </ul>
              </section>
            )}

            <section className="pjd-card">
              <h2>{isAr ? 'الوحدات المتاحة' : 'Available units'}</h2>
              {units.length > 0 ? (
                <div className="properties-grid-3 pjd-units">
                  {units.map((u) => (
                    <PropertyCard key={u.id} property={u} lang={lang} currency={currency} isFavorite={favorites.includes(u.id)} onToggleFavorite={onToggleFavorite} onQuickView={onQuickView} />
                  ))}
                </div>
              ) : (
                <div className="pjd-units-empty">
                  <p>
                    {project.isDemo
                      ? (isAr ? 'المشروع توضيحي. ابعتلنا ميزانيتك ونوع الوحدة ونرشّحلك وحدات في مشروعات حقيقية.' : 'A sample project. Send us your budget and unit type and we suggest units in real projects.')
                      : available > 0
                        ? (isAr ? `فيه ${available} وحدة متاحة دلوقتي. ابعتلنا المساحة والدور اللي محتاجهم ونبعتلك الاختيارات والأسعار.` : `${available} units are available. Tell us the size and floor you want and we send options and prices.`)
                        : (isAr ? 'ابعتلنا المساحة والميزانية ونبعتلك الوحدات المتاحة والأسعار.' : 'Tell us the size and budget and we send the available units and prices.')}
                  </p>
                  <a href={getWhatsAppUrl(waText)} target="_blank" rel="noopener noreferrer" className="pd-cta-wa">
                    <MessageSquare size={16} aria-hidden="true" /><span>{isAr ? 'اطلب الوحدات المتاحة' : 'Ask for available units'}</span>
                  </a>
                </div>
              )}
            </section>
          </main>

          <aside className="pjd-side">
            <div className="pjd-price">
              <small>{isAr ? 'سعر الوحدة يبدأ من' : 'Units from'}</small>
              <strong>{price.primary} <span>{price.symbol}</span></strong>
              {price.isConverted && <small>≈ {price.originalEgp}</small>}
              {(downPct > 0 || years > 0) && (
                <p className="pjd-price-plan">
                  {[downPct > 0 && (isAr ? `مقدم ${pct(downPct)}%` : `${pct(downPct)}% down`), years > 0 && (isAr ? `تقسيط ${arYears(years)}` : `${years}-year plan`)].filter(Boolean).join(isAr ? ' · ' : ' · ')}
                </p>
              )}
              {!project.isDemo && available > 0 && <span className="pjd-avail">{isAr ? `${available} وحدة متاحة` : `${available} units left`}</span>}
              {/* A running cash offer sits with the price */}
              {offer && (
                <div className="pd-offer-box pjd-offer" role="note">
                  <div className="pd-offer-head">
                    <Flame size={16} aria-hidden="true" />
                    <strong>{isAr ? 'عرض كاش لفترة محدودة' : 'Limited-time cash offer'}</strong>
                    <bdi dir="ltr" className="pd-offer-pct">−{offer.pct}%</bdi>
                  </div>
                  <div className="pd-offer-price">
                    <bdi>{offerPrice.primary}</bdi> <span>{offerPrice.symbol}</span>
                    <small>{isAr ? 'للدفع كاش' : 'paid in cash'}</small>
                  </div>
                  <p className="pd-offer-was">
                    {isAr ? 'بدلاً من ' : 'Instead of '}<del><bdi>{offer.basePrice.toLocaleString('en-US')}</bdi></del>{isAr ? ' ج.م' : ' EGP'}
                    {' · '}<span className="pd-offer-save">{isAr ? `وفّر ${offer.savings.toLocaleString('en-US')} ج.م` : `Save ${offer.savings.toLocaleString('en-US')} EGP`}</span>
                  </p>
                  <div className="pd-offer-meta">
                    <OfferCountdown endsAt={offer.endsAt} isAr={isAr} className="pd-offer-timer" />
                    <span>{isAr ? `آخر يوم: ${offerEndDay}` : `Last day: ${offerEndDay}`}</span>
                    {offer.extended && <span className="pd-offer-extended">{isAr ? 'تم تمديد العرض' : 'Offer extended'}</span>}
                  </div>
                  {offerTerms && <p className="pd-offer-terms"><strong>{isAr ? 'الشروط: ' : 'Terms: '}</strong>{offerTerms}</p>}
                </div>
              )}
              <div className="pd-price-ctas">
                <a href={getWhatsAppUrl(waText)} target="_blank" rel="noopener noreferrer" className="pd-cta-wa">
                  <MessageSquare size={16} aria-hidden="true" />
                  <span>{project.isDemo ? (isAr ? 'مشروعات مشابهة' : 'Similar projects') : (isAr ? 'احجز معاينة' : 'Book a visit')}</span>
                </a>
                <a href={getPhoneCallUrl()} className="pd-cta-visit">
                  <Phone size={16} aria-hidden="true" /><span>{isAr ? 'اتصل بنا' : 'Call us'}</span>
                </a>
              </div>
              {brochureUrl && (
                <button
                  type="button"
                  className="pjd-brochure"
                  onClick={() => download(
                    { kind: 'project_brochure', itemId: String(project.id || ''), itemTitle: project.title_ar || project.title_en || '' },
                    () => { window.open(brochureUrl, '_blank', 'noopener'); }
                  )}
                >
                  <FileDown size={16} aria-hidden="true" /><span>{isAr ? 'تحميل كتالوج المشروع' : 'Download brochure'}</span>
                </button>
              )}
              <p className="pjd-trust">{isAr ? 'معاينة الموقع مجانية، وبنراجع عقد المطوّر قبل ما تدفع.' : 'Site visits are free; we review the developer contract before you pay.'}</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
