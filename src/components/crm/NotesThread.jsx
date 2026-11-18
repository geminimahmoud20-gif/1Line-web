import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Trash2, AtSign } from 'lucide-react';
import useNotes from '../../hooks/useNotes';
import { useTeamDirectory } from '../../hooks/useTeamDirectory';
import { sendNote, removeNote } from '../../firebaseLazy';
import { buildNote, mentionSegments, mentionDraft, mentionedUids, NOTE_MAX } from '../../utils/teamNotes';
import { Avatar, EmptyState, useConfirm } from '../ui';
import './team-notes.css';

/**
 * A conversation about one client, listing or project (or the team's general thread): messages oldest first,
 * a box to write, and «@name» to hand it to a colleague, who gets it as a notification.
 * Reads and writes crm_notes (rules decide who may); a failed read is said plainly.
 */
export default function NotesThread({ entityType, entityId, entityName = '', lang = 'ar', canWrite = true, placeholder, className = '' }) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const confirm = useConfirm();
  const { self, people } = useTeamDirectory();
  const { notes, ready, failed } = useNotes(entityType, entityId);
  const [text, setText] = useState('');
  const [caret, setCaret] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const box = useRef(null);
  const end = useRef(null);

  // The newest message stays in view
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest' }); }, [notes.length]);

  const draft = mentionDraft(text, caret);
  const suggestions = useMemo(() => {
    if (!draft) return [];
    const q = draft.query.toLowerCase();
    return people.filter((p) => p.uid !== self?.uid && p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [draft, people, self]);
  const willNotify = useMemo(() => mentionedUids(text, people, self?.uid).length, [text, people, self]);

  const pick = (person) => {
    if (!draft) return;
    const before = text.slice(0, draft.start);
    const after = text.slice(caret);
    const next = `${before}@${person.name} ${after}`;
    setText(next);
    const pos = (before + '@' + person.name + ' ').length;
    requestAnimationFrame(() => { box.current?.focus(); box.current?.setSelectionRange?.(pos, pos); setCaret(pos); });
  };
  const insertAt = () => {
    const pos = box.current?.selectionStart ?? text.length;
    const next = `${text.slice(0, pos)}${pos && !/\s$/.test(text.slice(0, pos)) ? ' ' : ''}@${text.slice(pos)}`;
    setText(next);
    const np = next.length - text.slice(pos).length;
    requestAnimationFrame(() => { box.current?.focus(); box.current?.setSelectionRange?.(np, np); setCaret(np); });
  };

  const send = async () => {
    if (busy || !self) return;
    const r = buildNote({ entityType, entityId, entityName, text, author: self, people });
    if (r.error) { setError(r.error === 'too-long' ? L(`الرسالة أطول من ${NOTE_MAX} حرف`, 'Too long') : ''); return; }
    setBusy(true);
    setError('');
    const id = await sendNote(r.note, r.mentions);
    setBusy(false);
    if (!id) { setError(L('الرسالة ما اتبعتتش. اتأكد إن عندك صلاحية على العميل ده وجرّب تاني.', 'Not sent. Try again.')); return; }
    setText('');
    setCaret(0);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !suggestions.length) { e.preventDefault(); send(); }
    if (e.key === 'Enter' && suggestions.length && draft) { e.preventDefault(); pick(suggestions[0]); }
  };

  const when = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const same = d.toDateString() === new Date().toDateString();
    return new Intl.DateTimeFormat(isAr ? 'ar-EG-u-nu-latn' : 'en', same ? { hour: '2-digit', minute: '2-digit', hour12: true } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }).format(d);
  };
  const del = async (n) => {
    const ok = await confirm({ title: L('مسح الرسالة؟', 'Delete this message?'), confirmLabel: L('امسح', 'Delete'), tone: 'danger' });
    if (ok) removeNote(n.id);
  };

  return (
    <section className={`tn ${className}`} aria-label={L('ملاحظات الفريق', 'Team notes')}>
      <div className="tn__list" role="log" aria-live="polite">
        {failed ? (
          <p className="tn__hint is-bad">{L('مش قادر أقرا الرسايل دلوقتي (صلاحية أو نت).', 'Cannot read the messages right now.')}</p>
        ) : !ready ? (
          <p className="tn__hint">{L('بيحمّل…', 'Loading…')}</p>
        ) : notes.length === 0 ? (
          <EmptyState title={L('لسه مفيش رسايل', 'No messages yet')} description={L('اكتب ملاحظة للفريق، واكتب @ واسم زميلك عشان توصله كإشعار.', 'Write a note; @name sends it to a colleague as a notification.')} />
        ) : (
          notes.map((n) => {
            const mine = n.authorUid === self?.uid;
            return (
              <article key={n.id} className={`tn__msg ${mine ? 'is-mine' : ''}`}>
                <Avatar name={n.authorName || ''} size="sm" />
                <div className="tn__bubble">
                  <header>
                    <strong>{n.authorName || L('عضو في الفريق', 'Team member')}</strong>
                    <time dateTime={n.createdAt}>{when(n.createdAt)}</time>
                    {(mine || self?.canManage) && (
                      <button type="button" className="tn__del" onClick={() => del(n)} aria-label={L('امسح الرسالة', 'Delete message')}><Trash2 size={13} aria-hidden="true" /></button>
                    )}
                  </header>
                  <p>{mentionSegments(n.text, people).map((s, i) => (s.mention ? <mark key={i} className="tn__at">{s.text}</mark> : <span key={i}>{s.text}</span>))}</p>
                </div>
              </article>
            );
          })
        )}
        <div ref={end} />
      </div>

      {canWrite && (
        <div className="tn__composer">
          {suggestions.length > 0 && (
            <ul className="tn__pick" role="listbox" aria-label={L('اختار زميل', 'Pick a colleague')}>
              {suggestions.map((p) => (
                <li key={p.uid}>
                  <button type="button" role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p)}>
                    <Avatar name={p.name} size="sm" /><span>{p.name}</span>{p.desk && <small>{p.desk}</small>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <textarea
            ref={box}
            rows={2}
            value={text}
            maxLength={NOTE_MAX + 200}
            placeholder={placeholder || L('اكتب ملاحظة… (@ لزميل)', 'Write a note… (@ a colleague)')}
            aria-label={L('اكتب ملاحظة', 'Write a note')}
            onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart || 0); }}
            onSelect={(e) => setCaret(e.target.selectionStart || 0)}
            onKeyDown={onKeyDown}
          />
          <div className="tn__bar">
            <button type="button" className="tn__at-btn" onClick={insertAt} aria-label={L('اذكر زميل', 'Mention a colleague')}><AtSign size={16} aria-hidden="true" /></button>
            <span className="tn__hint">{willNotify > 0 ? L(`هتوصل كإشعار لـ ${willNotify}`, `Notifies ${willNotify}`) : L('Enter للإرسال، Shift+Enter سطر جديد', 'Enter to send')}</span>
            <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={send} disabled={busy || !text.trim()}><Send size={14} aria-hidden="true" />{L('ابعت', 'Send')}</button>
          </div>
          {error && <p role="alert" className="tn__hint is-bad">{error}</p>}
        </div>
      )}
    </section>
  );
}
