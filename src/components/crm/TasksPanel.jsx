import { useEffect, useMemo, useState, useCallback } from 'react';
import { CheckCircle2, Circle, Clock, Trash2, Plus, Users, ListChecks, ChevronDown, Zap, Phone, MessageSquare, Search, Pencil, CalendarClock, X, Eye, EyeOff, Send, Repeat } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { addTask, updateTask, removeTask, fetchLeadById } from '../../firebaseLazy';
import {
  PRIORITIES, KINDS, DUE_PRESETS, TEMPLATES, SNOOZE_OPTIONS, RECURRENCE_OPTIONS, buildTask, editPatch, taskProblem, groupTasks, taskCounts, dayProgress, filterTasks,
  dueFromPreset, dayKeyFrom, snoozed, pushAllPatch, completion, reopening, dueLabel,
  workload, isDelegated, assignedByMe, newAssignmentsFor, seenPatch, focusTasks, doneThisWeek, daysLate,
  parseTaskNote, formatTaskNote, nextRecurringDue
} from '../../utils/tasks';
import { firstContactPatch } from '../../utils/crmLeadViews';
import { auditContactUse } from '../../utils/contactAudit';
import { MyGoals } from './GoalsPanel';
import SilentLeads from './SilentLeads';
import TaskDoneFlow from './TaskDoneFlow';
import { PageHeader, KpiRow, KpiTile } from '../ui';
import './tasks-panel.css';

const SECTIONS = [
  { id: 'overdue', ar: 'متأخرة', en: 'Overdue', tone: 'danger' },
  { id: 'today', ar: 'النهارده', en: 'Today', tone: 'primary' },
  { id: 'upcoming', ar: 'جاية', en: 'Upcoming', tone: 'neutral' },
  { id: 'nodate', ar: 'من غير ميعاد', en: 'No date', tone: 'neutral' }
];

const dayOnly = (v) => String(v || '').slice(0, 10);
const timeOnly = (v) => (String(v || '').length > 10 ? String(v).slice(11, 16) : '');

