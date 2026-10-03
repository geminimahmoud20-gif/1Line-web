import { useState, useEffect } from 'react';
import { ShieldCheck, Scale, Award, Video, FileCheck, Check, Lock, EyeOff, Globe2, Sparkles, Compass, Radio } from 'lucide-react';
import { getFounderSettings, DEFAULT_FOUNDER_CMS } from '../../utils/founderCmsData';

// Map icon names from CMS to Lucide React components
const ICON_MAP = { ShieldCheck, Scale, Award, Video, FileCheck, Check, Lock, EyeOff, Globe2 };

/** 01 — Modern Digital Legal Audit Widget */
function CertificateArt({ isAr }) {
  const auditPoints = isAr ? [
    { title: 'تسلسل الملكية', desc: 'خالٍ من النزاعات القضائية والرهونات', status: 'موثق 100%' },
    { title: 'تراخيص البناء', desc: 'مطابق لاشتراطات الحي والارتفاعات', status: 'معتمد' },
    { title: 'صحة التوكيلات', desc: 'محققة وسارية بالشهر العقاري', status: 'سارٍ' },
    { title: 'المرافق والمخالفات', desc: 'براءة ذمة كاملة وخالٍ من المستحقات', status: 'سليم' },
  ] : [
    { title: 'Chain of Title', desc: 'Free of judicial disputes & liens', status: 'Verified' },
    { title: 'Building Permits', desc: 'Compliant with zoning & height codes', status: 'Approved' },
    { title: 'Powers of Attorney', desc: 'Verified & active at public registry', status: 'Active' },
    { title: 'Utilities & Dues', desc: 'Zero municipal arrears or citations', status: 'Cleared' },
  ];

  return (
    <div className="hx-cert-modern" aria-label={isAr ? 'سجل الفحص القانوني' : 'Legal audit record'}>
      <div className="hx-cert-topbar">
        <div className="hx-cert-title-wrap">
          <div className="hx-cert-icon-pulse">
            <FileCheck size={16} strokeWidth={2.2} />
          </div>
          <div>
            <span className="hx-cert-main-title">{isAr ? 'ملخص المراجعة القانونية' : 'Legal review summary'}</span>
            <span className="hx-cert-sub-id">{isAr ? 'يُسلَّم لك قبل التعاقد' : 'Shared with you before contract'}</span>
          </div>
        </div>
        <div className="hx-cert-status-badge">
          <span className="hx-cert-dot" />
          <span>{isAr ? 'قبل العرض' : 'Before listing'}</span>
        </div>
      </div>

      <div className="hx-cert-points-grid">
        {auditPoints.map((item, idx) => (
          <div key={idx} className="hx-cert-point-item">
            <div className="hx-point-check">
              <Check size={12} strokeWidth={2.6} />
            </div>
            <div className="hx-point-info">
              <span className="hx-point-name">{item.title}</span>
              <span className="hx-point-detail">{item.desc}</span>
            </div>
            <span className="hx-point-tag">{item.status}</span>
          </div>
        ))}
      </div>

      <div className="hx-cert-footer">
        <div className="hx-cert-seal-pill">
          <ShieldCheck size={15} strokeWidth={2.2} />
          <span>{isAr ? 'فحص شامل قبل إبرام أي تعاقد' : 'Full audit prior to any contract'}</span>
        </div>
        <span className="hx-cert-signature">{isAr ? 'اعتماد الإدارة القانونية' : 'Legal Dept Certified'}</span>
      </div>
    </div>
  );
}

