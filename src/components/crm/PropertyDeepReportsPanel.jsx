import { useState, useMemo } from 'react';
import {
  Clock,
  Users,
  ShieldCheck,
  Scale,
  AlertTriangle,
  TrendingUp,
  Share2,
  Calendar,
  Building,
  CheckCircle2,
  Phone,
  Search,
  ExternalLink
} from 'lucide-react';
import {
  calculateDaysOnMarket,
  calculateBuyerDemandDensity,
  calculateExclusivityAlerts,
  generateCmaReport
} from '../../utils/propertyDeepReports';
import { formatWhatsAppPhone } from '../../utils/matchingEngine';
import { Badge, Button } from '../ui';

export default function PropertyDeepReportsPanel({
  properties = [],
  leads = [],
  lang = 'ar',
  triggerToast
}) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const [subTab, setSubTab] = useState('dom'); // 'dom' | 'demand' | 'exclusivity' | 'cma'
  const [cmaPropId, setCmaPropId] = useState(() => (properties[0]?.id ? String(properties[0].id) : ''));
  const [cmaSearch, setCmaSearch] = useState('');

  // 1. Calculations
  const domReport = useMemo(() => calculateDaysOnMarket(properties), [properties]);
  const demandDensity = useMemo(() => calculateBuyerDemandDensity(properties, leads), [properties, leads]);
  const exclusivityReport = useMemo(() => calculateExclusivityAlerts(properties), [properties]);

  const selectedCmaProp = useMemo(() => {
    return properties.find((p) => String(p.id) === String(cmaPropId)) || properties[0] || null;
  }, [properties, cmaPropId]);

  const cmaData = useMemo(() => {
    return selectedCmaProp ? generateCmaReport(selectedCmaProp, properties, isAr) : null;
  }, [selectedCmaProp, properties, isAr]);

  const handleCopyOrShareCma = () => {
    if (!cmaData) return;
    const phone = (selectedCmaProp.contactPhone || selectedCmaProp.phone || '').replace(/[^0-9]/g, '');
    if (phone) {
      window.open(`https://wa.me/${formatWhatsAppPhone(phone)}?text=${encodeURIComponent(cmaData.whatsappCmaText)}`, '_blank');
    } else {
      navigator.clipboard?.writeText?.(cmaData.whatsappCmaText);
      triggerToast?.(isAr ? 'تم نسخ تقرير الـ CMA للحافظة لمشاركته مع المالك' : 'CMA report copied to clipboard', 'success');
    }
  };

  return (
    <div className="prop-deep-reports" dir={isAr ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Sub-tabs header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '10px 14px',
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <button
          type="button"
          onClick={() => setSubTab('dom')}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'dom' ? '#0B1C36' : 'transparent',
            color: subTab === 'dom' ? '#D4AF37' : '#475569',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Clock size={16} />
          <span>{L('⏳ أعمار المخزون والركود (DOM)', 'Days on Market')}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('demand')}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'demand' ? '#0B1C36' : 'transparent',
            color: subTab === 'demand' ? '#D4AF37' : '#475569',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Users size={16} />
          <span>{L('👥 كثافة طلب المشترين (Demand)', 'Buyer Demand Density')}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('exclusivity')}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'exclusivity' ? '#0B1C36' : 'transparent',
            color: subTab === 'exclusivity' ? '#D4AF37' : '#475569',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ShieldCheck size={16} />
          <span>
            {L('🛡️ متابعة الحصريات والعقود', 'Exclusivity Alerts')}
            {exclusivityReport.criticalCount > 0 && (
              <span style={{ background: '#DC2626', color: '#FFF', borderRadius: '10px', padding: '2px 6px', fontSize: '11px', marginRight: '4px' }}>
                {exclusivityReport.criticalCount}
              </span>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('cma')}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'cma' ? '#0B1C36' : 'transparent',
            color: subTab === 'cma' ? '#D4AF37' : '#475569',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Scale size={16} />
          <span>{L('📊 التحليل المقارن للمالك (CMA)', 'Comparative Market Analysis')}</span>
        </button>
      </div>

      {/* 1. DAYS ON MARKET & STALE INVENTORY */}
      {subTab === 'dom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', borderRight: '4px solid #3B82F6' }}>
              <span style={{ fontSize: '12px', color: '#64748B' }}>{L('متوسط فترة العرض الإجمالية', 'Overall Avg DOM')}</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0B1C36', marginTop: '4px' }}>{domReport.avgDom} {L('يوم', 'days')}</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', borderRight: '4px solid #10B981' }}>
              <span style={{ fontSize: '12px', color: '#64748B' }}>{L('مخزون نشط جديد (< 30 يوم)', 'Fresh (< 30d)')}</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#047857', marginTop: '4px' }}>{domReport.brackets.freshCount}</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', borderRight: '4px solid #F59E0B' }}>
              <span style={{ fontSize: '12px', color: '#64748B' }}>{L('ناضج وبطيء (30-90 يوم)', 'Mature (30-90d)')}</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#B45309', marginTop: '4px' }}>{domReport.brackets.matureCount + domReport.brackets.slowCount}</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', borderRight: '4px solid #EF4444' }}>
              <span style={{ fontSize: '12px', color: '#64748B' }}>{L('مخزون راكد (> 90 يوم)', 'Stale (> 90d)')}</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>{domReport.brackets.staleCount}</div>
            </div>
          </div>

          {/* Stale List Warning */}
          {domReport.staleItems.length > 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400E', fontWeight: 700, marginBottom: '8px' }}>
                <AlertTriangle size={18} />
                <span>{L(`يوجد ${domReport.staleItems.length} عقارات راكدة تجاوزت 90 يوماً في السوق بدون بيع:`, `${domReport.staleItems.length} stale listings need pricing or marketing intervention:`)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {domReport.staleItems.slice(0, 5).map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                    <span style={{ fontWeight: 600, color: '#1E293B' }}>{item.title}</span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ color: '#DC2626', fontWeight: 700 }}>معروض منذ {item.dom} يوم</span>
                      <Button size="xs" variant="secondary" onClick={() => { setCmaPropId(item.id); setSubTab('cma'); }}>
                        {L('تحليل تسعير CMA', 'CMA')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. BUYER DEMAND DENSITY */}
      {subTab === 'demand' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
          <h4 style={{ margin: '0 0 12px', color: '#0B1C36', fontSize: '15px' }}>
            {L('مؤشر كثافة طلب المشترين لكل عقار (عدد المشترين المطابقين لمواصفات وميزانية الوحدة)', 'Buyer Demand Density per Listing')}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {demandDensity.slice(0, 10).map((d) => (
              <div key={d.propertyId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <strong style={{ color: '#0F172A', display: 'block', fontSize: '13px' }}>{d.title}</strong>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    {L('السعر:', 'Price:')} {d.price.toLocaleString('en-US')} ج.م • {L('متوسط ميزانية طالبي الوحدة:', 'Avg buyer budget:')} {d.avgBuyerBudget ? `${d.avgBuyerBudget.toLocaleString('en-US')} ج.م` : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Badge tone={d.demandLevel === 'high' ? 'success' : d.demandLevel === 'medium' ? 'accent' : 'muted'}>
                    👥 {d.readyBuyersCount} {L('مشترين جاهزين', 'Ready buyers')}
                  </Badge>
                  {d.priceGapPct > 5 && (
                    <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>
                      + {d.priceGapPct}% {L('أعلى من ميزانية المشترين', 'above buyers')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. EXCLUSIVITY & MANDATE EXPIRY */}
      {subTab === 'exclusivity' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h4 style={{ margin: 0, color: '#0B1C36', fontSize: '15px' }}>
                {L('تقرير متابعة العقود والحصريات وتواريخ الانتهاء', 'Exclusivity & Mandate Expiry Tracker')}
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
                {L(`إجمالي الوحدات الحصرية: ${exclusivityReport.totalExclusives} وحدة`, `Total Exclusive Listings: ${exclusivityReport.totalExclusives}`)}
              </p>
            </div>
            {exclusivityReport.criticalCount > 0 && (
              <Badge tone="danger">⚠️ {exclusivityReport.criticalCount} {L('حصريات تنتهي خلال 15 يوماً', 'expiring in 15d')}</Badge>
            )}
          </div>

          {exclusivityReport.alerts.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: '13px' }}>{L('لا توجد عقارات مسجلة كحصرية حالياً.', 'No exclusive properties found.')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {exclusivityReport.alerts.map((al) => (
                <div key={al.propertyId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', background: al.status === 'critical' ? '#FEF2F2' : '#F8FAFC', border: al.status === 'critical' ? '1px solid #FECACA' : '1px solid #E2E8F0', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <strong style={{ color: '#0F172A', display: 'block', fontSize: '13px' }}>{al.title}</strong>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      {L('المالك:', 'Owner:')} {al.ownerName} ({al.ownerPhone || '—'}) • {L('ينتهي في:', 'Expires:')} {al.exclusiveUntil || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Badge tone={al.status === 'critical' ? 'danger' : al.status === 'warning' ? 'warning' : 'success'}>
                      {al.daysRemaining !== null ? (al.daysRemaining < 0 ? L('منتهي', 'Expired') : L(`متبقي ${al.daysRemaining} يوم`, `${al.daysRemaining} days left`)) : L('ساري', 'Active')}
                    </Badge>
                    {al.ownerPhone && (
                      <a href={`tel:${al.ownerPhone}`} className="ui-btn ui-btn--secondary ui-btn--xs">
                        <Phone size={12} /> {L('اتصال بالمالك للتجديد', 'Call Owner')}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. COMPARATIVE MARKET ANALYSIS (CMA) */}
      {subTab === 'cma' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h4 style={{ margin: 0, color: '#0B1C36', fontSize: '15px' }}>
              {L('مولّد تقرير التحليل المقارن للسوق (CMA) المخصص لمشاركته مع المالك', 'Comparative Market Analysis (CMA) for Property Owner')}
            </h4>
            <p style={{ margin: '4px 0 10px', fontSize: '12px', color: '#64748B' }}>
              {L('اختر العقار لتوليد تقرير فني يقارن سعر المالك بمتوسط الحي ورسالة واتساب مقنعة لتعديل السعر.', 'Select a listing to generate market comparison & WhatsApp justification text.')}
            </p>

            {/* Select Property */}
            <select
              style={{ width: '100%', maxWidth: '400px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              value={cmaPropId}
              onChange={(e) => setCmaPropId(e.target.value)}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title_ar || p.id} ({Number(p.price || 0).toLocaleString('en-US')} ج.م)
                </option>
              ))}
            </select>
          </div>

          {cmaData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>{L('سعر المتر المطلوب', 'Asking / sqm')}</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0B1C36' }}>{cmaData.askingSqm.toLocaleString('en-US')} ج.م</div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>{L('متوسط سعر الحي', 'District Median / sqm')}</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0B1C36' }}>{cmaData.medianPeerSqm.toLocaleString('en-US')} ج.م</div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>{L('الفارق عن السوق', 'Difference')}</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: cmaData.diffPct > 5 ? '#DC2626' : '#047857' }}>
                    {cmaData.diffPct > 0 ? `+${cmaData.diffPct}%` : `${cmaData.diffPct}%`}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>{L('الوحدات المنافسة بالحي', 'Competing Peers')}</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0B1C36' }}>{cmaData.peerCount} {L('وحدة', 'units')}</div>
                </div>
              </div>

              {/* CMA Preview Text Box */}
              <div style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>{L('معاينة رسالة التحليل المقارن (CMA) الموجهة للمالك:', 'CMA WhatsApp Message Preview:')}</span>
                  <Button size="xs" variant="primary" icon={<Share2 size={13} />} onClick={handleCopyOrShareCma}>
                    {L('إرسال / نسخ التقرير للواتساب 📲', 'Send CMA WhatsApp')}
                  </Button>
                </div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '12px', color: '#1E293B', background: '#FFFFFF', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  {cmaData.whatsappCmaText}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
