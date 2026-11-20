import { useMemo, useState, useEffect } from 'react';
import { computeDashboardMetrics, isListedOnSite } from '../../utils/crmLeadViews';
import { commissionForecast } from '../../utils/commission';
import { countWord } from '../../utils/arabicCount';
import { DESK_BY_ROLE } from '../../utils/rbacRules';
import { Users, Briefcase, Clock, Target, AlertTriangle, CheckCircle2, TrendingUp, Phone, Sparkles, Award, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { leadScore, LEAD_SCORE_HIGH } from '../../utils/crmLeadViews';
import { PageHeader, KpiRow, KpiTile, Card, CardHeader, Button, Badge, Avatar, AreaChart, Donut, BarList } from '../ui';
import { dashboardView, MIN_FOR_CHARTS } from '../../utils/dashboardView';
import { TeamGoals } from './GoalsPanel';
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
    const fc = commissionForecast(leads, { now });
    return {
      ...m,
      pipelineValueM: fmtM(m.pipelineValue),
      purchasingPowerM: fmtM(m.purchasingPower),
      forecast: fc,
      newLeadsCount: m.newCount,
      overdueCount: m.overdueList.length,
      dueTodayCount: m.dueTodayList.length,
      unassignedCount: m.unassignedList.length,
      staleLeadsCount: m.staleList.length,
      awaitingCount: m.awaitingList.length
    };
  }, [leads, demands, now, scopeDesk]);

  // The charts and trend figures: the last 30 days against the 30 before (a desk agent: their desk only)
  const view = useMemo(() => dashboardView(leads, { now, scopeDesk, isAr }), [leads, now, scopeDesk, isAr]);
  const change = (k) => view.change[k]?.change;
  const replyMs = view.metrics.medianReplyMs;
  const replyHours = replyMs >= 2 * 3600000;
  const dayLabel = (key) => `${Number(key.slice(8))}/${Number(key.slice(5, 7))}`;

  // Under 1M money reads better as a full amount (87,500 ج.م) than as '0.09 مليون'
  const moneyValue = (v) => (v >= 1e6 ? v / 1e6 : Math.round(v));
  const moneyUnit = (v) => (v >= 1e6 ? (isAr ? 'مليون ج.م' : 'M EGP') : (isAr ? 'ج.م' : 'EGP'));
  const goLeads = (filter) => { onFilterLeads?.(filter); onSwitchTab?.('leads'); };
  const L = (ar, en) => (isAr ? ar : en);

  const alerts = [
    metrics.overdueCount > 0 && { id: 'overdue', tone: 'danger', title: L(`${metrics.overdueCount} متابعة فات ميعادها`, `${metrics.overdueCount} overdue follow-ups`), hint: L('افتحهم وكلّم العملاء', 'Open them and call'), onClick: () => goLeads('overdue') },
    metrics.unassignedCount > 0 && { id: 'unassigned', tone: 'warning', title: L(`${metrics.unassignedCount} عميل من غير مسؤول`, `${metrics.unassignedCount} unassigned leads`), hint: L('وزّعهم قبل ما يبردوا', 'Assign them before they go cold'), onClick: () => goLeads('unassigned') },
    metrics.pendingDemandsCount > 0 && { id: 'demands', tone: 'info', title: L(`${metrics.pendingDemandsCount} طلب مشتري مستني مراجعة`, `${metrics.pendingDemandsCount} buyer requests to review`), hint: L('راجعها علشان تبدأ المطابقة', 'Review to start matching'), onClick: () => onSwitchTab?.('demands') },
    metrics.staleLeadsCount > 0 && { id: 'stale', tone: 'neutral', title: L(`${metrics.staleLeadsCount} عميل راكد من أكتر من 48 ساعة`, `${metrics.staleLeadsCount} leads idle for 48h+`), hint: L('تابع معاهم تاني', 'Follow up again'), onClick: () => goLeads('stale') }
  ].filter(Boolean);

  const trendIsEmpty = !view.trend.newLeads.some(Boolean) && !view.trend.closed.some(Boolean);
  const tooFew = L(`محتاج ${MIN_FOR_CHARTS} عملاء وصلوا في آخر ${view.days} يوم على الأقل علشان الرسم يبقى له معنى.`, `Needs at least ${MIN_FOR_CHARTS} clients in the last ${view.days} days to mean anything.`);

  return (
    <div className="crm-dashboard-stack crm-dash">
      <PageHeader
        title={isSuperAdmin ? L('النهارده', 'Today') : L(`أهلاً ${currentRoleObj.label_ar || ''}`.trim(), `Welcome ${currentRoleObj.label_en || ''}`.trim())}
        description={L(
          `${metrics.dueTodayCount} متابعة · ${metrics.createdTodayCount} عميل وصل النهارده · ${metrics.newLeadsCount} في مرحلة «جديد» · ${metrics.pendingDemandsCount} طلب مستني`,
          `${metrics.dueTodayCount} follow-ups · ${metrics.createdTodayCount} arrived today · ${metrics.newLeadsCount} in the «new» stage · ${metrics.pendingDemandsCount} pending requests`
        )}
        actions={(
          <>
            {/* The filled button is the one with something in it */}
            <Button variant={metrics.dueTodayCount > 0 || metrics.newLeadsCount === 0 ? 'primary' : 'secondary'} icon={<Clock size={16} aria-hidden="true" />} onClick={() => goLeads('due')}>
              {L(`متابعات النهارده (${metrics.dueTodayCount})`, `Today's follow-ups (${metrics.dueTodayCount})`)}
            </Button>
            <Button variant={metrics.dueTodayCount === 0 && metrics.newLeadsCount > 0 ? 'primary' : 'secondary'} icon={<Users size={16} aria-hidden="true" />} onClick={() => goLeads('new')}>
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

      {/* What needs someone now comes first, as one compact strip */}
      {alerts.length > 0 && (
        <section className="crm-dash__attention" aria-label={L('محتاج متابعة', 'Needs attention')}>
          <h2 className="crm-dash__attention-title"><AlertTriangle size={16} aria-hidden="true" />{L('محتاج متابعة', 'Needs attention')}</h2>
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
        </section>
      )}

      <KpiRow label={L('أهم الأرقام', 'Key figures')}>
        {metrics.scoped && (
          <KpiTile
            label={L('عملاء متاحين للاستلام', 'Leads in the shared pool')}
            value={metrics.unassignedCount}
            hint={L('من غير مسؤول، استلم منهم', 'Unassigned, claim one')}
            icon={<Users size={16} />}
            tone="primary"
            onClick={() => onFilterLeads?.('unassigned')}
          />
        )}
        {metrics.scoped && (
          <KpiTile
            label={L('عملائي المستنيين أول رد', 'Awaiting my first reply')}
            value={metrics.awaitingCount}
            hint={L(`${metrics.overdueCount} متابعة متأخرة`, `${metrics.overdueCount} overdue follow-ups`)}
            icon={<Phone size={16} />}
            tone={metrics.awaitingCount ? 'danger' : 'neutral'}
            onClick={() => onFilterLeads?.('awaiting')}
          />
        )}
        <KpiTile
          label={L('عملاء جدد', 'New clients')}
          value={view.metrics.newLeads}
          delta={change('newLeads') ?? undefined}
          deltaLabel="%"
          hint={L(`آخر ${view.days} يوم`, `last ${view.days} days`)}
          trend={view.trend.newLeads}
          icon={<Users size={16} />}
          tone="info"
          onClick={() => goLeads('new')}
        />
        <KpiTile
          label={L('سرعة أول رد (الوسيط)', 'First reply (median)')}
          value={view.metrics.replied > 0 ? (replyHours ? replyMs / 3600000 : Math.max(1, Math.round(replyMs / 60000))) : null}
          digits={replyHours ? 1 : 0}
          unit={replyHours ? L('ساعة', 'h') : L('دقيقة', 'min')}
          emptyText={L('لسه مفيش ردود متسجلة', 'No replies logged yet')}
          delta={view.metrics.replied > 0 ? (change('medianReplyMs') ?? undefined) : undefined}
          deltaLabel="%"
          invertDelta
          hint={view.metrics.replied > 0 ? L(`${view.metrics.inTimePct}% في الميعاد`, `${view.metrics.inTimePct}% on time`) : undefined}
          icon={<Clock size={16} />}
          tone="warning"
        />
        <KpiTile
          label={L('صفقات اتقفلت', 'Deals won')}
          value={view.metrics.closed}
          delta={change('closed') ?? undefined}
          deltaLabel="%"
          hint={L(`تحويل ${view.metrics.conversionPct}%`, `${view.metrics.conversionPct}% conversion`)}
          trend={view.trend.closed}
          icon={<Briefcase size={16} />}
          tone="success"
          onClick={() => goLeads('won')}
        />
        {!metrics.scoped && showMoney && (
          <KpiTile
            label={L('العمولة المتوقعة', 'Expected commission')}
            value={metrics.forecast.weighted > 0 ? moneyValue(metrics.forecast.weighted) : null}
            digits={metrics.forecast.weighted >= 1e6 ? 2 : 0}
            unit={moneyUnit(metrics.forecast.weighted)}
            emptyText={L('مفيش صفقات مفتوحة بقيمة', 'No open deals with a value')}
            hint={L(
              `من ${metrics.forecast.valued} عميل بقيمة${metrics.forecast.missingValue ? ` · ${metrics.forecast.missingValue} من غير قيمة` : ''}`,
              `from ${metrics.forecast.valued} clients with a value${metrics.forecast.missingValue ? ` · ${metrics.forecast.missingValue} without one` : ''}`
            )}
            icon={<Award size={16} />}
            tone="accent"
            onClick={() => onSwitchTab?.('kanban')}
          />
        )}
        <KpiTile
          label={metrics.scoped ? L('ميزانيات مشتريّ المفتوحين', 'My buyers\' budgets') : L('ميزانيات المشترين المفتوحين', 'Open buyers\' budgets')}
          value={metrics.pipelineValue > 0 ? metrics.pipelineValue / 1000000 : null}
          digits={1}
          unit={L('مليون ج.م', 'M EGP')}
          emptyText={L('مفيش ميزانيات متسجّلة', 'No budgets recorded')}
          hint={L(`${metrics.openBuyers} ${countWord('deal', metrics.openBuyers)} مفتوحة${metrics.scoped ? ' عندك' : ''}`, `${metrics.openBuyers} open buyers`)}
          icon={<TrendingUp size={16} />}
          tone="primary"
          onClick={() => onSwitchTab?.('kanban')}
        />
      </KpiRow>

      <div className="crm-dash__charts">
        <Card>
          <CardHeader
            title={L('العملاء الجداد والصفقات', 'New clients and deals')}
            description={L('كل يوم، آخر 14 يوم', 'Per day, last 14 days')}
          />
          {trendIsEmpty ? (
            <p className="crm-dash__note">{L('لسه مفيش عملاء جداد ولا صفقات في الفترة دي.', 'No new clients or deals in this period yet.')}</p>
          ) : (
            <AreaChart
              labels={view.series.map((b) => dayLabel(b.day))}
              series={[
                { id: 'new', label: L('عملاء جدد', 'New clients'), values: view.trend.newLeads, tone: 'info' },
                { id: 'closed', label: L('صفقات اتقفلت', 'Deals won'), values: view.trend.closed, tone: 'success' }
              ]}
              ariaLabel={L(`رسم بياني: ${view.trend.newLeads.reduce((a, b) => a + b, 0)} عميل جديد و${view.trend.closed.reduce((a, b) => a + b, 0)} صفقة في آخر 14 يوم`, `Chart: ${view.trend.newLeads.reduce((a, b) => a + b, 0)} new clients and ${view.trend.closed.reduce((a, b) => a + b, 0)} deals in the last 14 days`)}
            />
          )}
        </Card>

        <Card>
          <CardHeader
            title={L('قمع الصفقات', 'Deal funnel')}
            description={L(`العملاء اللي وصلوا آخر ${view.days} يوم، والنسبة من المرحلة اللي قبلها`, `Clients who arrived in the last ${view.days} days; % is of the stage before`)}
          />
          {!view.enough ? (
            <p className="crm-dash__note">{tooFew}</p>
          ) : (
            <>
              <BarList
                ariaLabel={L('قمع الصفقات', 'Deal funnel')}
                items={view.funnel.rows.map((r, i, all) => ({
                  id: r.id,
                  label: r.label,
                  value: r.value,
                  tone: i === all.length - 1 ? 'success' : 'info',
                  note: i > 0 ? `${r.ofPrevious}%` : null
                }))}
              />
              <p className="crm-dash__foot">{L(`${view.funnel.lost} خسرانة · تحويل للإغلاق ${view.metrics.conversionPct}%`, `${view.funnel.lost} lost · ${view.metrics.conversionPct}% reach closing`)}</p>
            </>
          )}
        </Card>
      </div>

      <div className="crm-dash__trio">
        <Card>
          <CardHeader title={L('مصادر العملاء', 'Where clients come from')} description={L(`آخر ${view.days} يوم`, `Last ${view.days} days`)} />
          {view.sources.length === 0 ? (
            <p className="crm-dash__note">{L('لسه مفيش عملاء في الفترة دي.', 'No clients in this period yet.')}</p>
          ) : (
            <Donut
              items={view.sources}
              centerLabel={L('عميل', 'clients')}
              ariaLabel={L(`مصادر العملاء: ${view.sources.map((s) => `${s.label} ${s.pct}%`).join('، ')}`, `Client sources: ${view.sources.map((s) => `${s.label} ${s.pct}%`).join(', ')}`)}
            />
          )}
        </Card>

        {!metrics.scoped && (
          <Card>
            <CardHeader title={L('أداء الفريق', 'Team performance')} description={L(`العملاء اللي اتسلّموا آخر ${view.days} يوم`, `Clients handed over in the last ${view.days} days`)} />
            {view.sellers.length === 0 ? (
              <p className="crm-dash__note">{L('لسه مفيش عملاء متسلّمين لحد في الفترة دي.', 'No clients handed to anyone in this period yet.')}</p>
            ) : (
              <BarList
                ariaLabel={L('أداء الفريق', 'Team performance')}
                items={view.sellers.map((sl) => ({
                  id: sl.key,
                  label: sl.name || L('بدون اسم', 'Unnamed'),
                  value: sl.leads,
                  tone: 'accent',
                  note: L(
                    `${sl.closed} صفقة · ${sl.replied > 0 ? `أول رد ${Math.max(1, Math.round(sl.medianReplyMs / 60000))} د` : 'لسه مفيش ردود'}`,
                    `${sl.closed} won · ${sl.replied > 0 ? `first reply ${Math.max(1, Math.round(sl.medianReplyMs / 60000))} min` : 'no replies yet'}`
                  )
                }))}
                valueText={(it) => L(`${it.value} عميل`, `${it.value} clients`)}
              />
            )}
          </Card>
        )}

        <Card>
          <CardHeader
            title={L('متابعات النهارده', "Today's follow-ups")}
            actions={<Button variant="ghost" size="sm" onClick={() => goLeads('due')}>{L('عرض الكل', 'View all')}</Button>}
          />
          {metrics.dueTodayList.length === 0 ? (
            <p className="crm-dash__note crm-dash__note--ok"><CheckCircle2 size={16} aria-hidden="true" />{L('كل متابعات النهارده خلصت.', 'Every follow-up for today is done.')}</p>
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
      </div>

      <div className="crm-dash__bottom">
        {!metrics.scoped && showMoney && <TeamGoals leads={leads} lang={isAr ? 'ar' : 'en'} onOpenGoals={() => onSwitchTab?.('performance')} />}
        <Card>
          <CardHeader
            title={L('العقارات والمشروعات', 'Listings & projects')}
            actions={<Button variant="ghost" size="sm" onClick={() => onSwitchTab?.('properties')}>{L('إدارة العقارات', 'Manage listings')}</Button>}
          />
          <dl className="crm-dash__stats">
            <div><dt>{L('وحدات معروضة على الموقع', 'Listed on the site')}</dt><dd>{properties.filter(isListedOnSite).length}<small> / {properties.filter((p) => p && !p.isDemo && !p.isDeleted).length} {L('في المحفظة', 'in the portfolio')}</small></dd></div>
            <div><dt>{L('مشروعات', 'Projects')}</dt><dd>{projects.filter((p) => p && !p.isDemo).length}</dd></div>
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
