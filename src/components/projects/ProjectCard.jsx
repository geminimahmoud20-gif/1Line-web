import { useState } from 'react';
import { Building2, MapPin, Wallet, Layers, CalendarClock, Check, MessageSquare, FileDown } from 'lucide-react';
import { formatCurrencyPrice } from '../../utils/currencyAndBenchmark';
import useClientDownload from '../../hooks/useClientDownload';

// Brochure links are typed in the CRM: only web links are opened
const safeBrochureUrl = (url) => (/^https?:\/\/\S+$/i.test(String(url || '').trim()) ? String(url).trim() : null);

// Arabic counting: سنة، سنتين، 3–10 سنوات، 11+ سنة
const arYears = (n) => (n === 1 ? 'سنة' : n === 2 ? 'سنتين' : n <= 10 ? `${n} سنوات` : `${n} سنة`);

const pct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

/** Construction progress as a ring: the one number people look for first */
function ProgressRing({ value, label }) {
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
 * One project on /projects. `featured` lays it out wide (photo beside the details) for the
 * first project in the list.
 */
export default function ProjectCard({ project, isAr, currency, lang, featured = false, index = 0, onInquire }) {
  const [imgFailed, setImgFailed] = useState(false);
  const title = isAr ? project.title_ar : project.title_en;
  const location = isAr ? project.location_ar : project.location_en;
  const dev = isAr ? project.developer_ar : project.developer_en;
  const delivery = isAr ? project.deliveryDate_ar : project.deliveryDate_en;
  const desc = isAr ? project.description_ar : project.description_en;
  const type = isAr ? project.type_ar : project.type_en;
  const feats = (isAr ? project.features_ar : project.features_en) || [];
  const price = formatCurrencyPrice(project.startPrice, currency, lang);
  const brochureUrl = safeBrochureUrl(project.brochureUrl);
  const download = useClientDownload();
  const image = Array.isArray(project.images) ? project.images.find(Boolean) : null;
  const progress = pct(project.progress);
  const bk = project.progressBreakdown || {};
  const units = Number(project.availableUnits);
  const showUnits = !project.isDemo && units > 0;
  const years = Number(project.installmentYears) || 0;

  const stages = [
    { key: 'concrete', ar: 'خرسانات', en: 'Structure' },
    { key: 'masonry', ar: 'مباني', en: 'Masonry' },
    { key: 'finishing', ar: 'تشطيب', en: 'Finishing' }
  ];
  const categoryLabel = project.category === 'commercial'
    ? (isAr ? 'تجاري' : 'Commercial')
    : (isAr ? 'سكني' : 'Residential');

  return (
    <article className={`pj-card ${featured ? 'pj-card--feature' : ''}`} style={{ '--i': index }}>
      <div className="pj-media">
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
      </div>

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
            <dd>{pct(project.downPaymentPercent)}%</dd>
          </div>
          <div>
            <dt><Layers size={15} aria-hidden="true" />{isAr ? 'التقسيط' : 'Plan'}</dt>
            <dd>{isAr ? arYears(years) : `${years} yrs`}</dd>
          </div>
          <div>
            <dt><CalendarClock size={15} aria-hidden="true" />{isAr ? 'التسليم' : 'Delivery'}</dt>
            <dd>{delivery || '—'}</dd>
          </div>
        </dl>

        <div className="pj-stages" aria-label={isAr ? 'مراحل التنفيذ' : 'Construction stages'}>
          {stages.map((s) => {
            const v = pct(bk[s.key]);
            return (
              <div key={s.key} className="pj-stage">
                <span className="pj-stage-head"><span>{isAr ? s.ar : s.en}</span><b>{v}%</b></span>
                <span className="pj-stage-bar"><span style={{ width: `${v}%` }} /></span>
              </div>
            );
          })}
        </div>

        {feats.length > 0 && (
          <ul className="pj-feats">
            {feats.slice(0, featured ? 4 : 3).map((f) => (
              <li key={f}><Check size={14} aria-hidden="true" />{f}</li>
            ))}
          </ul>
        )}

        <div className="pj-actions">
          <button type="button" className="pj-btn pj-btn--primary" onClick={() => onInquire(project)}>
            <MessageSquare size={17} aria-hidden="true" />
            <span>
              {project.isDemo
                ? (isAr ? 'اسأل عن مشروعات مشابهة' : 'Ask about similar projects')
                : (isAr ? 'احجز معاينة ميدانية' : 'Book a site visit')}
            </span>
          </button>
          {brochureUrl && (
            <button
              type="button"
              className="pj-btn pj-btn--ghost"
              title={isAr ? 'الكتالوج PDF' : 'Brochure PDF'}
              onClick={() => download(
                { kind: 'project_brochure', itemId: String(project.id || ''), itemTitle: project.name_ar || project.title_ar || project.name_en || '' },
                () => { window.open(brochureUrl, '_blank', 'noopener'); }
              )}
            >
              <FileDown size={17} aria-hidden="true" />
              <span>{isAr ? 'الكتالوج' : 'Brochure'}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
