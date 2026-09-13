import React, { useState, useEffect } from 'react';
import { ShieldCheck, Scale, Award, Video, CheckCircle2, Sparkles, FileCheck, Check, Lock } from 'lucide-react';
import { getFounderSettings, DEFAULT_FOUNDER_CMS } from '../../utils/founderCmsData';

// Map icon names from CMS to Lucide React components
const ICON_MAP = {
  ShieldCheck,
  Scale,
  Award,
  Video,
  FileCheck,
  Check,
  Lock
};

export default function GoldStandardsSection({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const [cms, setCms] = useState(() => getFounderSettings());

  // Listen to live CMS updates from CRM Admin Panel & Cloud sync
  useEffect(() => {
    const handleCmsUpdate = () => {
      setCms(getFounderSettings());
    };

    window.addEventListener('oneline_founder_cms_updated', handleCmsUpdate);
    window.addEventListener('storage', handleCmsUpdate);

    return () => {
      window.removeEventListener('oneline_founder_cms_updated', handleCmsUpdate);
      window.removeEventListener('storage', handleCmsUpdate);
    };
  }, []);

  const standards = (cms && cms.goldStandards && cms.goldStandards.length > 0)
    ? cms.goldStandards
    : DEFAULT_FOUNDER_CMS.goldStandards;

  const sectionTitle = isAr
    ? (cms?.goldStandardsTitle_ar || DEFAULT_FOUNDER_CMS.goldStandardsTitle_ar)
    : (cms?.goldStandardsTitle_en || DEFAULT_FOUNDER_CMS.goldStandardsTitle_en);

  const sectionDesc = isAr
    ? (cms?.goldStandardsDesc_ar || DEFAULT_FOUNDER_CMS.goldStandardsDesc_ar)
    : (cms?.goldStandardsDesc_en || DEFAULT_FOUNDER_CMS.goldStandardsDesc_en);

  return (
    <section className="homepage-section gold-standards-section">
      <div className="section-header-centered">
        <div className="section-pill-tag">
          <Sparkles size={14} className="text-gold" />
          <span>{isAr ? 'الضمان المؤسسي والريادة' : 'Institutional Trust & Leadership'}</span>
        </div>
        <h2 className="section-heading-primary">
          {sectionTitle}
        </h2>
        <p className="section-heading-desc">
          {sectionDesc}
        </p>
      </div>

      <div className="gold-standards-grid">
        {standards.map((std, idx) => {
          const IconComp = ICON_MAP[std.icon] || ShieldCheck;
          const badgeText = isAr 
            ? (std.badge_ar || 'ضمان مؤسسي معتمد') 
            : (std.badge_en || 'Guaranteed Standard');

          return (
            <div key={idx} className="gold-standard-card">
              <div className="standard-card-header">
                <div className="standard-icon-box">
                  <IconComp size={24} />
                </div>
                <span className="standard-number">{std.number || `0${idx + 1}`}</span>
              </div>

              <h3 className="standard-card-title">
                {isAr ? std.title_ar : (std.title_en || std.title_ar)}
              </h3>

              <p className="standard-card-desc">
                {isAr ? std.desc_ar : (std.desc_en || std.desc_ar)}
              </p>

              <div className="standard-card-badge">
                <CheckCircle2 size={13} className="text-emerald" />
                <span>{badgeText}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
