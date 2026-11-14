import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Clock, Trash2, Plus, Users, ListChecks, ChevronDown } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { addTask, updateTask, removeTask } from '../../firebaseLazy';
import {
  PRIORITIES, KINDS, DUE_PRESETS, buildTask, groupTasks, taskCounts, dueFromPreset, snoozed, completion, reopening, dueLabel
} from '../../utils/tasks';
import { MyGoals } from './GoalsPanel';
import './tasks-panel.css';

const SECTIONS = [
  { id: 'overdue', ar: 'متأخرة', en: 'Overdue', tone: 'danger' },
  { id: 'today', ar: 'النهارده', en: 'Today', tone: 'primary' },
  { id: 'upcoming', ar: 'جاية', en: 'Upcoming', tone: 'neutral' },
  { id: 'nodate', ar: 'من غير ميعاد', en: 'No date', tone: 'neutral' }
];

/** One task row: tick it, see when and for whom, push it a day or remove it */
function TaskRow({ t, isAr, team, onTick, onSnooze, onDelete, onOpenLead, canDelete, now }) {
  const kind = KINDS.find((k) => k.id === t.kind);
  const pr = PRIORITIES.find((p) => p.id === t.priority);
  const done = t.status === 'done';
  return (
    <li className={`tk-row ${done ? 'is-done' : ''}`}>
      <button type="button" className="tk-tick" onClick={() => onTick(t)} aria-label={done ? (isAr ? 'رجّعها مفتوحة' : 'Reopen') : (isAr ? 'تمّت' : 'Done')}>
        {done ? <CheckCircle2 size={22} aria-hidden="true" /> : <Circle size={22} aria-hidden="true" />}
      </button>
      <div className="tk-body">
        <strong className="tk-title">{t.title}</strong>
        <p className="tk-meta">
          <span><Clock size={12} aria-hidden="true" /> {dueLabel(t, isAr, now)}</span>
          {pr && t.priority !== 'normal' && <span className={`tk-pill is-${t.priority}`}>{isAr ? pr.ar : pr.en}</span>}
          {kind && t.kind !== 'other' && <span className="tk-pill">{isAr ? kind.ar : kind.en}</span>}
          {team && t.assigneeName && <span className="tk-pill is-who">{t.assigneeName}</span>}
          {t.leadId && (
            <button type="button" className="tk-lead" onClick={() => onOpenLead?.(t.leadId)}>{t.leadName || (isAr ? 'فتح العميل' : 'Open client')}</button>
          )}
        </p>
        {t.note && <p className="tk-note">{t.note}</p>}
      </div>
      {!done && (
        <div className="tk-acts">
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => onSnooze(t)}>{isAr ? 'بعد يوم' : '+1 day'}</button>
          {canDelete(t) && <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => onDelete(t)} aria-label={isAr ? 'حذف' : 'Delete'}><Trash2 size={14} aria-hidden="true" /></button>}
        </div>
      )}
    </li>
  );
}

