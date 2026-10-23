import { Bath, BedDouble, Briefcase, Building, CheckCircle2, Clock, Factory, Layers, Maximize2, ShieldCheck, Sparkles, Sprout, Store, Zap } from 'lucide-react';
import { isAgricultural, isIndustrial, filledSpecs, sizeLabel, pricePerFeddan } from '../../../utils/propertyKinds';
import { Users, ArrowUpDown, Car, Trees, Landmark } from 'lucide-react';
import { buildingFacts, featuresBesideFacts } from '../../../utils/buildingFeatures';
import { countLabel } from '../../../utils/arabicCount';
import SunlightCompassWidget from '../SunlightCompassWidget';
import FinancialBreakdown from '../FinancialBreakdown';
import FamilyCostSplitter from '../../family/FamilyCostSplitter';
import CommercialInsightsCard from '../../commercial/CommercialInsightsCard';

const BUILDING_ICONS = { elevator: ArrowUpDown, garage: Car, garden: Trees, landShare: Landmark };

export default function PropertyOverviewTab({
  currency,
  deliveryText,
  description,
  familyInfo,
  features,
  finishing,
  isAr,
  isCommercial,
  isLand,
  isOffice,
  lang,
  licenseText,
  property,
  setActiveTab,
  utilityItems
}) {
  // Farmland and industrial units list their own details (irrigation, power…) instead of rooms
  const agri = isAgricultural(property);
  const special = agri || isIndustrial(property);
  const specs = filledSpecs(property, isAr);
  const perFeddan = agri ? pricePerFeddan(property) : 0;
  const building = buildingFacts(property, isAr);
  // Elevator, land share… already sit in the specs above, so the list keeps the rest
  const extras = featuresBesideFacts(features, building);
  return (
    <div className="tab-pane-content">
      {/* Quick Specs Overview Grid */}
      <div className="detail-card-box">
        <h3>{isAr ? 'المواصفات الرئيسية للعقار' : 'Key Specifications'}</h3>
        <div className="specs-detail-grid">
          <div className="spec-box">
            <Maximize2 size={20} className="text-gold" />
            <div>
              <span className="spec-lbl">{isAr ? 'المساحة الإجمالية' : 'Total Area'}</span>
              <strong>{agri ? sizeLabel(property, isAr) : `${property.size} ${isAr ? 'م² صافي' : 'sqm net'}`}</strong>
            </div>
          </div>

          {/* Sector-Specific Specifications */}
          {special ? (
            <>
              {perFeddan > 0 && (
                <div className="spec-box">
                  <Sparkles size={20} className="text-gold" />
                  <div>
                    <span className="spec-lbl">{isAr ? 'سعر الفدان' : 'Price per feddan'}</span>
                    <strong>{perFeddan.toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}</strong>
                  </div>
                </div>
              )}
              {specs.map((sp) => (
                <div className="spec-box" key={sp.key}>
                  {agri ? <Sprout size={20} className="text-gold" /> : <Factory size={20} className="text-gold" />}
                  <div>
                    <span className="spec-lbl">{sp.label}</span>
                    <strong>{sp.value}</strong>
                  </div>
                </div>
              ))}
              {property.frontage && (
                <div className="spec-box">
                  <Layers size={20} className="text-gold" />
                  <div>
                    <span className="spec-lbl">{isAr ? 'الواجهة' : 'Frontage'}</span>
                    <strong>{property.frontage}</strong>
                  </div>
                </div>
              )}
              {licenseText && (
                <div className="spec-box">
                  <ShieldCheck size={20} className="text-gold" />
                  <div>
                    <span className="spec-lbl">{isAr ? 'الترخيص (من المراجعة)' : 'Licence (reviewed)'}</span>
                    <strong>{licenseText}</strong>
                  </div>
                </div>
              )}
            </>
          ) : isLand ? (
            <>
              {property.landType_ar && (
                <div className="spec-box">
                  <Building size={20} className="text-gold" />
                  <div>
                    <span className="spec-lbl">{isAr ? 'تصنيف الأرض' : 'Land Classification'}</span>
                    <strong>{isAr ? property.landType_ar : (property.landType_en || property.landType_ar)}</strong>
                  </div>
                </div>
              )}
              {property.frontage && (
                <div className="spec-box">
                  <Sparkles size={20} className="text-gold" />
                  <div>
                    <span className="spec-lbl">{isAr ? 'واجهة القطعة' : 'Plot Frontage'}</span>
                    <strong>{property.frontage}</strong>
                  </div>
                </div>
              )}
              {licenseText && (
                <div className="spec-box">
                  <ShieldCheck size={20} className="text-gold" />
                  <div>
                    <span className="spec-lbl">{isAr ? 'الترخيص (من المراجعة)' : 'Licence (reviewed)'}</span>
                    <strong>{licenseText}</strong>
                  </div>
                </div>
              )}
            </>
          ) : isCommercial ? (
            <>
              <div className="spec-box">
                <Store size={20} className="text-gold" />
                <div>
                  <span className="spec-lbl">{isAr ? 'نوع العقار التجاري' : 'Commercial Type'}</span>
                  <strong>{property.commercialType_ar || (isAr ? 'محل تجاري واجهة' : 'Retail Shop')}</strong>
                </div>
              </div>
              {property.frontage && (
                <div className="spec-box">
                  <Sparkles size={20} className="text-gold" />
                  <div>
                    <span className="spec-lbl">{isAr ? 'عرض الواجهة' : 'Storefront Width'}</span>
                    <strong>{property.frontage}</strong>
                  </div>
                </div>
              )}
              {licenseText && (
                <div className="spec-box">
                  <ShieldCheck size={20} className="text-gold" />
                  <div>
                    <span className="spec-lbl">{isAr ? 'الترخيص (من المراجعة)' : 'Licence (reviewed)'}</span>
                    <strong>{licenseText}</strong>
                  </div>
                </div>
              )}
            </>
          ) : isOffice ? (
            <>
              <div className="spec-box">
                <Briefcase size={20} className="text-gold" />
                <div>
                  <span className="spec-lbl">{isAr ? 'نوع المقر الإداري' : 'Admin Type'}</span>
                  <strong>{property.adminType_ar || (isAr ? 'مكتب إداري / عيادة' : 'Admin Office / Clinic')}</strong>
                </div>
              </div>
              {property.frontage && (
                <div className="spec-box">
                  <Sparkles size={20} className="text-gold" />
                  <div>
                    <span className="spec-lbl">{isAr ? 'الواجهة' : 'Facade'}</span>
                    <strong>{property.frontage}</strong>
                  </div>
                </div>
              )}
              {licenseText && (
                <div className="spec-box">
                  <ShieldCheck size={20} className="text-gold" />
                  <div>
                    <span className="spec-lbl">{isAr ? 'الترخيص (من المراجعة)' : 'Licence (reviewed)'}</span>
                    <strong>{licenseText}</strong>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Residential Units */
            <>
              {property.bedrooms > 0 && (
                <div className="spec-box">
                  <BedDouble size={20} className="text-gold" />
                  <div>
                    <span className="spec-lbl">{isAr ? 'غرف النوم' : 'Bedrooms'}</span>
                    <strong>{countLabel('room', property.bedrooms, isAr)}</strong>
                  </div>
                </div>
              )}

              {property.bathrooms > 0 && (
                <div className="spec-box">
                  <Bath size={20} className="text-gold" />
                  <div>
                    <span className="spec-lbl">{isAr ? 'الحمامات' : 'Bathrooms'}</span>
                    <strong>{countLabel('bath', property.bathrooms, isAr)}</strong>
                  </div>
                </div>
              )}
            </>
          )}

          {!isLand && !special && property.floor !== undefined && property.floor !== null && property.floor !== '' && (
            <div className="spec-box">
              <Layers size={20} className="text-gold" />
              <div>
                <span className="spec-lbl">{isAr ? 'الدور / الطابق' : 'Floor'}</span>
                <strong>{Number(property.floor) === 0 ? (isAr ? 'أرضي' : 'Ground') : property.floor}</strong>
              </div>
            </div>
          )}

          {building.map((f) => {
            const Icon = BUILDING_ICONS[f.key];
            return (
              <div className={`spec-box${f.positive ? '' : ' spec-box--no'}`} key={f.key}>
                <Icon size={20} className="text-gold" aria-hidden="true" />
                <div>
                  <span className="spec-lbl">{f.label}</span>
                  <strong>{f.value}</strong>
                </div>
              </div>
            );
          })}

          {finishing && (
            <div className="spec-box">
              <Sparkles size={20} className="text-gold" />
              <div>
                <span className="spec-lbl">{isLand ? (isAr ? 'طبيعة التجهيز' : 'Site Readiness') : (isAr ? 'مستوى التشطيب' : 'Finishing')}</span>
                <strong>{finishing}</strong>
              </div>
            </div>
          )}

          {deliveryText && (
            <div className="spec-box">
              <Clock size={20} className="text-gold" />
              <div>
                <span className="spec-lbl">{isAr ? 'الاستلام' : 'Delivery'}</span>
                <strong>{deliveryText}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🧾 مصفوفة الشفافية المالية — every cost from the listing's own data */}
      <FinancialBreakdown property={property} lang={lang} currency={currency} />

      {/* 👨‍👩‍👧 بيت العيلة — only for listings tagged in the CRM */}
      {familyInfo && (
        <section className="xs-fam-card" aria-labelledby="xs-fam-card-title">
          <header className="xs-fin-head">
            <span className="xs-fin-icon"><Users size={20} aria-hidden="true" /></span>
            <div>
              <h3 id="xs-fam-card-title">{isAr ? `بيت العيلة: ${familyInfo.kind.ar}` : `Family hub: ${familyInfo.kind.en}`}</h3>
              <p>
                {familyInfo.units > 0
                  ? (isAr ? `${familyInfo.units} وحدة قابلة للفرز` : `${familyInfo.units} units that can be split`)
                  : (isAr ? familyInfo.kind.desc_ar : familyInfo.kind.desc_en)}
                {(isAr ? familyInfo.note_ar : familyInfo.note_en || familyInfo.note_ar) ? ` — ${isAr ? familyInfo.note_ar : familyInfo.note_en || familyInfo.note_ar}` : ''}
              </p>
            </div>
          </header>
          <FamilyCostSplitter property={property} lang={lang} currency={currency} compact />
        </section>
      )}

      {/* 🏥 مؤشرات القرار للعقار التجاري/الطبي + حاسبة العائد */}
      <CommercialInsightsCard property={property} lang={lang} currency={currency} />

      {/* Description Box: hidden while the listing has no description yet */}
      {String(description || '').trim() && (
        <div className="detail-card-box">
          <h3>{isAr ? 'وصف العقار وتفاصيل الموقع' : 'Property Description'}</h3>
          <p className="detail-description-p">{description}</p>
        </div>
      )}

      {/* Features & Amenities List */}
      {extras.length > 0 && (
        <div className="detail-card-box">
          <h3>{isAr ? 'المزايا والخدمات الملحقة' : 'Features & Amenities'}</h3>
          <div className="features-checklist-grid">
            {extras.map((feat, i) => (
              <div key={i} className="feature-check-item">
                <CheckCircle2 size={18} className="text-gold" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⚖️ Legal status at a glance (full summary lives in the legal tab) */}
      <button type="button" className={`pd-legal-glance ${property.legalStatus ? 'is-reviewed' : 'is-pending'}`} onClick={() => setActiveTab('legal')}>
        <ShieldCheck size={18} aria-hidden="true" />
        <span>
          <strong>{property.legalStatus ? (isAr ? 'المستندات مراجَعة' : 'Documents reviewed') : (isAr ? 'المراجعة القانونية لم تُنشر بعد' : 'Legal review not published yet')}</strong>
          <small>
            {property.legalStatus
              ? ((isAr ? property.legalStatus.ownershipType_ar : (property.legalStatus.ownershipType_en || property.legalStatus.ownershipType_ar)) || (isAr ? 'اعرض ملخص المراجعة' : 'See the review summary'))
              : (isAr ? 'نراجع المستندات معك قبل أي حجز' : 'We review documents with you before any reservation')}
          </small>
        </span>
        <span className="pd-legal-glance-cta">{isAr ? 'التفاصيل ←' : 'Details →'}</span>
      </button>

      {/* 🔌 Utilities — only what the team recorded for this unit (CRM → المرافق) */}
      {utilityItems.length > 0 && (
        <div className="detail-card-box pd-utilities">
          <div className="pd-utilities-head">
            <h3>
              <Zap size={20} className="text-gold" aria-hidden="true" />
              <span>{isAr ? 'المرافق والخدمات' : 'Utilities'}</span>
            </h3>
            {property.utilities?.verifiedOnSite && (
              <span className="pd-utilities-verified">
                {isAr ? '✓ تمت المعاينة ميدانياً' : '✓ Checked on site'}
                {property.utilities?.verifiedDate ? ` — ${property.utilities.verifiedDate}` : ''}
              </span>
            )}
          </div>
          <ul className="pd-utilities-grid">
            {utilityItems.map(({ key, Icon, label, value }) => (
              <li key={key}>
                <Icon size={18} aria-hidden="true" />
                <div>
                  <strong>{label}</strong>
                  <span>{value}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 💼 Optional turnkey / rental management service (not shown for land) */}
      {!isLand && !special && <div className="investor-turnkey-banner detail-card-box" style={{
        background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.08), rgba(11, 78, 162, 0.06))',
        border: '1px solid rgba(217, 119, 6, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '16px'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          background: 'var(--accent-gold, #d97706)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Briefcase size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
            {isAr ? 'خدمة اختيارية: الاستلام والتشطيب وإدارة الإيجار' : 'Optional service: handover, finishing & rental management'}
          </h4>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
            {isAr
              ? 'لو مقيم بعيد، نقدر نتابع الاستلام والتشطيب ونبحث لك عن مستأجر وندير الإيجار. نطاق الخدمة وأتعابها في اتفاق مكتوب منفصل.'
              : 'If you live away, we can handle handover, finishing, tenant search and rent management. Scope and fees go in a separate written agreement.'}
          </p>
        </div>
      </div>}

      {/* 🧭☀️ Orientation, Natural Breeze & Sunlight Compass */}
      <SunlightCompassWidget
        property={property}
        lang={lang}
      />
    </div>

  );
}
