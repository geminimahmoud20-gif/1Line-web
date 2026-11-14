import { useMemo, useState } from 'react';
import { Target, Pencil, Check } from 'lucide-react';
import { useGoals } from '../../hooks/useGoals';
import { GOAL_KEYS, STATUS_LABEL, goalProgress, myGoalRows } from '../../utils/goals';
import { EmptyState } from '../ui';
import './goals-panel.css';

const num = (n) => Number(n || 0).toLocaleString('en-US');
const keyName = (id, isAr) => { const k = GOAL_KEYS.find((g) => g.id === id); return isAr ? k.ar : k.en; };

/** One goal: the bar, a marker where the month's pace says it should be, and where it is heading */
function GoalBar({ row, isAr }) {
  const L = (ar, en) => (isAr ? ar : en);
  const label = STATUS_LABEL[row.status];
  return (
    <li className={`gl-row is-${row.status}`}>
      <div className="gl-row__top">
        <span>{keyName(row.key, isAr)}</span>
        <b>{num(row.actual)} <small>/ {num(row.target)}</small></b>
      </div>
      <div className="gl-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, row.pct)} aria-label={keyName(row.key, isAr)}>
        <i style={{ width: `${Math.min(100, row.pct)}%` }} />
        {row.status !== 'done' && <em style={{ insetInlineStart: `${Math.min(100, row.expectedPct)}%` }} title={L('المفروض توصله دلوقتي', 'Where the pace says you should be')} />}
      </div>
      <div className="gl-row__meta">
        <span className="gl-chip">{isAr ? label.ar : label.en}</span>
        <span>{row.pct}% {L('من الهدف', 'of the goal')}{row.status !== 'done' && ` · ${L('المتوقع آخر الشهر', 'on track for')} ${num(row.projected)}`}</span>
      </div>
    </li>
  );
}

/** A salesperson's own goals for the month (nothing when none are set for them) */
export function MyGoals({ leads = [], uid, lang = 'ar' }) {
  const isAr = lang !== 'en';
  const { goals } = useGoals();
  const [now] = useState(() => Date.now());
  const rows = useMemo(() => myGoalRows(leads, goals, uid, now), [leads, goals, uid, now]);
  if (!rows.length) return null;
  return (
    <section className="gl-card" aria-label={isAr ? 'هدفي الشهر ده' : 'My goals this month'}>
      <h3><Target size={18} aria-hidden="true" /> {isAr ? 'هدفي الشهر ده' : 'My goals this month'}</h3>
      <ul className="gl-list">{rows.map((r) => <GoalBar key={r.key} row={r} isAr={isAr} />)}</ul>
    </section>
  );
}

/** The goals editor: the team's four targets, then each person's (collapsed) */
function Editor({ goals, people, isAr, onSave, onCancel, saving }) {
  const L = (ar, en) => (isAr ? ar : en);
  const [draft, setDraft] = useState(() => ({ team: { ...goals.team }, people: Object.fromEntries(Object.entries(goals.people).map(([u, t]) => [u, { ...t }])) }));
  const setTeam = (k, v) => setDraft((d) => ({ ...d, team: { ...d.team, [k]: v } }));
  const setPerson = (uid, k, v) => setDraft((d) => ({ ...d, people: { ...d.people, [uid]: { ...(d.people[uid] || {}), [k]: v } } }));
  const field = (value, onChange, id) => (
    <label key={id}><span>{keyName(id, isAr)}</span><input type="text" inputMode="numeric" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="—" /></label>
  );
  return (
    <div className="gl-editor">
      <h4>{L('هدف الفريق كله (شهريًا)', 'Team goals (monthly)')}</h4>
      <div className="gl-fields">{GOAL_KEYS.map((k) => field(draft.team[k.id], (v) => setTeam(k.id, v), k.id))}</div>
      <h4>{L('هدف كل بياع', 'Per salesperson')}</h4>
      {people.length === 0 && <p className="gl-note">{L('مفيش أعضاء فريق متسجلين.', 'No team members yet.')}</p>}
      {people.map((p) => (
        <details key={p.uid} className="gl-person">
          <summary>{p.name || p.uid.slice(0, 6)}{Object.keys(draft.people[p.uid] || {}).some((k) => draft.people[p.uid][k]) ? ' •' : ''}</summary>
          <div className="gl-fields">{GOAL_KEYS.map((k) => field(draft.people[p.uid]?.[k.id], (v) => setPerson(p.uid, k.id, v), k.id))}</div>
        </details>
      ))}
      <p className="gl-note">{L('الهدف بيتكرر كل شهر. سيب الخانة فاضية لو مفيش هدف.', 'Goals repeat every month. Leave a field empty for no goal.')}</p>
      <div className="gl-actions">
        <button type="button" className="gl-btn gl-btn--primary" onClick={() => onSave(draft)} disabled={saving}><Check size={16} aria-hidden="true" /> {saving ? L('بيحفظ…', 'Saving…') : L('حفظ الأهداف', 'Save goals')}</button>
        <button type="button" className="gl-btn" onClick={onCancel} disabled={saving}>{L('إلغاء', 'Cancel')}</button>
      </div>
    </div>
  );
}

