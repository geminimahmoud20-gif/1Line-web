import { useEffect, useMemo, useState } from 'react';
import { getActiveAccessConfig } from '../../services/accessConfig';
import { useGoals } from '../../hooks/useGoals';
import { loadMonthlySpend } from '../../firebaseLazy';
import { kpiScorecard } from '../../utils/kpiScorecard';
import './performance-report.css';

const LABELS = {
  replyOnTime: { ar: 'الرد في الوقت', hint: 'أول رد خلال 15 دقيقة لعميل الإعلان، وساعتين لأي عميل تاني' },
  qualifiedPct: { ar: 'نسبة التأهيل', hint: 'من العملاء الجداد، كام وصل «مؤهل» أو أبعد' },
  visitPct: { ar: 'نسبة المعاينة', hint: 'من العملاء الجداد، كام وصل لاجتماع أو معاينة' },
  winRate: { ar: 'نسبة الكسب', hint: 'من الصفقات اللي اتحسمت، كام كسبناها' },
  latePct: { ar: 'متأخرين في مرحلتهم', hint: 'عملاء مفتوحين عدّوا الوقت المسموح لمرحلتهم' },
  idlePct: { ar: 'من غير متابعة', hint: 'عملاء مفتوحين محدش لمسهم من 48 ساعة' },
  loadPct: { ar: 'حمل فريق المبيعات', hint: 'العملاء المفتوحين ÷ سعة البياعين' },
  unassigned: { ar: 'من غير مسؤول', hint: 'عملاء مفتوحين محدش استلمهم' },
  costPerQualified: { ar: 'تكلفة العميل المؤهل', hint: 'صرف الشهر ÷ المؤهلين من الإعلانات' },
};
const GROUPS = [
  { id: 'speed', ar: 'السرعة' },
  { id: 'conversion', ar: 'التحويل' },
  { id: 'flow', ar: 'تدفق الشغل' },
  { id: 'capacity', ar: 'السعة' },
  { id: 'marketing', ar: 'التسويق' },
];
const COLOUR = { good: { ar: 'في الهدف', cls: 'is-good' }, ok: { ar: 'قريب', cls: 'is-ok' }, bad: { ar: 'بعيد عن الهدف', cls: 'is-bad' }, none: { ar: 'مفيش هدف', cls: '' } };
const fmt = (k) => (k.value === null ? '—' : `${Number(k.value).toLocaleString('en-US')}${k.unit === '%' ? '%' : k.unit ? ` ${k.unit}` : ''}`);
const targetText = (k) => {
  if (!k.target) return 'الهدف لسه ما اتحددش';
  const u = k.unit === '%' ? '%' : '';
  return k.target.higher ? `الهدف ${k.target.good}${u} أو أكتر` : `الهدف ${k.target.good}${u} أو أقل`;
};

/** «المؤشرات»: each health number against its target, coloured, grouped by what it measures */
export default function KpiScorecardPanel({ leads = [], members = [] }) {
  const { goals } = useGoals();
  const [spend, setSpend] = useState({});
  useEffect(() => {
    let alive = true;
    loadMonthlySpend().then((m) => { if (alive && m) setSpend(m); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const r = useMemo(() => kpiScorecard(leads, { members, access: getActiveAccessConfig() || {}, capacity: goals, spend }), [leads, members, goals, spend]);

  return (
    <section className="pr-panel">
      <p className="kpi-summary">
        <span className="pr-pill is-good">{r.counts.good} في الهدف</span>
        <span className="pr-pill is-ok">{r.counts.ok} قريبين</span>
        <span className="pr-pill is-bad">{r.counts.bad} بعيدين</span>
        <span>· التحويل والرد محسوبين على العملاء اللي وصلوا آخر 30 يوم</span>
      </p>
      {GROUPS.map((g) => {
        const items = r.items.filter((k) => k.group === g.id);
        if (!items.length) return null;
        return (
          <div className="pr-block" key={g.id}>
            <h3>{g.ar}</h3>
            <div className="pr-cards">
              {items.map((k) => (
                <div className={`pr-card kpi-card kpi-card--${k.colour}`} key={k.id} title={LABELS[k.id]?.hint}>
                  <span className="pr-card__label">{LABELS[k.id]?.ar || k.id}</span>
                  <strong className="pr-card__value">{fmt(k)}</strong>
                  <span className={`pr-pill ${COLOUR[k.colour].cls}`}>{COLOUR[k.colour].ar}</span>
                  <span className="pr-card__delta">{targetText(k)} · {k.note}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <p className="pr-note">الأهداف مبدئية لشركة وساطة في البداية، ومحطوطة في مكان واحد (<code>KPI_TARGETS</code>). قولّنا لو عايز تغيّر أي هدف. تكلفة العميل المؤهل من غير هدف لحد ما أول شهور تبيّن الرقم الطبيعي.</p>
    </section>
  );
}
