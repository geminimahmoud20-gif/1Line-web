import { Plus, Phone, Inbox, CheckCircle2, UserRound, ArrowRightLeft, StickyNote } from 'lucide-react';
import { Button, Textarea } from '../../ui';
import { buildTimeline } from '../../../utils/clientTimeline';

const KIND = {
  outcome: { Icon: Phone, ar: 'نتيجة', en: 'Outcome' },
  request: { Icon: Inbox, ar: 'طلب', en: 'Request' },
  task: { Icon: CheckCircle2, ar: 'مهمة', en: 'Task' },
  owner: { Icon: UserRound, ar: 'مسؤول', en: 'Owner' },
  stage: { Icon: ArrowRightLeft, ar: 'مرحلة', en: 'Stage' },
  note: { Icon: StickyNote, ar: 'ملاحظة', en: 'Note' }
};

const when = (ms, isAr) => {
  if (!ms) return '';
  const d = new Date(ms);
  const locale = isAr ? 'ar-EG-u-nu-latn' : 'en-GB';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} · ${d.toLocaleDateString(locale, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })}`;
};

/** «اللي حصل»: a note box, then everything that happened with this client, newest first */
export default function ClientTimeline({ lead, isAr, newNote, setNewNote, onAddNote }) {
  const { events } = buildTimeline(lead);
  return (
    <section className="crm-ld__block" aria-labelledby="cf-history">
      <h3 id="cf-history" className="crm-ld__h">{isAr ? 'اللي حصل' : 'History'}{events.length > 0 && <span className="cf-count">{events.length}</span>}</h3>
      <form onSubmit={onAddNote} className="cf-note">
        <Textarea
          label={isAr ? 'ملاحظة جديدة' : 'New note'}
          hideLabel
          rows={2}
          placeholder={isAr ? 'اكتب اللي حصل: مكالمة، طلب جديد من العميل…' : 'What happened: a call, a new request…'}
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />
        <Button type="submit" size="sm" icon={<Plus size={16} aria-hidden="true" />} disabled={!newNote.trim()}>{isAr ? 'أضف' : 'Add'}</Button>
      </form>
      {events.length === 0 ? (
        <p className="crm-ld__hint">{isAr ? 'لسه مفيش حاجة. أي مكالمة أو نتيجة أو ملاحظة بتسجّلها هتظهر هنا.' : 'Nothing yet. Calls, outcomes and notes you log show up here.'}</p>
      ) : (
        <ol className="cf-events">
          {events.map((ev) => {
            const k = KIND[ev.kind] || KIND.note;
            return (
              <li key={ev.key} className={`cf-event cf-event--${ev.kind}`}>
                <span className="cf-event__icon" aria-hidden="true"><k.Icon size={14} /></span>
                <div className="cf-event__body">
                  <span className="cf-event__text">{ev.text}</span>
                  <small className="cf-event__meta">
                    {[ev.at ? when(ev.at, isAr) : ev.meta, ev.agent].filter(Boolean).join(' · ')}{ev.legacy ? ` · ${isAr ? 'قديم' : 'older'}` : ''}
                  </small>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
