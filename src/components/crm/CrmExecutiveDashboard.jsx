import React, { useMemo } from 'react';
import {
  Users, Building, Zap, Briefcase, Clock, Target,
  AlertTriangle, CheckCircle2, TrendingUp, Calendar,
  ArrowUpRight, Phone, MessageSquare, Flame, Sparkles,
  ChevronRight, ShieldAlert, Award, FileText, ArrowRight
} from 'lucide-react';

export default function CrmExecutiveDashboard({
  leads = [],
  properties = [],
  demands = [],
  projects = [],
  activeRole = 'super_admin',
  currentRoleObj = {},
  crmAnalytics = {},
  isAr = true,
  onSwitchTab,
  onOpenLead,
  onOpenDemand,
  onFilterLeads
}) {
  const isSuperAdmin = activeRole === 'super_admin';

  // 1. Core Financials & Metrics Calculation
  const metrics = useMemo(() => {
    const totalPipelineValue = leads
      .filter(l => !l.isArchived && l.status !== 'lost')
      .reduce((sum, l) => {
        const val = parseInt(String(l.budget || l.details?.budget || 0).replace(/[^0-9]/g, '')) || 0;
        return sum + val;
      }, 0);

    const totalPurchasingPower = demands
      .reduce((sum, d) => sum + (typeof d.budget === 'number' ? d.budget : parseInt(String(d.budget).replace(/,/g, '')) || 0), 0);

    const newLeads = leads.filter(l => !l.isArchived && (l.status === 'new' || !l.status));
    const qualifiedLeads = leads.filter(l => !l.isArchived && (l.status === 'contacted' || l.status === 'site_visit' || l.status === 'negotiating'));
    const closingDeals = leads.filter(l => !l.isArchived && (l.status === 'closing' || l.status === 'negotiating'));
    const wonDeals = leads.filter(l => l.status === 'closed');

    // Expected brokerage commission (standard 2.5% in Egyptian market)
    const expectedCommission = totalPipelineValue * 0.025;

    // Follow-ups & Attention Alerts
    const nowDayStr = new Date().toISOString().slice(0, 10);
    const overdueFollowUps = leads.filter(l => {
      if (l.isArchived || l.status === 'closed' || l.status === 'lost') return false;
      if (l.nextFollowUpAt && l.nextFollowUpAt.slice(0, 10) < nowDayStr) return true;
      return false;
    });

    const dueTodayFollowUps = leads.filter(l => {
      if (l.isArchived || l.status === 'closed' || l.status === 'lost') return false;
      if (l.nextFollowUpAt && l.nextFollowUpAt.slice(0, 10) === nowDayStr) return true;
      if (l.followUp && l.followUp.includes(nowDayStr)) return true;
      return false;
    });

    const unassignedLeads = leads.filter(l => !l.isArchived && (!l.assignedTo || l.assignedTo === 'Unassigned'));
    const pendingDemands = demands.filter(d => d.status === 'pending');

    // Stale leads (over 48h without activity)
    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const staleLeads = leads.filter(l => {
      if (l.isArchived || l.status === 'closed' || l.status === 'lost') return false;
      const lastAct = l.lastActivityAt || l.updatedAt || l.createdAt;
      return lastAct && lastAct < twoDaysAgo;
    });

    return {
      pipelineValueM: (totalPipelineValue / 1000000).toFixed(1),
      purchasingPowerM: (totalPurchasingPower / 1000000).toFixed(1),
      commissionM: (expectedCommission / 1000000).toFixed(2),
      // Under 1M the commission reads better as a full amount (87,500 ج.م) than as '0.09 مليون'
      commissionIsMillions: expectedCommission >= 1000000,
      commissionFull: Math.round(expectedCommission).toLocaleString('en-US'),
      newLeadsCount: newLeads.length,
      qualifiedCount: qualifiedLeads.length,
      closingCount: closingDeals.length,
      wonCount: wonDeals.length,
      overdueCount: overdueFollowUps.length,
      dueTodayCount: dueTodayFollowUps.length,
      unassignedCount: unassignedLeads.length,
      pendingDemandsCount: pendingDemands.length,
      staleLeadsCount: staleLeads.length,
      dueTodayList: dueTodayFollowUps,
      overdueList: overdueFollowUps,
      unassignedList: unassignedLeads
    };
  }, [leads, demands]);

  return (
    <div className="crm-dashboard-stack" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── §1. CEO COMMAND HUD / GREETING ──────────────────────────── */}
      <div style={{
        background: 'var(--crm-card, #ffffff)',
        border: '1px solid var(--crm-line, #e2e8f0)',
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
            <span style={{ fontSize: '1.4rem' }}>{isSuperAdmin ? '👑' : '💼'}</span>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--crm-ink)' }}>
              {isAr
                ? (isSuperAdmin ? 'مركز القيادة والعمليات التنفيذية' : `مرحباً ${currentRoleObj.label_ar || 'مستشار المبيعات'}`)
                : (isSuperAdmin ? 'Executive Command Center' : `Welcome, ${currentRoleObj.label_en || 'Sales Advisor'}`)}
            </h1>
            <span style={{
              fontSize: '0.72rem',
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

          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--crm-muted, #64748b)' }}>
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
              background: '#0F172A',
              color: '#FFFFFF',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.78rem',
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
              fontSize: '0.78rem',
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
              fontSize: '0.78rem',
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
            background: 'var(--crm-card, #ffffff)',
            border: '1px solid var(--crm-line, #e2e8f0)',
            borderRadius: '14px',
            padding: '16px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--crm-muted, #64748b)' }}>
              {isAr ? 'قيمة مسار الصفقات النشط' : 'Active Pipeline Value'}
            </span>
            <TrendingUp size={16} style={{ color: 'var(--crm-positive, #059669)' }} />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--crm-ink)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
            <bdi>{metrics.pipelineValueM}</bdi>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--crm-muted)', marginInlineStart: '6px' }}>
              {isAr ? 'مليون ج.م' : 'M EGP'}
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--crm-muted)', marginTop: '2px', display: 'block' }}>
            {isAr ? `${leads.length} عميل في مسار المبيعات` : `${leads.length} active leads in pipeline`}
          </span>
        </div>

        {/* Metric 2: Expected Commission */}
        <div
          style={{
            background: 'var(--crm-card, #ffffff)',
            border: '1px solid var(--crm-line, #e2e8f0)',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--crm-muted, #64748b)' }}>
              {isAr ? 'العمولة المتوقعة (2.5%)' : 'Expected Commission'}
            </span>
            <Award size={16} style={{ color: 'var(--crm-accent-text)' }} />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--crm-accent-text, #8A6828)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
            <bdi>{metrics.commissionIsMillions ? metrics.commissionM : metrics.commissionFull}</bdi>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--crm-muted)', marginInlineStart: '6px' }}>
              {metrics.commissionIsMillions ? (isAr ? 'مليون ج.م' : 'M EGP') : (isAr ? 'ج.م' : 'EGP')}
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--crm-muted)', marginTop: '2px', display: 'block' }}>
            {isAr ? 'بناءً على الصفقات قيد التفاوض' : 'Based on ongoing negotiations'}
          </span>
        </div>

        {/* Metric 3: Demand Purchasing Power */}
        <div
          onClick={() => onSwitchTab?.('demands')}
          style={{
            background: 'var(--crm-card, #ffffff)',
            border: '1px solid var(--crm-line, #e2e8f0)',
            borderRadius: '14px',
            padding: '16px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--crm-muted, #64748b)' }}>
              {isAr ? 'القوة الشرائية المسجلة' : 'Demand Purchasing Power'}
            </span>
            <Zap size={16} style={{ color: 'var(--crm-positive, #059669)' }} />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--crm-ink)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
            <bdi>{metrics.purchasingPowerM}</bdi>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--crm-muted)', marginInlineStart: '6px' }}>
              {isAr ? 'مليون ج.م' : 'M EGP'}
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--crm-muted)', marginTop: '2px', display: 'block' }}>
            {isAr ? `${demands.length} طلب مشتري معتمد` : `${demands.length} certified buyer demands`}
          </span>
        </div>

        {/* Metric 4: Closing Rate */}
        <div
          style={{
            background: 'var(--crm-card, #ffffff)',
            border: '1px solid var(--crm-line, #e2e8f0)',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--crm-muted, #64748b)' }}>
              {isAr ? 'معدل إغلاق الصفقات' : 'Closing Rate'}
            </span>
            <Briefcase size={16} style={{ color: 'var(--crm-info, #2563EB)' }} />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--crm-ink)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
            {crmAnalytics.conversionSuccess || '0%'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--crm-muted)', marginTop: '2px', display: 'block' }}>
            {isAr ? `${metrics.wonCount} صفقة ناجحة مكتملة` : `${metrics.wonCount} won deals closed`}
          </span>
        </div>
      </div>

      {/* ── §3. WHAT NEEDS ATTENTION? (OPERATIONAL ALERTS CENTER) ───── */}
      {(metrics.overdueCount > 0 || metrics.unassignedCount > 0 || metrics.pendingDemandsCount > 0 || metrics.staleLeadsCount > 0) && (
        <div style={{
          background: 'var(--crm-card, #ffffff)',
          border: '1px solid var(--crm-line, #e2e8f0)',
          borderRadius: '16px',
          padding: '18px 22px',
          boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} style={{ color: 'var(--crm-warn)' }} />
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--crm-ink)' }}>
                {isAr ? 'تنبيهات العمليات التنفيذية المباشرة' : 'Executive Operational Alerts'}
              </h3>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '999px',
              background: '#FEF3C7',
              color: '#92400E'
            }}>
              {isAr ? 'بحاجة لمتابعة' : 'Action Required'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {metrics.overdueCount > 0 && (
              <div
                onClick={() => {
                  onFilterLeads?.('due');
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
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#DC2626' }}>
                    {metrics.overdueCount} {isAr ? 'متابعات متأخرة تجاوزت موعدها' : 'Overdue Follow-ups'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--crm-muted)', marginTop: '2px' }}>
                    {isAr ? 'انقر لفتح العملاء والتواصل الفوري' : 'Click to review & contact'}
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: '#DC2626' }} />
              </div>
            )}

            {metrics.unassignedCount > 0 && (
              <div
                onClick={() => {
                  onFilterLeads?.('all');
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
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--crm-warn)' }}>
                    {metrics.unassignedCount} {isAr ? 'عملاء بدون مسؤول مبيعات' : 'Unassigned Leads'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--crm-muted)', marginTop: '2px' }}>
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
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--crm-info)' }}>
                    {metrics.pendingDemandsCount} {isAr ? 'طلبات مشترين بحاجة للاعتماد' : 'Pending Buyer Demands'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--crm-muted)', marginTop: '2px' }}>
                    {isAr ? 'مراجعة ونشر للمطابقة الفورية' : 'Review and approve to match'}
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--crm-info)' }} />
              </div>
            )}

            {metrics.staleLeadsCount > 0 && (
              <div
                onClick={() => {
                  onFilterLeads?.('all');
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
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--crm-ink)' }}>
                    {metrics.staleLeadsCount} {isAr ? 'عملاء في وضع الركود (>48h)' : 'Stale Leads (>48h)'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--crm-muted)', marginTop: '2px' }}>
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
          background: 'var(--crm-card, #ffffff)',
          border: '1px solid var(--crm-line, #e2e8f0)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: 'var(--crm-accent, #A9824A)' }} />
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--crm-ink)' }}>
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
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isAr ? 'عرض الكل ←' : 'View all →'}
            </button>
          </div>

          {metrics.dueTodayList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--crm-muted)' }}>
              <CheckCircle2 size={32} style={{ color: 'var(--crm-positive, #047857)', margin: '0 auto 8px', opacity: 0.8 }} />
              <p style={{ margin: 0, fontSize: '0.84rem' }}>
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
                      background: 'var(--crm-subtle, #f9f8f5)',
                      border: '1px solid var(--crm-line, #e2e8f0)',
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
                        <strong style={{ fontSize: '0.84rem', color: 'var(--crm-ink)' }}>{leadItem.name}</strong>
                        {leadItem.score && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--crm-accent-text)' }}>
                            ⚡ {leadItem.score}%
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--crm-muted)', marginTop: '2px' }}>
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
                          background: '#092347',
                          color: '#fff',
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
          background: 'var(--crm-card, #ffffff)',
          border: '1px solid var(--crm-line, #e2e8f0)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={16} style={{ color: 'var(--crm-accent, #A9824A)' }} />
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--crm-ink)' }}>
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
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isAr ? 'إدارة العقارات ←' : 'Manage Units →'}
            </button>
          </div>

          <div style={{
            background: 'var(--crm-subtle, #f9f8f5)',
            border: '1px solid var(--crm-line, #e2e8f0)',
            borderRadius: '12px',
            padding: '14px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div>
              <span style={{ fontSize: '0.74rem', color: 'var(--crm-muted)' }}>{isAr ? 'إجمالي الوحدات المعروضة' : 'Active Units'}</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--crm-ink)', marginTop: '2px' }}>
                {properties.length}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.74rem', color: 'var(--crm-muted)' }}>{isAr ? 'المشروعات الكبرى' : 'Mega Projects'}</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--crm-ink)', marginTop: '2px' }}>
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
                fontSize: '0.76rem',
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
              onClick={() => onSwitchTab?.('contract_studio')}
              className="btn btn-sm btn-outline"
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '0.76rem',
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
          </div>
        </div>
      </div>
    </div>
  );
}
