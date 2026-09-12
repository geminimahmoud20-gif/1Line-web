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
  Flame
} from 'lucide-react';
import SiteVisitModal from './SiteVisitModal';
import { getAreas } from '../../utils/areasData';

export default function SmartMatchingHub({
  leads = [],
  properties = [],
  onUpdateLead,
  lang = 'ar',
  triggerToast
}) {
  const isAr = lang === 'ar';
  const [minMatchScore, setMinMatchScore] = useState(60);
  const [schedulingVisitLead, setSchedulingVisitLead] = useState(null);

  const allAreas = useMemo(() => getAreas(), []);

  const getLocalizedArea = (areaKey) => {
    if (!areaKey) return isAr ? 'سوهاج' : 'Sohag';
    const cleanKey = String(areaKey).trim().toLowerCase();
    const map = {
      thakafa: 'حي الثقافة',
      east: 'حي شرق',
      west: 'حي غرب',
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
      const leadArea = (lead.area || details.area || lead.location || '').toLowerCase();
      const leadType = (lead.propertyType || details.propertyType || '').toLowerCase();
      const leadBudget = parseInt(lead.budget) || parseInt(details.budget) || parseInt(details.investmentAmount) || 2500000;

      liveProps.forEach(prop => {
        let score = 0;
        const reasons = [];

        // 1. Area match (35 pts)
        if (leadArea && (prop.areaKey === leadArea || leadArea === 'all')) {
          score += 35;
          reasons.push(isAr ? 'نفس المنطقة المستهدفة' : 'Area match');
        } else if (!leadArea) {
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

  const handleSendProposal = (match) => {
    const { lead, property } = match;
    const cleanPhone = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');
    const propTitle = isAr ? property.title_ar : property.title_en;
    const propLoc = isAr ? property.locationName_ar : property.locationName_en;
    const propPrice = property.price?.toLocaleString();

    const waText = isAr
      ? `🏛️ *شركة 1Line للحلول العقارية — عرض خاص ومطابق لطلبك*\n\n` +
        `أهلاً أ. *${lead.name}*،\n` +
        `بناءً على طلبكم المسجل لدينا، يسعدنا أن نرشح لكم هذه الوحدة المطابقة لاهتمامكم بنسبة ${match.score}%:\n\n` +
        `🏢 *العقار:* ${propTitle}\n` +
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
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`, '_blank');
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
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Sparkles size={20} className="text-gold" />
            {isAr ? 'محرك المطابقة الذكي اللحظي بين المشترين والمعروض' : 'Live Smart Deals & Buyer Matching Engine'}
          </h3>
          <p className="section-subtitle" style={{ margin: '4px 0 0' }}>
            {isAr ? `تم العثور على ${matches.length} فرصة صفقة مؤكدة التوافق مع المشترين المسجلين` : `${matches.length} high-probability buyer-property matches found`}
          </p>
        </div>

        {/* Filter by Match Strength */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {isAr ? 'الحد الأدنى للتوافق:' : 'Min Score:'}
          </span>
          <button
            type="button"
            className={`btn btn-sm ${minMatchScore === 80 ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setMinMatchScore(80)}
          >
            🔥 80%+ {isAr ? 'مطابقة مثالية' : 'Super Match'}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${minMatchScore === 60 ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setMinMatchScore(60)}
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
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-light)'
        }}>
          <Sparkles size={36} style={{ color: 'var(--accent-gold)', opacity: 0.5, marginBottom: '12px' }} />
          <h4>{isAr ? 'لا توجد مطابقات تتجاوز هذه النسبة حالياً' : 'No matches found above this threshold'}</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
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
                  background: 'var(--bg-card)',
                  border: score >= 85 ? '1px solid var(--accent-gold-light)' : '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  boxShadow: 'var(--shadow-sm)',
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
                        background: score >= 85 ? 'var(--emerald-bg)' : 'var(--amber-bg)',
                        color: score >= 85 ? 'var(--emerald)' : 'var(--amber)',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <CheckCircle2 size={13} /> {score}% {isAr ? 'نسبة التوافق' : 'Match'}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {lead.assignedTo}
                    </span>
                  </div>

                  {/* Buyer & Property Comparison Box */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '10px'
                  }}>
                    {/* Buyer Side */}
                    <div style={{ borderInlineEnd: '1px solid rgba(255,255,255,0.1)', paddingInlineEnd: '10px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>
                        👤 {isAr ? 'المشتري الراغب:' : 'Buyer Request:'}
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: '800', display: 'block', marginBottom: '2px' }}>
                        {lead.name}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', direction: 'ltr', textAlign: isAr ? 'right' : 'left' }}>
                        📱 {lead.whatsapp || lead.phone}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#34d399', display: 'block', marginTop: '4px', fontWeight: '700' }}>
                        💰 ميزانية: {(lead.details?.budget || lead.budget) ? parseInt(lead.details?.budget || lead.budget).toLocaleString() + ' ج.م' : '2,500,000 ج.م'}
                      </span>
                    </div>

                    {/* Matched Property Side */}
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>
                        🏢 {isAr ? 'العقار المطابق:' : 'Matched Property:'}
                      </span>
                      <strong style={{ fontSize: '0.92rem', color: '#ffffff', fontWeight: '800', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                        {isAr ? property.title_ar : property.title_en}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block' }}>
                        📐 {property.size} م² • 📍 {getLocalizedArea(property.areaKey)}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#34d399', display: 'block', marginTop: '4px', fontWeight: '800' }}>
                        💵 السعر: {property.price?.toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>

                  {/* Match Criteria Pills */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {reasons.map((r, i) => (
                      <span key={i} style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.68rem',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions Footer */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => handleSendProposal(match)}
                    style={{ flex: 1, padding: '7px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Send size={13} />
                    <span>{isAr ? 'إرسال العرض واتساب' : 'Send WhatsApp'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setSchedulingVisitLead({ ...lead, details: { ...lead.details, targetPropertyId: property.id } })}
                    style={{ padding: '7px 10px', fontSize: '0.75rem', color: 'var(--accent-gold)' }}
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
