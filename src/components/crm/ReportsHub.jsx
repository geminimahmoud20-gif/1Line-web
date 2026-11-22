import { useMemo, useRef, useState } from 'react';
import { Users, Building, Target, ShieldAlert, Megaphone, Trophy, Calculator, ChevronLeft, ChevronRight, Banknote, LayoutDashboard, Plus, X, Bookmark, Printer, Network } from 'lucide-react';
import { resolveRange, comparisonRange } from '../../utils/reportPeriods';
import { loadViews, saveView, removeView } from '../../utils/reportViews';
import PerformanceReportPanel from './PerformanceReportPanel';
import ExecutiveSummaryPanel from './ExecutiveSummaryPanel';
import TeamReportPanel from './TeamReportPanel';
import OrgCapacityPanel from './OrgCapacityPanel';
import MarketingReportPanel from './MarketingReportPanel';
import OperationsReportsPanel from './OperationsReportsPanel';
import GoalsPanel from './GoalsPanel';
import LostReportPanel from './LostReportPanel';
import MoneyReportPanel from './MoneyReportPanel';
import ReportControls from './ReportControls';
import ExportMenu from './ExportMenu';
import { collectReport, row } from '../../utils/reportExport';
import { rangeText } from '../../utils/reportPeriods';
import { PageHeader, Button } from '../ui';
import './performance-report.css';
import './executive-summary.css';

// Grouped by the question a manager asks, not by the data behind it
const TABS = [
  { id: 'summary', icon: LayoutDashboard, ar: 'الملخص', en: 'Summary', q_ar: 'الشغل ماشي إزاي؟' },
  { id: 'sales', icon: Banknote, ar: 'المبيعات والفلوس', en: 'Sales & money', q_ar: 'بنبيع قد إيه وبنكسب كام؟' },
  { id: 'team', icon: Users, ar: 'الفريق', en: 'Team', q_ar: 'مين محتاج دعم؟' },
  { id: 'org', icon: Network, ar: 'الهيكل والسعة', en: 'Structure & capacity', q_ar: 'مين شايل إيه؟' },
  { id: 'marketing', icon: Megaphone, ar: 'التسويق', en: 'Marketing', q_ar: 'أنهي مصدر يستاهل فلوسه؟' },
  { id: 'stock', icon: Building, ar: 'العقارات والطلب', en: 'Stock & demand', q_ar: 'عندنا اللي العملاء عايزينه؟' },
  { id: 'risk', icon: ShieldAlert, ar: 'الخسارة والمخاطر', en: 'Losses & risk', q_ar: 'بنخسر عملاء ليه؟' },
  { id: 'goals', icon: Target, ar: 'الأهداف', en: 'Goals', q_ar: 'هنوصل للهدف؟' }
];
// Old tab ids (a saved view from before) open their new home
const LEGACY = { money: 'sales', portfolio: 'stock', demand: 'stock', calls: 'team', lost: 'risk' };
const NO_RANGE = new Set(['goals', 'org']);

