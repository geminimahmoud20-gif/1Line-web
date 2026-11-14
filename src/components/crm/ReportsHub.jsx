import { useMemo, useState } from 'react';
import { BarChart3, Users, Building, Zap, Target, Activity, Megaphone, Trophy, Calculator, ChevronLeft } from 'lucide-react';
import { resolveRange, comparisonRange } from '../../utils/reportPeriods';
import PerformanceReportPanel from './PerformanceReportPanel';
import OperationsReportsPanel from './OperationsReportsPanel';
import GoalsPanel from './GoalsPanel';
import ReportControls from './ReportControls';
import './performance-report.css';

const TABS = [
  { id: 'sales', icon: Users, ar: 'العملاء والمبيعات', en: 'Clients & sales' },
  { id: 'portfolio', icon: Building, ar: 'العقارات', en: 'Portfolio' },
  { id: 'demand', icon: Zap, ar: 'الطلبات والخدمات', en: 'Demands & services' },
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
export default function ReportsHub({ leads = [], properties = [], demands = [], intake = [], members = [], me, canManage = false, areaNames = {}, lang = 'ar', onOpenTab, triggerToast }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState('sales');
  const [preset, setPreset] = useState('30');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [mode, setMode] = useState('previous');
  const range = useMemo(() => resolveRange(preset, now, custom), [preset, now, custom]);
  const prevRange = useMemo(() => comparisonRange(range, mode), [range, mode]);
  const ctl = { preset, setPreset, custom, setCustom, mode, setMode };

  return (
    <section className="pr-panel pr-hub" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="pr-head">
        <div>
          <h2><BarChart3 size={22} aria-hidden="true" /> {L('مركز التقارير', 'Reports')}</h2>
          <p>{L('اختار الفترة وقارنها، وبدّل بين الأقسام، وتابع أهداف الشهر.', 'Pick the period, compare it, switch sections, and follow the monthly goals.')}</p>
        </div>
      </header>

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

      {tab !== 'goals' && <ReportControls ctl={ctl} range={range} prevRange={prevRange} now={now} isAr={isAr} />}

      {tab === 'sales' && <PerformanceReportPanel leads={leads} lang={lang} range={range} prevRange={prevRange} now={now} />}
      {tab === 'portfolio' && <OperationsReportsPanel part="portfolio" properties={properties} areaNames={areaNames} range={range} prevRange={prevRange} now={now} lang={lang} />}
      {tab === 'demand' && <OperationsReportsPanel part="demand" demands={demands} intake={intake} areaNames={areaNames} range={range} prevRange={prevRange} now={now} lang={lang} />}

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
