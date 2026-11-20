import { useMemo, useState } from 'react';
import { Users, Building, Zap, Target, UserMinus, PhoneCall, Activity, Megaphone, Trophy, Calculator, ChevronLeft, Banknote, LayoutDashboard } from 'lucide-react';
import { resolveRange, comparisonRange } from '../../utils/reportPeriods';
import PerformanceReportPanel from './PerformanceReportPanel';
import ExecutiveSummaryPanel from './ExecutiveSummaryPanel';
import OperationsReportsPanel from './OperationsReportsPanel';
import GoalsPanel from './GoalsPanel';
import LostReportPanel from './LostReportPanel';
import CallsReportPanel from './CallsReportPanel';
import MoneyReportPanel from './MoneyReportPanel';
import ReportControls from './ReportControls';
import { PageHeader } from '../ui';
import './performance-report.css';

const TABS = [
  { id: 'summary', icon: LayoutDashboard, ar: 'الملخص التنفيذي', en: 'Summary' },
  { id: 'sales', icon: Users, ar: 'العملاء والمبيعات', en: 'Clients & sales' },
  { id: 'money', icon: Banknote, ar: 'القمع والفلوس', en: 'Funnel & money' },
  { id: 'portfolio', icon: Building, ar: 'العقارات', en: 'Portfolio' },
  { id: 'demand', icon: Zap, ar: 'الطلبات والخدمات', en: 'Demands & services' },
  { id: 'calls', icon: PhoneCall, ar: 'الاتصالات', en: 'Calls' },
  { id: 'lost', icon: UserMinus, ar: 'ضياع العملاء', en: 'Lost clients' },
  { id: 'goals', icon: Target, ar: 'الأهداف', en: 'Goals' }
];

// The reports that live on their own screens, one tap away
const LINKS = [
  { tab: 'campaigns', icon: Megaphone, ar: 'تقرير الحملات', sub_ar: 'كل إعلان جاب كام عميل وكلّفك كام' },
  { tab: 'agents', icon: Trophy, ar: 'فريق المبيعات والعمولات', sub_ar: 'ترتيب البياعين وأهدافهم' },
  { tab: 'financials', icon: Calculator, ar: 'المالية والأقساط', sub_ar: 'التحصيل والالتزامات' },
  { tab: 'visitor_intelligence', icon: Activity, ar: 'زوار الموقع', sub_ar: 'الزيارات ومصادرها وأكتر العقارات مشاهدة' }
];

/** «مركز التقارير»: one place and one date range / comparison for every report (managers) */
export default function ReportsHub({ leads = [], properties = [], demands = [], intake = [], members = [], me, canManage = false, areaNames = {}, lang = 'ar', onOpenTab, onOpenLead, triggerToast }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState('summary');
  const [preset, setPreset] = useState('30');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [mode, setMode] = useState('previous');
  const range = useMemo(() => resolveRange(preset, now, custom), [preset, now, custom]);
  const prevRange = useMemo(() => comparisonRange(range, mode), [range, mode]);
  const ctl = { preset, setPreset, custom, setCustom, mode, setMode };

  return (
    <section className="pr-panel pr-hub" dir={isAr ? 'rtl' : 'ltr'}>
      <PageHeader
        title={L('مركز التقارير', 'Reports')}
        description={L('اختار الفترة وقارنها. اضغط على أي رقم تشوف العملاء اللي وراه.', 'Pick a period and compare it. Tap any number to see the clients behind it.')}
      />

      <div className="pr-tabs" role="tablist" aria-label={L('أقسام التقارير', 'Report sections')}>
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>
              <Icon size={16} aria-hidden="true" /> {isAr ? t.ar : t.en}
            </button>
          );
        })}
      </div>

      {tab !== 'goals' && tab !== 'money' && <ReportControls ctl={ctl} range={range} prevRange={prevRange} now={now} isAr={isAr} />}

      {tab === 'summary' && <ExecutiveSummaryPanel leads={leads} range={range} prevRange={prevRange} now={now} lang={lang} onOpenLead={onOpenLead} />}
      {tab === 'sales' && <PerformanceReportPanel leads={leads} lang={lang} range={range} prevRange={prevRange} now={now} />}
      {tab === 'money' && <MoneyReportPanel leads={leads} lang={lang} onOpenTab={onOpenTab} />}
      {tab === 'portfolio' && <OperationsReportsPanel part="portfolio" properties={properties} areaNames={areaNames} range={range} prevRange={prevRange} now={now} lang={lang} />}
      {tab === 'demand' && <OperationsReportsPanel part="demand" demands={demands} intake={intake} areaNames={areaNames} range={range} prevRange={prevRange} now={now} lang={lang} />}

      {tab === 'calls' && <CallsReportPanel leads={leads} range={range} prevRange={prevRange} lang={lang} />}
      {tab === 'lost' && <LostReportPanel leads={leads} range={range} prevRange={prevRange} lang={lang} onOpenLead={onOpenLead} />}
      {tab === 'goals' && <GoalsPanel leads={leads} members={members} me={me} canManage={canManage} lang={lang} triggerToast={triggerToast} />}

      {onOpenTab && (
        <div className="pr-block">
          <h3>{L('تقارير تانية', 'More reports')}</h3>
          <ul className="pr-links">
            {LINKS.map((l) => {
              const Icon = l.icon;
              return (
                <li key={l.tab}>
                  <button type="button" onClick={() => onOpenTab(l.tab)}>
                    <Icon size={18} aria-hidden="true" />
                    <span><b>{l.ar}</b><small>{l.sub_ar}</small></span>
                    <ChevronLeft size={16} aria-hidden="true" className="pr-links__go" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
