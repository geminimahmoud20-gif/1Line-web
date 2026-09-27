import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, LayoutPanelTop, LandPlot, Store, ArrowLeft, ArrowRight, Calculator, ChevronDown } from 'lucide-react';
import { FAMILY_KINDS } from '../../utils/propertyInsights';
import FamilyCostSplitter from './FamilyCostSplitter';
import '../../styles/expat-suite.css';

const ICONS = { full_building: Building2, adjacent_units: LayoutPanelTop, double_frontage_land: LandPlot, investment_hq: Store };

/**
 * بيت العيلة واستثمار المستقبل — homepage entry to family-sized listings
 * (whole buildings, adjacent units, double-frontage land, family commercial assets).
 */
export default function FamilyLegacySection({ lang = 'ar', currency = 'EGP', properties = [] }) {
  const isAr = lang === 'ar';
  const [calcOpen, setCalcOpen] = useState(false);
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  const counts = useMemo(() => {
    const c = {};
    for (const p of properties) {
      const k = p?.family?.kind;
      if (k) c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [properties]);

  return (
    <section className="xs-family" aria-labelledby="xs-family-title">
      <header className="xs-section-head">
        <p className="xs-kicker">{isAr ? 'بيت العيلة واستثمار المستقبل' : 'Family legacy & future investment'}</p>
        <h2 id="xs-family-title">{isAr ? <>بيت واحد يجمع <em>العيلة</em>، ودخل يكبر مع <em>الأولاد</em></> : <>One home for the <em>family</em>, income that grows with the <em>children</em></>}</h2>
        <p>
          {isAr
            ? 'عمارة كاملة لكل أخ دور، أو شقق متجاورة، أو أرض تبنوا عليها على مزاجكم — مع حاسبة توزع التكلفة بينكم بوضوح.'
            : 'A whole building with a floor each, adjacent units, or land to build your way — with a calculator that splits the cost clearly.'}
        </p>
      </header>

      <div className="xs-family-grid">
        {FAMILY_KINDS.map((k, i) => {
          const Icon = ICONS[k.id] || Building2;
          const n = counts[k.id] || 0;
          return (
            <Link key={k.id} to={`/properties?family=${k.id}`} className="xs-family-tile" style={{ '--i': i }}>
              <span className="xs-family-icon"><Icon size={22} strokeWidth={1.6} aria-hidden="true" /></span>
              <strong>{isAr ? k.ar : k.en}</strong>
              <small>{isAr ? k.desc_ar : k.desc_en}</small>
              <span className="xs-family-foot">
                <span>{n > 0 ? (isAr ? `${n} عقار متاح` : `${n} available`) : (isAr ? 'اطلب ونوفرلك' : 'Request one')}</span>
                <Arrow size={15} aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>

      <div className={`xs-family-calc ${calcOpen ? 'is-open' : ''}`}>
        <button type="button" className="xs-family-calc-toggle" onClick={() => setCalcOpen((o) => !o)} aria-expanded={calcOpen}>
          <Calculator size={17} aria-hidden="true" />
          <span>{isAr ? 'حاسبة توزيع التكلفة على العيلة + دراسة الإيجار' : 'Family cost split + rental study'}</span>
          <ChevronDown size={16} className="xs-chev" aria-hidden="true" />
        </button>
        {calcOpen && <FamilyCostSplitter lang={lang} currency={currency} />}
      </div>
    </section>
  );
}
