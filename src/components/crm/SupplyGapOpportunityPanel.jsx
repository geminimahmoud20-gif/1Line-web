import { useMemo, useState } from 'react';
import {
  Sparkles,
  AlertOctagon,
  AlertTriangle,
  Building2,
  Users,
  Camera,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  PhoneCall,
  CheckCircle2,
  TrendingUp,
  MapPin,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardHeader, Button, Badge } from '../ui';
import {
  matchSellerLeadsToSupplyDeficits,
  buildPrepopulatedPropertyFromLead
} from '../../utils/supplyGapMatcher';

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
    <div className="crm-supply-gap-opp" style={{ marginBottom: '24px' }}>
      <Card>
        {/* Header with Luxury Accent */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '14px',
          borderBottom: '1px solid var(--crm-border, #E2E8F0)',
          paddingBottom: '16px',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                color: '#D4AF37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--crm-text, #0B1C36)' }}>
                {L('محرك سد العجز: مطابقة استمارات البائعين مع نقص المعروض', 'Supply Gap Auto-Matcher: Seller Intake vs Inventory Deficit')}
              </h3>
              <Badge tone="gold" size="sm">
                {L('أتمتة ذكية', 'Smart Automation')}
              </Badge>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--crm-text-muted, #64748B)' }}>
              {L(
                'يكتشف النظام المناطق التي تعاني من عجز في الوحدات المعروضة، ويطابقها تلقائياً مع وحدات البائعين غير المنشورة في CRM لمراجعتها وتحويلها لوحدات معروضة بضغطة زر واحدة.',
                'Detects supply shortages across districts and auto-matches unconverted seller leads ready for 1-click publishing.'
              )}
            </p>
          </div>

          {/* Quick Filter Buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '10px',
            padding: '12px 14px'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#991B1B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertOctagon size={14} />
              {L('مناطق تعاني من عجز حاد', 'Critical Deficit Areas')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
              {criticalDeficitCount} {L('مناطق', 'areas')}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '10px',
            padding: '12px 14px'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#065F46', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={14} />
              {L('وحدات مرشحة لسد العجز', 'Matched Candidate Units')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
              {totalOpportunityCount} {L('وحدات مسجلة', 'units')}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.02) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '10px',
            padding: '12px 14px'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#854D0E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} />
              {L('قيمة المعروض غير المستغل', 'Hidden Supply Value')}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B45309', marginTop: '4px' }}>
              {shortMoney(totalOpportunityValue, isAr)}
            </div>
          </div>
        </div>

        {/* Deficit Areas List */}
        {displayedDeficits.length === 0 ? (
          <div style={{
            padding: '30px',
            textAlign: 'center',
            backgroundColor: 'var(--crm-bg-subtle, #F8FAFC)',
            borderRadius: '10px',
            border: '1px dashed var(--crm-border, #CBD5E1)'
          }}>
            <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 6px', color: 'var(--crm-text, #0B1C36)' }}>
              {L('لا يوجد عجز معروض بحاجة للمطابقة حالياً', 'No matching deficits at this filter')}
            </h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--crm-text-muted, #64748B)' }}>
              {L('جميع المناطق المعروضة مغطاة أو تم تحويل وحدات البائعين بها بنجاح.', 'All areas have adequate inventory or available seller leads were already listed.')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {displayedDeficits.map((areaDeficit) => {
              const isExpanded = expandedAreaId === areaDeficit.areaId || (expandedAreaId === null && areaDeficit.matchingCount > 0);
              const isCritical = areaDeficit.severity === 'critical';

              return (
                <div
                  key={areaDeficit.areaId}
                  style={{
                    border: isCritical ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--crm-border, #E2E8F0)',
                    borderRadius: '10px',
                    backgroundColor: isCritical ? 'rgba(254, 242, 242, 0.4)' : '#FFFFFF',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}
                >
                  {/* Area Card Header */}
                  <div
                    onClick={() => setExpandedAreaId(isExpanded ? '__none' : areaDeficit.areaId)}
                    style={{
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      cursor: 'pointer',
                      borderBottom: isExpanded ? '1px solid var(--crm-border, #E2E8F0)' : 'none',
                      backgroundColor: isCritical ? 'rgba(254, 226, 226, 0.3)' : '#F8FAFC'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <MapPin size={18} color={isCritical ? '#DC2626' : '#2563EB'} />
                      <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--crm-text, #0B1C36)' }}>
                        {areaDeficit.areaName}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: isCritical ? '#FEE2E2' : '#FEF3C7',
                        color: isCritical ? '#991B1B' : '#92400E'
                      }}>
                        {areaDeficit.activeSupply === 0 ? L('عجز كلي (0 معروض)', 'Zero stock') : L(`معروض ${areaDeficit.activeSupply} فقط`, `${areaDeficit.activeSupply} live units`)}
                      </span>
                      {areaDeficit.buyerDemandsCount > 0 && (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Users size={12} />
                          {areaDeficit.buyerDemandsCount} {L('طلبات شراء نشطة', 'buyer demands')}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {areaDeficit.matchingCount > 0 ? (
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#059669',
                          backgroundColor: '#D1FAE5',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Sparkles size={14} />
                          {areaDeficit.matchingCount} {L('استمارة عميل مطابقة لسد العجز', 'matching seller leads')}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                          {L('لا توجد استمارات حالياً', 'No seller intake')}
                        </span>
                      )}
                      {isExpanded ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
                    </div>
                  </div>

                  {/* Area Body: Matching Candidate Leads */}
                  {isExpanded && (
                    <div style={{ padding: '16px 18px', backgroundColor: '#FFFFFF' }}>
                      {areaDeficit.matchingCount > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>
                            {L(
                              `وجدنا ${areaDeficit.matchingCount} عملاء مسجلين وحدات مطابقة لم تُعرض بعد في ${areaDeficit.areaName}. اضغط على «مراجعة وتحويل» لفتح نموذج العقار مباشرة واكتمال بياناته ونشره:`,
                              `Found ${areaDeficit.matchingCount} candidate seller units in ${areaDeficit.areaName} awaiting review and publishing:`
                            )}
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                            gap: '12px'
                          }}>
                            {areaDeficit.matchingLeads.map((cand) => (
                              <div
                                key={cand.leadId}
                                style={{
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '8px',
                                  padding: '12px 14px',
                                  backgroundColor: '#F8FAFC',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  gap: '10px',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {/* Candidate Top */}
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--crm-text, #0B1C36)' }}>
                                        {cand.leadName}
                                      </div>
                                      <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                                        {cand.phone || L('رقم غير مسجل', 'No phone')}
                                      </div>
                                    </div>
                                    <Badge tone="blue" size="sm">
                                      {cand.typeLabelAr}
                                    </Badge>
                                  </div>

                                  {/* Specs Pill Row */}
                                  <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px',
                                    fontSize: '0.8rem',
                                    color: '#334155',
                                    margin: '8px 0'
                                  }}>
                                    {cand.size > 0 && (
                                      <span style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>
                                        {cand.size} م²
                                      </span>
                                    )}
                                    {cand.rooms > 0 && (
                                      <span style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>
                                        {cand.rooms} غرف
                                      </span>
                                    )}
                                    {cand.floor && (
                                      <span style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>
                                        دور {cand.floor}
                                      </span>
                                    )}
                                    {cand.finishing && (
                                      <span style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>
                                        {cand.finishing}
                                      </span>
                                    )}
                                  </div>

                                  {/* Price and Photos */}
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: '8px',
                                    fontSize: '0.85rem'
                                  }}>
                                    <div style={{ fontWeight: 700, color: '#059669' }}>
                                      {cand.askingPrice > 0 ? `${money(cand.askingPrice)} ج.م` : L('سعر غير محدد', 'Price not set')}
                                    </div>

                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      color: cand.images.length > 0 ? '#0284C7' : '#94A3B8',
                                      fontSize: '0.8rem',
                                      fontWeight: 600
                                    }}>
                                      <Camera size={14} />
                                      {cand.images.length > 0 ? `${cand.images.length} ${L('صور', 'photos')}` : L('بدون صور', 'No photos')}
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{
                                  display: 'flex',
                                  gap: '6px',
                                  borderTop: '1px solid #E2E8F0',
                                  paddingTop: '10px'
                                }}>
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    style={{ flex: 1, backgroundColor: '#0B1C36', color: '#D4AF37' }}
                                    onClick={() => handleConvertCandidate(cand)}
                                  >
                                    <Sparkles size={14} style={{ marginInlineEnd: '4px' }} />
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
                                      style={{ color: '#059669' }}
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
                        <div style={{
                          padding: '16px',
                          borderRadius: '8px',
                          backgroundColor: '#FFFBEB',
                          border: '1px solid #FDE68A',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px'
                        }}>
                          <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#92400E', marginBottom: '2px' }}>
                              {L('توجيه استقطاب عقاري مطلوب (Sourcing Advisory)', 'Inventory Sourcing Advisory')}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#B45309', lineHeight: 1.5 }}>
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
