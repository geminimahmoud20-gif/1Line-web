import { useState, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Layers, 
  Calendar, 
  Percent, 
  CheckCircle2, 
  Download, 
  MessageSquare, 
  ArrowUpRight, 
  ShieldCheck, 
  Clock,
  Sparkles,
  TrendingUp,
  FileDown
} from 'lucide-react';
import { MEGA_PROJECTS } from '../data/projectsData';

export default function ProjectsPage({ lang = 'ar', triggerToast }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const isAr = lang === 'ar';

  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'all') return MEGA_PROJECTS;
    return MEGA_PROJECTS.filter(p => p.category === selectedCategory);
  }, [selectedCategory]);

  const handleInquireProject = (project) => {
    const title = isAr ? project.title_ar : project.title_en;
    const msg = isAr 
      ? `مرحباً ون لاين، أريد حجز موعد معاينة ميدانية ومعرفة الوحدات المتاحة في مشروع: ${title}`
      : `Hello One Line, I would like to book a viewing tour and request unit availability for: ${title}`;
    window.open(`https://wa.me/201012345678?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDownloadBrochure = (project) => {
    const title = isAr ? project.title_ar : project.title_en;
    if (triggerToast) {
      triggerToast(isAr ? `جاري تجهيز وتحميل بروشور مشروع ${title}...` : `Downloading brochure for ${title}...`, 'success');
    }
    // Direct open/download brochure mock
    window.open(project.images[0], '_blank');
  };

  return (
    <div className="projects-page-wrapper">
      {/* Hero Header */}
      <div className="projects-hero-banner">
        <div className="projects-hero-container">
          <div className="projects-badge-pill">
            <Sparkles size={16} className="text-gold" />
            <span>{isAr ? 'دليل المشروعات والكمبوندات الكبرى في سوهاج' : 'Mega Projects & Flagship Compounds'}</span>
          </div>
          <h1>{isAr ? 'أضخم المشروعات العقارية والتجارية بسوهاج 2026' : 'Premier Real Estate Developments in Sohag'}</h1>
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

            return (
              <div key={project.id} className="mega-project-card">
                {/* Media & Progress Badge */}
                <div className="project-card-media-wrap">
                  <img src={project.images[0]} alt={title} className="project-card-img" />
                  <div className="project-overlay-gradient" />

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
                    <h3 className="project-title-text">{title}</h3>
                    <p className="project-desc-snippet">{desc}</p>
                  </div>

                  {/* Construction Progress Breakdown */}
                  <div className="project-construction-box">
                    <div className="prog-header-flex">
                      <span>{isAr ? 'معدل التنفيذ الميداني للمشروع' : 'Live Construction Stage'}</span>
                      <strong>{project.progress}% {isAr ? 'مكتمل' : 'Completed'}</strong>
                    </div>
                    <div className="prog-track">
                      <div className="prog-fill" style={{ width: `${project.progress}%` }} />
                    </div>
                    <div className="prog-milestones-row">
                      <span>{isAr ? 'الخرسانات: 100%' : 'Structure: 100%'}</span>
                      <span>{isAr ? `المباني: ${project.progressBreakdown.masonry}%` : `Masonry: ${project.progressBreakdown.masonry}%`}</span>
                      <span>{isAr ? `التشطيب: ${project.progressBreakdown.finishing}%` : `Finishing: ${project.progressBreakdown.finishing}%`}</span>
                    </div>
                  </div>

                  {/* Key Metrics Strip */}
                  <div className="project-metrics-grid">
                    <div className="proj-metric-item">
                      <span className="metric-lbl">{isAr ? 'يبدأ من' : 'Starting From'}</span>
                      <strong className="metric-val text-primary">{project.startPrice.toLocaleString()} ج.م</strong>
                    </div>

                    <div className="proj-metric-item">
                      <span className="metric-lbl">{isAr ? 'مقدم ونظام التقسيط' : 'Downpayment & Plan'}</span>
                      <strong className="metric-val">{project.downPaymentPercent}% مقدم • {project.installmentYears} سنوات</strong>
                    </div>

                    <div className="proj-metric-item">
                      <span className="metric-lbl">{isAr ? 'تاريخ التسليم' : 'Delivery Target'}</span>
                      <strong className="metric-val">{delivery}</strong>
                    </div>

                    <div className="proj-metric-item">
                      <span className="metric-lbl">{isAr ? 'الوحدات المتاحة' : 'Available Units'}</span>
                      <strong className="metric-val text-success">{project.availableUnits} {isAr ? 'وحدة متبقية' : 'Units'}</strong>
                    </div>
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
                  <div className="project-card-footer-actions" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleInquireProject(project)}
                    >
                      <MessageSquare size={15} />
                      <span>{isAr ? 'حجز معاينة ميدانية' : 'Book Viewing Tour'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => handleDownloadBrochure(project)}
                    >
                      <FileDown size={15} />
                      <span>{isAr ? 'الكتالوج PDF' : 'Brochure'}</span>
                    </button>
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
