import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Wallet, Layers, CalendarClock, MessageSquare, ArrowLeft, ArrowRight } from 'lucide-react';
import { formatCurrencyPrice } from '../../utils/currencyAndBenchmark';
import { arYears, pct, projectPath } from '../../utils/projectFacts';

/** Construction progress as a ring: the one number people look for first */
export function ProgressRing({ value, label }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="pj-ring" role="img" aria-label={label}>
      <svg viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r={r} className="pj-ring-track" />
        <circle cx="26" cy="26" r={r} className="pj-ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <span className="pj-ring-num">{value}<small>%</small></span>
    </div>
  );
}

/**
 * One project on /projects: photo, name, starting price and the three plan facts. Stages,
 * features and the brochure live on the project page the card opens.
 * `featured` lays the first project out wide, with its short description.
 */
export default function ProjectCard({ project, isAr, currency, lang, featured = false, index = 0, onInquire }) {
  const [imgFailed, setImgFailed] = useState(false);
  const title = isAr ? project.title_ar : project.title_en;
  const location = isAr ? project.location_ar : project.location_en;
  const dev = isAr ? project.developer_ar : project.developer_en;
  const delivery = isAr ? project.deliveryDate_ar : project.deliveryDate_en;
  const desc = isAr ? project.description_ar : project.description_en;
  const type = isAr ? project.type_ar : project.type_en;
  const price = formatCurrencyPrice(project.startPrice, currency, lang);
  const image = Array.isArray(project.images) ? project.images.find(Boolean) : null;
  const progress = pct(project.progress);
  const units = Number(project.availableUnits);
  const showUnits = !project.isDemo && units > 0;
  const years = Number(project.installmentYears) || 0;
  const href = projectPath(project);
  const categoryLabel = project.category === 'commercial'
    ? (isAr ? 'تجاري' : 'Commercial')
    : (isAr ? 'سكني' : 'Residential');
  const Go = isAr ? ArrowLeft : ArrowRight;

  return (
    <article className={`pj-card ${featured ? 'pj-card--feature' : ''}`} style={{ '--i': index }}>
      <Link to={href} className="pj-media" aria-label={title}>
        {image && !imgFailed ? (
          <img src={image} alt={title} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" onError={() => setImgFailed(true)} />
        ) : (
          <div className="pj-media-fallback" aria-hidden="true"><Building2 size={64} strokeWidth={1} /></div>
        )}
        <div className="pj-media-shade" />

        <div className="pj-media-top">
          <div className="pj-chips">
            <span className="pj-chip">{categoryLabel}</span>
            {project.isDemo && <span className="pj-chip pj-chip--sample">{isAr ? 'مثال توضيحي' : 'Sample'}</span>}
          </div>
          <ProgressRing value={progress} label={isAr ? `نسبة الإنجاز ${progress}%` : `${progress}% built`} />
        </div>

        <div className="pj-media-bottom">
          <p className="pj-loc"><MapPin size={14} aria-hidden="true" /><span>{location}</span></p>
          <h3 className="pj-title" title={title}>{title}</h3>
          <p className="pj-dev">
            <Building2 size={13} aria-hidden="true" /><span>{dev}</span>
            {project.brandTag && <span className="pj-brand" dir="ltr">{project.brandTag}</span>}
          </p>
        </div>
      </Link>

      <div className="pj-body">
        <div className="pj-price-row">
          <div>
            <span className="pj-label">{isAr ? 'يبدأ من' : 'From'}</span>
            <strong className="pj-price">{price.primary} <small>{price.symbol}</small></strong>
            {price.isConverted && <span className="pj-label">≈ {price.originalEgp}</span>}
          </div>
          {showUnits
            ? <span className="pj-units">{isAr ? `${units} وحدة متاحة` : `${units} units left`}</span>
            : type && <span className="pj-type">{type}</span>}
        </div>

        {featured && desc && <p className="pj-desc">{desc}</p>}

        <dl className="pj-facts">
          <div>
            <dt><Wallet size={15} aria-hidden="true" />{isAr ? 'المقدم' : 'Down'}</dt>
            <dd>{Number(project.downPaymentPercent) > 0 ? `${pct(project.downPaymentPercent)}%` : '—'}</dd>
          </div>
          <div>
            <dt><Layers size={15} aria-hidden="true" />{isAr ? 'التقسيط' : 'Plan'}</dt>
            <dd>{years ? (isAr ? arYears(years) : `${years} yrs`) : '—'}</dd>
          </div>
          <div>
            <dt><CalendarClock size={15} aria-hidden="true" />{isAr ? 'التسليم' : 'Delivery'}</dt>
            <dd>{delivery || '—'}</dd>
          </div>
        </dl>

        <div className="pj-actions">
          <Link to={href} className="pj-btn pj-btn--primary">
            <span>{isAr ? 'تفاصيل المشروع' : 'Project details'}</span>
            <Go size={17} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="pj-btn pj-btn--ghost pj-btn--icon"
            onClick={() => onInquire(project)}
            aria-label={isAr ? 'اسأل على واتساب' : 'Ask on WhatsApp'}
            title={isAr ? 'اسأل على واتساب' : 'Ask on WhatsApp'}
          >
            <MessageSquare size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
