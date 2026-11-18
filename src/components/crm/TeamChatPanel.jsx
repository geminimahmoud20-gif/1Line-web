import { useEffect, useMemo, useRef, useState } from 'react';
import { Hash, Lock, MessageSquarePlus, Send, Users, ChevronRight, ChevronLeft, X } from 'lucide-react';
import NotesThread from './NotesThread';
import { Avatar } from '../ui';
import { TEAM_THREAD_ID } from '../../utils/teamNotes';
import { useTeamDirectory } from '../../hooks/useTeamDirectory';
import { usePrivateChats } from '../../hooks/usePrivateChats';
import { subscribeToMessages, openChat, sendChatMessage, markChatRead } from '../../firebaseLazy';
import { chatTitle, isUnread, memberNames, MESSAGE_MAX, TITLE_MAX, GROUP_MAX } from '../../utils/privateChat';
import './team-chat.css';

const GENERAL = 'general';

const clock = (ms, isAr) => {
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  return same
    ? d.toLocaleTimeString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short' });
};

/** A new conversation: pick one colleague (a private chat) or several (a private group with a name) */
function NewChat({ isAr, people, self, onClose, onCreate }) {
  const L = (ar, en) => (isAr ? ar : en);
  const [picked, setPicked] = useState([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const others = useMemo(() => people.filter((p) => p.uid !== self?.uid && p.name.toLowerCase().includes(q.trim().toLowerCase())), [people, self, q]);
  const group = picked.length > 1;
  const ready = picked.length > 0 && picked.length < GROUP_MAX && (!group || title.trim().length > 0);
  const toggle = (uid) => setPicked((l) => (l.includes(uid) ? l.filter((x) => x !== uid) : [...l, uid]));
  const go = async () => {
    if (!ready || busy) return;
    setBusy(true);
    const ok = await onCreate(picked, title);
    setBusy(false);
    if (!ok) return;
  };
  return (
    <div className="tc-overlay" role="dialog" aria-modal="true" aria-labelledby="tc-new-title" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="tc-modal">
        <header className="tc-modal__head">
          <h3 id="tc-new-title">{L('محادثة خاصة جديدة', 'New private chat')}</h3>
          <button type="button" className="tc-icon" onClick={onClose} aria-label={L('إغلاق', 'Close')}><X size={18} aria-hidden="true" /></button>
        </header>
        <p className="tc-hint"><Lock size={13} aria-hidden="true" /> {L('اختار زميل لمحادثة بينكم بس، أو أكتر من واحد لمجموعة خاصة.', 'Pick one colleague, or several for a private group.')}</p>
        <input className="tc-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L('دوّر على زميل', 'Find a colleague')} aria-label={L('دوّر على زميل', 'Find a colleague')} />
        <ul className="tc-people">
          {others.map((p) => (
            <li key={p.uid}>
              <label className={`tc-person ${picked.includes(p.uid) ? 'is-on' : ''}`}>
                <input type="checkbox" checked={picked.includes(p.uid)} onChange={() => toggle(p.uid)} />
                <Avatar name={p.name} size="sm" />
                <span>{p.name}</span>
              </label>
            </li>
          ))}
          {others.length === 0 && <li className="tc-empty">{L('مفيش زملاء بالاسم ده.', 'No colleagues found.')}</li>}
        </ul>
        {group && (
          <label className="tc-field">
            <span>{L('اسم المجموعة', 'Group name')}</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={TITLE_MAX} placeholder={L('مثال: فريق المعاينات', 'e.g. Viewings team')} />
          </label>
        )}
        <footer className="tc-modal__foot">
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose} disabled={busy}>{L('إلغاء', 'Cancel')}</button>
          <button type="button" className="ui-btn ui-btn--primary" onClick={go} disabled={!ready || busy}>
            {group ? L('إنشاء المجموعة', 'Create group') : L('ابدأ المحادثة', 'Start chat')}
          </button>
        </footer>
      </div>
    </div>
  );
}

/** One private conversation (remounted per conversation, so its state starts fresh): its messages (oldest first), a box to write, and «seen up to here» kept for the list's dot */
function ChatThread({ chat, self, people, isAr, onBack }) {
  const L = (ar, en) => (isAr ? ar : en);
  const [messages, setMessages] = useState(null); // null: loading, [] none yet
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef(null);
  const BackIcon = isAr ? ChevronRight : ChevronLeft;

  useEffect(() => {
    return subscribeToMessages(chat.id, (list) => { setFailed(list === null); setMessages(list || []); });
  }, [chat.id]);

  useEffect(() => { end.current?.scrollIntoView?.({ block: 'end' }); }, [messages?.length, chat.id]);

  // Opening the conversation, and a message arriving while it is open, counts as seen
  const unread = isUnread(chat, self.uid);
  useEffect(() => {
    if (unread && (typeof document === 'undefined' || document.visibilityState === 'visible')) markChatRead(chat.id, self.uid);
  }, [unread, chat.id, chat.lastMessageAt, self.uid]);

  const title = chatTitle(chat, self.uid, people, isAr);
  const names = chat.kind === 'group' ? memberNames(chat, people, self.uid).join('، ') : '';

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setError('');
    const ok = await sendChatMessage(chat.id, { text: body, author: self });
    setBusy(false);
    if (ok) setText(''); else setError(L('الرسالة ماتبعتتش، جرّب تاني.', 'Not sent, try again.'));
  };
  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) { e.preventDefault(); send(); } };

  return (
    <section className="tc-thread" aria-label={title}>
      <header className="tc-thread__head">
        <button type="button" className="tc-icon tc-back" onClick={onBack} aria-label={L('رجوع للمحادثات', 'Back to chats')}><BackIcon size={20} aria-hidden="true" /></button>
        {chat.kind === 'group' ? <span className="tc-group-ico" aria-hidden="true"><Users size={18} /></span> : <Avatar name={title} />}
        <div className="tc-thread__who">
          <strong>{title}</strong>
          <small><Lock size={11} aria-hidden="true" /> {chat.kind === 'group' ? `${L('مجموعة خاصة', 'Private group')}${names ? ` · ${names}` : ''}` : L('محادثة خاصة: ما حدش غيركم بيشوفها', 'Private: only you two see this')}</small>
        </div>
      </header>

      <div className="tc-msgs" role="log" aria-live="polite">
        {failed && <p className="tc-note is-bad">{L('ماقدرناش نحمّل الرسائل. جرّب تفتح الصفحة تاني.', 'Could not load the messages.')}</p>}
        {messages === null && !failed && <p className="tc-note">{L('بيتحمّل…', 'Loading…')}</p>}
        {messages?.length === 0 && !failed && <p className="tc-note">{L('ابدأ المحادثة بأول رسالة.', 'Say hello.')}</p>}
        {(messages || []).map((m, i, all) => {
          const mine = m.authorUid === self.uid;
          const first = i === 0 || all[i - 1].authorUid !== m.authorUid;
          return (
            <div key={m.id} className={`tc-msg ${mine ? 'is-mine' : ''} ${first ? 'is-first' : ''}`}>
              <div className="tc-bubble">
                {first && !mine && chat.kind === 'group' && <b className="tc-bubble__who">{m.authorName}</b>}
                <p>{m.text}</p>
                <time>{clock(m.createdAt, isAr)}</time>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      <div className="tc-composer">
        {error && <small role="alert" className="tc-note is-bad">{error}</small>}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          maxLength={MESSAGE_MAX}
          placeholder={L('اكتب رسالة…', 'Write a message…')}
          aria-label={L('اكتب رسالة', 'Write a message')}
        />
        <button type="button" className="tc-send" onClick={send} disabled={!text.trim() || busy} aria-label={L('إرسال', 'Send')}>
          <Send size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

/**
 * «محادثة الفريق»: the general thread everyone sees, and private conversations (one colleague, or a small
 * group) that only their members can read. The list shows who wrote last and a dot for what is new.
 */
export default function TeamChatPanel({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const { self, people } = useTeamDirectory();
  const { chats, ready, failed } = usePrivateChats(self?.uid);
  const [active, setActive] = useState(GENERAL);
  const [listOpen, setListOpen] = useState(true); // phones: the list or the thread, not both
  const [creating, setCreating] = useState(false);
  const current = chats.find((c) => c.id === active);

  const open = (id) => { setActive(id); setListOpen(false); };
  const create = async (uids, title) => {
    const id = await openChat({ me: self.uid, others: uids, title });
    if (!id) return false;
    setCreating(false);
    open(id);
    return true;
  };

  return (
    <div className={`tc ${listOpen ? 'is-list' : 'is-thread'}`}>
      <aside className="tc-list" aria-label={L('المحادثات', 'Chats')}>
        <header className="tc-list__head">
          <h2>{L('المحادثات', 'Chats')}</h2>
          <button type="button" className="tc-new" onClick={() => setCreating(true)} disabled={!self}>
            <MessageSquarePlus size={16} aria-hidden="true" /> {L('محادثة خاصة', 'New private')}
          </button>
        </header>
        <ul>
          <li>
            <button type="button" className={`tc-item ${active === GENERAL ? 'is-on' : ''}`} onClick={() => open(GENERAL)}>
              <span className="tc-item__ico" aria-hidden="true"><Hash size={18} /></span>
              <span className="tc-item__text"><strong>{L('الفريق كله', 'Whole team')}</strong><small>{L('عام: كل الفريق بيشوفه', 'Public to the team')}</small></span>
            </button>
          </li>
          {chats.map((c) => {
            const title = chatTitle(c, self?.uid, people, isAr);
            const unread = isUnread(c, self?.uid);
            return (
              <li key={c.id}>
                <button type="button" className={`tc-item ${active === c.id ? 'is-on' : ''} ${unread ? 'is-unread' : ''}`} onClick={() => open(c.id)}>
                  {c.kind === 'group' ? <span className="tc-item__ico is-group" aria-hidden="true"><Users size={18} /></span> : <Avatar name={title} />}
                  <span className="tc-item__text">
                    <strong>{title}</strong>
                    <small>{c.lastMessageText ? `${c.lastSenderUid === self?.uid ? L('أنت: ', 'You: ') : ''}${c.lastMessageText}` : L('لسه مفيش رسايل', 'No messages yet')}</small>
                  </span>
                  <span className="tc-item__meta">
                    {c.lastMessageAt ? <time>{clock(c.lastMessageAt, isAr)}</time> : null}
                    {unread && <i className="tc-dot" aria-label={L('جديد', 'New')} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {ready && failed && <p className="tc-note is-bad">{L('ماقدرناش نحمّل المحادثات الخاصة.', 'Could not load private chats.')}</p>}
        {ready && !failed && chats.length === 0 && <p className="tc-note"><Lock size={12} aria-hidden="true" /> {L('مفيش محادثات خاصة لسه. ابدأ واحدة مع زميل: محدش غيركم بيشوفها.', 'No private chats yet.')}</p>}
      </aside>

      <div className="tc-main">
        {active === GENERAL || !current ? (
          <div className="tc-general">
            <header className="tc-thread__head">
              <button type="button" className="tc-icon tc-back" onClick={() => setListOpen(true)} aria-label={L('رجوع للمحادثات', 'Back to chats')}>{isAr ? <ChevronRight size={20} aria-hidden="true" /> : <ChevronLeft size={20} aria-hidden="true" />}</button>
              <span className="tc-item__ico" aria-hidden="true"><Hash size={18} /></span>
              <div className="tc-thread__who"><strong>{L('الفريق كله', 'Whole team')}</strong><small>{L('رسالة لكل الفريق. اكتب @ واسم زميلك عشان توصله إشعار.', 'Everyone sees this. @name notifies a colleague.')}</small></div>
            </header>
            <NotesThread entityType="team" entityId={TEAM_THREAD_ID} lang={lang} />
          </div>
        ) : (
          self && <ChatThread key={current.id} chat={current} self={self} people={people} isAr={isAr} onBack={() => setListOpen(true)} />
        )}
      </div>

      {creating && self && <NewChat isAr={isAr} people={people} self={self} onClose={() => setCreating(false)} onCreate={create} />}
    </div>
  );
}