/** The quick-add form: a title, when, how urgent, and (for a manager) who */
export function TaskForm({ isAr, me, members = [], canAssign = false, lead = null, onAdded, triggerToast, compact = false }) {
  const [title, setTitle] = useState('');
  const [preset, setPreset] = useState('today');
  const [customDay, setCustomDay] = useState('');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState('normal');
  const [kind, setKind] = useState('call');
  const [assigneeUid, setAssigneeUid] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!compact);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const day = preset === 'custom' ? customDay : dueFromPreset(preset);
    const assignee = canAssign && assigneeUid ? members.find((m) => m.uid === assigneeUid) : null;
    const payload = buildTask({ title, dueAt: day && time ? `${day}T${time}` : day, priority, kind, lead, assignee, me });
    if (!payload) { triggerToast?.(isAr ? 'اكتب المهمة الأول' : 'Write the task first', 'error'); return; }
    setBusy(true);
    const id = await addTask(payload);
    setBusy(false);
    if (!id) { triggerToast?.(isAr ? 'المهمة ماتحفظتش، جرّب تاني' : 'The task was not saved', 'error'); return; }
    setTitle(''); setTime(''); setPriority('normal');
    triggerToast?.(isAr ? 'اتضافت المهمة' : 'Task added', 'success');
    onAdded?.(id);
  };

  if (compact && !open) {
    return <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm tk-add-toggle" onClick={() => setOpen(true)}><Plus size={14} aria-hidden="true" />{isAr ? 'أضف مهمة' : 'Add task'}</button>;
  }
  return (
    <form className="tk-form" onSubmit={submit}>
      <input className="tk-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140}
        placeholder={lead ? (isAr ? `مهمة لـ ${lead.name || 'العميل'}: اتصل، ابعت الكتالوج…` : 'Task for this client') : (isAr ? 'اكتب المهمة: اتصل، جهّز العقد، صوّر الوحدة…' : 'Write the task')} aria-label={isAr ? 'المهمة' : 'Task'} />
      <div className="tk-chips" role="group" aria-label={isAr ? 'الميعاد' : 'When'}>
        {DUE_PRESETS.map((p) => (
          <button key={p.id} type="button" className={preset === p.id ? 'is-on' : ''} aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}>{isAr ? p.ar : p.en}</button>
        ))}
        <button type="button" className={preset === 'custom' ? 'is-on' : ''} aria-pressed={preset === 'custom'} onClick={() => setPreset('custom')}>{isAr ? 'تاريخ تاني' : 'Pick a day'}</button>
      </div>
      <div className="tk-row-fields">
        {preset === 'custom' && <input type="date" className="tk-input" value={customDay} onChange={(e) => setCustomDay(e.target.value)} aria-label={isAr ? 'اليوم' : 'Day'} />}
        <input type="time" className="tk-input" value={time} onChange={(e) => setTime(e.target.value)} aria-label={isAr ? 'الساعة (اختياري)' : 'Time (optional)'} />
        <select className="tk-input" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label={isAr ? 'الأولوية' : 'Priority'}>
          {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{isAr ? p.ar : p.en}</option>)}
        </select>
        <select className="tk-input" value={kind} onChange={(e) => setKind(e.target.value)} aria-label={isAr ? 'النوع' : 'Kind'}>
          {KINDS.map((k) => <option key={k.id} value={k.id}>{isAr ? k.ar : k.en}</option>)}
        </select>
        {canAssign && members.length > 0 && (
          <select className="tk-input" value={assigneeUid} onChange={(e) => setAssigneeUid(e.target.value)} aria-label={isAr ? 'لمين' : 'Assign to'}>
            <option value="">{isAr ? 'ليا أنا' : 'Me'}</option>
            {members.filter((m) => m.uid).map((m) => <option key={m.uid} value={m.uid}>{m.name || m.email || m.uid}</option>)}
          </select>
        )}
      </div>
      <div className="tk-form-acts">
        <button type="submit" className="ui-btn ui-btn--primary ui-btn--sm" disabled={busy}><Plus size={14} aria-hidden="true" />{isAr ? 'أضف' : 'Add'}</button>
        {compact && <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</button>}
      </div>
    </form>
  );
}

/**
 * «مهامي»: today's work in one list across all clients: late first, then today by urgency, then what's coming.
 * A manager can switch to the whole team's tasks. Ticking a task that belongs to a client writes it in his history.
 */
