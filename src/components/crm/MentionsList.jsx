import { useMemo } from 'react';
import { useMentions } from '../../hooks/useMentions';
import { markMentionsRead } from '../../firebaseLazy';
import { sortMentions, unreadMentions, ENTITY_LABEL } from '../../utils/teamNotes';

const when = (iso, isAr) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(isAr ? 'ar-EG-u-nu-latn' : 'en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }).format(d);
};

/** What colleagues sent you with @ (crm_mentions), unread first, with «mark all read». `onOpen(m)`: where it was written */
export function MentionsList({ isAr = true, onOpen, withHead = true }) {
  const L = (ar, en) => (isAr ? ar : en);
  const { mentions } = useMentions();
  const list = useMemo(() => sortMentions(mentions), [mentions]);
  const unread = unreadMentions(mentions);
  const readAll = () => markMentionsRead(list.filter((m) => !m.readAt).map((m) => m.id));
  const openOne = (m) => {
    if (!m.readAt) markMentionsRead([m.id]);
    onOpen?.(m);
  };
  return (
    <>
      {withHead && (
        <div className="mm__head">
          <span>{L('رسايل الفريق ليك', 'Messages for you')}</span>
          {unread > 0 && <button type="button" onClick={readAll}>{L('علّم الكل مقروء', 'Mark all read')}</button>}
        </div>
      )}
      {!withHead && unread > 0 && <div className="mm__head mm__head--bare"><button type="button" onClick={readAll}>{L('علّم الكل مقروء', 'Mark all read')}</button></div>}
      {list.length === 0 ? (
        <p className="mm__empty">{L('محدش ذكرك لسه. لما زميل يكتب @اسمك هتلاقيها هنا.', 'Nothing yet. When a colleague @mentions you it shows up here.')}</p>
      ) : list.map((m) => (
        <button key={m.id} type="button" className={`mm__item ${m.readAt ? '' : 'is-unread'}`} onClick={() => openOne(m)}>
          <span className="mm__who"><b>{m.fromName || L('زميل', 'Colleague')}</b> · {(ENTITY_LABEL[m.entityType] || {})[isAr ? 'ar' : 'en']}{m.entityName && m.entityType !== 'team' ? ` «${m.entityName}»` : ''} · {when(m.createdAt, isAr)}</span>
          <span className="mm__snip">{m.snippet}</span>
        </button>
      ))}
    </>
  );
}
