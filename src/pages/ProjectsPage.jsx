import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, MapPin, CheckCircle2, MessageSquare, Sparkles, FileDown, ArrowRight, ArrowLeft } from 'lucide-react';
import { MEGA_PROJECTS } from '../data/projectsData';
import BrandWatermark from '../components/common/BrandWatermark';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import { updatePageSeo } from '../utils/seoHelper';
import { formatCurrencyPrice } from '../utils/currencyAndBenchmark';

// Brochure links are typed in the CRM: only web links are opened
const safeBrochureUrl = (url) => (/^https?:\/\/\S+$/i.test(String(url || '').trim()) ? String(url).trim() : null);

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



  return (
    <div className="projects-page-wrapper">
      {/* Hero Header */}
      <div className="projects-hero-banner">
        <div className="projects-hero-container">
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
              <span className="crumb-current">{isAr ? 'دليل المشروعات' : 'Mega Projects'}</span>
            </div>
          </div>

          <div className="projects-badge-pill">
            <Sparkles size={16} className="text-gold" />
            <span>{isAr ? 'دليل المشروعات والكمبوندات الكبرى في سوهاج' : 'Mega Projects & Flagship Compounds'}</span>
          </div>
          <h1>{isAr ? 'المشروعات العقارية والتجارية في سوهاج' : 'Premier Real Estate Developments in Sohag'}</h1>
          <p>
            {isAr 
              ? 'تصفح الكمبوندات السكنية المغلقة، المولات التجارية، والأبراج الإدارية مع متابعة حية لنسب الإنجاز الإنشائي الميداني.' 
              : 'Explore gated residential compounds, retail malls, and executive towers with live construction progress updates.'}
          </p>

          {/* Category Tabs */}
          <div className="projects-category-pills">
            {[
              { id: 'all', label_ar: 'جميع المشروعات', label_en: 'All Projects' },
              { id: 'residential', label_ar: 'كمبوندات سكنية', label_en: 'Residential Compounds' },
              { id: 'commercial', label_ar: 'مولات ومقرات تجارية', label_en: 'Commercial & Malls' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`proj-cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {isAr ? cat.label_ar : cat.label_en}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="projects-content-container">
        <div className="projects-list-grid">
          {filteredProjects.map((project) => {
            const title = isAr ? project.title_ar : project.title_en;
            const location = isAr ? project.location_ar : project.location_en;
            const dev = isAr ? project.developer_ar : project.developer_en;
            const delivery = isAr ? project.deliveryDate_ar : project.deliveryDate_en;
            const desc = isAr ? project.description_ar : project.description_en;
            const feats = isAr ? project.features_ar : project.features_en;
            const priceData = formatCurrencyPrice(project.startPrice, currency, lang);
            const brochureUrl = safeBrochureUrl(project.brochureUrl);

            return (
              <div key={project.id} className="mega-project-card">
                {/* Media & Progress Badge */}
                <div className="project-card-media-wrap">
                  <img 
                    src={(Array.isArray(project.images) && project.images[0]) || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'} 
                    alt={title} 
                    className="project-card-img" 
                  />
                  <div className="project-overlay-gradient" />

                  {/* Brand Watermark Overlay */}
                  <BrandWatermark size="md" position="bottom-right" />

                  {project.isDemo && <span className="xs-demo-tag project-demo-tag">{isAr ? 'مثال توضيحي' : 'Sample'}</span>}

                  {/* Progress Tag Badge */}
                  <div className="project-progress-badge">
                    <span className="prog-percent">{project.progress}%</span>
                    <span className="prog-lbl">{isAr ? 'إنجاز إنشائي' : 'Constructed'}</span>
                  </div>

                  {/* Developer Tag */}
                  <div className="project-dev-pill">
                    <Building2 size={13} />
                    <span>{dev}</span>
                  </div>
                </div>

                {/* Project Content */}
                <div className="project-card-body">
                  <div className="project-header-top">
                    <div className="proj-loc-row">
                      <MapPin size={14} className="text-gold" />
                      <span>{location}</span>
                    </div>
                    <h3 className="project-title-text" title={title}>{title}</h3>
                    <div className="project-title-row">
                      {project.brandTag && (
                        <span className="project-brand-pill">{project.brandTag}</span>
                      )}
                    </div>
                    <p className="project-desc-snippet">{desc}</p>
                  </div>

                  {/* Construction Progress Breakdown */}
                  <div className="project-construction-box">
                    <div className="prog-header-flex">
                      <span className="prog-title-lbl">{isAr ? 'معدل التنفيذ الميداني' : 'Construction Progress'}</span>
                      <span className="prog-status-pill">{project.progress}% {isAr ? 'مكتمل' : 'Completed'}</span>
                    </div>
                    <div className="prog-track">
                      <div className="prog-fill" style={{ width: `${project.progress}%` }} />
                    </div>
                    <div className="prog-milestones-row">
                      <span className="milestone-chip"><strong>{project.progressBreakdown?.concrete ?? 0}%</strong> {isAr ? 'خرسانات' : 'Structure'}</span>
                      <span className="milestone-chip"><strong>{project.progressBreakdown?.masonry ?? 0}%</strong> {isAr ? 'مباني' : 'Masonry'}</span>
                      <span className="milestone-chip"><strong>{project.progressBreakdown?.finishing ?? 0}%</strong> {isAr ? 'تشطيب' : 'Finishing'}</span>
                    </div>
                  </div>

                  {/* Key Metrics Strip */}
                  <div className="project-metrics-grid">
                    <div className="proj-metric-item">
                      <span className="metric-lbl">{isAr ? 'يبدأ من' : 'Starting From'}</span>
                      <strong className="metric-val metric-val--key">{priceData.primary} {priceData.symbol}</strong>
                      {priceData.isConverted && (
                        <small style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>
                          ≈ {priceData.originalEgp}
                        </small>
                      )}
                    </div>

                    <div className="proj-metric-item">
                      <span className="metric-lbl">{isAr ? 'المقدم والتقسيط' : 'Down & plan'}</span>
                      <strong className="metric-val">
                        {isAr
                          ? `${project.downPaymentPercent}% • ${project.installmentYears} ${project.installmentYears > 10 ? 'سنة' : 'سنوات'}`
                          : `${project.downPaymentPercent}% • ${project.installmentYears} yrs`}
                      </strong>
                    </div>

                    <div className="proj-metric-item">
                      <span className="metric-lbl">{isAr ? 'تاريخ التسليم' : 'Delivery Target'}</span>
                      <strong className="metric-val">{delivery}</strong>
                    </div>

                    {/* A sample has no units for sale: show what kind of project it is instead */}
                    {project.isDemo || !Number(project.availableUnits) ? (
                      <div className="proj-metric-item">
                        <span className="metric-lbl">{isAr ? 'نوع المشروع' : 'Project type'}</span>
                        <strong className="metric-val">{isAr ? project.type_ar : project.type_en}</strong>
                      </div>
                    ) : (
                      <div className="proj-metric-item">
                        <span className="metric-lbl">{isAr ? 'الوحدات المتاحة' : 'Available Units'}</span>
                        <strong className="metric-val">{project.availableUnits} {isAr ? 'وحدة متاحة' : 'units'}</strong>
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="project-features-pills">
                    {feats.slice(0, 3).map((f, i) => (
                      <span key={i} className="proj-feat-tag">
                        <CheckCircle2 size={13} className="text-gold" />
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* Card Actions */}
                  <div className={`project-card-footer-actions ${brochureUrl ? '' : 'is-single'}`}>
                    <button
                      type="button"
                      className="btn btn-primary btn-project-cta"
                      onClick={() => handleInquireProject(project)}
                    >
                      <MessageSquare size={15} />
                      <span>
                        {project.isDemo
                          ? (isAr ? 'اسأل عن مشروعات مشابهة' : 'Ask about similar projects')
                          : (isAr ? 'حجز معاينة ميدانية' : 'Book Viewing Tour')}
                      </span>
                    </button>

                    {/* Only when the project has an actual brochure file */}
                    {brochureUrl && (
                      <a
                        className="btn btn-outline btn-project-brochure"
                        href={brochureUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileDown size={15} />
                        <span>{isAr ? 'الكتالوج PDF' : 'Brochure PDF'}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