/** «الأهداف»: this month's team and per-person goals against the pace (everyone with the reports); managers edit them */
export default function GoalsPanel({ leads = [], members = [], me, canManage = false, lang = 'ar', triggerToast }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const { goals, ready, save } = useGoals();
  const [now] = useState(() => Date.now());
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const progress = useMemo(() => goalProgress(leads, goals, now), [leads, goals, now]);
  const monthName = new Date(`${progress.win.from}T12:00:00Z`).toLocaleDateString('ar-EG-u-nu-latn', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const people = useMemo(() => {
    const byUid = new Map(members.filter((m) => m.uid).map((m) => [m.uid, { uid: m.uid, name: m.name || m.email || '' }]));
    for (const p of progress.people) if (!byUid.has(p.uid)) byUid.set(p.uid, { uid: p.uid, name: p.name });
    return [...byUid.values()];
  }, [members, progress.people]);
  const hasGoals = progress.team.length > 0 || progress.people.length > 0;

  const onSave = async (draft) => {
    setSaving(true);
    const ok = await save(draft, me?.uid);
    setSaving(false);
    if (ok) { setEditing(false); triggerToast?.(L('اتحفظت الأهداف', 'Goals saved'), 'success'); } else triggerToast?.(L('الأهداف ماتحفظتش. محتاج صلاحية مدير مبيعات.', 'Not saved. Needs a sales manager.'), 'error');
  };

  return (
    <section className="gl-panel">
      <header className="gl-head">
        <div>
          <h3><Target size={20} aria-hidden="true" /> {L('أهداف', 'Goals')} {monthName}</h3>
          <p>{L(`النهارده يوم ${progress.win.day} من ${progress.win.days} — يعني المفروض تكون وصلت لحوالي ${Math.round((progress.win.day / progress.win.days) * 100)}% من كل هدف.`, `Day ${progress.win.day} of ${progress.win.days}.`)}</p>
        </div>
        {canManage && !editing && <button type="button" className="gl-btn" onClick={() => setEditing(true)}><Pencil size={16} aria-hidden="true" /> {hasGoals ? L('تعديل الأهداف', 'Edit goals') : L('حدد الأهداف', 'Set goals')}</button>}
      </header>

      {editing && <Editor goals={goals} people={people} isAr={isAr} onSave={onSave} onCancel={() => setEditing(false)} saving={saving} />}

      {!editing && !hasGoals && ready && (
        <EmptyState title={L('لسه مفيش أهداف للشهر', 'No goals set yet')} description={canManage ? L('دوس «حدد الأهداف» وحط هدف للفريق ولكل بياع.', 'Press "Set goals".') : L('المدير هيحدد الأهداف.', 'A manager will set them.')} />
      )}

      {!editing && progress.team.length > 0 && (
        <div className="gl-card">
          <h4>{L('الفريق كله', 'Whole team')}</h4>
          <ul className="gl-list">{progress.team.map((r) => <GoalBar key={r.key} row={r} isAr={isAr} />)}</ul>
        </div>
      )}

      {!editing && progress.people.filter((p) => p.rows.length).map((p) => (
        <div key={p.uid} className="gl-card">
          <h4>{p.name || people.find((x) => x.uid === p.uid)?.name || p.uid.slice(0, 6)}</h4>
          <ul className="gl-list">{p.rows.map((r) => <GoalBar key={r.key} row={r} isAr={isAr} />)}</ul>
        </div>
      ))}
    </section>
  );
}
