import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, AtSign } from 'lucide-react';
import TeamChatPanel from './TeamChatPanel';
import { MentionsList } from './MentionsList';
import { useMentions } from '../../hooks/useMentions';
import { usePrivateChats } from '../../hooks/usePrivateChats';
import { unreadMentions } from '../../utils/teamNotes';
import './messages-hub.css';

/**
 * One floating icon on the side of every CRM page for what colleagues write to you: private chats, the team thread
 * and @mentions. It sits over the page without moving it, and opens a panel (docked on a laptop, a sheet on a phone).
 * The count is what is waiting for you personally (private messages and @mentions), not the team thread. Hidden on the
 * full «محادثة الفريق» page, which shows the same chats at full size.
 */
export default function MessagesHub({ uid, lang = 'ar', hidden = false, onOpenMention }) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('chats'); // 'chats' | 'mentions'
  const { unread: unreadChats } = usePrivateChats(uid);
  const { mentions } = useMentions();
  const unreadAt = unreadMentions(mentions);
  const count = unreadChats + unreadAt;
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e) => { if (box.current && !box.current.contains(e.target) && !e.target.closest?.('.mh-fab')) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  if (hidden || !uid) return null;
  return (
    <>
      {!open && (
        <button type="button" className="mh-fab" onClick={() => setOpen(true)} aria-label={count > 0 ? L(`الرسايل، ${count} جديدة`, `Messages, ${count} new`) : L('الرسايل', 'Messages')} title={L('رسايل الفريق', 'Team messages')}>
          <MessageCircle size={24} aria-hidden="true" />
          {count > 0 && <span className="mh-fab__badge">{count > 9 ? '9+' : count}</span>}
        </button>
      )}
      {open && (
        <section className="mh-panel" ref={box} role="dialog" aria-label={L('رسايل الفريق', 'Team messages')}>
          <header className="mh-panel__head">
            <div className="mh-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'chats'} className={tab === 'chats' ? 'is-on' : ''} onClick={() => setTab('chats')}>
                <MessageCircle size={15} aria-hidden="true" /> {L('المحادثات', 'Chats')}{unreadChats > 0 && <b>{unreadChats}</b>}
              </button>
              <button type="button" role="tab" aria-selected={tab === 'mentions'} className={tab === 'mentions' ? 'is-on' : ''} onClick={() => setTab('mentions')}>
                <AtSign size={15} aria-hidden="true" /> {L('إشارات', 'Mentions')}{unreadAt > 0 && <b>{unreadAt}</b>}
              </button>
            </div>
            <button type="button" className="mh-close" onClick={() => setOpen(false)} aria-label={L('إغلاق', 'Close')}><X size={18} aria-hidden="true" /></button>
          </header>
          <div className="mh-panel__body">
            {tab === 'chats'
              ? <TeamChatPanel lang={lang} compact />
              : <div className="mm__list"><MentionsList isAr={isAr} withHead={false} onOpen={(m) => { setOpen(false); onOpenMention?.(m); }} /></div>}
          </div>
        </section>
      )}
    </>
  );
}
