import { useMemo, useState, useEffect } from 'react';
import { computeDashboardMetrics } from '../../utils/crmLeadViews';
import { DESK_BY_ROLE } from '../../utils/rbacRules';
import { Users, Zap, Briefcase, Clock, Target, AlertTriangle, CheckCircle2, TrendingUp, Phone, Sparkles, Award, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { leadScore, LEAD_SCORE_HIGH } from '../../utils/crmLeadViews';
import { PageHeader, KpiRow, KpiTile, Card, CardHeader, Button, Badge, Avatar, EmptyState } from '../ui';
import './dashboard.css';

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
  onOpenCopywriter,
  deskView = null,
  scopeDesk: scopeDeskProp = null,
  showMoney: showMoneyProp = null,
  coverage = null
}) {
  const isSuperAdmin = activeRole === 'super_admin';

  // Company-wide numbers are for roles that see agency financials (super admin, sales manager,
  // finance). Everyone else gets their own desk's numbers.
  // CrmAdminPanel passes the account's real scope; the role-name fallback is for older callers
  const canViewCompany = isSuperAdmin || !!currentRoleObj.canViewAgencyFinancials;
  const isDeskView = deskView ?? !canViewCompany;
  const scopeDesk = isDeskView ? (scopeDeskProp || DESK_BY_ROLE[activeRole] || currentRoleObj.agentName || '__no_team__') : null;
  const showMoney = showMoneyProp ?? canViewCompany;

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

  const activeDemands = demands.filter((d) => !d.isArchived && d.status !== 'archived').length;
  const goLeads = (filter) => { onFilterLeads?.(filter); onSwitchTab?.('leads'); };
  const L = (ar, en) => (isAr ? ar : en);

  const alerts = [
    metrics.overdueCount > 0 && { id: 'overdue', tone: 'danger', title: L(`${metrics.overdueCount} متابعة فات ميعادها`, `${metrics.overdueCount} overdue follow-ups`), hint: L('افتحهم وكلّم العملاء', 'Open them and call'), onClick: () => goLeads('overdue') },
    metrics.unassignedCount > 0 && { id: 'unassigned', tone: 'warning', title: L(`${metrics.unassignedCount} عميل من غير مسؤول`, `${metrics.unassignedCount} unassigned leads`), hint: L('وزّعهم قبل ما يبردوا', 'Assign them before they go cold'), onClick: () => goLeads('unassigned') },
    metrics.pendingDemandsCount > 0 && { id: 'demands', tone: 'info', title: L(`${metrics.pendingDemandsCount} طلب مشتري مستني مراجعة`, `${metrics.pendingDemandsCount} buyer requests to review`), hint: L('راجعها علشان تبدأ المطابقة', 'Review to start matching'), onClick: () => onSwitchTab?.('demands') },
    metrics.staleLeadsCount > 0 && { id: 'stale', tone: 'neutral', title: L(`${metrics.staleLeadsCount} عميل راكد من أكتر من 48 ساعة`, `${metrics.staleLeadsCount} leads idle for 48h+`), hint: L('تابع معاهم تاني', 'Follow up again'), onClick: () => goLeads('stale') }
  ].filter(Boolean);

  return (
    <div className="crm-dashboard-stack crm-dash">
      <PageHeader
        title={isSuperAdmin ? L('لوحة القيادة', 'Dashboard') : L(`أهلاً ${currentRoleObj.label_ar || ''}`.trim(), `Welcome ${currentRoleObj.label_en || ''}`.trim())}
        description={L(
          `النهارده: ${metrics.dueTodayCount} متابعة · ${metrics.newLeadsCount} عميل جديد · ${metrics.pendingDemandsCount} طلب مستني`,
          `Today: ${metrics.dueTodayCount} follow-ups · ${metrics.newLeadsCount} new leads · ${metrics.pendingDemandsCount} pending requests`
        )}
        actions={(
          <>
            <Button icon={<Clock size={16} aria-hidden="true" />} onClick={() => goLeads('due')}>
              {L(`متابعات النهارده (${metrics.dueTodayCount})`, `Today's follow-ups (${metrics.dueTodayCount})`)}
            </Button>
            <Button variant="secondary" icon={<Users size={16} aria-hidden="true" />} onClick={() => goLeads('new')}>
              {L(`العملاء الجداد (${metrics.newLeadsCount})`, `New leads (${metrics.newLeadsCount})`)}
            </Button>
            <Button variant="ghost" icon={<Target size={16} aria-hidden="true" />} onClick={() => onSwitchTab?.('kanban')}>
              {L('مسار الصفقات', 'Pipeline')}
            </Button>
          </>
        )}
      />
      {coverage && (
        <p className={`crm-dash__coverage ${coverage.complete && !coverage.loading ? '' : 'is-partial'}`}>
          {coverage.loading
            ? L('بيتحسب من كل العملاء…', 'Computing over all leads…')
            : coverage.complete
              ? L(`محسوبة من كل العملاء (${coverage.count.toLocaleString('en-US')})`, `Covers all ${coverage.count.toLocaleString('en-US')} leads`)
              : L(`الأرقام من أول ${coverage.count.toLocaleString('en-US')} عميل بس، مش كل العملاء`, `Covers the first ${coverage.count.toLocaleString('en-US')} leads only`)}
        </p>
      )}

      <KpiRow label={L('أهم الأرقام', 'Key figures')}>
        <KpiTile
          label={metrics.scoped ? L('قيمة صفقاتي المفتوحة', 'My open pipeline') : L('قيمة الصفقات المفتوحة', 'Open pipeline value')}
          value={metrics.pipelineValue > 0 ? metrics.pipelineValue / 1000000 : null}
          digits={1}
          unit={L('مليون ج.م', 'M EGP')}
          emptyText={L('مفيش ميزانيات متسجّلة', 'No budgets recorded')}
          hint={L(`${metrics.openCount} صفقة مفتوحة${metrics.scoped ? ' عندك' : ''}`, `${metrics.openCount} open deals`)}
          icon={<TrendingUp size={16} />}
          onClick={() => onSwitchTab?.('kanban')}
        />
        {metrics.scoped && (
          <KpiTile
            label={L('عملاء متاحين للاستلام', 'Leads in the shared pool')}
            value={metrics.unassignedCount}
            hint={L('من غير مسؤول، استلم منهم', 'Unassigned, claim one')}
            icon={<Users size={16} />}
            onClick={() => onFilterLeads?.('unassigned')}
          />
        )}
        {metrics.scoped && (
          <KpiTile
            label={L('عملائي المستنيين أول رد', 'Awaiting my first reply')}
            value={metrics.awaitingCount}
            hint={L(`${metrics.overdueCount} متابعة متأخرة`, `${metrics.overdueCount} overdue follow-ups`)}
            icon={<Phone size={16} />}
            className={metrics.awaitingCount ? 'crm-dash__kpi-alert' : undefined}
            onClick={() => onFilterLeads?.('awaiting')}
          />
        )}
        {!metrics.scoped && showMoney && (
          <KpiTile
            label={L('العمولة المتوقعة (2.5%)', 'Expected commission (2.5%)')}
            value={metrics.expectedCommission > 0 ? (metrics.commissionIsMillions ? metrics.expectedCommission / 1000000 : Math.round(metrics.expectedCommission)) : null}
            digits={metrics.commissionIsMillions ? 2 : 0}
            unit={metrics.commissionIsMillions ? L('مليون ج.م', 'M EGP') : L('ج.م', 'EGP')}
            emptyText={L('مفيش صفقات في التفاوض', 'No deals in negotiation')}
            hint={L('من الصفقات اللي في التفاوض', 'From deals in negotiation')}
            icon={<Award size={16} />}
          />
        )}
        {!metrics.scoped && showMoney && (
          <KpiTile
            label={L('القوة الشرائية المسجلة', 'Recorded buying power')}
            value={metrics.purchasingPower > 0 ? metrics.purchasingPower / 1000000 : null}
            digits={1}
            unit={L('مليون ج.م', 'M EGP')}
            emptyText={L('مفيش طلبات بميزانية', 'No budgeted requests')}
            hint={L(`${activeDemands} طلب مشتري نشط`, `${activeDemands} active buyer requests`)}
            icon={<Zap size={16} />}
            onClick={() => onSwitchTab?.('demands')}
          />
        )}
        <KpiTile
          label={L('نسبة الفوز بالصفقات', 'Win rate')}
          value={metrics.winRate}
          unit="%"
          emptyText={L('لسه مفيش صفقات مقفولة', 'No closed deals yet')}
          hint={L(`${metrics.wonCount} ناجحة · ${metrics.lostCount} خسرانة`, `${metrics.wonCount} won · ${metrics.lostCount} lost`)}
          icon={<Briefcase size={16} />}
        />
      </KpiRow>

      {alerts.length > 0 && (
        <Card>
          <CardHeader
            title={L('محتاج متابعة', 'Needs attention')}
            actions={<Badge tone="warning" icon={<AlertTriangle size={12} aria-hidden="true" />}>{alerts.length}</Badge>}
          />
          <ul className="crm-dash__alerts">
            {alerts.map((a) => (
              <li key={a.id}>
                <button type="button" className={`crm-dash__alert is-${a.tone}`} onClick={a.onClick}>
                  <span className="crm-dash__alert-dot" aria-hidden="true" />
                  <span className="crm-dash__alert-text">
                    <strong>{a.title}</strong>
                    <span>{a.hint}</span>
                  </span>
                  {isAr ? <ChevronLeft size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="crm-dash__split">
        <Card>
          <CardHeader
            title={L('متابعات النهارده', "Today's follow-ups")}
            actions={<Button variant="ghost" size="sm" onClick={() => goLeads('due')}>{L('عرض الكل', 'View all')}</Button>}
          />
          {metrics.dueTodayList.length === 0 ? (
            <EmptyState icon={<CheckCircle2 size={22} />} title={L('مفيش متابعات مستنية', 'Nothing due')} description={L('كل متابعات النهارده خلصت.', 'Every follow-up for today is done.')} />
          ) : (
            <ul className="crm-dash__list">
              {metrics.dueTodayList.slice(0, 5).map((leadItem) => {
                const cleanPhone = (leadItem.phone || '').replace(/[^0-9+]/g, '');
                const sc = leadScore(leadItem);
                return (
                  <li key={leadItem.id} className="crm-dash__row">
                    <button type="button" className="crm-dash__row-main" onClick={() => onOpenLead?.(leadItem)}>
                      <Avatar name={leadItem.name || ''} size="sm" />
                      <span className="crm-dash__row-text">
                        <strong>{leadItem.name || L('عميل بدون اسم', 'Unnamed client')}</strong>
                        <span><bdi dir="ltr">{leadItem.phone}</bdi> · {leadItem.area || L('سوهاج', 'Sohag')}</span>
                      </span>
                      <Badge tone={sc.score >= LEAD_SCORE_HIGH ? 'success' : 'neutral'}>{sc.score}%</Badge>
                    </button>
                    {cleanPhone && (
                      <a href={`tel:${cleanPhone}`} className="ui-icon-btn ui-icon-btn--secondary" aria-label={L(`اتصال بـ ${leadItem.name || 'العميل'}`, `Call ${leadItem.name || 'client'}`)}>
                        <Phone size={16} />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title={L('العقارات والمشروعات', 'Listings & projects')}
            actions={<Button variant="ghost" size="sm" onClick={() => onSwitchTab?.('properties')}>{L('إدارة العقارات', 'Manage listings')}</Button>}
          />
          <dl className="crm-dash__stats">
            <div><dt>{L('وحدات معروضة', 'Listed units')}</dt><dd>{properties.length}</dd></div>
            <div><dt>{L('مشروعات', 'Projects')}</dt><dd>{projects.length}</dd></div>
          </dl>
          <div className="crm-dash__tools">
            <Button variant="secondary" size="sm" icon={<Sparkles size={16} aria-hidden="true" />} onClick={() => onSwitchTab?.('matching')}>{L('المطابقات', 'Matching')}</Button>
            <Button variant="secondary" size="sm" icon={<FileText size={16} aria-hidden="true" />} onClick={() => onOpenContractStudio?.()}>{L('استوديو العقود', 'Contracts')}</Button>
            <Button variant="secondary" size="sm" icon={<Sparkles size={16} aria-hidden="true" />} onClick={() => onOpenCopywriter?.()}>{L('كاتب الإعلانات', 'Ad copywriter')}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
