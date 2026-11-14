import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Clock, Trash2, Plus, Users, ListChecks, ChevronDown, Phone, MessageSquare, Search, Pencil, CalendarClock, X } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { addTask, updateTask, removeTask } from '../../firebaseLazy';
import {
  PRIORITIES, KINDS, DUE_PRESETS, TEMPLATES, SNOOZE_OPTIONS, buildTask, editPatch, groupTasks, taskCounts, dayProgress, filterTasks,
  dueFromPreset, snoozed, pushAllPatch, completion, reopening, dueLabel
} from '../../utils/tasks';
import { firstContactPatch } from '../../utils/crmLeadViews';
import { auditContactUse } from '../../utils/contactAudit';
import { MyGoals } from './GoalsPanel';
import './tasks-panel.css';

const SECTIONS = [
  { id: 'overdue', ar: 'متأخرة', en: 'Overdue', tone: 'danger' },
  { id: 'today', ar: 'النهارده', en: 'Today', tone: 'primary' },
  { id: 'upcoming', ar: 'جاية', en: 'Upcoming', tone: 'neutral' },
  { id: 'nodate', ar: 'من غير ميعاد', en: 'No date', tone: 'neutral' }
];

const dayOnly = (v) => String(v || '').slice(0, 10);
const timeOnly = (v) => (String(v || '').length > 10 ? String(v).slice(11, 16) : '');

/** Inline editor for one task: the words, the day and time, how urgent, what kind, a note */
function EditForm({ t, isAr, onSave, onCancel }) {
  const [title, setTitle] = useState(t.title);
  const [day, setDay] = useState(dayOnly(t.dueAt));
  const [time, setTime] = useState(timeOnly(t.dueAt));
  const [priority, setPriority] = useState(t.priority || 'normal');
  const [kind, setKind] = useState(t.kind || 'other');
  const [note, setNote] = useState(t.note || '');
  const submit = (e) => {
    e.preventDefault();
    const patch = editPatch({ title, dueAt: day && time ? `${day}T${time}` : day, priority, kind, note });
    if (patch) onSave(patch);
  };
  return (
    <form className="tk-edit" onSubmit={submit}>
      <input className="tk-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} aria-label={isAr ? 'المهمة' : 'Task'} />
      <div className="tk-row-fields">
        <input type="date" className="tk-input" value={day} onChange={(e) => setDay(e.target.value)} aria-label={isAr ? 'اليوم' : 'Day'} />
        <input type="time" className="tk-input" value={time} onChange={(e) => setTime(e.target.value)} aria-label={isAr ? 'الساعة' : 'Time'} />
        <select className="tk-input" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label={isAr ? 'الأولوية' : 'Priority'}>
          {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{isAr ? p.ar : p.en}</option>)}
        </select>
        <select className="tk-input" value={kind} onChange={(e) => setKind(e.target.value)} aria-label={isAr ? 'النوع' : 'Kind'}>
          {KINDS.map((k) => <option key={k.id} value={k.id}>{isAr ? k.ar : k.en}</option>)}
        </select>
      </div>
      <textarea className="tk-input tk-textarea" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder={isAr ? 'ملاحظة (اختياري)' : 'Note (optional)'} aria-label={isAr ? 'ملاحظة' : 'Note'} />
      <div className="tk-form-acts">
        <button type="submit" className="ui-btn ui-btn--primary ui-btn--sm">{isAr ? 'حفظ' : 'Save'}</button>
        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={onCancel}>{isAr ? 'إلغاء' : 'Cancel'}</button>
      </div>
    </form>
  );
}

/**
 * One task: tick it; call or WhatsApp the client from here; move it; open it to edit or delete.
 * `lead` is the client behind it (its phone stays out of the task itself).
 */
