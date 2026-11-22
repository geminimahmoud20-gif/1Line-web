import { useMemo, useState } from 'react';
import { getActiveAccessConfig } from '../../services/accessConfig';
import { useGoals } from '../../hooks/useGoals';
import { orgReport, DEFAULT_CAPACITY } from '../../utils/orgReport';
import { CAPACITY_KEY } from '../../utils/goals';
import { EmptyState } from '../ui';
import './performance-report.css';

const num = (n) => Number(n || 0).toLocaleString('en-US');
const LEVEL = {
  over: { ar: 'فوق طاقته', cls: 'is-bad' },
  high: { ar: 'قرّب يتملي', cls: 'is-warn' },
  ok: { ar: 'مناسب', cls: '' },
  low: { ar: 'عنده مساحة', cls: 'is-good' },
};

function Person({ p, isAr, canManage, draft, setDraft, onSave }) {
  const L = (ar, en) => (isAr ? ar : en);
  const lv = p.level ? LEVEL[p.level] : null;
  return (
    <li className="org-person">
      <div className="org-person__head">
        <strong>{p.name || L('من غير اسم', 'Unnamed')}</strong>
        <span className="pr-pill">{p.roleLabel}</span>
        {lv && <span className={`pr-pill ${lv.cls}`}>{lv.ar} · {p.pct}%</span>}
      </div>
      {p.level && (
        <div className="org-person__load">
          <span>{L(`${num(p.open)} عميل مفتوح من سعة ${num(p.capacity)}`, `${p.open} open of ${p.capacity}`)}</span>
          <span>{L(`ملاك ${num(p.sellers)} · مشترين ${num(p.buyers)}`, `owners ${p.sellers} · buyers ${p.buyers}`)}</span>
          {p.idle > 0 && <span className="pr-pill is-warn">{L(`${num(p.idle)} من غير لمسة 48 ساعة`, `${p.idle} idle 48h+`)}</span>}
          {canManage && (
            <label className="org-person__cap">
              {L('السعة', 'Capacity')}
              <input className="ui-input org-input" inputMode="numeric" value={draft[p.uid] ?? (p.customCapacity ? p.capacity : '')} placeholder={String(p.capacity)}
                onChange={(e) => setDraft((d) => ({ ...d, [p.uid]: e.target.value }))} onBlur={() => onSave(p.uid)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
            </label>
          )}
        </div>
      )}
      {p.duties.length > 0 && <ul className="org-person__duties">{p.duties.map((d) => <li key={d}>{d}</li>)}</ul>}
    </li>
  );
}

/** «الهيكل والسعة»: the team as it is arranged, each role's duties, and how full each person is against what he can hold */
export default function OrgCapacityPanel({ leads = [], members = [], me, lang = 'ar', canManage = false, triggerToast }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const { goals, ready, save } = useGoals();
  const [draft, setDraft] = useState({});
  const r = useMemo(() => orgReport(leads, members, getActiveAccessConfig() || {}, goals), [leads, members, goals]);

  const saveCap = async (uid) => {
    if (draft[uid] === undefined) return;
    const value = Math.max(0, Math.round(Number(String(draft[uid]).replace(/[^\d]/g, '')) || 0));
    setDraft((d) => { const { [uid]: _drop, ...rest } = d; return rest; });
    const current = goals.people?.[uid]?.[CAPACITY_KEY] || 0;
    if (value === current) return;
    const person = { ...(goals.people?.[uid] || {}) };
    if (value) person[CAPACITY_KEY] = value; else delete person[CAPACITY_KEY];
    const ok = await save({ ...goals, people: { ...goals.people, [uid]: person } }, me?.uid);
    triggerToast?.(ok ? L('اتحفظت السعة', 'Capacity saved') : L('ما اتحفظتش، جرّب تاني', 'Not saved'), ok ? 'success' : 'error');
  };
  const saveDefault = async () => {
    if (draft.__team === undefined) return;
    const value = Math.max(0, Math.round(Number(String(draft.__team).replace(/[^\d]/g, '')) || 0));
    setDraft((d) => { const { __team: _drop, ...rest } = d; return rest; });
    const team = { ...(goals.team || {}) };
    if (value) team[CAPACITY_KEY] = value; else delete team[CAPACITY_KEY];
    const ok = await save({ ...goals, team }, me?.uid);
    triggerToast?.(ok ? L('اتحفظت السعة الافتراضية', 'Default saved') : L('ما اتحفظتش، جرّب تاني', 'Not saved'), ok ? 'success' : 'error');
  };

  if (!members.length) return <section className="pr-panel"><EmptyState title={L('قايمة الفريق مش متاحة', 'Team list not available')} description={L('القايمة الكاملة بتظهر للمدير العام.', 'The full list shows to the super admin.')} /></section>;
  const p = { isAr, canManage: canManage && ready, draft, setDraft, onSave: saveCap };
  const t = r.totals;
  return (
    <section className="pr-panel">
      <div className="pr-cards">
        <div className="pr-card"><span className="pr-card__label">{L('حمل فريق المبيعات', 'Sales team load')}</span><strong className="pr-card__value">{t.pct}%</strong><span className={`pr-card__delta ${t.pct > 100 ? 'is-bad' : ''}`}>{L(`${num(t.open)} عميل مفتوح من سعة ${num(t.capacity)}`, `${t.open} of ${t.capacity}`)}</span></div>
        <div className="pr-card"><span className="pr-card__label">{L('بياعين', 'Salespeople')}</span><strong className="pr-card__value">{num(t.sellers)}</strong><span className="pr-card__delta">{L(`من ${num(t.people)} في الفريق`, `of ${t.people}`)}</span></div>
        <div className="pr-card"><span className="pr-card__label">{L('فوق طاقتهم', 'Over capacity')}</span><strong className="pr-card__value">{num(r.people.filter((x) => x.level === 'over').length)}</strong><span className="pr-card__delta">{L(`وعندهم مساحة: ${num(r.people.filter((x) => x.level === 'low').length)}`, `with room: ${r.people.filter((x) => x.level === 'low').length}`)}</span></div>
        <div className="pr-card"><span className="pr-card__label">{L('عملاء من غير مسؤول', 'Unassigned clients')}</span><strong className="pr-card__value">{num(r.unassigned.open)}</strong><span className="pr-card__delta">{L(`ملاك ${num(r.unassigned.sellers)} · مشترين ${num(r.unassigned.buyers)}`, `owners ${r.unassigned.sellers} · buyers ${r.unassigned.buyers}`)}</span></div>
      </div>

      {canManage && ready && (
        <div className="pr-block">
          <label className="org-person__cap">
            {L('السعة الافتراضية لكل بياع (عملاء مفتوحين في نفس الوقت)', 'Default capacity per salesperson')}
            <input className="ui-input org-input" inputMode="numeric" value={draft.__team ?? (goals.team?.[CAPACITY_KEY] || '')} placeholder={String(DEFAULT_CAPACITY)}
              onChange={(e) => setDraft((d) => ({ ...d, __team: e.target.value }))} onBlur={saveDefault} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
          </label>
        </div>
      )}

      {r.top.length > 0 && (
        <div className="pr-block"><h3>{L('الإدارة العليا', 'Leadership')}</h3><ul className="org-list">{r.top.map((x) => <Person key={x.uid} p={x} {...p} />)}</ul></div>
      )}
      {r.teams.map((team) => (
        <div className="pr-block" key={team.id}>
          <h3>{team.label} <small>{L(`· ${num(team.open)} عميل من سعة ${num(team.capacity)} (${team.pct}%)`, `· ${team.open}/${team.capacity} (${team.pct}%)`)}</small></h3>
          <ul className="org-list">
            {team.managers.map((x) => <Person key={x.uid} p={x} {...p} />)}
            {team.people.map((x) => <Person key={x.uid} p={x} {...p} />)}
          </ul>
        </div>
      ))}
      {r.support.length > 0 && (
        <div className="pr-block"><h3>{L('الإدارات المساندة', 'Support')}</h3><ul className="org-list">{r.support.map((x) => <Person key={x.uid} p={x} {...p} />)}</ul></div>
      )}
      <p className="pr-note">{L('المهام مأخوذة من صلاحيات كل دور في «إدارة الفريق»: لو مهمة ناقصة أو زيادة، عدّل صلاحيات الدور. الحمل = العملاء المفتوحين (من جديد لحد الإغلاق) ÷ السعة.', 'Duties come from each role’s permissions. Load = open clients ÷ capacity.')}</p>
    </section>
  );
}
