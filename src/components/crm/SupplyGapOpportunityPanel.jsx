import { useMemo, useState } from 'react';
import {
  Sparkles,
  AlertOctagon,
  AlertTriangle,
  Building2,
  Users,
  Camera,
  ExternalLink,
  MessageCircle,
  CheckCircle2,
  TrendingUp,
  MapPin,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, Button, Badge } from '../ui';
import { matchSellerLeadsToSupplyDeficits } from '../../utils/supplyGapMatcher';
import './supply-gap-opportunity.css';

const money = (n) => (n ? Number(n).toLocaleString('en-US') : '—');
const shortMoney = (n, isAr) => {
  if (!n) return '—';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} ${isAr ? 'مليون ج.م' : 'M EGP'}`;
  return `${money(n)} ${isAr ? 'ج.م' : 'EGP'}`;
};

export default function SupplyGapOpportunityPanel({
  properties = [],
  leads = [],
  demands = [],
  areas = [],
  lang = 'ar',
  onConvertToProperty,
  onOpenLead,
  triggerToast
}) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);

  const [filterMode, setFilterMode] = useState('with_candidates'); // 'with_candidates' | 'all' | 'critical'
  const [expandedAreaId, setExpandedAreaId] = useState(null);

  const analysis = useMemo(() => {
    return matchSellerLeadsToSupplyDeficits(properties, leads, demands, areas);
  }, [properties, leads, demands, areas]);

  const {
    matchedDeficits,
    totalDeficitAreas,
    criticalDeficitCount,
    totalOpportunityCount,
    totalOpportunityValue
  } = analysis;

  const displayedDeficits = useMemo(() => {
    if (filterMode === 'with_candidates') {
      return matchedDeficits.filter((d) => d.matchingCount > 0);
    }
    if (filterMode === 'critical') {
      return matchedDeficits.filter((d) => d.severity === 'critical');
    }
    return matchedDeficits;
  }, [matchedDeficits, filterMode]);

  const handleConvertCandidate = (candidate) => {
    if (onConvertToProperty) {
      onConvertToProperty(candidate.leadRef);
    } else if (triggerToast) {
      triggerToast(L('يرجى الانتقال لتبويب العقارات لتسجيل الوحدة.', 'Switch to properties tab to register listing.'), 'info');
    }
  };

  const handleOpenWhatsApp = (phone, candidate) => {
    if (!phone) return;
    const cleanPhone = String(phone).replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? `20${cleanPhone.slice(1)}` : cleanPhone;
    const msg = isAr
      ? `أهلاً بحضرتك أستاذ ${candidate.leadName}، بخصوص وحدتك المعروضة للبيع (${candidate.typeLabelAr} في ${candidate.areaNameAr})، يسعدنا في وان لاين للتسويق العقاري استكمال عرض وحدتك لشبكة عملائنا المهتمين بالشراء حالياً.`
      : `Hello ${candidate.leadName}, regarding your property listing with One Line Real Estate, we would like to review the details to showcase it to our active buyers.`;
    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="crm-supply-gap-opp sgo-wrap">
      <Card>
        {/* Header with Luxury Accent */}
        <div className="sgo-header">
          <div>
            <div className="sgo-header-row">
              <div className="sgo-header-icon">
                <Sparkles size={18} />
              </div>
              <h3 className="sgo-title">
                {L('محرك سد العجز: مطابقة استمارات البائعين مع نقص المعروض', 'Supply Gap Auto-Matcher: Seller Intake vs Inventory Deficit')}
              </h3>
              <Badge tone="gold" size="sm">
                {L('أتمتة ذكية', 'Smart Automation')}
              </Badge>
            </div>
            <p className="sgo-desc">
              {L(
                'يكتشف النظام المناطق التي تعاني من عجز في الوحدات المعروضة، ويطابقها تلقائياً مع وحدات البائعين غير المنشورة في CRM لمراجعتها وتحويلها لوحدات معروضة بضغطة زر واحدة.',
                'Detects supply shortages across districts and auto-matches unconverted seller leads ready for 1-click publishing.'
              )}
            </p>
          </div>

          {/* Quick Filter Buttons */}
          <div className="sgo-filters">
            <Button
              size="sm"
              variant={filterMode === 'with_candidates' ? 'primary' : 'secondary'}
              onClick={() => setFilterMode('with_candidates')}
            >
              {L(`يوجد مرشحين (${matchedDeficits.filter((d) => d.matchingCount > 0).length})`, `With Candidates (${matchedDeficits.filter((d) => d.matchingCount > 0).length})`)}
            </Button>
            <Button
              size="sm"
              variant={filterMode === 'critical' ? 'primary' : 'secondary'}
              onClick={() => setFilterMode('critical')}
            >
              {L(`عجز كلي (0 معروض) (${criticalDeficitCount})`, `Zero Stock (${criticalDeficitCount})`)}
            </Button>
            <Button
              size="sm"
              variant={filterMode === 'all' ? 'primary' : 'secondary'}
              onClick={() => setFilterMode('all')}
            >
              {L(`كل المناطق ذات العجز (${totalDeficitAreas})`, `All Deficits (${totalDeficitAreas})`)}
            </Button>
          </div>
        </div>

        {/* Executive Stats Banner */}
        <div className="sgo-stats-grid">
          <div className="sgo-stat-card sgo-stat-card--danger">
            <div className="sgo-stat-label sgo-stat-label--danger">
              <AlertOctagon size={14} />
              {L('مناطق تعاني من عجز حاد', 'Critical Deficit Areas')}
            </div>
            <div className="sgo-stat-value sgo-stat-value--danger">
              {criticalDeficitCount} {L('مناطق', 'areas')}
            </div>
          </div>

          <div className="sgo-stat-card sgo-stat-card--positive">
            <div className="sgo-stat-label sgo-stat-label--positive">
              <Building2 size={14} />
              {L('وحدات مرشحة لسد العجز', 'Matched Candidate Units')}
            </div>
            <div className="sgo-stat-value sgo-stat-value--positive">
              {totalOpportunityCount} {L('وحدات مسجلة', 'units')}
            </div>
          </div>

          <div className="sgo-stat-card sgo-stat-card--warn">
            <div className="sgo-stat-label sgo-stat-label--warn">
              <TrendingUp size={14} />
              {L('قيمة المعروض غير المستغل', 'Hidden Supply Value')}
            </div>
            <div className="sgo-stat-value sgo-stat-value--warn">
              {shortMoney(totalOpportunityValue, isAr)}
            </div>
          </div>
        </div>

        {/* Deficit Areas List */}
        {displayedDeficits.length === 0 ? (
          <div className="sgo-empty">
            <CheckCircle2 size={36} color="var(--crm-positive)" className="sgo-empty-icon" />
            <h4 className="sgo-empty-title">
              {L('لا يوجد عجز معروض بحاجة للمطابقة حالياً', 'No matching deficits at this filter')}
            </h4>
            <p className="sgo-empty-text">
              {L('جميع المناطق المعروضة مغطاة أو تم تحويل وحدات البائعين بها بنجاح.', 'All areas have adequate inventory or available seller leads were already listed.')}
            </p>
          </div>
        ) : (
          <div className="sgo-deficit-list">
            {displayedDeficits.map((areaDeficit) => {
              const isExpanded = expandedAreaId === areaDeficit.areaId || (expandedAreaId === null && areaDeficit.matchingCount > 0);
              const isCritical = areaDeficit.severity === 'critical';

              return (
                <div key={areaDeficit.areaId} className={`sgo-area-card ${isCritical ? 'is-critical' : ''}`}>
                  {/* Area Card Header */}
                  <div
                    onClick={() => setExpandedAreaId(isExpanded ? '__none' : areaDeficit.areaId)}
                    className={`sgo-area-head ${isCritical ? 'is-critical' : ''} ${isExpanded ? 'is-expanded' : ''}`}
                  >
                    <div className="sgo-area-head-left">
                      <MapPin size={18} color={isCritical ? 'var(--crm-danger)' : 'var(--crm-info)'} />
                      <span className="sgo-area-name">
                        {areaDeficit.areaName}
                      </span>
                      <span className={`sgo-pill ${isCritical ? 'sgo-pill--critical' : 'sgo-pill--warn'}`}>
                        {areaDeficit.activeSupply === 0 ? L('عجز كلي (0 معروض)', 'Zero stock') : L(`معروض ${areaDeficit.activeSupply} فقط`, `${areaDeficit.activeSupply} live units`)}
                      </span>
                      {areaDeficit.buyerDemandsCount > 0 && (
                        <span className="sgo-pill sgo-pill--info">
                          <Users size={12} />
                          {areaDeficit.buyerDemandsCount} {L('طلبات شراء نشطة', 'buyer demands')}
                        </span>
                      )}
                    </div>

                    <div className="sgo-area-head-right">
                      {areaDeficit.matchingCount > 0 ? (
                        <span className="sgo-match-pill">
                          <Sparkles size={14} />
                          {areaDeficit.matchingCount} {L('استمارة عميل مطابقة لسد العجز', 'matching seller leads')}
                        </span>
                      ) : (
                        <span className="sgo-no-intake">
                          {L('لا توجد استمارات حالياً', 'No seller intake')}
                        </span>
                      )}
                      {isExpanded ? <ChevronUp size={18} color="var(--crm-muted)" /> : <ChevronDown size={18} color="var(--crm-muted)" />}
                    </div>
                  </div>

                  {/* Area Body: Matching Candidate Leads */}
                  {isExpanded && (
                    <div className="sgo-area-body">
                      {areaDeficit.matchingCount > 0 ? (
                        <div className="sgo-candidates-wrap">
                          <div className="sgo-candidates-intro">
                            {L(
                              `وجدنا ${areaDeficit.matchingCount} عملاء مسجلين وحدات مطابقة لم تُعرض بعد في ${areaDeficit.areaName}. اضغط على «مراجعة وتحويل» لفتح نموذج العقار مباشرة واكتمال بياناته ونشره:`,
                              `Found ${areaDeficit.matchingCount} candidate seller units in ${areaDeficit.areaName} awaiting review and publishing:`
                            )}
                          </div>

                          <div className="sgo-candidates-grid">
                            {areaDeficit.matchingLeads.map((cand) => (
                              <div key={cand.leadId} className="sgo-candidate-card">
                                {/* Candidate Top */}
                                <div>
                                  <div className="sgo-candidate-top-row">
                                    <div>
                                      <div className="sgo-candidate-name">
                                        {cand.leadName}
                                      </div>
                                      <div className="sgo-candidate-phone">
                                        {cand.phone || L('رقم غير مسجل', 'No phone')}
                                      </div>
                                    </div>
                                    <Badge tone="blue" size="sm">
                                      {cand.typeLabelAr}
                                    </Badge>
                                  </div>

                                  {/* Specs Pill Row */}
                                  <div className="sgo-specs-row">
                                    {cand.size > 0 && (
                                      <span className="sgo-spec-pill">
                                        {cand.size} م²
                                      </span>
                                    )}
                                    {cand.rooms > 0 && (
                                      <span className="sgo-spec-pill">
                                        {cand.rooms} غرف
                                      </span>
                                    )}
                                    {cand.floor && (
                                      <span className="sgo-spec-pill">
                                        دور {cand.floor}
                                      </span>
                                    )}
                                    {cand.finishing && (
                                      <span className="sgo-spec-pill">
                                        {cand.finishing}
                                      </span>
                                    )}
                                  </div>

                                  {/* Price and Photos */}
                                  <div className="sgo-price-row">
                                    <div className="sgo-price">
                                      {cand.askingPrice > 0 ? `${money(cand.askingPrice)} ج.م` : L('سعر غير محدد', 'Price not set')}
                                    </div>

                                    <div className={`sgo-photos ${cand.images.length > 0 ? 'has-photos' : ''}`}>
                                      <Camera size={14} />
                                      {cand.images.length > 0 ? `${cand.images.length} ${L('صور', 'photos')}` : L('بدون صور', 'No photos')}
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="sgo-candidate-actions">
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    className="sgo-convert-btn"
                                    onClick={() => handleConvertCandidate(cand)}
                                  >
                                    <Sparkles size={14} className="sgo-convert-btn-icon" />
                                    {L('مراجعة وتحويل لوحدة معروضة 🚀', 'Review & Convert 🚀')}
                                  </Button>

                                  {onOpenLead && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => onOpenLead(cand.leadRef)}
                                      title={L('فتح استمارة العميل في CRM', 'Open client lead in CRM')}
                                    >
                                      <ExternalLink size={14} />
                                    </Button>
                                  )}

                                  {cand.phone && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="sgo-whatsapp-btn"
                                      onClick={() => handleOpenWhatsApp(cand.phone, cand)}
                                      title={L('مراسلة عبر واتساب', 'Chat on WhatsApp')}
                                    >
                                      <MessageCircle size={14} />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* Sourcing Advisory when no leads exist for deficit */
                        <div className="sgo-advisory">
                          <AlertTriangle size={20} color="var(--crm-warn)" className="sgo-advisory-icon" />
                          <div>
                            <div className="sgo-advisory-title">
                              {L('توجيه استقطاب عقاري مطلوب (Sourcing Advisory)', 'Inventory Sourcing Advisory')}
                            </div>
                            <p className="sgo-advisory-text">
                              {L(
                                `المنطقة تعاني من عجز في المعروض ولم يسجل أي بائع وحدات بها مؤخراً. نقترح على فريق التسويق إطلاق حملة استقطاب ملاك وبائعين في (${areaDeficit.areaName}) لتلبية طلبات الشراء الحالية وسد فجوة المخزون.`,
                                `No seller leads currently recorded for ${areaDeficit.areaName}. We recommend launching targeted seller ads to supply active buyers in this sector.`
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