export default function TasksPanel({ leads = [], members = [], me, canManage = false, lang = 'ar', triggerToast, onOpenLead, onUpdateLead }) {
  const isAr = lang === 'ar';
  const { tasks, ready } = useTasks();
  const [team, setTeam] = useState(false);
  const [showDone, setShowDone] = useState(false);
  // Re-read the clock every minute so a task slips into «متأخرة» on its own
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(id); }, []);
  const mine = useMemo(() => tasks.filter((t) => team || t.assigneeUid === me?.uid), [tasks, team, me?.uid]);
  const groups = useMemo(() => groupTasks(mine, now), [mine, now]);
  const counts = taskCounts(tasks, me?.uid, now);
  const leadById = useMemo(() => new Map(leads.map((l) => [String(l.id), l])), [leads]);

  const tick = async (t) => {
    const done = t.status === 'done';
    const ok = await updateTask(t.id, done ? reopening() : completion(me));
    if (!ok) { triggerToast?.(isAr ? 'ماتحدّثتش، جرّب تاني' : 'Not updated', 'error'); return; }
    const lead = t.leadId ? leadById.get(String(t.leadId)) : null;
    if (!done && lead && onUpdateLead) {
      const at = new Date().toISOString();
      onUpdateLead(lead.id, { lastActivityAt: at, activityLogs: [{ timestamp: at, action: `${isAr ? 'أنجز مهمة' : 'Task done'}: ${t.title}` }, ...(lead.activityLogs || [])] }, lead.version);
    }
  };
  const snooze = async (t) => { if (!(await updateTask(t.id, { dueAt: snoozed(t, 1), updatedAt: new Date().toISOString() }))) triggerToast?.(isAr ? 'ماتأجّلتش' : 'Not moved', 'error'); };
  const remove = async (t) => { if (!(await removeTask(t.id))) triggerToast?.(isAr ? 'ماتحذفتش' : 'Not deleted', 'error'); };
  const canDelete = (t) => canManage || t.createdBy === me?.uid;
  const openLead = (id) => { const l = leadById.get(String(id)); if (l) onOpenLead?.(l); else triggerToast?.(isAr ? 'العميل مش في القايمة الحالية' : 'Client not in the current list', 'info'); };

  const empty = SECTIONS.every((s) => groups[s.id].length === 0);

  return (
    <div className="crm-table-container tk-panel">
      <header className="tk-head">
        <div>
          <h2><ListChecks size={20} aria-hidden="true" /> {team ? (isAr ? 'مهام الفريق' : 'Team tasks') : (isAr ? 'مهامي' : 'My tasks')}</h2>
          <p>{isAr ? `${counts.overdue} متأخرة · ${counts.today} النهارده · ${counts.open} مفتوحة` : `${counts.overdue} overdue · ${counts.today} today · ${counts.open} open`}</p>
        </div>
        {canManage && (
          <div className="tk-seg" role="group" aria-label={isAr ? 'العرض' : 'View'}>
            <button type="button" className={!team ? 'is-on' : ''} aria-pressed={!team} onClick={() => setTeam(false)}>{isAr ? 'مهامي' : 'Mine'}</button>
            <button type="button" className={team ? 'is-on' : ''} aria-pressed={team} onClick={() => setTeam(true)}><Users size={14} aria-hidden="true" /> {isAr ? 'كل الفريق' : 'Team'}</button>
          </div>
        )}
      </header>

      <MyGoals leads={leads} uid={me?.uid} lang={lang} />
      <TaskForm isAr={isAr} me={me} members={members} canAssign={canManage} triggerToast={triggerToast} />

      {!ready ? <p className="tk-empty">{isAr ? 'بيتحمّل…' : 'Loading…'}</p> : empty && (
        <p className="tk-empty">{isAr ? 'مفيش مهام مفتوحة. اكتب أول مهمة فوق، أو من درج أي عميل.' : 'No open tasks. Add one above, or from a client.'}</p>
      )}

      {SECTIONS.map((s) => groups[s.id].length > 0 && (
        <section key={s.id} className={`tk-section is-${s.tone}`}>
          <h3>{isAr ? s.ar : s.en} <span>{groups[s.id].length}</span></h3>
          <ul className="tk-list">
            {groups[s.id].map((t) => <TaskRow key={t.id} t={t} isAr={isAr} team={team} onTick={tick} onSnooze={snooze} onDelete={remove} onOpenLead={openLead} canDelete={canDelete} now={now} />)}
          </ul>
        </section>
      ))}

      {groups.done.length > 0 && (
        <section className="tk-section">
          <button type="button" className="tk-more" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
            <ChevronDown size={14} aria-hidden="true" /> {isAr ? `اتنفذت (${groups.done.length})` : `Done (${groups.done.length})`}
          </button>
          {showDone && <ul className="tk-list">{groups.done.map((t) => <TaskRow key={t.id} t={t} isAr={isAr} team={team} onTick={tick} onSnooze={snooze} onDelete={remove} onOpenLead={openLead} canDelete={canDelete} now={now} />)}</ul>}
        </section>
      )}
    </div>
  );
}