/** Inline editor for one task: the words, the day and time, how urgent, what kind, a note, checklist and recurrence */
function EditForm({ t, isAr, onSave, onCancel }) {
  const parsed = useMemo(() => parseTaskNote(t.note), [t.note]);
  const [title, setTitle] = useState(t.title);
  const [day, setDay] = useState(dayOnly(t.dueAt));
  const [time, setTime] = useState(timeOnly(t.dueAt));
  const [priority, setPriority] = useState(t.priority || 'normal');
  const [kind, setKind] = useState(t.kind || 'other');
  const [plainNote, setPlainNote] = useState(parsed.plainNote);
  const [recurrence, setRecurrence] = useState(parsed.recurrence || 'none');
  const [checklist, setChecklist] = useState(parsed.checklist || []);
  const [newSubtask, setNewSubtask] = useState('');
  const [problem, setProblem] = useState('');

  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    setChecklist([...checklist, { id: `chk-${Date.now()}`, done: false, text: newSubtask.trim() }]);
    setNewSubtask('');
  };

  const handleRemoveSubtask = (idx) => {
    setChecklist(checklist.filter((_, i) => i !== idx));
  };

  const submit = (e) => {
    e.preventDefault();
    const finalNote = formatTaskNote(plainNote, checklist, recurrence);
    const patch = editPatch({ title, dueAt: day && time ? `${day}T${time}` : day, priority, kind, note: finalNote });
    if (!patch) {
      setProblem(taskProblem({ title, dueAt: day && time ? `${day}T${time}` : day, me: { uid: 'x' } }, isAr) || (isAr ? 'اكتب المهمة وحدد ميعادها' : 'A task needs a title and a day'));
      return;
    }
    setProblem('');
    onSave(patch);
  };

  return (
    <form className="tk-edit" onSubmit={submit}>
      {problem && <small role="alert" className="tk-problem">{problem}</small>}
      <input className="tk-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} aria-label={isAr ? 'المهمة' : 'Task'} />
      <div className="tk-row-fields">
        <input type="date" className="tk-input" value={day} min={dayKeyFrom()} onChange={(e) => setDay(e.target.value)} aria-label={isAr ? 'اليوم' : 'Day'} />
        <input type="time" className="tk-input" value={time} onChange={(e) => setTime(e.target.value)} aria-label={isAr ? 'الساعة' : 'Time'} />
        <select className="tk-input" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label={isAr ? 'الأولوية' : 'Priority'}>
          {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{isAr ? p.ar : p.en}</option>)}
        </select>
        <select className="tk-input" value={kind} onChange={(e) => setKind(e.target.value)} aria-label={isAr ? 'النوع' : 'Kind'}>
          {KINDS.map((k) => <option key={k.id} value={k.id}>{isAr ? k.ar : k.en}</option>)}
        </select>
        <select className="tk-input" value={recurrence} onChange={(e) => setRecurrence(e.target.value)} aria-label={isAr ? 'التكرار' : 'Recurrence'}>
          {RECURRENCE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{isAr ? r.ar : r.en}</option>)}
        </select>
      </div>
      <textarea className="tk-input tk-textarea" rows={2} maxLength={1000} value={plainNote} onChange={(e) => setPlainNote(e.target.value)} placeholder={isAr ? 'ملاحظة (اختياري)' : 'Note (optional)'} aria-label={isAr ? 'ملاحظة' : 'Note'} />

      {/* Subtasks inside EditForm */}
      <div className="tk-checklist">
        <div className="tk-checklist__head">
          <span>{isAr ? 'المهام الفرعية (Checklist):' : 'Subtasks:'}</span>
          <span>{checklist.length}</span>
        </div>
        {checklist.length > 0 && (
          <ul className="tk-checklist__items">
            {checklist.map((item, idx) => (
              <li key={item.id || idx} className="tk-chk-item">
                <span>• {item.text}</span>
                <button type="button" className="ui-btn ui-btn--ghost ui-btn--xs" onClick={() => handleRemoveSubtask(idx)} aria-label={isAr ? 'حذف' : 'Remove'}>
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="tk-chk-add">
          <input
            type="text"
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            placeholder={isAr ? '+ أضف بنداً فرعياً...' : '+ Add subtask...'}
            onKeyDown={(e) => { if (e.key === 'Enter') { handleAddSubtask(e); } }}
          />
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--xs" onClick={handleAddSubtask}>{isAr ? 'أضف' : 'Add'}</button>
        </div>
      </div>

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
function TaskRow({ t, lead, isAr, team, me, onTick, onMove, onSave, onDelete, onOpenLead, onCall, onWhatsApp, canDelete, now }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const kind = KINDS.find((k) => k.id === t.kind);
  const pr = PRIORITIES.find((p) => p.id === t.priority);
  const done = t.status === 'done';
  const hasPhone = Boolean(lead && (lead.phone || lead.whatsapp));

  const parsed = useMemo(() => parseTaskNote(t.note), [t.note]);
  const rec = RECURRENCE_OPTIONS.find((r) => r.id === parsed.recurrence);
  const chkDone = parsed.checklist.filter((c) => c.done).length;

  const handleToggleChecklist = (idx) => {
    const nextChecklist = parsed.checklist.map((item, i) => (i === idx ? { ...item, done: !item.done } : item));
    const nextNote = formatTaskNote(parsed.plainNote, nextChecklist, parsed.recurrence);
    onSave(t, { note: nextNote });
  };

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
            {rec && rec.id !== 'none' && (
              <span className="tk-pill is-rec" title={isAr ? `تكرار: ${rec.ar}` : `Repeats: ${rec.en}`}>
                <Repeat size={11} aria-hidden="true" /> {isAr ? rec.ar : rec.en}
              </span>
            )}
            {parsed.checklist.length > 0 && (
              <span className="tk-pill" title={isAr ? 'المهام الفرعية' : 'Subtasks'}>
                <ListChecks size={11} aria-hidden="true" /> {chkDone}/{parsed.checklist.length}
              </span>
            )}
            {team && t.assigneeName && <span className="tk-pill is-who">{t.assigneeName}</span>}
            {isDelegated(t) && t.assigneeUid === me?.uid && <span className="tk-pill is-from"><Send size={11} aria-hidden="true" /> {isAr ? `من ${t.createdByName || 'زميل'}` : `From ${t.createdByName || 'a colleague'}`}</span>}
            {isDelegated(t) && t.assigneeUid !== me?.uid && !done && (
              <span className={`tk-pill ${t.seenAt ? 'is-seen' : 'is-unseen'}`} title={t.seenAt ? (isAr ? 'المسؤول فتح المهمة' : 'Opened by the assignee') : (isAr ? 'المسؤول لسه ما فتحهاش' : 'Not opened yet')}>
                {t.seenAt ? <Eye size={11} aria-hidden="true" /> : <EyeOff size={11} aria-hidden="true" />} {t.seenAt ? (isAr ? 'اتشافت' : 'Seen') : (isAr ? 'لسه ما اتشافتش' : 'Not seen')}
              </span>
            )}
            {t.leadName && <span className="tk-client">{t.leadName}</span>}
          </span>
        </button>
      </div>

      {/* Interactive Subtasks Checklist */}
      {parsed.checklist.length > 0 && !done && (
        <div className="tk-checklist" onClick={(e) => e.stopPropagation()}>
          <div className="tk-checklist__head">
            <span>{isAr ? 'المهام الفرعية' : 'Subtasks'}</span>
            <span>{chkDone} / {parsed.checklist.length}</span>
          </div>
          <ul className="tk-checklist__items">
            {parsed.checklist.map((item, idx) => (
              <li key={item.id || idx} className={`tk-chk-item ${item.done ? 'is-done' : ''}`} onClick={() => handleToggleChecklist(idx)}>
                <input type="checkbox" checked={item.done} onChange={() => handleToggleChecklist(idx)} aria-label={item.text} />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          {t.leadId && <button type="button" className="tk-q" onClick={() => onOpenLead(t.leadId)}>{isAr ? 'افتح العميل' : 'Open client'}</button>}
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
              {parsed.plainNote ? <p className="tk-note">{parsed.plainNote}</p> : <p className="tk-note tk-note--empty">{isAr ? 'مفيش ملاحظة.' : 'No note.'}</p>}
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

/** The quick-add form: starters, a title, when, how urgent, recurrence, and (for a manager) who */
export function TaskForm({ isAr, me, members = [], canAssign = false, defaultAssigneeUid = '', lead = null, onAdded, triggerToast, compact = false }) {
  const [title, setTitle] = useState('');
  const [preset, setPreset] = useState('today');
  const [customDay, setCustomDay] = useState('');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState('normal');
  const [kind, setKind] = useState('call');
  const [recurrence, setRecurrence] = useState('none');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [assigneeUid, setAssigneeUid] = useState(defaultAssigneeUid || '');
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
    const formattedNote = formatTaskNote(note, [], recurrence);
    const payload = buildTask({ title, note: formattedNote, dueAt: day && time ? `${day}T${time}` : day, priority, kind, lead, assignee, me });
    if (!payload) { triggerToast?.(taskProblem({ title, dueAt: day && time ? `${day}T${time}` : day, assignee, me }, isAr) || (isAr ? 'اكتب المهمة الأول' : 'Write the task first'), 'error'); return; }
    setBusy(true);
    const id = await addTask(payload);
    setBusy(false);
    if (!id) { triggerToast?.(isAr ? 'المهمة ماتحفظتش، جرّب تاني' : 'The task was not saved', 'error'); return; }
    setTitle(''); setTime(''); setPriority('normal'); setRecurrence('none'); setNote(''); setShowNote(false);
    if (compact) setOpen(false);
    triggerToast?.(payload.assigneeUid !== payload.createdBy
      ? (isAr ? `اتكلّف ${payload.assigneeName || 'زميلك'} بالمهمة، وهتلاقي إنجازها في «كلّفت بيها»` : 'Assigned')
      : (isAr ? 'اتضافت المهمة' : 'Task added'), 'success');
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
        {preset === 'custom' && <input type="date" className="tk-input" value={customDay} min={dayKeyFrom()} onChange={(e) => setCustomDay(e.target.value)} aria-label={isAr ? 'اليوم' : 'Day'} />}
        <input type="time" className="tk-input" value={time} onChange={(e) => setTime(e.target.value)} aria-label={isAr ? 'الساعة (اختياري)' : 'Time (optional)'} />
        <select className="tk-input" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label={isAr ? 'الأولوية' : 'Priority'}>
          {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{isAr ? p.ar : p.en}</option>)}
        </select>
        <select className="tk-input" value={kind} onChange={(e) => setKind(e.target.value)} aria-label={isAr ? 'النوع' : 'Kind'}>
          {KINDS.map((k) => <option key={k.id} value={k.id}>{isAr ? k.ar : k.en}</option>)}
        </select>
        <select className="tk-input" value={recurrence} onChange={(e) => setRecurrence(e.target.value)} aria-label={isAr ? 'التكرار' : 'Recurrence'}>
          {RECURRENCE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{isAr ? r.ar : r.en}</option>)}
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

/**
 * «مهامي»: today's work in one list across all clients: late first, then today by urgency, then what's coming.
 * Search and filter it, call or WhatsApp the client from a task, move or edit it; a manager can switch to the whole
 * team's tasks and push every late one to tomorrow. Ticking a task that belongs to a client writes it in his history.
 */
export default function TasksPanel({ leads = [], members = [], me, canManage = false, lang = 'ar', triggerToast, onOpenLead, onUpdateLead, onWhatsApp }) {
  const isAr = lang === 'ar';
  const { tasks, ready } = useTasks();
  const [view, setView] = useState('mine'); // 'mine' | 'assigned' (what I gave to colleagues) | 'team'
  const scopeUid = view === 'mine' ? me?.uid : undefined;
  const [showDone, setShowDone] = useState(false);
  const [focus, setFocus] = useState('');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [priority, setPriority] = useState('');
  const [person, setPerson] = useState('');
  // Re-read the clock every minute so a task slips into «متأخرة» on its own
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(id); }, []);
  const mine = useMemo(() => (view === 'team' ? tasks : view === 'assigned' ? assignedByMe(tasks, me?.uid) : tasks.filter((t) => t.assigneeUid === me?.uid)), [tasks, view, me?.uid]);
  const shown = useMemo(() => filterTasks(mine, { q, kind, priority, assignee: view === 'mine' ? '' : person }), [mine, q, kind, priority, person, view]);
  const groups = useMemo(() => groupTasks(shown, now), [shown, now]);
  const counts = taskCounts(mine, scopeUid, now);
  const progress = useMemo(() => dayProgress(mine, scopeUid, now), [mine, scopeUid, now]);
  const people = useMemo(() => (canManage ? workload(tasks, members, now) : []), [canManage, tasks, members, now]);
  // Opening the list is how an assignee «sees» what a colleague gave them (the assigner reads it as seen)
  const unseen = useMemo(() => newAssignmentsFor(tasks, me?.uid), [tasks, me?.uid]);
  useEffect(() => {
    if (view !== 'mine' || unseen.length === 0) return;
    const patch = seenPatch();
    unseen.forEach((t) => { updateTask(t.id, patch); });
  }, [view, unseen]);
  const [extraLeads, setExtraLeads] = useState(new Map());
  const leadById = useMemo(() => new Map(leads.map((l) => [String(l.id), l])), [leads]);
  const getLead = useCallback((id) => {
    if (!id) return null;
    return leadById.get(String(id)) || extraLeads.get(String(id)) || null;
  }, [leadById, extraLeads]);

  // Background resolver for missing task leads (up to 15 leads)
  useEffect(() => {
    const missingIds = Array.from(
      new Set(
        tasks
          .filter((t) => t.leadId && !leadById.has(String(t.leadId)) && !extraLeads.has(String(t.leadId)))
          .map((t) => String(t.leadId))
      )
    ).slice(0, 15);
    if (missingIds.length === 0) return;
    let cancelled = false;
    Promise.all(missingIds.map((id) => fetchLeadById(id))).then((results) => {
      if (cancelled) return;
      setExtraLeads((prev) => {
        const next = new Map(prev);
        results.forEach((res) => {
          if (res.status === 'ok' && res.lead) {
            next.set(String(res.lead.id), res.lead);
          }
        });
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [tasks, leadById, extraLeads]);

  const filtering = Boolean(q || kind || priority || person);

  const [flowTask, setFlowTask] = useState(null);
  const tick = async (t) => {
    const done = t.status === 'done';
    const lead = t.leadId ? getLead(t.leadId) : null;
    const needsFlow = !done && lead && onUpdateLead && ['call', 'whatsapp', 'visit'].includes(t.kind);
    if (needsFlow) {
      setFlowTask(t);
      return;
    }
    const ok = await updateTask(t.id, done ? reopening() : completion(me));
    if (!ok) {
      triggerToast?.(isAr ? 'ماتحدّثتش، جرّب تاني' : 'Not updated', 'error');
      return;
    }
    if (!done) {
      const parsed = parseTaskNote(t.note);
      if (parsed.recurrence && parsed.recurrence !== 'none') {
        const nextDue = nextRecurringDue(t.dueAt, parsed.recurrence);
        const nextPayload = buildTask({
          title: t.title,
          note: t.note,
          dueAt: nextDue,
          priority: t.priority,
          kind: t.kind,
          lead: t.leadId ? { id: t.leadId, name: t.leadName } : null,
          assignee: { uid: t.assigneeUid, name: t.assigneeName },
          me
        });
        if (nextPayload) {
          addTask(nextPayload).then((newId) => {
            if (newId) triggerToast?.(isAr ? 'تمت جدولة التكرار القادم تلقائياً' : 'Next recurring task scheduled', 'info');
          });
        }
      }
      triggerToast?.(isAr ? 'تم إنجاز المهمة' : 'Task completed', 'success');
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
  const openLead = async (id) => {
    const l = getLead(id);
    if (l) {
      onOpenLead?.(l);
      return;
    }
    triggerToast?.(isAr ? 'جاري فتح ملف العميل...' : 'Opening client...', 'info');
    const res = await fetchLeadById(id);
    if (res.status === 'ok' && res.lead) {
      setExtraLeads((prev) => new Map(prev).set(String(id), res.lead));
      onOpenLead?.(res.lead);
    } else if (res.status === 'denied') {
      triggerToast?.(isAr ? 'غير مصرح بعرض عملاء هذا الفريق' : 'Access denied for this desk', 'error');
    } else {
      triggerToast?.(isAr ? 'تعذر العثور على ملف العميل (ربما تم حذفه)' : 'Client not found or deleted', 'error');
    }
  };
  // One tap to call counts as the first reply, like the call button on the clients list
  const call = (lead) => {
    auditContactUse(lead, 'call');
    const patch = firstContactPatch(lead);
    if (patch && onUpdateLead) onUpdateLead(lead.id, patch, lead.version);
  };
  const whatsapp = (lead) => { if (onWhatsApp) onWhatsApp(lead); };

  const visibleSections = SECTIONS.filter((s) => (!focus || focus === s.id) && groups[s.id].length > 0);
  const empty = SECTIONS.every((s) => groups[s.id].length === 0);
  const rowProps = { isAr, team: view !== 'mine', me, onTick: tick, onMove: move, onSave: save, onDelete: remove, onOpenLead: openLead, onCall: call, onWhatsApp: whatsapp, canDelete, now };
  const upcomingCount = groupTasks(mine, now).upcoming.length;
  const weekDone = doneThisWeek(mine, scopeUid, now);
  const focusList = useMemo(() => focusTasks(mine, now, 3), [mine, now]);

  return (
    <div className="crm-table-container tk-panel">
      {flowTask && getLead(flowTask.leadId) && (
        <TaskDoneFlow key={flowTask.id} task={flowTask} lead={getLead(flowTask.leadId)} me={me} isAr={isAr} onUpdateLead={onUpdateLead} triggerToast={triggerToast} onClose={() => setFlowTask(null)} />
      )}
      <PageHeader
        title={view === 'team' ? (isAr ? 'مهام الفريق' : 'Team tasks') : view === 'assigned' ? (isAr ? 'اللي كلّفت بيه' : 'Tasks I gave') : (isAr ? 'مهامي' : 'My tasks')}
        description={counts.overdue > 0
          ? (isAr ? `عندك ${counts.overdue} متأخرة. ابدأ بيها.` : `${counts.overdue} overdue. Start there.`)
          : counts.today > 0 ? (isAr ? `${counts.today} مهمة النهارده.` : `${counts.today} tasks today.`) : (isAr ? 'مفيش حاجة مستعجلة النهارده.' : 'Nothing urgent today.')}
        actions={canManage ? (
          <div className="tk-seg" role="group" aria-label={isAr ? 'العرض' : 'View'}>
            <button type="button" className={view === 'mine' ? 'is-on' : ''} aria-pressed={view === 'mine'} onClick={() => { setView('mine'); setPerson(''); }}>{isAr ? 'مهامي' : 'Mine'}</button>
            <button type="button" className={view === 'assigned' ? 'is-on' : ''} aria-pressed={view === 'assigned'} onClick={() => { setView('assigned'); setPerson(''); }}><Send size={14} aria-hidden="true" /> {isAr ? 'كلّفت بيها' : 'I assigned'}</button>
            <button type="button" className={view === 'team' ? 'is-on' : ''} aria-pressed={view === 'team'} onClick={() => setView('team')}><Users size={14} aria-hidden="true" /> {isAr ? 'كل الفريق' : 'Team'}</button>
          </div>
        ) : null}
      />

      {view !== 'mine' && people.length > 0 && (
        <section className="tk-load" aria-label={isAr ? 'حمل الفريق' : 'Team workload'}>
          {people.map((p) => (
            <button key={p.uid} type="button" className={`tk-person ${person === p.uid ? 'is-on' : ''} ${p.overdue > 0 ? 'is-late' : ''}`} aria-pressed={person === p.uid} onClick={() => setPerson(person === p.uid ? '' : p.uid)}>
              <span className="tk-person__name">{p.name || (isAr ? 'عضو' : 'Member')}</span>
              <span className="tk-person__nums">
                <b>{p.open}</b> {isAr ? 'مفتوحة' : 'open'}
                {p.overdue > 0 && <em className="is-late">{p.overdue} {isAr ? 'متأخرة' : 'late'}</em>}
                {p.today > 0 && <em>{p.today} {isAr ? 'النهارده' : 'today'}</em>}
              </span>
              <span className="tk-person__bar" aria-hidden="true"><i style={{ width: `${p.open + p.doneWeek ? Math.round((p.doneWeek / (p.open + p.doneWeek)) * 100) : 0}%` }} /></span>
              <small>{isAr ? `${p.doneWeek} خلصت الأسبوع ده` : `${p.doneWeek} done this week`}{p.unseen > 0 ? (isAr ? ` · ${p.unseen} ما اتفتحتش` : ` · ${p.unseen} unseen`) : ''}</small>
            </button>
          ))}
        </section>
      )}

      <KpiRow label={isAr ? 'ملخص المهام' : 'Task summary'}>
        <KpiTile
          label={isAr ? 'متأخرة' : 'Overdue'}
          value={counts.overdue}
          tone={counts.overdue > 0 ? 'danger' : 'success'}
          hint={counts.overdue > 0 ? (isAr ? 'اضغط تشوفها' : 'Tap to see') : (isAr ? 'مفيش تأخير' : 'None late')}
          icon={<Clock size={16} />}
          onClick={() => setFocus(focus === 'overdue' ? '' : 'overdue')}
          className={focus === 'overdue' ? 'is-picked' : undefined}
        />
        <KpiTile
          label={isAr ? 'النهارده' : 'Today'}
          value={counts.today}
          tone="info"
          icon={<CalendarClock size={16} />}
          onClick={() => setFocus(focus === 'today' ? '' : 'today')}
          className={focus === 'today' ? 'is-picked' : undefined}
        />
        <KpiTile
          label={isAr ? 'جاية' : 'Upcoming'}
          value={upcomingCount}
          tone="neutral"
          icon={<ListChecks size={16} />}
          onClick={() => setFocus(focus === 'upcoming' ? '' : 'upcoming')}
          className={focus === 'upcoming' ? 'is-picked' : undefined}
        />
        <KpiTile
          label={isAr ? 'خلصت النهارده' : 'Done today'}
          value={progress.done}
          tone="success"
          hint={progress.total ? (isAr ? `من ${progress.total} مطلوبة` : `of ${progress.total} due`) : (isAr ? 'لسه ما خلصتش حاجة' : 'Nothing yet')}
          icon={<CheckCircle2 size={16} />}
        />
        <KpiTile
          label={isAr ? 'خلصت الأسبوع ده' : 'Done this week'}
          value={weekDone}
          tone="primary"
          icon={<ListChecks size={16} />}
        />
      </KpiRow>

      {/* The few to do first: late ones, then today's most urgent */}
      {focusList.length > 0 && !focus && !filtering && (
        <section className="tk-focus" aria-label={isAr ? 'ابدأ بيها' : 'Start with these'}>
          <h2 className="tk-focus__title"><Zap size={15} aria-hidden="true" />{isAr ? 'ابدأ بيها دلوقتي' : 'Start with these'}</h2>
          <ul className="tk-focus__list">
            {focusList.map((t) => {
              const lead = t.leadId ? getLead(t.leadId) : null;
              const late = daysLate(t, now);
              return (
                <li key={t.id} className={`tk-focus__row${late ? ' is-late' : ''}`}>
                  <button type="button" className="tk-tick" onClick={() => tick(t)} aria-label={isAr ? 'تمّت' : 'Done'}><Circle size={22} aria-hidden="true" /></button>
                  <span className="tk-focus__text">
                    <strong>{t.title}</strong>
                    <span>{late ? (isAr ? `متأخرة ${late === 1 ? 'يوم' : `${late} يوم`}` : `${late}d late`) : dueLabel(t, isAr, now)}{t.leadName ? ` · ${t.leadName}` : ''}</span>
                  </span>
                  {lead && (lead.phone || lead.whatsapp) && (
                    <a className="tk-q tk-q--call" href={`tel:${String(lead.phone || lead.whatsapp).replace(/[^0-9+]/g, '')}`} onClick={() => call(lead)} aria-label={isAr ? `اتصل بـ ${t.leadName || 'العميل'}` : 'Call'}>
                      <Phone size={16} aria-hidden="true" />{isAr ? 'اتصل' : 'Call'}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <MyGoals leads={leads} uid={me?.uid} lang={lang} />
      <SilentLeads leads={leads} tasks={tasks} uid={view === 'mine' ? me?.uid : ''} me={me} isAr={isAr} onCall={call} onWhatsApp={whatsapp} onOpenLead={onOpenLead} triggerToast={triggerToast} />
      <TaskForm isAr={isAr} me={me} members={members} canAssign={canManage} triggerToast={triggerToast} compact />

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
        {view !== 'mine' && members.length > 0 && (
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
            {groups[s.id].map((t) => <TaskRow key={t.id} t={t} lead={t.leadId ? getLead(t.leadId) : null} {...rowProps} />)}
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