// The reports that live on their own screens, one tap away
const LINKS = [
  { tab: 'agents', icon: Trophy, ar: 'فريق المبيعات والعمولات', sub_ar: 'ترتيب البياعين وأهدافهم' },
  { tab: 'financials', icon: Calculator, ar: 'المالية والأقساط', sub_ar: 'التحصيل والالتزامات' }
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
  const current = TABS.find((t) => t.id === tab) || TABS[0];
  const Go = isAr ? ChevronLeft : ChevronRight;
  // Export / print whatever the open tab shows (its numbers, findings, bars and tables)
  const bodyRef = useRef(null);
  const exportRowsNow = () => [
    row('التقرير', isAr ? current.ar : current.en, NO_RANGE.has(tab) ? '' : rangeText(range), prevRange && !NO_RANGE.has(tab) ? `مقابل ${rangeText(prevRange)}` : ''),
    ...collectReport(bodyRef.current, isAr ? current.ar : current.en)
  ];

  // Saved views: this period + comparison + tab under a name, on this device
  const [views, setViews] = useState(() => loadViews());
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const applyView = (v) => {
    setTab(LEGACY[v.tab] || (TABS.some((t) => t.id === v.tab) ? v.tab : 'summary'));
    setPreset(v.preset || '30');
    setCustom(v.custom?.from ? v.custom : { from: '', to: '' });
    setMode(v.mode || 'previous');
  };
  const addView = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setViews(saveView({ name, tab, preset, custom, mode }));
    setName('');
    setNaming(false);
    triggerToast?.(L('اتحفظ العرض', 'View saved'), 'success');
  };

  return (
    <section className="pr-panel pr-hub" dir={isAr ? 'rtl' : 'ltr'}>
      <PageHeader
        title={L('مركز التقارير', 'Reports')}
        description={L(`${current.q_ar} اضغط على أي رقم تشوف العملاء اللي وراه.`, 'Tap any number to see the clients behind it.')}
        actions={(
          <div className="pr-hub__actions">
            <ExportMenu getRows={exportRowsNow} baseName={`1Line_Report_${tab}`} sheetName="Report" label={L('تصدير', 'Export')}
              onDone={(f, ok) => triggerToast?.(ok ? L('اتصدّر التقرير', 'Exported') : L('التصدير ما نجحش', 'Export failed'), ok ? 'success' : 'error')} />
            <Button variant="secondary" icon={<Printer size={16} aria-hidden="true" />} onClick={() => window.print()}>{L('طباعة / PDF', 'Print / PDF')}</Button>
          </div>
        )}
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

      {!NO_RANGE.has(tab) && <ReportControls ctl={ctl} range={range} prevRange={prevRange} now={now} isAr={isAr} />}

      <div className="rv" role="group" aria-label={L('العروض المحفوظة', 'Saved views')}>
        <span className="rv__label"><Bookmark size={14} aria-hidden="true" /> {L('عروضي:', 'My views:')}</span>
        {views.map((v) => (
          <span key={v.id} className="rv__chip">
            <button type="button" onClick={() => applyView(v)}>{v.name}</button>
            <button type="button" aria-label={L(`امسح «${v.name}»`, `Remove ${v.name}`)} onClick={() => setViews(removeView(v.id))}><X size={12} aria-hidden="true" /></button>
          </span>
        ))}
        {naming ? (
          <form className="rv__form" onSubmit={addView}>
            <input autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={L('اسم العرض: أداء الشهر', 'View name')} aria-label={L('اسم العرض', 'View name')} />
            <button type="submit" className="rv__add">{L('احفظ', 'Save')}</button>
            <button type="button" className="rv__add" onClick={() => { setNaming(false); setName(''); }}>{L('إلغاء', 'Cancel')}</button>
          </form>
        ) : (
          <button type="button" className="rv__add" onClick={() => setNaming(true)}><Plus size={14} aria-hidden="true" /> {L('احفظ العرض ده', 'Save this view')}</button>
        )}
      </div>

      <div ref={bodyRef} className="pr-hub__body">
      {tab === 'summary' && <ExecutiveSummaryPanel leads={leads} range={range} prevRange={prevRange} now={now} lang={lang} onOpenLead={onOpenLead} />}
      {tab === 'sales' && (
        <>
          <PerformanceReportPanel leads={leads} lang={lang} range={range} prevRange={prevRange} now={now} hide={['team', 'sources']} />
          <section className="xs-card" aria-labelledby="hub-money">
            <h2 id="hub-money" className="xs-h">{L('الفلوس: الإعلانات والعمولات والمتوقع', 'Money: ads, commission and forecast')} <small>{L('(كل الوقت، مش الفترة)', '(all time)')}</small></h2>
            <MoneyReportPanel leads={leads} lang={lang} onOpenTab={onOpenTab} />
          </section>
        </>
      )}
      {tab === 'org' && <OrgCapacityPanel leads={leads} members={members} me={me} lang={lang} canManage={canManage} triggerToast={triggerToast} />}
      {tab === 'team' && <TeamReportPanel leads={leads} range={range} prevRange={prevRange} now={now} lang={lang} />}
      {tab === 'marketing' && <MarketingReportPanel leads={leads} range={range} lang={lang} onOpenTab={onOpenTab} />}
      {tab === 'stock' && (
        <>
          <OperationsReportsPanel part="portfolio" properties={properties} areaNames={areaNames} range={range} prevRange={prevRange} now={now} lang={lang} />
          <OperationsReportsPanel part="demand" demands={demands} intake={intake} areaNames={areaNames} range={range} prevRange={prevRange} now={now} lang={lang} />
        </>
      )}
      {tab === 'risk' && <LostReportPanel leads={leads} range={range} prevRange={prevRange} lang={lang} onOpenLead={onOpenLead} />}
      {tab === 'goals' && <GoalsPanel leads={leads} members={members} me={me} canManage={canManage} lang={lang} triggerToast={triggerToast} />}
      </div>

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
                    <Go size={16} aria-hidden="true" className="pr-links__go" />
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
