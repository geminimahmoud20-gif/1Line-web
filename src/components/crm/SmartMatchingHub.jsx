import { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Building, 
  User, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  ArrowRight, 
  Car, 
  TrendingUp, 
  DollarSign,
  Filter,
  Flame,
  Zap
} from 'lucide-react';
import SiteVisitModal from './SiteVisitModal';
import { getAreas, normalizeAreaKey } from '../../utils/areasData';

export default function SmartMatchingHub({
  leads = [],
  properties = [],
  onUpdateLead,
  onOpenLead,
  lang = 'ar',
  triggerToast
}) {
  const isAr = lang === 'ar';
  const [minMatchScore, setMinMatchScore] = useState(60);
  const [schedulingVisitLead, setSchedulingVisitLead] = useState(null);

  const allAreas = useMemo(() => getAreas(), []);

  const getLocalizedArea = (areaKey) => {
    if (!areaKey) return isAr ? 'سوهاج' : 'Sohag';
    const cleanKey = normalizeAreaKey(areaKey);
    const map = {
      thakafa: 'حي الثقافة',
      east: 'حي شرق',
      west: 'حي غرب',
      center: 'وسط البلد',
      new_sohag: 'سوهاج الجديدة',
      corniche: 'كورنيش النيل',
      city: 'سيتي والشبان',
      kawthar: 'مدينة الكوثر',
      akhmeem: 'أخميم',
      tahta: 'طهطا',
      girga: 'جرجا',
      araba: 'عرابة أبيدوس'
    };
    if (map[cleanKey]) return map[cleanKey];
    const found = allAreas.find(a => a.id === cleanKey);
    return found ? (isAr ? (found.name_ar || found.label_ar) : (found.name_en || found.label_en)) : areaKey;
  };

  // Compute live match matrix between Buyer Leads and Published Properties
  const matches = useMemo(() => {
    const buyerLeads = leads.filter(l => l.type === 'buyer' || l.type === 'investor' || l.type === 'request' || !l.type);
    const liveProps = properties.filter(p => !p.isDeleted && p.status !== 'trash' && p.status !== 'hidden');

    const results = [];

    buyerLeads.forEach(lead => {
      const details = lead.details || {};
      const rawLeadArea = lead.area || details.area || lead.location || '';
      const leadArea = normalizeAreaKey(rawLeadArea);
      const leadType = (lead.propertyType || details.propertyType || '').toLowerCase();
      const leadBudget = parseInt(lead.budget) || parseInt(details.budget) || parseInt(details.investmentAmount) || 2500000;

      liveProps.forEach(prop => {
        let score = 0;
        const reasons = [];
        const propArea = normalizeAreaKey(prop.areaKey);

        // 1. Area match (35 pts) - Normalized comparison
        if (leadArea && (propArea === leadArea || leadArea === 'all' || propArea === 'all')) {
          score += 35;
          reasons.push(isAr ? 'نفس المنطقة المستهدفة' : 'Area match');
        } else if (!rawLeadArea) {
          score += 20;
        }

        // 2. Property type match (30 pts)
        if (leadType && (prop.type === leadType || prop.category === leadType)) {
          score += 30;
          reasons.push(isAr ? 'نفس نوع العقار' : 'Type match');
        } else if (!leadType) {
          score += 15;
        }

        // 3. Budget match (35 pts)
        if (prop.price) {
          const diffRatio = Math.abs(prop.price - leadBudget) / leadBudget;
          if (diffRatio <= 0.1) {
            score += 35;
            reasons.push(isAr ? 'مطابق تماماً للميزانية' : 'Exact budget match');
          } else if (diffRatio <= 0.25) {
            score += 25;
            reasons.push(isAr ? 'قريب جداً من الميزانية' : 'Close to budget');
          } else if (prop.price <= leadBudget) {
            score += 30;
            reasons.push(isAr ? 'أقل من الميزانية المحددة' : 'Under budget');
          }
        }

        if (score >= minMatchScore) {
          results.push({
            id: `match-${lead.id}-${prop.id}`,
            lead,
            property: prop,
            score,
            reasons,
            budgetDifference: prop.price - leadBudget
          });
        }
      });
    });

    return results.sort((a, b) => b.score - a.score);
  }, [leads, properties, minMatchScore, isAr]);

  // Dispatch proposal directly to buyer via WhatsApp
  const handleSendProposal = (match) => {
    const { lead, property } = match;
    const phone = lead.whatsapp || lead.phone;
    const cleanPhone = phone?.replace(/[^0-9]/g, '');

    const propTitle = isAr ? property.title_ar : property.title_en;
    const propPrice = property.price?.toLocaleString();
    const propLoc = getLocalizedArea(property.areaKey);

    const waText = isAr
      ? `🏛️ *شركة 1Line للحلول العقارية — عرض عقاري مخصص لطلبكم (${match.score}% نسبة توافق)*\n\n` +
        `أهلاً بك أ. *${lead.name}*،\n` +
        `بناءً على طلبكم المسجل لدينا، وجدنا لك وحدة عقارية استثنائية تطابق معاييرك تماماً:\n\n` +
        `🏢 *الوحدة:* ${propTitle}\n` +
        `📍 *الموقع:* ${propLoc}\n` +
        `📐 *المساحة:* ${property.size} م² (${property.bedrooms || 0} غرف)\n` +
        `💰 *السعر الإجمالي:* ${propPrice} ج.م\n` +
        `💳 *المقدم:* ${property.downPayment?.toLocaleString()} ج.م وقسط شهري: ${property.monthlyInstallment?.toLocaleString()} ج.م\n\n` +
        `📲 هل يناسبكم حجز موعد لمعاينة العقار على الطبيعة اليوم أو غداً؟`
      : `🏛️ *1Line Real Estate — Tailored Property Match (${match.score}%)*\n\n` +
        `Dear Mr/Ms *${lead.name}*,\n` +
        `We have matched a prime property for your criteria:\n` +
        `🏢 *${propTitle}*\n` +
        `📍 *Location:* ${propLoc}\n` +
        `💰 *Price:* ${propPrice} EGP\n\n` +
        `Would you like to schedule a site visit?`;

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`, '_blank', 'noopener,noreferrer');
    }

    if (triggerToast) {
      triggerToast(isAr ? 'تم فتح واتساب لإرسال العرض المقترح للمشتري!' : 'WhatsApp proposal link opened!', 'success');
    }
  };

  return (
    <div className="smart-matching-hub-card">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: '#092347', fontSize: '1.15rem', fontWeight: 700 }}>
            <Sparkles size={20} style={{ color: 'var(--crm-accent-text)' }} />
            {isAr ? 'محرك المطابقة الذكي اللحظي بين المشترين والمعروض' : 'Live Smart Deals & Buyer Matching Engine'}
          </h3>
          <p className="section-subtitle" style={{ margin: '4px 0 0', color: 'var(--crm-muted)', fontSize: 'var(--crm-text-base)' }}>
            {isAr ? `تم العثور على ${matches.length} فرصة صفقة مؤكدة التوافق مع المشترين المسجلين` : `${matches.length} high-probability buyer-property matches found`}
          </p>
        </div>

        {/* Filter by Match Strength */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-body)', fontWeight: '600' }}>
            {isAr ? 'الحد الأدنى للتوافق:' : 'Min Score:'}
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setMinMatchScore(80)}
            style={{
              borderRadius: '8px',
              fontSize: 'var(--crm-text-xs)',
              fontWeight: minMatchScore === 80 ? 'bold' : '600',
              background: minMatchScore === 80 ? '#d97706' : '#ffffff',
              color: minMatchScore === 80 ? '#ffffff' : '#334155',
              border: minMatchScore === 80 ? '1px solid #d97706' : '1px solid #cbd5e1'
            }}
          >
            🔥 80%+ {isAr ? 'مطابقة مثالية' : 'Super Match'}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setMinMatchScore(60)}
            style={{
              borderRadius: '8px',
              fontSize: 'var(--crm-text-xs)',
              fontWeight: minMatchScore === 60 ? 'bold' : '600',
              background: minMatchScore === 60 ? '#092347' : '#ffffff',
              color: minMatchScore === 60 ? '#ffffff' : '#334155',
              border: minMatchScore === 60 ? '1px solid #092347' : '1px solid #cbd5e1'
            }}
          >
            ⚡ 60%+ {isAr ? 'كل الفرص' : 'All Deals'}
          </button>
        </div>
      </div>

      {/* Matches Grid */}
      {matches.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--crm-card)',
          borderRadius: '12px',
          border: '2px dashed #cbd5e1'
        }}>
          <Sparkles size={36} style={{ color: 'var(--crm-accent-text)', opacity: 0.7, marginBottom: '12px' }} />
          <h4 style={{ color: '#092347', fontWeight: 700 }}>{isAr ? 'لا توجد مطابقات تتجاوز هذه النسبة حالياً' : 'No matches found above this threshold'}</h4>
          <p style={{ fontSize: 'var(--crm-text-base)', color: 'var(--crm-muted)' }}>
            {isAr ? 'أضف عقارات جديدة أو قلل نسبة المطابقة لعرض الفرص القريبة' : 'Add new properties or lower threshold'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
          {matches.map((match) => {
            const { lead, property, score, reasons } = match;

            return (
              <div
                key={match.id}
                className="deal-match-card animate-fadeIn"
                style={{
                  background: 'var(--crm-card)',
                  border: score >= 85 ? '1px solid #fde68a' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  {/* Card Header: Score Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        background: score >= 85 ? '#ecfdf5' : '#fef3c7',
                        color: score >= 85 ? '#065f46' : '#92400e',
                        border: `1px solid ${score >= 85 ? '#a7f3d0' : '#fde68a'}`,
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: 'var(--crm-text-sm)',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <CheckCircle2 size={13} /> {score}% {isAr ? 'نسبة التوافق' : 'Match'}
                      </span>
                    </div>

                    <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', fontWeight: '600' }}>
                      {lead.assignedTo}
                    </span>
                  </div>

                  {/* Buyer & Property Comparison Box */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    background: 'var(--crm-subtle)',
                    border: '1px solid var(--crm-line)',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '10px'
                  }}>
                    {/* Buyer Side */}
                    <div style={{ borderInlineEnd: '1px solid #e2e8f0', paddingInlineEnd: '10px' }}>
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-info)', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>
                        👤 {isAr ? 'المشتري الراغب:' : 'Buyer Request:'}
                      </span>
                      <strong 
                        onClick={() => onOpenLead?.(lead)}
                        style={{ 
                          fontSize: 'var(--crm-text-md)', 
                          color: '#092347', 
                          fontWeight: 700, 
                          display: 'block', 
                          marginBottom: '2px',
                          cursor: onOpenLead ? 'pointer' : 'default',
                          textDecoration: onOpenLead ? 'underline' : 'none'
                        }}
                        title={isAr ? 'فتح المعاينة السريعة للعميل' : 'Open Lead Quick Drawer'}
                      >
                        {lead.name}
                      </strong>
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', display: 'block', direction: 'ltr', textAlign: isAr ? 'right' : 'left' }}>
                        📱 {lead.whatsapp || lead.phone}
                      </span>
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-positive)', display: 'block', marginTop: '4px', fontWeight: '700' }}>
                        💰 ميزانية: {(lead.details?.budget || lead.budget) ? parseInt(lead.details?.budget || lead.budget).toLocaleString() + ' ج.م' : '2,500,000 ج.م'}
                      </span>
                    </div>

                    {/* Matched Property Side */}
                    <div>
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-accent-text)', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>
                        🏢 {isAr ? 'العقار المطابق:' : 'Matched Property:'}
                      </span>
                      <strong style={{ fontSize: 'var(--crm-text-md)', color: '#092347', fontWeight: 700, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                        {isAr ? property.title_ar : property.title_en}
                      </strong>
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-body)', display: 'block' }}>
                        📐 {property.size} م² • 📍 {getLocalizedArea(property.areaKey)}
                      </span>
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-positive)', display: 'block', marginTop: '4px', fontWeight: 700 }}>
                        💵 السعر: {property.price?.toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>

                  {/* Match Criteria Pills */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {reasons.map((r, i) => (
                      <span key={i} style={{
                        background: 'var(--crm-card)',
                        border: '1px solid var(--crm-line)',
                        color: 'var(--crm-body)',
                        fontSize: 'var(--crm-text-xs)',
                        fontWeight: '600',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions Footer */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                  {onOpenLead && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onOpenLead(lead)}
                      style={{ padding: '7px 10px', fontSize: 'var(--crm-text-xs)', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px' }}
                      title={isAr ? 'معاينة العميل وتعديل مرحلته' : 'Quick Drawer'}
                    >
                      <Zap size={14} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => handleSendProposal(match)}
                    style={{ flex: 1, padding: '7px 10px', fontSize: 'var(--crm-text-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--crm-positive-solid)', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
                  >
                    <Send size={13} />
                    <span>{isAr ? 'إرسال العرض واتساب' : 'Send WhatsApp'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setSchedulingVisitLead({ ...lead, details: { ...lead.details, targetPropertyId: property.id } })}
                    style={{ padding: '7px 10px', fontSize: 'var(--crm-text-xs)', color: 'var(--crm-accent-text)', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px' }}
                    title={isAr ? 'حجز موعد معاينة' : 'Schedule Visit'}
                  >
                    <Car size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Visit Modal */}
      {schedulingVisitLead && (
        <SiteVisitModal
          isOpen={Boolean(schedulingVisitLead)}
          onClose={() => setSchedulingVisitLead(null)}
          lead={schedulingVisitLead}
          properties={properties}
          onScheduleVisit={(leadId, visitDetails) => {
            if (onUpdateLead) {
              onUpdateLead(leadId, {
                status: 'site_visit',
                siteVisit: visitDetails,
                followUp: `معاينة مجدولة يوم ${visitDetails.visitDate}`
              });
            }
          }}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}
    </div>
  );
}
