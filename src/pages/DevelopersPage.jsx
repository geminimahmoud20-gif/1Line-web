import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Building2, CalendarClock, CheckCircle2, ExternalLink, Layers, MapPin, MessageSquare } from 'lucide-react';
import ProjectCard from '../components/projects/ProjectCard';
import NotFoundPage from './NotFoundPage';
import { useDevelopersState, findDeveloper, projectsOf, developerPath } from '../utils/developers';
import { projectPriceStats } from '../utils/projectStats';
import { getAreas } from '../utils/areasData';
import { areaPathName, mainAreaOf, shortAreaName } from '../utils/areaLookup';
import { openWhatsAppSafely } from '../utils/founderCmsData';
import { updatePageSeo, buildBreadcrumbSchema } from '../utils/seoHelper';
import '../styles/projects-modern.css';
import '../styles/developers-public.css';

const n = (v) => Math.round(Number(v) || 0).toLocaleString('en-US');

/** Price per m² across a developer's projects: the average of the projects that have one */
function developerFigures(projects, properties) {
  const stats = projects.map((p) => projectPriceStats(p, properties));
  const priced = stats.filter((s) => s.avgPricePerMeter > 0);
  return {
    avgPpm: priced.length ? Math.round(priced.reduce((t, s) => t + s.avgPricePerMeter, 0) / priced.length / 50) * 50 : 0,
    units: stats.reduce((t, s) => t + s.units, 0)
  };
}

