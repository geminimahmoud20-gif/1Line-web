import { useMemo, useState, useEffect } from 'react';
import { computeDashboardMetrics } from '../../utils/crmLeadViews';
import { DESK_BY_ROLE } from '../../utils/rbacRules';
import { Users, Building, Zap, Briefcase, Clock, Target, AlertTriangle, CheckCircle2, TrendingUp, Phone, Sparkles, Award, FileText, ArrowRight } from 'lucide-react';

export default function CrmExecutiveDashboard({
  leads = [],
  properties = [],
  demands = [],
  projects = [],
  activeRole = 'super_admin',
  currentRoleObj = {},
  isAr = true,
  onSwitchTab,
  onOpenLead,
  onFilterLeads,
  onOpenContractStudio,
  onOpenCopywriter
}) {
  const isSuperAdmin = activeRole === 'super_admin';

  // Company-wide numbers are for roles that see agency financials (super admin, sales manager,
  // finance). Everyone else gets their own desk's numbers.
  const canViewCompany = isSuperAdmin || !!currentRoleObj.canViewAgencyFinancials;
  const scopeDesk = canViewCompany ? null : (DESK_BY_ROLE[activeRole] || currentRoleObj.agentName || null);

  // Clock for "overdue / stale / today"; ticks once a minute
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const metrics = useMemo(() => {
    const m = computeDashboardMetrics(leads, demands, { now, scopeDesk });
    const fmtM = (v) => (v / 1000000).toFixed(1);
    return {
      ...m,
      pipelineValueM: fmtM(m.pipelineValue),
      purchasingPowerM: fmtM(m.purchasingPower),
      commissionM: (m.expectedCommission / 1000000).toFixed(2),
      // Under 1M the commission reads better as a full amount (87,500 ج.م) than as '0.09 مليون'
      commissionIsMillions: m.expectedCommission >= 1000000,
      commissionFull: Math.round(m.expectedCommission).toLocaleString('en-US'),
      newLeadsCount: m.newCount,
      overdueCount: m.overdueList.length,
      dueTodayCount: m.dueTodayList.length,
      unassignedCount: m.unassignedList.length,
      staleLeadsCount: m.staleList.length,
      awaitingCount: m.awaitingList.length
    };
  }, [leads, demands, now, scopeDesk]);

  return (
    <div className="crm-dashboard-stack" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── §1. CEO COMMAND HUD / GREETING ──────────────────────────── */}
      <div style={{
        background: 'var(--crm-card)',
        border: '1px solid var(--crm-line)',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: 'var(--crm-text-xl)' }}>{isSuperAdmin ? '👑' : '💼'}</span>
            <h1 style={{ margin: 0, fontSize: 'var(--crm-text-lg)', fontWeight: 800, color: 'var(--crm-ink)' }}>
              {isAr
                ? (isSuperAdmin ? 'مركز القيادة والعمليات التنفيذية' : `مرحباً ${currentRoleObj.label_ar || 'مستشار المبيعات'}`)
                : (isSuperAdmin ? 'Executive Command Center' : `Welcome, ${currentRoleObj.label_en || 'Sales Advisor'}`)}
            </h1>
            <span style={{
              fontSize: 'var(--crm-text-xs)',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(169, 130, 74, 0.12)',
              color: 'var(--crm-accent-text)',
              border: '1px solid rgba(169, 130, 74, 0.25)'
            }}>
              1Line Real Estate OS
            </span>
          </div>

          <p style={{ margin: 0, fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted, var(--crm-faint))' }}>
            {isAr
              ? `موجز العمليات: لديك اليوم ${metrics.dueTodayCount} متابعات مجدولة • ${metrics.newLeadsCount} عملاء جدد بحاجة للتأهيل • ${metrics.pendingDemandsCount} طلبات معلقة.`
              : `Today's Brief: ${metrics.dueTodayCount} follow-ups due • ${metrics.newLeadsCount} new leads to qualify • ${metrics.pendingDemandsCount} pending demands.`}
          </p>
        </div>

        {/* Quick Jump Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              onFilterLeads?.('due');
              onSwitchTab?.('leads');
            }}
            className="btn btn-sm"
            style={{
              background: 'var(--crm-surface-ink)',
              color: 'var(--crm-on-dark)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: 'var(--crm-text-xs)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Clock size={14} style={{ color: 'var(--crm-accent)' }} />
            <span>{isAr ? `متابعات اليوم (${metrics.dueTodayCount})` : `Follow-ups (${metrics.dueTodayCount})`}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onFilterLeads?.('new');
              onSwitchTab?.('leads');
            }}
            className="btn btn-sm"
            style={{
              background: 'var(--crm-subtle)',
              color: 'var(--crm-ink)',
              border: '1px solid var(--crm-line)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: 'var(--crm-text-xs)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Users size={14} style={{ color: 'var(--crm-muted)' }} />
            <span>{isAr ? `العملاء الجدد (${metrics.newLeadsCount})` : `New Leads (${metrics.newLeadsCount})`}</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchTab?.('kanban')}
            className="btn btn-sm"
            style={{
              background: 'var(--crm-subtle)',
              color: 'var(--crm-ink)',
              border: '1px solid var(--crm-line)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: 'var(--crm-text-xs)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Target size={14} style={{ color: 'var(--crm-muted)' }} />
            <span>{isAr ? 'مسار الصفقات' : 'Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* ── §2. WHERE IS THE MONEY? (FINANCIAL & CASH PIPELINE) ───── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px'
      }}>
        {/* Metric 1: Total Pipeline Value */}
        <div
          onClick={() => onSwitchTab?.('kanban')}
          style={{
            background: 'var(--crm-card)',
            border: '1px solid var(--crm-line)',
            borderRadius: '14px',
            padding: '16px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 600, color: 'var(--crm-muted, var(--crm-faint))' }}>
              {metrics.scoped ? (isAr ? 'قيمة صفقاتي المفتوحة' : 'My open pipeline') : (isAr ? 'قيمة مسار الصفقات النشط' : 'Active Pipeline Value')}
            </span>
            <TrendingUp size={16} style={{ color: 'var(--crm-positive)' }} />
          </div>
          <div style={{ fontSize: 'var(--crm-text-xl)', fontWeight: 900, color: 'var(--crm-ink)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
            <bdi>{metrics.pipelineValueM}</bdi>
            <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 600, color: 'var(--crm-muted)', marginInlineStart: '6px' }}>
              {isAr ? 'مليون ج.م' : 'M EGP'}
            </span>
          </div>
          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px', display: 'block' }}>
            {isAr ? `${metrics.openCount} صفقة مفتوحة${metrics.scoped ? ' عندك' : ''}` : `${metrics.openCount} open deals`}
          </span>
        </div>

        {metrics.scoped && (
          <>
            {/* Desk view: the shared pool and first replies instead of company money */}
            <div
              onClick={() => onFilterLeads?.('unassigned')}
              style={{ background: 'var(--crm-card)', border: '1px solid var(--crm-line)', borderRadius: '14px', padding: '16px 20px', cursor: 'pointer', boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 600, color: 'var(--crm-muted, var(--crm-faint))' }}>
                  {isAr ? 'عملاء متاحين للاستلام' : 'Leads in the shared pool'}
                </span>
                <Users size={16} style={{ color: 'var(--crm-accent-text)' }} />
              </div>
              <div style={{ fontSize: 'var(--crm-text-xl)', fontWeight: 900, color: 'var(--crm-ink)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {metrics.unassignedCount}
              </div>
              <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px', display: 'block' }}>
                {isAr ? 'بدون مسؤول — استلم منهم' : 'Unassigned — claim one'}
              </span>
            </div>
            <div
              onClick={() => onFilterLeads?.('awaiting')}
              style={{ background: 'var(--crm-card)', border: '1px solid var(--crm-line)', borderRadius: '14px', padding: '16px 20px', cursor: 'pointer', boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 600, color: 'var(--crm-muted, var(--crm-faint))' }}>
                  {isAr ? 'عملائي المستنيين أول رد' : 'My leads awaiting a first reply'}
                </span>
                <Phone size={16} style={{ color: metrics.awaitingCount ? 'var(--crm-danger)' : 'var(--crm-positive)' }} />
              </div>
              <div style={{ fontSize: 'var(--crm-text-xl)', fontWeight: 900, color: metrics.awaitingCount ? 'var(--crm-danger)' : 'var(--crm-ink)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {metrics.awaitingCount}
              </div>
              <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px', display: 'block' }}>
                {isAr ? `${metrics.overdueCount} متابعة متأخرة` : `${metrics.overdueCount} overdue follow-ups`}
              </span>
            </div>
          </>
        )}

        {!metrics.scoped && (
          <>
        {/* Metric 2: Expected Commission */}
        <div
          style={{
            background: 'var(--crm-card)',
            border: '1px solid var(--crm-line)',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 600, color: 'var(--crm-muted, var(--crm-faint))' }}>
              {isAr ? 'العمولة المتوقعة (2.5%)' : 'Expected Commission'}
            </span>
            <Award size={16} style={{ color: 'var(--crm-accent-text)' }} />
          </div>
          <div style={{ fontSize: 'var(--crm-text-xl)', fontWeight: 900, color: 'var(--crm-accent-text)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
            <bdi>{metrics.commissionIsMillions ? metrics.commissionM : metrics.commissionFull}</bdi>
            <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 600, color: 'var(--crm-muted)', marginInlineStart: '6px' }}>
              {metrics.commissionIsMillions ? (isAr ? 'مليون ج.م' : 'M EGP') : (isAr ? 'ج.م' : 'EGP')}
            </span>
          </div>
          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px', display: 'block' }}>
            {isAr ? 'بناءً على الصفقات قيد التفاوض' : 'Based on ongoing negotiations'}
          </span>
        </div>

        {/* Metric 3: Demand Purchasing Power */}
        <div
          onClick={() => onSwitchTab?.('demands')}
          style={{
            background: 'var(--crm-card)',
            border: '1px solid var(--crm-line)',
            borderRadius: '14px',
            padding: '16px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 600, color: 'var(--crm-muted, var(--crm-faint))' }}>
              {isAr ? 'القوة الشرائية المسجلة' : 'Demand Purchasing Power'}
            </span>
            <Zap size={16} style={{ color: 'var(--crm-positive)' }} />
          </div>
          <div style={{ fontSize: 'var(--crm-text-xl)', fontWeight: 900, color: 'var(--crm-ink)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
            <bdi>{metrics.purchasingPowerM}</bdi>
            <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 600, color: 'var(--crm-muted)', marginInlineStart: '6px' }}>
              {isAr ? 'مليون ج.م' : 'M EGP'}
            </span>
          </div>
          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px', display: 'block' }}>
            {isAr ? `${demands.filter((d) => !d.isArchived && d.status !== 'archived').length} طلب مشتري نشط` : `${demands.filter((d) => !d.isArchived && d.status !== 'archived').length} active buyer demands`}
          </span>
        </div>

          </>
        )}

        {/* Metric 4: Closing Rate */}
        <div
          style={{
            background: 'var(--crm-card)',
            border: '1px solid var(--crm-line)',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 600, color: 'var(--crm-muted, var(--crm-faint))' }}>
              {isAr ? 'نسبة الفوز بالصفقات' : 'Win rate'}
            </span>
            <Briefcase size={16} style={{ color: 'var(--crm-info)' }} />
          </div>
          <div style={{ fontSize: 'var(--crm-text-xl)', fontWeight: 900, color: 'var(--crm-ink)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
            {metrics.winRate === null ? '—' : `${metrics.winRate}%`}
          </div>
          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px', display: 'block' }}>
            {isAr ? `${metrics.wonCount} ناجحة • ${metrics.lostCount} خسرانة` : `${metrics.wonCount} won • ${metrics.lostCount} lost`}
          </span>
        </div>
      </div>

      {/* ── §3. WHAT NEEDS ATTENTION? (OPERATIONAL ALERTS CENTER) ───── */}
      {(metrics.overdueCount > 0 || metrics.unassignedCount > 0 || metrics.pendingDemandsCount > 0 || metrics.staleLeadsCount > 0) && (
        <div style={{
          background: 'var(--crm-card)',
          border: '1px solid var(--crm-line)',
          borderRadius: '16px',
          padding: '18px 22px',
          boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} style={{ color: 'var(--crm-warn)' }} />
              <h3 style={{ margin: 0, fontSize: 'var(--crm-text-md)', fontWeight: 800, color: 'var(--crm-ink)' }}>
                {isAr ? 'تنبيهات العمليات التنفيذية المباشرة' : 'Executive Operational Alerts'}
              </h3>
            </div>
            <span style={{
              fontSize: 'var(--crm-text-xs)',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'var(--crm-warn-soft)',
              color: 'var(--crm-warn)'
            }}>
              {isAr ? 'بحاجة لمتابعة' : 'Action Required'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {metrics.overdueCount > 0 && (
              <div
                onClick={() => {
                  onFilterLeads?.('overdue');
                  onSwitchTab?.('leads');
                }}
                style={{
                  background: 'var(--crm-subtle)',
                  border: '1px solid var(--crm-line)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 700, color: 'var(--crm-danger)' }}>
                    {metrics.overdueCount} {isAr ? 'متابعات متأخرة تجاوزت موعدها' : 'Overdue Follow-ups'}
                  </div>
                  <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px' }}>
                    {isAr ? 'انقر لفتح العملاء والتواصل الفوري' : 'Click to review & contact'}
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--crm-danger)' }} />
              </div>
            )}

            {metrics.unassignedCount > 0 && (
              <div
                onClick={() => {
                  onFilterLeads?.('unassigned');
                  onSwitchTab?.('leads');
                }}
                style={{
                  background: 'var(--crm-subtle)',
                  border: '1px solid var(--crm-line)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 700, color: 'var(--crm-warn)' }}>
                    {metrics.unassignedCount} {isAr ? 'عملاء بدون مسؤول مبيعات' : 'Unassigned Leads'}
                  </div>
                  <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px' }}>
                    {isAr ? 'تعيين لمستشار لمنع تسرب العميل' : 'Assign to sales rep'}
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--crm-warn)' }} />
              </div>
            )}

            {metrics.pendingDemandsCount > 0 && (
              <div
                onClick={() => onSwitchTab?.('demands')}
                style={{
                  background: 'var(--crm-subtle)',
                  border: '1px solid var(--crm-line)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 700, color: 'var(--crm-info)' }}>
                    {metrics.pendingDemandsCount} {isAr ? 'طلبات مشترين بحاجة للاعتماد' : 'Pending Buyer Demands'}
                  </div>
                  <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px' }}>
                    {isAr ? 'مراجعة ونشر للمطابقة الفورية' : 'Review and approve to match'}
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--crm-info)' }} />
              </div>
            )}

            {metrics.staleLeadsCount > 0 && (
              <div
                onClick={() => {
                  onFilterLeads?.('stale');
                  onSwitchTab?.('leads');
                }}
                style={{
                  background: 'var(--crm-subtle)',
                  border: '1px solid var(--crm-line)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 700, color: 'var(--crm-ink)' }}>
                    {metrics.staleLeadsCount} {isAr ? 'عملاء في وضع الركود (>48h)' : 'Stale Leads (>48h)'}
                  </div>
                  <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px' }}>
                    {isAr ? 'إعادة تنشيط ومتابعة' : 'Reactivate lead'}
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--crm-muted)' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── §4. SPLIT SECTION: TODAY'S ACTIONS + LIVE RECENT ACTIVITY ─ */}
      <div className="crm-dashboard-split">
        {/* Left Column: Today's Due Follow-ups Table / Quick List */}
        <div style={{
          background: 'var(--crm-card)',
          border: '1px solid var(--crm-line)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: 'var(--crm-accent, var(--crm-accent-text))' }} />
              <h3 style={{ margin: 0, fontSize: 'var(--crm-text-md)', fontWeight: 800, color: 'var(--crm-ink)' }}>
                {isAr ? 'قائمة متابعات اليوم المستحقة' : "Today's Actionable Follow-ups"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                onFilterLeads?.('due');
                onSwitchTab?.('leads');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--crm-accent-text)',
                fontSize: 'var(--crm-text-xs)',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isAr ? 'عرض الكل ←' : 'View all →'}
            </button>
          </div>

          {metrics.dueTodayList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--crm-muted)' }}>
              <CheckCircle2 size={32} style={{ color: 'var(--crm-positive)', margin: '0 auto 8px', opacity: 0.8 }} />
              <p style={{ margin: 0, fontSize: 'var(--crm-text-sm)' }}>
                {isAr ? 'ممتاز! تم إنجاز كافة المتابعات المجدولة لليوم حتى الآن.' : 'All scheduled follow-ups are up to date!'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {metrics.dueTodayList.slice(0, 5).map(leadItem => {
                const cleanPhone = (leadItem.phone || '').replace(/[^0-9+]/g, '');
                return (
                  <div
                    key={leadItem.id}
                    onClick={() => onOpenLead?.(leadItem)}
                    style={{
                      background: 'var(--crm-subtle)',
                      border: '1px solid var(--crm-line)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-ink)' }}>{leadItem.name}</strong>
                        {leadItem.score && (
                          <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 700, color: 'var(--crm-accent-text)' }}>
                            ⚡ {leadItem.score}%
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px' }}>
                        {leadItem.phone} • {leadItem.area || 'سوهاج'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`tel:${cleanPhone}`}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '6px',
                          background: 'var(--crm-brand-navy)',
                          color: 'var(--crm-on-dark)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none'
                        }}
                      >
                        <Phone size={13} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Fast Inventory Overview & Team Readiness */}
        <div style={{
          background: 'var(--crm-card)',
          border: '1px solid var(--crm-line)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={16} style={{ color: 'var(--crm-accent, var(--crm-accent-text))' }} />
              <h3 style={{ margin: 0, fontSize: 'var(--crm-text-md)', fontWeight: 800, color: 'var(--crm-ink)' }}>
                {isAr ? 'جاهزية الأصول والمشروعات' : 'Inventory & Projects'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onSwitchTab?.('properties')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--crm-accent-text)',
                fontSize: 'var(--crm-text-xs)',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isAr ? 'إدارة العقارات ←' : 'Manage Units →'}
            </button>
          </div>

          <div style={{
            background: 'var(--crm-subtle)',
            border: '1px solid var(--crm-line)',
            borderRadius: '12px',
            padding: '14px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div>
              <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>{isAr ? 'إجمالي الوحدات المعروضة' : 'Active Units'}</span>
              <div style={{ fontSize: 'var(--crm-text-xl)', fontWeight: 900, color: 'var(--crm-ink)', marginTop: '2px' }}>
                {properties.length}
              </div>
            </div>

            <div>
              <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>{isAr ? 'المشروعات الكبرى' : 'Mega Projects'}</span>
              <div style={{ fontSize: 'var(--crm-text-xl)', fontWeight: 900, color: 'var(--crm-ink)', marginTop: '2px' }}>
                {projects.length}
              </div>
            </div>
          </div>

          {/* Quick Shortcuts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onSwitchTab?.('matching')}
              className="btn btn-sm btn-outline"
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: 'var(--crm-text-xs)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={13} style={{ color: 'var(--crm-accent)' }} />
              <span>{isAr ? 'المطابقات الذكية' : 'AI Matcher'}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenContractStudio?.()}
              className="btn btn-sm btn-outline"
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: 'var(--crm-text-xs)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <FileText size={13} style={{ color: 'var(--crm-accent)' }} />
              <span>{isAr ? 'استوديو العقود' : 'Contracts PDF'}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenCopywriter?.()}
              className="btn btn-sm btn-outline"
              style={{
                gridColumn: '1 / -1',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: 'var(--crm-text-xs)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={13} style={{ color: 'var(--crm-accent)' }} />
              <span>{isAr ? 'صانع المحتوى AI' : 'AI Copywriter'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
