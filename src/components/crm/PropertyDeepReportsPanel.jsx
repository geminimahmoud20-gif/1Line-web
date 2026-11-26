import { useState, useMemo } from 'react';
import {
  Clock,
  Users,
  ShieldCheck,
  Scale,
  AlertTriangle,
  Share2,
  Phone
} from 'lucide-react';
import {
  calculateDaysOnMarket,
  calculateBuyerDemandDensity,
  calculateExclusivityAlerts,
  generateCmaReport
} from '../../utils/propertyDeepReports';
import { formatWhatsAppPhone } from '../../utils/matchingEngine';
import { Badge, Button } from '../ui';
import './property-deep-reports.css';

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
    <div className="prop-deep-reports pdr-root" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Sub-tabs header */}
      <div className="pdr-tabs">
        <button type="button" onClick={() => setSubTab('dom')} className={`pdr-tab ${subTab === 'dom' ? 'is-active' : ''}`}>
          <Clock size={16} />
          <span>{L('⏳ أعمار المخزون والركود (DOM)', 'Days on Market')}</span>
        </button>

        <button type="button" onClick={() => setSubTab('demand')} className={`pdr-tab ${subTab === 'demand' ? 'is-active' : ''}`}>
          <Users size={16} />
          <span>{L('👥 كثافة طلب المشترين (Demand)', 'Buyer Demand Density')}</span>
        </button>

        <button type="button" onClick={() => setSubTab('exclusivity')} className={`pdr-tab ${subTab === 'exclusivity' ? 'is-active' : ''}`}>
          <ShieldCheck size={16} />
          <span>
            {L('🛡️ متابعة الحصريات والعقود', 'Exclusivity Alerts')}
            {exclusivityReport.criticalCount > 0 && (
              <span className="pdr-tab-badge">{exclusivityReport.criticalCount}</span>
            )}
          </span>
        </button>

        <button type="button" onClick={() => setSubTab('cma')} className={`pdr-tab ${subTab === 'cma' ? 'is-active' : ''}`}>
          <Scale size={16} />
          <span>{L('📊 التحليل المقارن للمالك (CMA)', 'Comparative Market Analysis')}</span>
        </button>
      </div>

      {/* 1. DAYS ON MARKET & STALE INVENTORY */}
      {subTab === 'dom' && (
        <div className="pdr-section">
          {/* Summary KPIs */}
          <div className="pdr-kpi-grid">
            <div className="pdr-kpi-card pdr-kpi-card--info">
              <span className="pdr-kpi-label">{L('متوسط فترة العرض الإجمالية', 'Overall Avg DOM')}</span>
              <div className="pdr-kpi-value">{domReport.avgDom} {L('يوم', 'days')}</div>
            </div>

            <div className="pdr-kpi-card pdr-kpi-card--positive">
              <span className="pdr-kpi-label">{L('مخزون نشط جديد (< 30 يوم)', 'Fresh (< 30d)')}</span>
              <div className="pdr-kpi-value pdr-kpi-value--positive">{domReport.brackets.freshCount}</div>
            </div>

            <div className="pdr-kpi-card pdr-kpi-card--warn">
              <span className="pdr-kpi-label">{L('ناضج وبطيء (30-90 يوم)', 'Mature (30-90d)')}</span>
              <div className="pdr-kpi-value pdr-kpi-value--warn">{domReport.brackets.matureCount + domReport.brackets.slowCount}</div>
            </div>

            <div className="pdr-kpi-card pdr-kpi-card--danger">
              <span className="pdr-kpi-label">{L('مخزون راكد (> 90 يوم)', 'Stale (> 90d)')}</span>
              <div className="pdr-kpi-value pdr-kpi-value--danger">{domReport.brackets.staleCount}</div>
            </div>
          </div>

          {/* Stale List Warning */}
          {domReport.staleItems.length > 0 && (
            <div className="pdr-warn-box">
              <div className="pdr-warn-head">
                <AlertTriangle size={18} />
                <span>{L(`يوجد ${domReport.staleItems.length} عقارات راكدة تجاوزت 90 يوماً في السوق بدون بيع:`, `${domReport.staleItems.length} stale listings need pricing or marketing intervention:`)}</span>
              </div>
              <div className="pdr-list pdr-list--tight">
                {domReport.staleItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="pdr-row pdr-row--flat">
                    <span className="pdr-row-title">{item.title}</span>
                    <div className="pdr-row-side">
                      <span className="pdr-row-flag">معروض منذ {item.dom} يوم</span>
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
        <div className="pdr-card">
          <h4 className="pdr-card-title">
            {L('مؤشر كثافة طلب المشترين لكل عقار (عدد المشترين المطابقين لمواصفات وميزانية الوحدة)', 'Buyer Demand Density per Listing')}
          </h4>
          <div className="pdr-list">
            {demandDensity.slice(0, 10).map((d) => (
              <div key={d.propertyId} className="pdr-row">
                <div>
                  <strong className="pdr-row-title">{d.title}</strong>
                  <span className="pdr-row-meta">
                    {L('السعر:', 'Price:')} {d.price.toLocaleString('en-US')} ج.م • {L('متوسط ميزانية طالبي الوحدة:', 'Avg buyer budget:')} {d.avgBuyerBudget ? `${d.avgBuyerBudget.toLocaleString('en-US')} ج.م` : '—'}
                  </span>
                </div>
                <div className="pdr-row-side">
                  <Badge tone={d.demandLevel === 'high' ? 'success' : d.demandLevel === 'medium' ? 'accent' : 'muted'}>
                    👥 {d.readyBuyersCount} {L('مشترين جاهزين', 'Ready buyers')}
                  </Badge>
                  {d.priceGapPct > 5 && (
                    <span className="pdr-row-flag">
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
        <div className="pdr-card">
          <div className="pdr-card-head">
            <div>
              <h4 className="pdr-card-title">
                {L('تقرير متابعة العقود والحصريات وتواريخ الانتهاء', 'Exclusivity & Mandate Expiry Tracker')}
              </h4>
              <p className="pdr-card-sub">
                {L(`إجمالي الوحدات الحصرية: ${exclusivityReport.totalExclusives} وحدة`, `Total Exclusive Listings: ${exclusivityReport.totalExclusives}`)}
              </p>
            </div>
            {exclusivityReport.criticalCount > 0 && (
              <Badge tone="danger">⚠️ {exclusivityReport.criticalCount} {L('حصريات تنتهي خلال 15 يوماً', 'expiring in 15d')}</Badge>
            )}
          </div>

          {exclusivityReport.alerts.length === 0 ? (
            <p className="pdr-card-empty">{L('لا توجد عقارات مسجلة كحصرية حالياً.', 'No exclusive properties found.')}</p>
          ) : (
            <div className="pdr-list">
              {exclusivityReport.alerts.map((al) => (
                <div key={al.propertyId} className={`pdr-row ${al.status === 'critical' ? 'pdr-row--critical' : ''}`}>
                  <div>
                    <strong className="pdr-row-title">{al.title}</strong>
                    <span className="pdr-row-meta">
                      {L('المالك:', 'Owner:')} {al.ownerName} ({al.ownerPhone || '—'}) • {L('ينتهي في:', 'Expires:')} {al.exclusiveUntil || '—'}
                    </span>
                  </div>
                  <div className="pdr-row-side">
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
        <div className="pdr-card">
          <div style={{ marginBottom: '14px' }}>
            <h4 className="pdr-card-title">
              {L('مولّد تقرير التحليل المقارن للسوق (CMA) المخصص لمشاركته مع المالك', 'Comparative Market Analysis (CMA) for Property Owner')}
            </h4>
            <p className="pdr-card-sub" style={{ margin: '4px 0 10px' }}>
              {L('اختر العقار لتوليد تقرير فني يقارن سعر المالك بمتوسط الحي ورسالة واتساب مقنعة لتعديل السعر.', 'Select a listing to generate market comparison & WhatsApp justification text.')}
            </p>

            {/* Select Property */}
            <select
              className="pdr-select"
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
            <div className="pdr-section">
              {/* Stats Row */}
              <div className="pdr-cma-grid">
                <div className="pdr-cma-stat">
                  <span className="pdr-kpi-label">{L('سعر المتر المطلوب', 'Asking / sqm')}</span>
                  <div className="pdr-cma-stat-value">{cmaData.askingSqm.toLocaleString('en-US')} ج.م</div>
                </div>

                <div className="pdr-cma-stat">
                  <span className="pdr-kpi-label">{L('متوسط سعر الحي', 'District Median / sqm')}</span>
                  <div className="pdr-cma-stat-value">{cmaData.medianPeerSqm.toLocaleString('en-US')} ج.م</div>
                </div>

                <div className="pdr-cma-stat">
                  <span className="pdr-kpi-label">{L('الفارق عن السوق', 'Difference')}</span>
                  <div className={`pdr-cma-stat-value ${cmaData.diffPct > 5 ? 'pdr-cma-stat-value--danger' : 'pdr-cma-stat-value--positive'}`}>
                    {cmaData.diffPct > 0 ? `+${cmaData.diffPct}%` : `${cmaData.diffPct}%`}
                  </div>
                </div>

                <div className="pdr-cma-stat">
                  <span className="pdr-kpi-label">{L('الوحدات المنافسة بالحي', 'Competing Peers')}</span>
                  <div className="pdr-cma-stat-value">{cmaData.peerCount} {L('وحدة', 'units')}</div>
                </div>
              </div>

              {/* CMA Preview Text Box */}
              <div className="pdr-cma-preview">
                <div className="pdr-cma-preview-head">
                  <span className="pdr-cma-label">{L('معاينة رسالة التحليل المقارن (CMA) الموجهة للمالك:', 'CMA WhatsApp Message Preview:')}</span>
                  <Button size="xs" variant="primary" icon={<Share2 size={13} />} onClick={handleCopyOrShareCma}>
                    {L('إرسال / نسخ التقرير للواتساب 📲', 'Send CMA WhatsApp')}
                  </Button>
                </div>
                <pre className="pdr-cma-pre">
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