function Logo({ developer, size = 'md' }) {
  const initials = String(developer.name_ar || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
  return developer.logo
    ? <img className={`dvp-logo is-${size}`} src={developer.logo} alt="" loading="lazy" decoding="async" />
    : <span className={`dvp-logo is-${size} is-text`} aria-hidden="true">{initials}</span>;
}

function Crumbs({ isAr, current }) {
  return (
    <nav className="dvp-crumbs" aria-label={isAr ? 'مسار الصفحة' : 'Breadcrumb'}>
      <Link to="/">{isAr ? 'الرئيسية' : 'Home'}</Link>
      <span aria-hidden="true">/</span>
      <Link to="/projects">{isAr ? 'المشروعات' : 'Projects'}</Link>
      <span aria-hidden="true">/</span>
      {current ? (
        <>
          <Link to="/developers">{isAr ? 'شركات التطوير' : 'Developers'}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{current}</span>
        </>
      ) : <span aria-current="page">{isAr ? 'شركات التطوير' : 'Developers'}</span>}
    </nav>
  );
}

/** /developers: every developer with its projects on 1Line; /developers/:slug: one developer */
export default function DevelopersPage({ projects = [], properties = [], lang = 'ar', currency = 'EGP' }) {
  const { slug } = useParams();
  return slug
    ? <DeveloperDetail slug={slug} projects={projects} properties={properties} lang={lang} currency={currency} />
    : <DevelopersList projects={projects} properties={properties} lang={lang} />;
}

function DevelopersList({ projects, properties, lang }) {
  const isAr = lang === 'ar';
  const { list, loaded } = useDevelopersState();
  const areas = useMemo(() => getAreas(), []);

  useEffect(() => {
    updatePageSeo({
      title: isAr ? 'شركات التطوير العقاري في سوهاج ومشروعاتها | 1Line' : 'Real estate developers in Sohag | 1Line',
      description: isAr
        ? 'شركات التطوير العقاري في سوهاج: مشروعات كل شركة، مناطقها، ومتوسط سعر المتر فيها.'
        : 'Developers in Sohag: each company\'s projects, areas and average price per m².',
      url: '/developers',
      type: 'website',
      schemaId: 'breadcrumb-schema',
      schema: buildBreadcrumbSchema([
        { name: isAr ? 'الرئيسية' : 'Home', url: '/' },
        { name: isAr ? 'المشروعات' : 'Projects', url: '/projects' },
        { name: isAr ? 'شركات التطوير' : 'Developers', url: '/developers' }
      ])
    });
  }, [isAr]);

  const rows = useMemo(() => list.map((d) => {
    const own = projectsOf(d, projects);
    const areaNames = [...new Set(own.map((p) => mainAreaOf(p.areaKey, areas)).filter(Boolean).map((a) => shortAreaName(a, areas, isAr)))];
    return { d, own, areaNames, ...developerFigures(own, properties) };
  }).sort((a, b) => b.own.length - a.own.length), [list, projects, properties, areas, isAr]);

  return (
    <div className="pj-page dvp-page" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="dvp-hero">
        <div className="pj-wrap">
          <Crumbs isAr={isAr} />
          <h1>{isAr ? 'شركات التطوير في سوهاج' : 'Developers in Sohag'}</h1>
          <p>{isAr ? 'كل شركة ومشروعاتها المعروضة على 1Line، والمناطق اللي بتشتغل فيها، ومتوسط سعر المتر في مشروعاتها.' : 'Each company, its projects on 1Line, the areas it builds in and its average price per m².'}</p>
        </div>
      </header>
      <div className="pj-wrap dvp-main">
        {!loaded && rows.length === 0 ? (
          <p className="dvp-empty">{isAr ? 'جاري التحميل…' : 'Loading…'}</p>
        ) : rows.length === 0 ? (
          <p className="dvp-empty">{isAr ? 'لسه مفيش شركات مسجلة. تصفّح المشروعات من صفحة المشروعات.' : 'No developers yet. Browse the projects page.'} <Link to="/projects">{isAr ? 'المشروعات' : 'Projects'}</Link></p>
        ) : (
          <ul className="dvp-list">
            {rows.map(({ d, own, areaNames, avgPpm }) => (
              <li key={d.id}>
                <Link to={developerPath(d)} className="dvp-row">
                  <Logo developer={d} />
                  <span className="dvp-row-text">
                    <strong>{isAr ? d.name_ar : d.name_en || d.name_ar}</strong>
                    <span>
                      {own.length ? (isAr ? (own.length === 1 ? 'مشروع واحد' : own.length === 2 ? 'مشروعين' : `${own.length} مشروعات`) : `${own.length} projects`) : (isAr ? 'لسه مفيش مشروعات معروضة' : 'No projects listed yet')}
                      {areaNames.length > 0 && ` · ${areaNames.join(isAr ? '، ' : ', ')}`}
                    </span>
                  </span>
                  {avgPpm > 0 && (
                    <span className="dvp-row-price">
                      <bdi>{n(avgPpm)}</bdi>
                      <small>{isAr ? 'ج.م للمتر' : 'EGP/m²'}</small>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DeveloperDetail({ slug, projects, properties, lang, currency }) {
  const isAr = lang === 'ar';
  const { list, loaded } = useDevelopersState();
  const developer = findDeveloper(slug, list);
  const areas = useMemo(() => getAreas(), []);
  const own = useMemo(() => (developer ? projectsOf(developer, projects) : []), [developer, projects]);
  const figures = useMemo(() => developerFigures(own, properties), [own, properties]);
  const name = developer ? (isAr ? developer.name_ar : developer.name_en || developer.name_ar) : '';
  const areaNames = [...new Set(own.map((p) => areaPathName(p.areaKey, areas, isAr)).filter(Boolean))];

  useEffect(() => {
    if (!developer) return;
    updatePageSeo({
      title: isAr ? `${developer.name_ar}: مشروعاتها في سوهاج وأسعارها | 1Line` : `${name}: projects in Sohag | 1Line`,
      description: (isAr ? developer.about_ar : '') || (isAr ? `مشروعات ${developer.name_ar} في سوهاج، المناطق ومتوسط سعر المتر ونظام السداد.` : `${name}'s projects in Sohag.`),
      url: developerPath(developer),
      image: developer.logo || undefined,
      type: 'website',
      schemaId: 'breadcrumb-schema',
      schema: buildBreadcrumbSchema([
        { name: isAr ? 'الرئيسية' : 'Home', url: '/' },
        { name: isAr ? 'شركات التطوير' : 'Developers', url: '/developers' },
        { name, url: developerPath(developer) }
      ])
    });
  }, [developer, isAr, name]);

  if (!developer) {
    if (!loaded) return <div className="pj-page dvp-page"><p className="dvp-empty pj-wrap">{isAr ? 'جاري التحميل…' : 'Loading…'}</p></div>;
    return <NotFoundPage lang={lang} />;
  }

  const founded = Number(developer.founded) || 0;
  const delivered = Number(developer.deliveredProjects) || 0;
  const facts = [
    founded > 1900 && { key: 'since', Icon: CalendarClock, value: String(founded), label: isAr ? 'سنة التأسيس' : 'Founded' },
    delivered > 0 && { key: 'done', Icon: CheckCircle2, value: n(delivered), label: isAr ? 'مشروعات سلّمتها' : 'Projects delivered' },
    own.length > 0 && { key: 'here', Icon: Layers, value: n(own.length), label: isAr ? 'مشروعات على 1Line' : 'Projects on 1Line' },
    figures.avgPpm > 0 && { key: 'ppm', Icon: Building2, value: `${n(figures.avgPpm)}`, unit: isAr ? 'ج.م' : 'EGP', label: isAr ? 'متوسط سعر المتر' : 'Avg price / m²' }
  ].filter(Boolean);

  const ask = () => openWhatsAppSafely(isAr
    ? `مرحباً 1Line، عايز أعرف الوحدات المتاحة في مشروعات ${developer.name_ar}`
    : `Hello 1Line, I'd like the available units in ${name}'s projects`);

  return (
    <div className="pj-page dvp-page" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="dvp-hero">
        <div className="pj-wrap">
          <Crumbs isAr={isAr} current={name} />
          <div className="dvp-id">
            <Logo developer={developer} size="lg" />
            <div>
              <h1>{name}</h1>
              {isAr && developer.name_en && <p className="dvp-en" dir="ltr">{developer.name_en}</p>}
              {areaNames.length > 0 && <p className="dvp-areas"><MapPin size={15} aria-hidden="true" />{areaNames.join(isAr ? '، ' : ', ')}</p>}
            </div>
          </div>
        </div>
      </header>

      <div className="pj-wrap dvp-main">
        {facts.length > 0 && (
          <ul className="dvp-facts">
            {facts.map(({ key, Icon, value, unit, label }) => (
              <li key={key}>
                <Icon size={18} aria-hidden="true" />
                <strong><bdi>{value}</bdi>{unit && <small> {unit}</small>}</strong>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        )}

        {(developer.about_ar || developer.website || developer.facebook) && (
          <section className="dvp-card">
            <h2>{isAr ? 'عن الشركة' : 'About'}</h2>
            {developer.about_ar && <p className="dvp-about">{developer.about_ar}</p>}
            {(developer.website || developer.facebook) && (
              <p className="dvp-links">
                {developer.website && <a href={developer.website} target="_blank" rel="noopener noreferrer nofollow"><ExternalLink size={15} aria-hidden="true" />{isAr ? 'موقع الشركة' : 'Website'}</a>}
                {developer.facebook && <a href={developer.facebook} target="_blank" rel="noopener noreferrer nofollow"><ExternalLink size={15} aria-hidden="true" />{isAr ? 'صفحة فيسبوك' : 'Facebook'}</a>}
              </p>
            )}
          </section>
        )}

        <section>
          <h2 className="dvp-h2">{isAr ? `مشروعات ${developer.name_ar}` : `${name}'s projects`}</h2>
          {own.length ? (
            <div className="pj-grid">
              {own.map((project, i) => (
                <ProjectCard key={project.id} project={project} isAr={isAr} lang={lang} currency={currency} index={i}
                  onInquire={() => openWhatsAppSafely(isAr ? `مرحباً 1Line، عايز أعرف الوحدات المتاحة في مشروع ${project.title_ar}` : `Hello 1Line, units in ${project.title_en || project.title_ar}?`)} />
              ))}
            </div>
          ) : (
            <p className="dvp-empty">{isAr ? 'لسه مفيش مشروعات للشركة دي معروضة على 1Line.' : 'No projects of this company on 1Line yet.'}</p>
          )}
        </section>

        <section className="dvp-cta">
          <div>
            <h2>{isAr ? `عايز وحدة في مشروع من مشروعات ${developer.name_ar}؟` : `Looking for a unit by ${name}?`}</h2>
            <p>{isAr ? 'قولنا المساحة والميزانية، ونبعتلك المتاح والأسعار، ونراجع العقد مع المطوّر قبل ما تدفع.' : 'Tell us the size and budget; we send what is available and review the contract before you pay.'}</p>
          </div>
          <button type="button" className="pj-btn pj-btn--primary" onClick={ask}>
            <MessageSquare size={17} aria-hidden="true" />
            <span>{isAr ? 'اسأل على واتساب' : 'Ask on WhatsApp'}</span>
          </button>
        </section>
      </div>
    </div>
  );
}
