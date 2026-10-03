import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageSquare, Sparkles, ArrowRight, ArrowLeft, HardHat, Wallet, CalendarClock, LayoutGrid, Home, Store, SearchX } from 'lucide-react';
import { MEGA_PROJECTS } from '../data/projectsData';
import ProjectCard from '../components/projects/ProjectCard';
import '../styles/projects-modern.css';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import { updatePageSeo } from '../utils/seoHelper';

export default function ProjectsPage({ 
  projects = [],
  lang = 'ar', 
  currency = 'EGP'
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const navigate = useNavigate();

  const isAr = lang === 'ar';

  // Dynamic SEO Meta Tags
  useEffect(() => {
    updatePageSeo({
      title: isAr ? 'دليل المشروعات والكمبوندات الكبرى بسوهاج 2026 | 1Line' : 'Mega Projects & Flagship Compounds in Sohag 2026',
      description: isAr 
        ? 'تصفح الكمبوندات السكنية والمولات التجارية والأبراج الإدارية بسوهاج مع متابعة حية لنسب التنفيذ الإنشائي.' 
        : 'Explore gated compounds, retail malls, and executive towers with live construction progress updates.',
      url: '/projects',
      type: 'website'
    });
  }, [lang, isAr]);

  const allProjects = projects && projects.length > 0 ? projects : MEGA_PROJECTS;

  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'all') return allProjects;
    return allProjects.filter(p => p.category === selectedCategory);
  }, [selectedCategory, allProjects]);

  const handleInquireProject = (project) => {
    const title = isAr ? project.title_ar : project.title_en;
    // A sample project can't be visited: ask about real projects of the same kind instead
    if (project.isDemo) {
      const kind = isAr ? (project.type_ar || 'مشروع') : (project.type_en || 'project');
      window.open(getWhatsAppUrl(isAr
        ? `مرحباً 1Line، أبحث عن ${kind} في سوهاج. ما المشروعات المتاحة حالياً؟`
        : `Hello 1Line, I'm looking for a ${kind} in Sohag. Which projects are available now?`), '_blank');
      return;
    }
    const msg = isAr 
      ? `مرحباً 1Line، أريد حجز موعد معاينة ميدانية ومعرفة الوحدات المتاحة في مشروع: ${title}`
      : `Hello 1Line, I would like to book a viewing tour and request unit availability for: ${title}`;
    window.open(getWhatsAppUrl(msg), '_blank');
  };



  const categories = [
    { id: 'all', label_ar: 'الكل', label_en: 'All', Icon: LayoutGrid },
    { id: 'residential', label_ar: 'سكني', label_en: 'Residential', Icon: Home },
    { id: 'commercial', label_ar: 'تجاري', label_en: 'Commercial', Icon: Store }
  ];
  const countFor = (id) => (id === 'all' ? allProjects.length : allProjects.filter((p) => p.category === id).length);

  const askCustom = () => window.open(getWhatsAppUrl(isAr
    ? 'مرحباً 1Line، أبحث عن وحدة في مشروع بمواصفات معيّنة في سوهاج. المواصفات: '
    : 'Hello 1Line, I am looking for a unit in a specific kind of project in Sohag. Details: '), '_blank');

  return (
    <div className="pj-page">
      <header className="pj-hero">
        <div className="pj-wrap">
          {/* Quick Back Navigation Bar */}
          <div className="page-top-back-bar">
            <button
              type="button"
              className="btn-back-step"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }}
              title={isAr ? 'الرجوع خطوة للخلف' : 'Go back one step'}
            >
              {isAr ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
              <span>{isAr ? 'رجوع خطوة للخلف' : 'Back'}</span>
            </button>
            <div className="page-breadcrumb-sub">
              <Link to="/">{isAr ? 'الرئيسية' : 'Home'}</Link>
              <span>/</span>
              <span className="crumb-current">{isAr ? 'دليل المشروعات' : 'Projects'}</span>
            </div>
          </div>

          <p className="pj-kicker"><Sparkles size={15} aria-hidden="true" />{isAr ? 'دليل المشروعات' : 'Projects guide'}</p>
          <h1 className="pj-hero-title">
            {isAr ? <>المشروعات العقارية والتجارية <em>في سوهاج</em></> : <>Residential & commercial projects <em>in Sohag</em></>}
          </h1>
          <p className="pj-hero-sub">
            {isAr
              ? 'كمبوندات سكنية ومولات وأبراج إدارية: نسبة التنفيذ على الأرض، نظام السداد، وموعد التسليم لكل مشروع في مكان واحد.'
              : 'Compounds, malls and office towers: on-site progress, payment plan and delivery date for each project in one place.'}
          </p>
          <ul className="pj-hero-points">
            <li><HardHat size={16} aria-hidden="true" />{isAr ? 'نسب تنفيذ ميدانية' : 'On-site progress'}</li>
            <li><Wallet size={16} aria-hidden="true" />{isAr ? 'أنظمة سداد واضحة' : 'Clear payment plans'}</li>
            <li><CalendarClock size={16} aria-hidden="true" />{isAr ? 'مواعيد التسليم' : 'Delivery dates'}</li>
          </ul>

          <div className="pj-filter" role="tablist" aria-label={isAr ? 'نوع المشروع' : 'Project type'}>
            {categories.map(({ id, label_ar, label_en, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selectedCategory === id}
                className={selectedCategory === id ? 'is-active' : ''}
                onClick={() => setSelectedCategory(id)}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{isAr ? label_ar : label_en}</span>
                <b>{countFor(id)}</b>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="pj-wrap pj-main">
        {filteredProjects.length === 0 ? (
          <div className="pj-empty">
            <SearchX size={36} aria-hidden="true" />
            <p>{isAr ? 'لا توجد مشروعات من هذا النوع حالياً.' : 'No projects of this type right now.'}</p>
            <button type="button" className="pj-btn pj-btn--ghost" onClick={() => setSelectedCategory('all')}>
              {isAr ? 'عرض كل المشروعات' : 'Show all projects'}
            </button>
          </div>
        ) : (
          <div className="pj-grid">
            {filteredProjects.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                isAr={isAr}
                lang={lang}
                currency={currency}
                index={i}
                featured={i === 0}
                onInquire={handleInquireProject}
              />
            ))}
          </div>
        )}

        <section className="pj-cta">
          <div>
            <h2>{isAr ? 'مش لاقي المشروع اللي بتدور عليه؟' : "Can't find the project you want?"}</h2>
            <p>{isAr ? 'قولنا المنطقة والميزانية ونوع الوحدة، ونرشّح لك المشروعات المناسبة ونرتّب المعاينة.' : 'Tell us the area, budget and unit type; we suggest matching projects and arrange the visit.'}</p>
          </div>
          <div className="pj-cta-actions">
            <button type="button" className="pj-btn pj-btn--primary" onClick={askCustom}>
              <MessageSquare size={17} aria-hidden="true" />
              <span>{isAr ? 'كلّمنا على واتساب' : 'Message us on WhatsApp'}</span>
            </button>
            <Link to="/special" className="pj-btn pj-btn--ghost">
              <span>{isAr ? 'طلب بمواصفات خاصة' : 'Custom request'}</span>
              {isAr ? <ArrowLeft size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