/** 02 — Dynamic Valuation & Comparables Widget */
function ComparablesArt({ isAr }) {
  const bars = [
    { label: isAr ? 'بيع مستعجل' : 'Distressed', h: 50, current: false },
    { label: isAr ? 'صفقة سابقة' : 'Past Deal', h: 68, current: false },
    { label: isAr ? 'عقارك العادل' : '1Line Fair', h: 92, current: true },
    { label: isAr ? 'متوسط الحي' : 'Area Avg', h: 74, current: false },
    { label: isAr ? 'مغالاة راكدة' : 'Overpriced', h: 98, current: false }
  ];

  return (
    <div className="hx-comps-modern" aria-label={isAr ? 'مؤشر التسعير العادل' : 'Fair valuation index'}>
      <div className="hx-comps-header">
        <div className="hx-comps-tag">
          <Scale size={14} strokeWidth={2.2} />
          <span>{isAr ? 'مؤشر التسعير الميداني الدقيق' : 'Field Valuation Index'}</span>
        </div>
        <span className="hx-comps-badge-fair">
          {isAr ? 'يحمي من المغالاة والركود' : 'Fair Pricing'}
        </span>
      </div>

      <div className="hx-comps-chart">
        <div className="hx-comps-bars">
          {bars.map((bar, i) => (
            <div key={i} className={`hx-comp-bar-col ${bar.current ? 'is-fair' : ''}`}>
              <div className="hx-bar-track">
                <div className="hx-bar-fill" style={{ height: `${bar.h}%` }}>
                  {bar.current && <span className="hx-bar-pulse" />}
                </div>
              </div>
              <span className="hx-bar-lbl">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hx-comps-legend-modern">
        <div className="hx-legend-item is-target">
          <span className="hx-legend-dot hx-legend-dot--gold" />
          <span>{isAr ? 'سعر 1Line العادل' : '1Line Fair Price'}</span>
        </div>
        <div className="hx-legend-item">
          <span className="hx-legend-dot hx-legend-dot--neutral" />
          <span>{isAr ? 'مقارنات فعلية بالشارع' : 'Real Street Comps'}</span>
        </div>
      </div>
    </div>
  );
}

/** 03 — Private Off-Market Matching Radar Widget */
function OffMarketArt({ isAr }) {
  return (
    <div className="hx-radar-modern" aria-label={isAr ? 'رادار المطابقة الحصرية' : 'Off-market matching radar'}>
      <div className="hx-radar-viewport">
        {/* Radar concentric rings */}
        <div className="hx-radar-ring hx-radar-ring--1" />
        <div className="hx-radar-ring hx-radar-ring--2" />
        <div className="hx-radar-ring hx-radar-ring--3" />
        <div className="hx-radar-sweep" />

        {/* Center protected node */}
        <div className="hx-radar-center">
          <Lock size={15} strokeWidth={2.4} />
        </div>

        {/* Active qualified buyer blips */}
        <div className="hx-radar-blip hx-blip--1">
          <span className="hx-blip-dot" />
          <span className="hx-blip-label">{isAr ? 'مستثمر كاش • سوهاج' : 'Cash Buyer • Sohag'}</span>
        </div>
        <div className="hx-radar-blip hx-blip--2">
          <span className="hx-blip-dot" />
          <span className="hx-blip-label">{isAr ? 'طبيب مغترب • جدة' : 'Expat • Jeddah'}</span>
        </div>
        <div className="hx-radar-blip hx-blip--3">
          <span className="hx-blip-dot" />
          <span className="hx-blip-label">{isAr ? 'مشتري معتمد • الكوثر' : 'Vetted • Kawthar'}</span>
        </div>
      </div>

      <div className="hx-radar-footer">
        <div className="hx-radar-live-count">
          <span className="hx-pulse-dot-radar" />
          <span>{isAr ? 'مشترون كاش موثّقون' : 'Vetted cash buyers'}</span>
        </div>
        <span className="hx-radar-confidential-pill">
          {isAr ? 'بدون نشر علني • سرية تامة' : '100% Confidential Off-Market'}
        </span>
      </div>
    </div>
  );
}

/** 04 — Live WhatsApp / Drone Expat Remote Tour Widget */
function ExpatTourArt({ isAr }) {
  return (
    <div className="hx-expat-modern" aria-label={isAr ? 'معاينة الغربة الحية' : 'Live expat remote inspection'}>
      <div className="hx-expat-screen">
        {/* Live video HUD overlay */}
        <div className="hx-expat-hud-top">
          <div className="hx-hud-live-tag">
            <span className="hx-hud-rec-dot" />
            <span>{isAr ? 'بث حي ومباشر' : 'LIVE ON-SITE'}</span>
          </div>
          <span className="hx-hud-quality">4K HDR • 60fps</span>
        </div>

        {/* Crosshair telemetry */}
        <div className="hx-expat-crosshair">
          <Compass size={22} strokeWidth={1.75} className="hx-crosshair-icon" />
          <div className="hx-hud-target-box" />
        </div>

        <div className="hx-expat-hud-bottom">
          <div className="hx-hud-location-tag">
            <Radio size={13} strokeWidth={2.2} />
            <span>{isAr ? 'سوهاج الجديدة • تفقد إنشائي وميداني' : 'New Sohag • Site Audit'}</span>
          </div>
          <span className="hx-hud-latency">{isAr ? 'مباشر عبر واتساب' : 'Live WhatsApp Tour'}</span>
        </div>
      </div>

      <div className="hx-expat-footer">
        <div className="hx-expat-agent-tag">
          <Video size={14} strokeWidth={2.2} />
          <span>{isAr ? 'معاينة فيديو تفاعلية من أرض الواقع للمغتربين' : 'Interactive video viewings for expats'}</span>
        </div>
        <span className="hx-expat-badge-handover">
          {isAr ? 'حتى تسليم المفتاح' : 'Through Handover'}
        </span>
      </div>
    </div>
  );
}

const DEFAULT_ICONS = [ShieldCheck, Scale, Award, Video];

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
        <span className="hx-kicker">
          <Sparkles size={13} strokeWidth={1.75} aria-hidden="true" />
          {isAr ? 'التزامات 1Line' : '1Line commitments'}
        </span>
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
                  <span className="hx-bento-icon">
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                </div>
                <h3>{isAr ? std.title_ar : (std.title_en || std.title_ar)}</h3>
                <p>{isAr ? std.desc_ar : (std.desc_en || std.desc_ar)}</p>
                {badge && (
                  <span className="hx-bento-badge">
                    <Check size={12} strokeWidth={2} aria-hidden="true" />
                    {badge}
                  </span>
                )}
              </div>

              {idx === 0 && <CertificateArt isAr={isAr} />}
              {idx === 1 && <ComparablesArt isAr={isAr} />}
              {idx === 2 && <OffMarketArt isAr={isAr} />}
              {idx === 3 && <ExpatTourArt isAr={isAr} />}
            </article>
          );
        })}
      </div>
    </section>
  );
}