function TaskRow({ t, lead, isAr, team, onTick, onMove, onSave, onDelete, onOpenLead, onCall, onWhatsApp, canDelete, now }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const kind = KINDS.find((k) => k.id === t.kind);
  const pr = PRIORITIES.find((p) => p.id === t.priority);
  const done = t.status === 'done';
  const hasPhone = Boolean(lead && (lead.phone || lead.whatsapp));
  return (
    <li className={`tk-row ${done ? 'is-done' : ''} ${t.priority === 'high' && !done ? 'is-high' : ''}`}>
      <div className="tk-row__main">
        <button type="button" className="tk-tick" onClick={() => onTick(t)} aria-label={done ? (isAr ? 'رجّعها مفتوحة' : 'Reopen') : (isAr ? 'تمّت' : 'Done')}>
          {done ? <CheckCircle2 size={24} aria-hidden="true" /> : <Circle size={24} aria-hidden="true" />}
        </button>
        <button type="button" className="tk-body" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <strong className="tk-title">{t.title}</strong>
          <span className="tk-meta">
            <span className="tk-due"><Clock size={12} aria-hidden="true" /> {dueLabel(t, isAr, now)}</span>
            {pr && t.priority !== 'normal' && <span className={`tk-pill is-${t.priority}`}>{isAr ? pr.ar : pr.en}</span>}
            {kind && t.kind !== 'other' && <span className="tk-pill">{isAr ? kind.ar : kind.en}</span>}
            {team && t.assigneeName && <span className="tk-pill is-who">{t.assigneeName}</span>}
            {t.leadName && <span className="tk-client">{t.leadName}</span>}
          </span>
        </button>
      </div>

      {!done && (
        <div className="tk-quick">
          {hasPhone && (
            <a className="tk-q tk-q--call" href={`tel:${String(lead.phone || lead.whatsapp).replace(/[^0-9+]/g, '')}`} onClick={() => onCall(lead)} aria-label={isAr ? `اتصل بـ ${t.leadName || 'العميل'}` : 'Call'}>
              <Phone size={16} aria-hidden="true" /> {isAr ? 'اتصل' : 'Call'}
            </a>
          )}
          {hasPhone && (
            <button type="button" className="tk-q tk-q--wa" onClick={() => onWhatsApp(lead)} aria-label={isAr ? `واتساب ${t.leadName || 'العميل'}` : 'WhatsApp'}>
              <MessageSquare size={16} aria-hidden="true" /> {isAr ? 'واتساب' : 'WhatsApp'}
            </button>
          )}
          {lead && <button type="button" className="tk-q" onClick={() => onOpenLead(t.leadId)}>{isAr ? 'افتح العميل' : 'Open client'}</button>}
          <button type="button" className="tk-q" onClick={() => setMoving((v) => !v)} aria-expanded={moving}><CalendarClock size={16} aria-hidden="true" /> {isAr ? 'أجّل' : 'Move'}</button>
        </div>
      )}

      {moving && !done && (
        <div className="tk-chips tk-moving" role="group" aria-label={isAr ? 'أجّلها لـ' : 'Move to'}>
          {SNOOZE_OPTIONS.map((o) => (
            <button key={o.id} type="button" onClick={() => { setMoving(false); onMove(t, o.days); }}>{isAr ? o.ar : o.en}</button>
          ))}
        </div>
      )}

      {open && (
        <div className="tk-details">
          {editing ? <EditForm t={t} isAr={isAr} onSave={(patch) => { setEditing(false); onSave(t, patch); }} onCancel={() => setEditing(false)} /> : (
            <>
              {t.note ? <p className="tk-note">{t.note}</p> : <p className="tk-note tk-note--empty">{isAr ? 'مفيش ملاحظة.' : 'No note.'}</p>}
              <div className="tk-form-acts">
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => setEditing(true)}><Pencil size={14} aria-hidden="true" /> {isAr ? 'تعديل' : 'Edit'}</button>
                {canDelete(t) && <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => onDelete(t)}><Trash2 size={14} aria-hidden="true" /> {isAr ? 'حذف' : 'Delete'}</button>}
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}

/** The quick-add form: starters, a title, when, how urgent, and (for a manager) who */
export function TaskForm({ isAr, me, members = [], canAssign = false, lead = null, onAdded, triggerToast, compact = false }) {
  const [title, setTitle] = useState('');
  const [preset, setPreset] = useState('today');
  const [customDay, setCustomDay] = useState('');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState('normal');
  const [kind, setKind] = useState('call');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [assigneeUid, setAssigneeUid] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!compact);

  const applyTemplate = (tpl) => {
    const who = lead?.name ? ` — ${String(lead.name).split(' ').slice(0, 2).join(' ')}` : '';
    setTitle(`${tpl.ar}${who}`.slice(0, 140));
    setKind(tpl.kind);
    setPriority(tpl.priority);
    setPreset(tpl.due);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const day = preset === 'custom' ? customDay : dueFromPreset(preset);
    const assignee = canAssign && assigneeUid ? members.find((m) => m.uid === assigneeUid) : null;
    const payload = buildTask({ title, note, dueAt: day && time ? `${day}T${time}` : day, priority, kind, lead, assignee, me });
    if (!payload) { triggerToast?.(isAr ? 'اكتب المهمة الأول' : 'Write the task first', 'error'); return; }
    setBusy(true);
    const id = await addTask(payload);
    setBusy(false);
    if (!id) { triggerToast?.(isAr ? 'المهمة ماتحفظتش، جرّب تاني' : 'The task was not saved', 'error'); return; }
    setTitle(''); setTime(''); setPriority('normal'); setNote(''); setShowNote(false);
    triggerToast?.(isAr ? 'اتضافت المهمة' : 'Task added', 'success');
    onAdded?.(id);
  };

  if (compact && !open) {
    return <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm tk-add-toggle" onClick={() => setOpen(true)}><Plus size={14} aria-hidden="true" />{isAr ? 'أضف مهمة' : 'Add task'}</button>;
  }
  return (
    <form className="tk-form" onSubmit={submit}>
      <div className="tk-chips tk-templates" role="group" aria-label={isAr ? 'مهام جاهزة' : 'Quick starts'}>
        {TEMPLATES.map((tpl) => <button key={tpl.id} type="button" onClick={() => applyTemplate(tpl)}>{tpl.ar}</button>)}
      </div>
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
      {showNote
        ? <textarea className="tk-input tk-textarea" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder={isAr ? 'ملاحظة (اختياري)' : 'Note (optional)'} aria-label={isAr ? 'ملاحظة' : 'Note'} />
        : <button type="button" className="tk-link" onClick={() => setShowNote(true)}>{isAr ? '+ أضف ملاحظة' : '+ Add a note'}</button>}
      <div className="tk-form-acts">
        <button type="submit" className="ui-btn ui-btn--primary ui-btn--sm" disabled={busy}><Plus size={14} aria-hidden="true" />{isAr ? 'أضف' : 'Add'}</button>
        {compact && <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</button>}
      </div>
    </form>
  );
}

/** A ring: how many of today's tasks are done */
function Ring({ done, total }) {
  const R = 22;
  const C = 2 * Math.PI * R;
  const pct = total ? done / total : 0;
  return (
    <svg className="tk-ring" viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
      <circle cx="28" cy="28" r={R} className="tk-ring__bg" />
      <circle cx="28" cy="28" r={R} className="tk-ring__fg" strokeDasharray={`${(pct * C).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 28 28)" />
      <text x="28" y="33" textAnchor="middle" className="tk-ring__txt">{total ? Math.round(pct * 100) : 0}%</text>
    </svg>
  );
}

/**
 * «مهامي»: today's work in one list across all clients: late first, then today by urgency, then what's coming.
 * Search and filter it, call or WhatsApp the client from a task, move or edit it; a manager can switch to the whole
 * team's tasks and push every late one to tomorrow. Ticking a task that belongs to a client writes it in his history.
 */
export default function TasksPanel({ leads = [], members = [], me, canManage = false, lang = 'ar', triggerToast, onOpenLead, onUpdateLead, onWhatsApp }) {
  const isAr = lang === 'ar';
  const { tasks, ready } = useTasks();
  const [team, setTeam] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [focus, setFocus] = useState('');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [priority, setPriority] = useState('');
  const [person, setPerson] = useState('');
  // Re-read the clock every minute so a task slips into «متأخرة» on its own
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(id); }, []);
  const mine = useMemo(() => tasks.filter((t) => team || t.assigneeUid === me?.uid), [tasks, team, me?.uid]);
  const shown = useMemo(() => filterTasks(mine, { q, kind, priority, assignee: team ? person : '' }), [mine, q, kind, priority, person, team]);
  const groups = useMemo(() => groupTasks(shown, now), [shown, now]);
  const counts = taskCounts(mine, team ? undefined : me?.uid, now);
  const progress = useMemo(() => dayProgress(mine, team ? undefined : me?.uid, now), [mine, team, me?.uid, now]);
  const leadById = useMemo(() => new Map(leads.map((l) => [String(l.id), l])), [leads]);
  const filtering = Boolean(q || kind || priority || person);

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
  const move = async (t, days) => { if (!(await updateTask(t.id, { dueAt: snoozed(t, days), updatedAt: new Date().toISOString() }))) triggerToast?.(isAr ? 'ماتأجّلتش' : 'Not moved', 'error'); };
  const save = async (t, patch) => { if (!(await updateTask(t.id, patch))) triggerToast?.(isAr ? 'التعديل ماتحفظش' : 'Not saved', 'error'); };
  const remove = async (t) => { if (!(await removeTask(t.id))) triggerToast?.(isAr ? 'ماتحذفتش' : 'Not deleted', 'error'); };
  const pushLate = async () => {
    const results = await Promise.all(groups.overdue.map((t) => updateTask(t.id, pushAllPatch(t))));
    triggerToast?.(results.every(Boolean) ? (isAr ? `اتأجّلت ${results.length} مهمة لبكرة` : 'Moved to tomorrow') : (isAr ? 'بعض المهام ماتأجّلتش' : 'Some were not moved'), results.every(Boolean) ? 'success' : 'error');
  };
  const canDelete = (t) => canManage || t.createdBy === me?.uid;
  const openLead = (id) => { const l = leadById.get(String(id)); if (l) onOpenLead?.(l); else triggerToast?.(isAr ? 'العميل مش في القايمة الحالية' : 'Client not in the current list', 'info'); };
  // One tap to call counts as the first reply, like the call button on the clients list
  const call = (lead) => {
    auditContactUse(lead, 'call');
    const patch = firstContactPatch(lead);
    if (patch && onUpdateLead) onUpdateLead(lead.id, patch, lead.version);
  };
  const whatsapp = (lead) => { if (onWhatsApp) onWhatsApp(lead); };

  const visibleSections = SECTIONS.filter((s) => (!focus || focus === s.id) && groups[s.id].length > 0);
  const empty = SECTIONS.every((s) => groups[s.id].length === 0);
  const rowProps = { isAr, team, onTick: tick, onMove: move, onSave: save, onDelete: remove, onOpenLead: openLead, onCall: call, onWhatsApp: whatsapp, canDelete, now };
  const stat = (id, label, n, tone) => (
    <button type="button" className={`tk-stat is-${tone} ${focus === id ? 'is-on' : ''}`} aria-pressed={focus === id} onClick={() => setFocus(focus === id ? '' : id)}>
      <b>{n}</b><span>{label}</span>
    </button>
  );
  const upcomingCount = groupTasks(mine, now).upcoming.length;

  return (
    <div className="crm-table-container tk-panel">
      <header className="tk-head">
        <div>
          <h2><ListChecks size={20} aria-hidden="true" /> {team ? (isAr ? 'مهام الفريق' : 'Team tasks') : (isAr ? 'مهامي' : 'My tasks')}</h2>
          <p>{isAr ? `${counts.open} مفتوحة` : `${counts.open} open`}</p>
        </div>
        {canManage && (
          <div className="tk-seg" role="group" aria-label={isAr ? 'العرض' : 'View'}>
            <button type="button" className={!team ? 'is-on' : ''} aria-pressed={!team} onClick={() => { setTeam(false); setPerson(''); }}>{isAr ? 'مهامي' : 'Mine'}</button>
            <button type="button" className={team ? 'is-on' : ''} aria-pressed={team} onClick={() => setTeam(true)}><Users size={14} aria-hidden="true" /> {isAr ? 'كل الفريق' : 'Team'}</button>
          </div>
        )}
      </header>

      <div className="tk-summary">
        <div className="tk-progress">
          <Ring done={progress.done} total={progress.total} />
          <p><b>{progress.done}</b> {isAr ? 'من' : 'of'} <b>{progress.total}</b> {isAr ? 'خلصت النهارده' : 'done today'}</p>
        </div>
        <div className="tk-stats">
          {stat('overdue', isAr ? 'متأخرة' : 'Overdue', counts.overdue, 'danger')}
          {stat('today', isAr ? 'النهارده' : 'Today', counts.today, 'primary')}
          {stat('upcoming', isAr ? 'جاية' : 'Upcoming', upcomingCount, 'neutral')}
        </div>
      </div>

      <MyGoals leads={leads} uid={me?.uid} lang={lang} />
      <TaskForm isAr={isAr} me={me} members={members} canAssign={canManage} triggerToast={triggerToast} />

      <div className="tk-filters">
        <label className="tk-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={isAr ? 'دوّر في المهام أو اسم العميل' : 'Search tasks or clients'} aria-label={isAr ? 'بحث' : 'Search'} />
        </label>
        <div className="tk-chips" role="group" aria-label={isAr ? 'النوع' : 'Kind'}>
          <button type="button" className={!kind ? 'is-on' : ''} aria-pressed={!kind} onClick={() => setKind('')}>{isAr ? 'الكل' : 'All'}</button>
          {KINDS.filter((k) => k.id !== 'other').map((k) => <button key={k.id} type="button" className={kind === k.id ? 'is-on' : ''} aria-pressed={kind === k.id} onClick={() => setKind(kind === k.id ? '' : k.id)}>{isAr ? k.ar : k.en}</button>)}
          <button type="button" className={priority === 'high' ? 'is-on' : ''} aria-pressed={priority === 'high'} onClick={() => setPriority(priority === 'high' ? '' : 'high')}>{isAr ? 'العاجلة' : 'Urgent'}</button>
        </div>
        {team && members.length > 0 && (
          <select className="tk-input" value={person} onChange={(e) => setPerson(e.target.value)} aria-label={isAr ? 'الشخص' : 'Person'}>
            <option value="">{isAr ? 'كل الفريق' : 'Everyone'}</option>
            {members.filter((m) => m.uid).map((m) => <option key={m.uid} value={m.uid}>{m.name || m.email || m.uid}</option>)}
          </select>
        )}
        {(filtering || focus) && <button type="button" className="tk-link" onClick={() => { setQ(''); setKind(''); setPriority(''); setPerson(''); setFocus(''); }}><X size={14} aria-hidden="true" /> {isAr ? 'امسح الفلاتر' : 'Clear filters'}</button>}
      </div>

      {!ready ? <p className="tk-empty">{isAr ? 'بيتحمّل…' : 'Loading…'}</p> : empty && (
        <p className="tk-empty">{filtering ? (isAr ? 'مفيش مهام تطابق البحث.' : 'No tasks match.') : (isAr ? 'مفيش مهام مفتوحة. اكتب أول مهمة فوق، أو من درج أي عميل.' : 'No open tasks. Add one above, or from a client.')}</p>
      )}

      {visibleSections.map((s) => (
        <section key={s.id} className={`tk-section is-${s.tone}`}>
          <h3>{isAr ? s.ar : s.en} <span>{groups[s.id].length}</span>
            {s.id === 'overdue' && groups.overdue.length > 1 && <button type="button" className="tk-link tk-push" onClick={pushLate}>{isAr ? 'أجّل الكل لبكرة' : 'Move all to tomorrow'}</button>}
          </h3>
          <ul className="tk-list">
            {groups[s.id].map((t) => <TaskRow key={t.id} t={t} lead={t.leadId ? leadById.get(String(t.leadId)) : null} {...rowProps} />)}
          </ul>
        </section>
      ))}

      {groups.done.length > 0 && !focus && (
        <section className="tk-section">
          <button type="button" className="tk-more" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
            <ChevronDown size={14} aria-hidden="true" /> {isAr ? `اتنفذت (${groups.done.length})` : `Done (${groups.done.length})`}
          </button>
          {showDone && <ul className="tk-list">{groups.done.map((t) => <TaskRow key={t.id} t={t} lead={null} {...rowProps} />)}</ul>}
        </section>
      )}
    </div>
  );
}
