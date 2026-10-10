import { useEffect, useMemo, useState, useCallback } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { getAreas } from '../../utils/areasData';
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { recordTimeLabel } from '../../utils/relativeTime';
import {
  sumDays, kpis, funnel, demand, dayRange, topEntries, visitorInterests, formatSeconds, bandLabel, sourceLabel,
} from '../../utils/analyticsSummary';
import { loadAnalyticsDays, loadTopAnalyticsProperties, loadHotVisitors, loadRecentSessions } from '../../firebaseLazy';
import { Section, Kpi, BarList, DayColumns, LevelBadge } from './analytics/AnalyticsBits';
import { card } from './analytics/analyticsStyles';

const RANGES = [7, 30, 90];
const DEVICE_LABELS = { mobile: ['موبايل', 'Mobile'], tablet: ['تابلت', 'Tablet'], desktop: ['كمبيوتر', 'Desktop'] };

/**
 * Visitor analytics from the server (/api/track → Firestore): every visitor on every device.
 * Visitors who declined analytics are counted anonymously; profiles exist only with consent.
 */
export default function VisitorIntelligencePanel({ properties = [], leads = [], onOpenLead, lang = 'ar' }) {
  const isAr = lang === 'ar';
  const [range, setRange] = useState(30);
  const [state, setState] = useState({ loading: true, error: null, days: [], props: [], visitors: [], sessions: [] });
  const [refreshTick, setRefreshTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async (days) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const fromDay = dayRange(days)[0];
    const [d, p, v, s] = await Promise.all([
      loadAnalyticsDays(fromDay), loadTopAnalyticsProperties(15), loadHotVisitors(20), loadRecentSessions(40),
    ]);
    const failed = [d, p, v, s].find((r) => !r.ok);
    setState({ loading: false, error: failed ? failed.reason : null, days: d.data, props: p.data, visitors: v.data, sessions: s.data });
    setNow(Date.now());
  }, []);

  useEffect(() => {
    // Loading is async; state is only set once the reads resolve
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(range);
  }, [load, range, refreshTick]);

  const areaName = useMemo(() => {
    const areas = getAreas();
    return (id) => {
      const a = areas.find((x) => x.id === id);
      return a ? (isAr ? a.name_ar : (a.name_en || a.name_ar)) : id;
    };
  }, [isAr]);
  const typeName = (id) => {
    const t = PROPERTY_TYPES.find((x) => x.id === id);
    return t ? (isAr ? t.name_ar : t.name_en) : id;
  };
  const propertyById = useMemo(() => new Map(properties.map((p) => [String(p.id), p])), [properties]);
  const propertyName = (id) => {
    const p = propertyById.get(String(id));
    return (p && (isAr ? p.title_ar || p.title_en : p.title_en || p.title_ar)) || id;
  };
  const leadById = useMemo(() => new Map(leads.map((l) => [String(l.id), l])), [leads]);

  const { totals, byDay } = useMemo(() => sumDays(state.days), [state.days]);
  const k = kpis(totals);
  const steps = funnel(totals);
  const want = demand(totals);
  const series = dayRange(range, now).map((day) => ({ day, value: byDay[day]?.sessions || 0, mark: byDay[day]?.leads || 0 }));
  const activeNow = state.sessions.filter((s) => now - (s.lastSeenAt?.toMillis?.() || 0) < 5 * 60 * 1000).length;
  const n = (v) => Number(v || 0).toLocaleString('en-US');
  const noData = isAr ? 'لسه مفيش بيانات' : 'No data yet';

  const errorText = {
    denied: isAr ? 'التحليلات متاحة للمدير العام ومديري المبيعات بس.' : 'Analytics are available to admins and sales managers only.',
    'not-configured': isAr ? 'Firebase مش متوصل.' : 'Firebase is not connected.',
    error: isAr ? 'تعذّر تحميل التحليلات. جرّب تحديث.' : 'Could not load analytics. Try refreshing.',
  }[state.error];

  return (
    <div className="visitor-intelligence-panel animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--crm-info-soft)', color: 'var(--crm-info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 'var(--crm-text-lg)' }}>{isAr ? 'تحليلات الزوار وتوجهات العملاء' : 'Visitor analytics & buyer intent'}</h2>
            <p style={{ margin: '3px 0 0', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
              {isAr ? `بيانات حقيقية من كل الأجهزة • ${activeNow} زائر نشط دلوقتي` : `Real data from every device • ${activeNow} active now`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {RANGES.map((r) => (
            <button key={r} type="button" className={`btn btn-sm ${range === r ? 'btn-primary' : 'btn-outline'}`} onClick={() => setRange(r)} aria-pressed={range === r}>
              {isAr ? `${r} يوم` : `${r}d`}
            </button>
          ))}
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setRefreshTick((t) => t + 1)} disabled={state.loading} aria-label={isAr ? 'تحديث' : 'Refresh'}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {errorText && <div style={{ ...card, color: 'var(--crm-danger)', background: 'var(--crm-danger-soft)' }}>{errorText}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        <Kpi label={isAr ? 'الزوار' : 'Visitors'} value={n(k.visitors)} sub={isAr ? `${n(k.newVisitors)} جديد` : `${n(k.newVisitors)} new`} />
        <Kpi label={isAr ? 'الزيارات' : 'Visits'} value={n(k.sessions)} sub={isAr ? `${n(k.pageViews)} صفحة` : `${n(k.pageViews)} pages`} />
        <Kpi label={isAr ? 'مشاهدات العقارات' : 'Listing views'} value={n(k.propertyViews)} sub={isAr ? `متوسط القراءة ${formatSeconds(k.avgReadSeconds, isAr)}` : `avg read ${formatSeconds(k.avgReadSeconds, isAr)}`} />
        <Kpi tone="positive" label={isAr ? 'تواصل مباشر' : 'Contacts'} value={n(k.contacts)} sub={isAr ? `واتساب ${n(k.whatsapp)} • اتصال ${n(k.calls)}` : `WhatsApp ${n(k.whatsapp)} • calls ${n(k.calls)}`} />
        <Kpi tone="positive" label={isAr ? 'طلبات مسجلة' : 'Requests'} value={n(k.leads)} sub={isAr ? `تحويل ${k.conversionRate}% من الزيارات` : `${k.conversionRate}% of visits`} />
        <Kpi tone="warn" label={isAr ? 'حاسبة التمويل' : 'Calculator'} value={n(k.calculatorUses)} sub={isAr ? `بدأوا نموذج ${n(k.formStarts)}` : `${n(k.formStarts)} forms started`} />
      </div>

      <Section title={isAr ? 'الزيارات يوم بيوم' : 'Visits per day'} hint={isAr ? 'العمود = عدد الزيارات، والنقطة الخضرا = يوم اتسجل فيه طلب.' : 'Bars = visits; green dot = a day with requests.'}>
        <DayColumns days={series} isAr={isAr} />
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <Section title={isAr ? 'المناطق المطلوبة' : 'Areas in demand'} hint={isAr ? 'اللي الزوار فتحوا عقاراتها أو بحثوا عنها.' : 'Opened or searched by visitors.'}>
          <BarList rows={want.areas.map(([id, v]) => ({ key: id, label: areaName(id), value: v }))} empty={noData} />
        </Section>
        <Section title={isAr ? 'أنواع العقارات المطلوبة' : 'Property types in demand'}>
          <BarList tone="violet" rows={want.types.map(([id, v]) => ({ key: id, label: typeName(id), value: v }))} empty={noData} />
        </Section>
        <Section title={isAr ? 'شرائح الميزانية' : 'Budget bands'} hint={isAr ? 'من أسعار العقارات اللي اتفتحت والبحث والحاسبة.' : 'From listings opened, searches and the calculator.'}>
          <BarList tone="warn" rows={want.bands.map(([id, v]) => ({ key: id, label: bandLabel(id, isAr), value: v }))} empty={noData} />
        </Section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <Section title={isAr ? 'رحلة الزائر (قمع التحويل)' : 'Conversion funnel'} hint={isAr ? 'نسبة الزيارات اللي وصلت لكل مرحلة.' : 'Share of visits reaching each step.'}>
          <BarList tone="positive" rows={steps.map((s) => ({ key: s.id, label: isAr ? s.ar : s.en, value: s.count, sub: s.id === 'sessions' ? '' : `(${s.pctOfVisits}%)` }))} empty={isAr ? 'لسه مفيش زيارات' : 'No visits yet'} />
        </Section>
        <Section title={isAr ? 'مصادر الزيارات' : 'Traffic sources'}>
          <BarList rows={topEntries(totals.sources, 8).map(([id, v]) => ({ key: id, label: sourceLabel(id, isAr), value: v }))} empty={noData} />
          {topEntries(totals.campaigns, 5).length > 0 && (
            <>
              <h4 style={{ margin: '14px 0 8px', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>{isAr ? 'الحملات (utm_campaign)' : 'Campaigns'}</h4>
              <BarList tone="violet" rows={topEntries(totals.campaigns, 5).map(([id, v]) => ({ key: id, label: id, value: v }))} />
            </>
          )}
        </Section>
        <Section title={isAr ? 'الأجهزة وأفضل وقت' : 'Devices & best hours'} hint={isAr ? 'أكتر ساعات تصفح (بتوقيت مصر): أنسب وقت للمتابعة والإعلانات.' : 'Busiest hours (Cairo time).'}>
          <BarList rows={topEntries(totals.devices, 3).map(([id, v]) => ({ key: id, label: DEVICE_LABELS[id]?.[isAr ? 0 : 1] || id, value: v }))} empty={noData} />
          <h4 style={{ margin: '14px 0 8px', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>{isAr ? 'أكتر الساعات نشاطاً' : 'Busiest hours'}</h4>
          <BarList tone="warn" rows={topEntries(totals.hours, 4).map(([h, v]) => ({ key: h, label: `${h}:00`, value: v }))} empty="—" />
        </Section>
      </div>

      <Section title={isAr ? 'أكتر العقارات جذباً' : 'Most engaging listings'} hint={isAr ? 'المشاهدات ووقت القراءة والتواصل لكل وحدة (من بداية التسجيل).' : 'Views, reading time and contacts per listing (all time).'}>
        {state.props.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--crm-faint)', fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'لسه مفيش مشاهدات مسجلة.' : 'No views recorded yet.'}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crm-table" style={{ width: '100%', fontSize: 'var(--crm-text-sm)' }}>
              <thead>
                <tr>
                  <th>{isAr ? 'العقار' : 'Listing'}</th>
                  <th>{isAr ? 'مشاهدات' : 'Views'}</th>
                  <th>{isAr ? 'متوسط القراءة' : 'Avg read'}</th>
                  <th>{isAr ? 'مفضلة / مقارنة' : 'Saved / compared'}</th>
                  <th>{isAr ? 'تواصل' : 'Contacts'}</th>
                  <th>{isAr ? 'نسبة التواصل' : 'Contact rate'}</th>
                </tr>
              </thead>
              <tbody>
                {state.props.map((p) => (
                  <tr key={p.id}>
                    <td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{propertyName(p.id)}</td>
                    <td>{n(p.views)}</td>
                    <td>{p.engagedViews ? formatSeconds((p.engagedSeconds || 0) / p.engagedViews, isAr) : '—'}</td>
                    <td>{n(p.favorites)} / {n(p.compares)}</td>
                    <td>{n(p.contacts)}</td>
                    <td>{p.views ? `${Math.round(((p.contacts || 0) / p.views) * 1000) / 10}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title={isAr ? 'أكتر الزوار جدية' : 'Highest-intent visitors'}
        hint={isAr
          ? 'ترتيب حسب نقاط الجدية (مشاهدة، قراءة، حاسبة، مقارنة، تواصل، طلب). اللي سجّل طلب بيظهر جنبه زرار يفتح ملفه. اللي رفضوا التتبع بيتعدّوا في الأرقام بس من غير ملف.'
          : 'Ranked by intent score. Visitors who submitted a request link to their lead. Visitors who declined tracking are only counted.'}
      >
        {state.visitors.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--crm-faint)', fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'لسه مفيش زوار وافقوا على التتبع.' : 'No consenting visitors yet.'}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {state.visitors.map((v) => {
              const it = visitorInterests(v);
              const lead = v.leadId ? leadById.get(String(v.leadId)) : null;
              const seen = recordTimeLabel({ timestamp: v.lastSeenAt?.toMillis?.() }, isAr, now);
              const wants = [
                ...it.types.slice(0, 1).map(([id]) => typeName(id)),
                ...it.areas.slice(0, 2).map(([id]) => areaName(id)),
                ...it.bands.slice(0, 1).map(([id]) => bandLabel(id, isAr)),
              ].join(' • ');
              return (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '10px 12px', border: '1px solid var(--crm-line)', borderRadius: '10px', background: 'var(--crm-surface)' }}>
                  <LevelBadge level={it.level} score={it.intent} isAr={isAr} />
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--crm-ink)', fontSize: 'var(--crm-text-sm)' }}>{wants || (isAr ? 'اهتمامات غير واضحة بعد' : 'No clear interest yet')}</div>
                    <div style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-xs)', marginTop: '2px' }}>
                      {isAr
                        ? `${n(it.sessions)} زيارة • قراءة ${formatSeconds(it.engagedSeconds, isAr)} • ${n(it.contacts)} تواصل • حاسبة ${n(it.calculatorUses)} • ${sourceLabel(v.lastSource, isAr)} • ${seen}`
                        : `${n(it.sessions)} visits • read ${formatSeconds(it.engagedSeconds, isAr)} • ${n(it.contacts)} contacts • calc ${n(it.calculatorUses)} • ${sourceLabel(v.lastSource, isAr)} • ${seen}`}
                    </div>
                    {it.topProps.length > 0 && (
                      <div style={{ color: 'var(--crm-body)', fontSize: 'var(--crm-text-xs)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isAr ? 'أكتر وحدة شدّته: ' : 'Most read: '}{propertyName(it.topProps[0].id)}
                        {it.topProps[0].seconds ? ` (${formatSeconds(it.topProps[0].seconds, isAr)})` : ''}
                      </div>
                    )}
                  </div>
                  {lead && onOpenLead ? (
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => onOpenLead(lead)}>
                      {isAr ? `افتح ${lead.name || 'العميل'}` : `Open ${lead.name || 'lead'}`}
                    </button>
                  ) : (
                    <span style={{ fontSize: 'var(--crm-text-xs)', color: v.leadId ? 'var(--crm-positive)' : 'var(--crm-faint)' }}>
                      {v.leadId ? (isAr ? 'سجّل طلب' : 'Submitted a request') : (isAr ? 'لسه ماسجلش' : 'Not a lead yet')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <p style={{ margin: 0, fontSize: 'var(--crm-text-xs)', color: 'var(--crm-faint)', lineHeight: 1.7 }}>
        {isAr
          ? `${k.anonymousShare}% من النشاط من زوار رفضوا التتبع (بيتعدّوا في الإجماليات بس). مفيش أسماء ولا أرقام بتتسجل في التحليلات، والسجلات التفصيلية بتتمسح لوحدها بعد 180 يوم.`
          : `${k.anonymousShare}% of activity is from visitors who declined tracking (totals only). No names or phone numbers are stored; detailed logs expire after 180 days.`}
      </p>
    </div>
  );
}
