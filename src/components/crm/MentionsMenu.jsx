import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useMentions } from '../../hooks/useMentions';
import { markMentionsRead } from '../../firebaseLazy';
import { sortMentions, unreadMentions, ENTITY_LABEL } from '../../utils/teamNotes';

/** Top-bar menu: what colleagues sent you with @ (crm_mentions), unread first. Clicking one opens where it was written. */
export default function MentionsMenu({ isAr = true, onOpen }) {
  const L = (ar, en) => (isAr ? ar : en);
  const { mentions } = useMentions();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const list = useMemo(() => sortMentions(mentions), [mentions]);
  const unread = unreadMentions(mentions);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const readAll = () => markMentionsRead(list.filter((m) => !m.readAt).map((m) => m.id));
  const openOne = (m) => {
    if (!m.readAt) markMentionsRead([m.id]);
    setOpen(false);
    onOpen?.(m);
  };
  const when = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(isAr ? 'ar-EG-u-nu-latn' : 'en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }).format(d);
  };

  return (
    <div className="mm" ref={ref}>
      <button type="button" className="mm__btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} title={L('رسايل الفريق ليك', 'Messages for you')} aria-label={L('رسايل الفريق ليك', 'Messages for you')}>
        <MessageSquare size={16} aria-hidden="true" />
        {unread > 0 && <span className="mm__badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="mm__panel" role="dialog" aria-label={L('رسايل الفريق ليك', 'Messages for you')}>
          <div className="mm__head">
            <span>{L('رسايل الفريق ليك', 'Messages for you')}</span>
            {unread > 0 && <button type="button" onClick={readAll}>{L('علّم الكل مقروء', 'Mark all read')}</button>}
          </div>
          {list.length === 0 ? (
            <p className="mm__empty">{L('محدش ذكرك لسه. لما زميل يكتب @اسمك هتلاقيها هنا.', 'Nothing yet. When a colleague @mentions you it shows up here.')}</p>
          ) : list.map((m) => (
            <button key={m.id} type="button" className={`mm__item ${m.readAt ? '' : 'is-unread'}`} onClick={() => openOne(m)}>
              <span className="mm__who"><b>{m.fromName || L('زميل', 'Colleague')}</b> · {(ENTITY_LABEL[m.entityType] || {})[isAr ? 'ar' : 'en']}{m.entityName && m.entityType !== 'team' ? ` «${m.entityName}»` : ''} · {when(m.createdAt)}</span>
              <span className="mm__snip">{m.snippet}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
