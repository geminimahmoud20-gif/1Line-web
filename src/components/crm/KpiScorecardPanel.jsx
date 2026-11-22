import { useEffect, useMemo, useState } from 'react';
import { Timer, UserCheck, CalendarCheck, Trophy, AlarmClock, Hourglass, Gauge, UserX, Coins, CircleCheck, CircleAlert, TriangleAlert } from 'lucide-react';
import { getActiveAccessConfig } from '../../services/accessConfig';
import { useGoals } from '../../hooks/useGoals';
import { loadMonthlySpend } from '../../firebaseLazy';
import { kpiScorecard } from '../../utils/kpiScorecard';
import { RingGauge, Badge, IconBadge } from '../ui';
import './report-dash.css';

const META = {
  replyOnTime: { ar: 'الرد في الوقت', hint: 'أول رد خلال 15 دقيقة لعميل الإعلان، وساعتين لأي عميل تاني', icon: Timer },
  qualifiedPct: { ar: 'نسبة التأهيل', hint: 'من العملاء الجداد، كام وصل «مؤهل» أو أبعد', icon: UserCheck },
  visitPct: { ar: 'نسبة المعاينة', hint: 'من العملاء الجداد، كام وصل لاجتماع أو معاينة', icon: CalendarCheck },
  winRate: { ar: 'نسبة الكسب', hint: 'من الصفقات اللي اتحسمت، كام كسبناها', icon: Trophy },
  latePct: { ar: 'متأخرين في مرحلتهم', hint: 'عملاء مفتوحين عدّوا الوقت المسموح لمرحلتهم', icon: AlarmClock },
  idlePct: { ar: 'من غير متابعة', hint: 'عملاء مفتوحين محدش لمسهم من 48 ساعة', icon: Hourglass },
  loadPct: { ar: 'حمل فريق المبيعات', hint: 'العملاء المفتوحين ÷ سعة البياعين', icon: Gauge },
  unassigned: { ar: 'من غير مسؤول', hint: 'عملاء مفتوحين محدش استلمهم', icon: UserX },
  costPerQualified: { ar: 'تكلفة العميل المؤهل', hint: 'صرف الشهر ÷ المؤهلين من الإعلانات', icon: Coins },
};
const GROUPS = [
  { id: 'speed', ar: 'السرعة' },
  { id: 'conversion', ar: 'التحويل' },
  { id: 'flow', ar: 'تدفق الشغل' },
  { id: 'capacity', ar: 'السعة' },
  { id: 'marketing', ar: 'التسويق' },
];
const TONE = { good: 'success', ok: 'warning', bad: 'danger', none: 'neutral' };
const WORD = { good: 'في الهدف', ok: 'قريب', bad: 'بعيد عن الهدف', none: 'مفيش هدف' };
const targetText = (k) => {
  if (!k.target) return 'الهدف لسه ما اتحددش';
  const u = k.unit === '%' ? '%' : '';
  return k.target.higher ? `الهدف ${k.target.good}${u} أو أكتر` : `الهدف ${k.target.good}${u} أو أقل`;
};
const big = (k) => (k.value === null ? '—' : `${Number(k.value).toLocaleString('en-US')}${k.unit && k.unit !== '%' ? ` ${k.unit}` : ''}`);

function KpiCard({ k, group }) {
  const m = META[k.id] || { ar: k.id, icon: Gauge };
  const Icon = m.icon;
  const tone = TONE[k.colour];
  return (
    <div className={`rd-card rd-kpi ui-tone-${tone}`} title={m.hint}>
      {k.unit === '%'
        ? <RingGauge value={k.value} tone={tone} size={84} />
        : <IconBadge icon={<Icon size={22} />} tone={tone} size="lg" />}
      <div className="rd-kpi__body">
        <span className="rd-kpi__group">{group}</span>
        <span className="rd-kpi__label">{k.unit === '%' && <Icon size={16} aria-hidden="true" />}{m.ar}</span>
        {k.unit !== '%' && <span className="rd-kpi__value">{big(k)}</span>}
        <span><Badge tone={tone} dot>{WORD[k.colour]}</Badge></span>
        <span className="rd-kpi__line">{targetText(k)}</span>
        <span className="rd-kpi__line">{k.note}</span>
      </div>
    </div>
  );
}

/** «المؤشرات»: each health number against its target, coloured, grouped by what it measures */
export default function KpiScorecardPanel({ leads = [], members = [], initialSpend = {} }) {
  const { goals } = useGoals();
  const [spend, setSpend] = useState(initialSpend);
  useEffect(() => {
    let alive = true;
    loadMonthlySpend().then((m) => { if (alive && m) setSpend(m); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const r = useMemo(() => kpiScorecard(leads, { members, access: getActiveAccessConfig() || {}, capacity: goals, spend }), [leads, members, goals, spend]);

  return (
    <div className="rd">
      <div className="rd-score" role="group" aria-label="ملخص المؤشرات">
        <div className="rd-score__item ui-tone-success"><IconBadge icon={<CircleCheck size={22} />} tone="success" /><div><strong>{r.counts.good}</strong><span>في الهدف</span></div></div>
        <div className="rd-score__item ui-tone-warning"><IconBadge icon={<CircleAlert size={22} />} tone="warning" /><div><strong>{r.counts.ok}</strong><span>قريبين</span></div></div>
        <div className="rd-score__item ui-tone-danger"><IconBadge icon={<TriangleAlert size={22} />} tone="danger" /><div><strong>{r.counts.bad}</strong><span>بعيدين</span></div></div>
      </div>
      <div className="rd-grid rd-grid--3">
        {GROUPS.flatMap((g) => r.items.filter((k) => k.group === g.id).map((k) => <KpiCard key={k.id} k={k} group={g.ar} />))}
      </div>
      <p className="rd-note">التحويل والرد محسوبين على العملاء اللي وصلوا آخر 30 يوم، والكسب على الصفقات اللي اتحسمت آخر 90 يوم. الأهداف مبدئية ومحطوطة في مكان واحد (<code>KPI_TARGETS</code>). تكلفة العميل المؤهل من غير هدف لحد ما أول شهور تبيّن الرقم الطبيعي.</p>
    </div>
  );
}
