import { useState, useMemo } from 'react';
import { Sparkles, Send, CheckCircle2, Car, Zap } from 'lucide-react';
import SiteVisitModal from './SiteVisitModal';
import { getAreas, normalizeAreaKey } from '../../utils/areasData';
import { parseMoney } from '../../utils/crmLeadViews';
import { formatWhatsAppPhone } from '../../utils/matchingEngine';
import { formatPhoneNumber } from '../../utils/crmNoteSanitizer';

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

  const formatAssignedAgent = (agent) => {
    if (!agent || agent === 'Unassigned') return isAr ? 'غير مخصص' : 'Unassigned';
    if (agent === 'Sales Advisor Team') return isAr ? 'فريق مستشاري المبيعات' : 'Sales Advisor Team';
    return agent;
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
      const rawLeadType = (lead.propertyType || details.propertyType || '').toLowerCase();
      // Guard against account role "buyer" accidentally stored as propertyType
      const leadType = (rawLeadType === 'buyer' || rawLeadType === 'request' || rawLeadType === 'lead') ? '' : rawLeadType;
      
      const leadBudget = parseMoney(lead.budget) || parseMoney(details.budget) || parseMoney(details.investmentAmount);
      const leadWantedSize = parseMoney(lead.size) || parseMoney(details.size) || parseMoney(details.minSize);
      const leadWantedRooms = parseInt(lead.rooms || details.rooms || details.bedrooms, 10) || 0;

      const leadPaymentRaw = (lead.paymentMethod || details.paymentMethod || details.paymentPlan || '').toLowerCase();
      const prefersInstallments = leadPaymentRaw.includes('installment') || leadPaymentRaw.includes('قسط') || leadPaymentRaw.includes('تقسيط');
      const prefersCash = leadPaymentRaw.includes('cash') || leadPaymentRaw.includes('كاش');

      liveProps.forEach(prop => {
        let score = 0;
        const reasons = [];
        const propArea = normalizeAreaKey(prop.areaKey);
        const propPrice = Number(prop.price) || 0;

        // 1. Area match (Up to 35 pts)
        if (leadArea && (propArea === leadArea || leadArea === 'all' || propArea === 'all')) {
          score += 35;
          reasons.push(isAr ? 'نفس المنطقة المستهدفة' : 'Area match');
        }

        // 2. Property type match (Up to 25 pts)
        if (leadType && (prop.type === leadType || prop.category === leadType)) {
          score += 25;
          reasons.push(isAr ? 'نفس نوع العقار' : 'Type match');
        }

        // 3. Budget match (Up to 30 pts)
        if (propPrice <= 0) {
          reasons.push(isAr ? 'السعر قيد التحديد' : 'Price pending');
        } else if (leadBudget) {
          const diffRatio = Math.abs(propPrice - leadBudget) / leadBudget;
          if (diffRatio <= 0.1) {
            score += 30;
            reasons.push(isAr ? 'مطابق تماماً للميزانية' : 'Exact budget match');
          } else if (diffRatio <= 0.25) {
            score += 20;
            reasons.push(isAr ? 'قريب جداً من الميزانية' : 'Close to budget');
          } else if (propPrice <= leadBudget) {
            score += 25;
            reasons.push(isAr ? 'أقل من الميزانية المحددة' : 'Under budget');
          }
        } else {
          // No budget specified: do NOT grant fake points; cap score
          reasons.push(isAr ? 'الميزانية قيد التدقيق' : 'Budget pending');
        }

        // 4. Size & Rooms Compatibility (Up to 10 pts)
        const propSize = Number(prop.size) || 0;
        const propRooms = Number(prop.bedrooms) || 0;

        if (leadWantedSize && propSize > 0) {
          if (propSize >= leadWantedSize * 0.85 && propSize <= leadWantedSize * 1.35) {
            score += 7;
            reasons.push(isAr ? 'المساحة مطابقة للطلب' : 'Size match');
          }
        }

        if (leadWantedRooms && propRooms > 0) {
          if (propRooms >= leadWantedRooms) {
            score += 3;
            reasons.push(isAr ? 'عدد الغرف كافٍ' : 'Rooms match');
          }
        }

        // 5. Payment Plan Compatibility (Up to 5 pts)
        const propHasInstallments = Boolean(prop.monthlyInstallment || prop.installmentYears || prop.downPayment);
        if (prefersInstallments && propHasInstallments) {
          score += 5;
          reasons.push(isAr ? 'تسهيلات تقسيط متوافقة' : 'Installment plan match');
        } else if (prefersCash && !propHasInstallments) {
          score += 5;
          reasons.push(isAr ? 'سداد كاش' : 'Cash ready');
        }

        // Cap score: unpriced properties cannot exceed 50%; unspecified client budgets cannot exceed 65%
        if (propPrice <= 0) {
          if (score > 50) score = 50;
        } else if (!leadBudget && score > 65) {
          score = 65;
        }

        if (score >= minMatchScore) {
          results.push({
            id: `match-${lead.id}-${prop.id}`,
            lead,
            property: prop,
            score: Math.min(100, Math.round(score)),
            reasons,
            budgetDifference: leadBudget ? propPrice - leadBudget : null
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

    if (!cleanPhone || cleanPhone.includes('*') || cleanPhone.length < 8) {
      triggerToast?.(isAr ? 'رقم هاتف العميل غير متوفر أو محجوب لصلاحيات حسابك' : 'Phone number is unavailable or masked for your role', 'error');
      return;
    }

    const propTitle = isAr ? property.title_ar : property.title_en;
    const propPrice = property.price?.toLocaleString('en-US');
    const propLoc = getLocalizedArea(property.areaKey);

    const waText = isAr
      ? `🏛️ *شركة 1Line للحلول العقارية — عرض عقاري مخصص لطلبكم (${match.score}% نسبة توافق)*\n\n` +
        `أهلاً بك أ. *${lead.name}*،\n` +
        `بناءً على طلبكم المسجل لدينا، وجدنا لك وحدة عقارية استثنائية تطابق معاييرك تماماً:\n\n` +
        `🏢 *الوحدة:* ${propTitle}\n` +
        `📍 *الموقع:* ${propLoc}\n` +
        `📐 *المساحة:* ${property.size} م² (${property.bedrooms || 0} غرف)\n` +
        `💰 *السعر الإجمالي:* ${propPrice} ج.م\n` +
        `💳 *المقدم:* ${property.downPayment?.toLocaleString('en-US')} ج.م وقسط شهري: ${property.monthlyInstallment?.toLocaleString('en-US')} ج.م\n\n` +
        `📲 هل يناسبكم حجز موعد لمعاينة العقار على الطبيعة اليوم أو غداً؟`
      : `🏛️ *1Line Real Estate — Tailored Property Match (${match.score}%)*\n\n` +
        `Dear Mr/Ms *${lead.name}*,\n` +
        `We have matched a prime property for your criteria:\n` +
        `🏢 *${propTitle}*\n` +
        `📍 *Location:* ${propLoc}\n` +
        `💰 *Price:* ${propPrice} EGP\n\n` +
        `Would you like to schedule a site visit?`;

    window.open(`https://wa.me/${formatWhatsAppPhone(cleanPhone)}?text=${encodeURIComponent(waText)}`, '_blank', 'noopener,noreferrer');

    // Update lead CRM record: lastContactedAt + activity log
    if (onUpdateLead) {
      const nowIso = new Date().toISOString();
      const newLog = {
        timestamp: nowIso,
        action: `إرسال ترشيح مطابق عبر واتساب للعقار [${property.id}] — ${propTitle} (${match.score}% توافق)`
      };
      onUpdateLead(lead.id, {
        lastContactedAt: nowIso,
        activityLogs: [newLog, ...(lead.activityLogs || [])]
      });
    }

    if (triggerToast) {
      triggerToast(isAr ? 'تم فتح واتساب وتوثيق إرسال العرض في سجل العميل!' : 'WhatsApp opened and logged in lead history!', 'success');
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
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--crm-ink)', fontSize: 'var(--crm-text-lg)', fontWeight: 700 }}>
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
              background: minMatchScore === 80 ? 'var(--crm-warn-solid)' : 'var(--crm-card)',
              color: minMatchScore === 80 ? 'var(--crm-on-dark)' : 'var(--crm-body)',
              border: minMatchScore === 80 ? '1px solid var(--crm-warn)' : '1px solid var(--crm-line-strong)'
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
              background: minMatchScore === 60 ? 'var(--crm-brand-navy)' : 'var(--crm-card)',
              color: minMatchScore === 60 ? 'var(--crm-on-dark)' : 'var(--crm-body)',
              border: minMatchScore === 60 ? '1px solid var(--crm-brand-navy)' : '1px solid var(--crm-line-strong)'
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
          border: '2px dashed var(--crm-line-strong)'
        }}>
          <Sparkles size={36} style={{ color: 'var(--crm-accent-text)', opacity: 0.7, marginBottom: '12px' }} />
          <h4 style={{ color: 'var(--crm-ink)', fontWeight: 700 }}>{isAr ? 'لا توجد مطابقات تتجاوز هذه النسبة حالياً' : 'No matches found above this threshold'}</h4>
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
                  border: score >= 85 ? '1px solid var(--crm-warn-line)' : '1px solid var(--crm-line)',
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
                        background: score >= 85 ? 'var(--crm-positive-soft)' : 'var(--crm-warn-soft)',
                        color: score >= 85 ? 'var(--crm-positive)' : 'var(--crm-warn)',
                        border: `1px solid ${score >= 85 ? 'var(--crm-positive-line)' : 'var(--crm-warn-line)'}`,
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
                      {formatAssignedAgent(lead.assignedTo)}
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
                    <div style={{ borderInlineEnd: '1px solid var(--crm-line)', paddingInlineEnd: '10px' }}>
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-info)', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>
                        👤 {isAr ? 'المشتري الراغب:' : 'Buyer Request:'}
                      </span>
                      <strong 
                        onClick={() => onOpenLead?.(lead)}
                        style={{ 
                          fontSize: 'var(--crm-text-md)', 
                          color: 'var(--crm-ink)', 
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
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span>📱</span>
                        <bdi dir="ltr" style={{ unicodeBidi: 'isolate', fontFamily: 'monospace' }}>{formatPhoneNumber(lead.whatsapp || lead.phone) || '—'}</bdi>
                      </span>
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-positive)', display: 'block', marginTop: '4px', fontWeight: '700' }}>
                        💰 {isAr ? 'ميزانية:' : 'Budget:'} {parseMoney(lead.details?.budget) || parseMoney(lead.budget) ? (parseMoney(lead.details?.budget) || parseMoney(lead.budget)).toLocaleString('en-US') + ' ج.م' : (isAr ? 'غير محددة بعد' : 'Not set')}
                      </span>
                    </div>

                    {/* Matched Property Side */}
                    <div>
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-accent-text)', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>
                        🏢 {isAr ? 'العقار المطابق:' : 'Matched Property:'}
                      </span>
                      <strong style={{ fontSize: 'var(--crm-text-md)', color: 'var(--crm-ink)', fontWeight: 700, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                        {isAr ? property.title_ar : property.title_en}
                      </strong>
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-body)', display: 'block' }}>
                        📐 {property.size} م² • 📍 {getLocalizedArea(property.areaKey)}
                      </span>
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-positive)', display: 'block', marginTop: '4px', fontWeight: 700 }}>
                        {property.price && Number(property.price) > 0 ? (
                          <>💵 {isAr ? 'السعر:' : 'Price:'} {Number(property.price).toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}</>
                        ) : (
                          <span style={{ color: 'var(--crm-warn)' }}>💵 {isAr ? 'السعر: عند التواصل / غير محدد' : 'Price: Upon inquiry'}</span>
                        )}
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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--crm-line)' }}>
                  {onOpenLead && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onOpenLead(lead)}
                      style={{
                        height: '36px',
                        padding: '0 12px',
                        fontSize: 'var(--crm-text-xs)',
                        color: 'var(--crm-info)',
                        background: 'var(--crm-info-soft)',
                        border: '1px solid var(--crm-info-line)',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                      title={isAr ? 'معاينة العميل وتعديل مرحلته' : 'Quick Drawer'}
                    >
                      <Zap size={14} />
                      <span>{isAr ? 'معاينة' : 'Preview'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => handleSendProposal(match)}
                    style={{
                      flex: 1,
                      height: '36px',
                      padding: '0 12px',
                      fontSize: 'var(--crm-text-xs)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: 'var(--crm-positive-solid)',
                      color: 'var(--crm-on-dark)',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Send size={13} />
                    <span>{isAr ? 'إرسال العرض واتساب' : 'Send WhatsApp'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setSchedulingVisitLead({ ...lead, details: { ...lead.details, targetPropertyId: property.id } })}
                    style={{
                      height: '36px',
                      padding: '0 12px',
                      fontSize: 'var(--crm-text-xs)',
                      color: 'var(--crm-accent-text)',
                      background: 'var(--crm-warn-soft)',
                      border: '1px solid var(--crm-warn-line)',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    title={isAr ? 'حجز موعد معاينة' : 'Schedule Visit'}
                  >
                    <Car size={14} />
                    <span>{isAr ? 'معاينة ميدانية' : 'Visit'}</span>
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
