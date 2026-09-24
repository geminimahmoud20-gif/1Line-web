import { useState, useEffect } from 'react';
import { ShieldCheck, Scale, Award, Video, FileCheck, Check, Lock, EyeOff, Globe2, Sparkles } from 'lucide-react';
import { getFounderSettings, DEFAULT_FOUNDER_CMS } from '../../utils/founderCmsData';

// Map icon names from CMS to Lucide React components
const ICON_MAP = { ShieldCheck, Scale, Award, Video, FileCheck, Check, Lock, EyeOff, Globe2 };

/** 01 — document-review certificate (decorative) */
function CertificateArt({ isAr }) {
  const rows = isAr
    ? ['تسلسل الملكية', 'رخصة البناء', 'التوكيلات والتفويضات', 'المرافق والمخالفات']
    : ['Chain of title', 'Building permit', 'Powers of attorney', 'Utilities & violations'];
  return (
    <div className="hx-cert" aria-hidden="true">
      <div className="hx-cert-head">
        <FileCheck size={16} strokeWidth={1.5} />
        <span>{isAr ? 'ملخص المراجعة القانونية' : 'Legal review summary'}</span>
      </div>
      <ul>
        {rows.map((r) => (
          <li key={r}><Check size={13} strokeWidth={2} /><span>{r}</span></li>
        ))}
      </ul>
      <div className="hx-cert-seal"><ShieldCheck size={22} strokeWidth={1.5} /></div>
    </div>
  );
}

/** 02 — comparables: subject vs. nearby closed deals (illustrative shape, no numbers) */
function ComparablesArt({ isAr }) {
  const bars = [62, 74, 68, 80, 71];
  return (
    <div className="hx-comps" aria-hidden="true">
      <div className="hx-comps-bars">
        {bars.map((h, i) => <span key={i} style={{ height: `${h}%` }} className={i === 3 ? 'is-subject' : ''} />)}
      </div>
      <div className="hx-comps-legend">
        <span><i className="is-subject" />{isAr ? 'عقارك' : 'Your property'}</span>
        <span><i />{isAr ? 'صفقات مماثلة في نفس الشارع' : 'Comparable deals nearby'}</span>
      </div>
    </div>
  );
}

const DEFAULT_ICONS = [FileCheck, Scale, EyeOff, Globe2];

export default function GoldStandardsSection({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const [cms, setCms] = useState(() => getFounderSettings());

  // Listen to live CMS updates from CRM Admin Panel & Cloud sync
  useEffect(() => {
    const handleCmsUpdate = () => setCms(getFounderSettings());
    window.addEventListener('oneline_founder_cms_updated', handleCmsUpdate);
    window.addEventListener('storage', handleCmsUpdate);
    return () => {
      window.removeEventListener('oneline_founder_cms_updated', handleCmsUpdate);
      window.removeEventListener('storage', handleCmsUpdate);
    };
  }, []);

  const standards = (cms?.goldStandards?.length > 0 ? cms.goldStandards : DEFAULT_FOUNDER_CMS.goldStandards).slice(0, 4);

  const sectionTitle = isAr
    ? (cms?.goldStandardsTitle_ar || DEFAULT_FOUNDER_CMS.goldStandardsTitle_ar)
    : (cms?.goldStandardsTitle_en || DEFAULT_FOUNDER_CMS.goldStandardsTitle_en);
  const sectionDesc = isAr
    ? (cms?.goldStandardsDesc_ar || DEFAULT_FOUNDER_CMS.goldStandardsDesc_ar)
    : (cms?.goldStandardsDesc_en || DEFAULT_FOUNDER_CMS.goldStandardsDesc_en);

  return (
    <section className="hx-section hx-bento-section" aria-labelledby="hx-bento-title">
      <header className="hx-section-head">
        <span className="hx-kicker"><Sparkles size={13} strokeWidth={1.75} aria-hidden="true" />{isAr ? 'الضمان المؤسسي' : 'Institutional guarantee'}</span>
        <h2 id="hx-bento-title">{sectionTitle}</h2>
        {sectionDesc && <p>{sectionDesc}</p>}
      </header>

      <div className="hx-bento">
        {standards.map((std, idx) => {
          const Icon = ICON_MAP[std.icon] || DEFAULT_ICONS[idx] || ShieldCheck;
          const badge = isAr ? std.badge_ar : std.badge_en;
          return (
            <article key={std.number || idx} className={`hx-bento-card hx-bento-card--${idx + 1}`}>
              <div className="hx-bento-copy">
                <div className="hx-bento-top">
                  <span className="hx-bento-num">{std.number || `0${idx + 1}`}</span>
                  <span className="hx-bento-icon"><Icon size={20} strokeWidth={1.5} aria-hidden="true" /></span>
                </div>
                <h3>{isAr ? std.title_ar : (std.title_en || std.title_ar)}</h3>
                <p>{isAr ? std.desc_ar : (std.desc_en || std.desc_ar)}</p>
                {badge && <span className="hx-bento-badge"><Check size={12} strokeWidth={2} aria-hidden="true" />{badge}</span>}
              </div>
              {idx === 0 && <CertificateArt isAr={isAr} />}
              {idx === 1 && <ComparablesArt isAr={isAr} />}
            </article>
          );
        })}
      </div>
    </section>
  );
}
