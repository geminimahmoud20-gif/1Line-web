import { useState, useMemo } from 'react';
import { Plus, Phone, Inbox, CheckCircle2, UserRound, ArrowRightLeft, StickyNote, Search } from 'lucide-react';
import { Button, Textarea } from '../../ui';
import { buildTimeline } from '../../../utils/clientTimeline';

const KIND = {
  outcome: { Icon: Phone, ar: 'مكالمة / نتيجة', en: 'Outcome' },
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

/** «اللي حصل»: interactive timeline with categorization, instant search and quick note taking */
export default function ClientTimeline({ lead, isAr, newNote, setNewNote, onAddNote }) {
  const { events } = buildTimeline(lead);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const filteredEvents = useMemo(() => {
    let list = events;
    if (filter !== 'all') {
      list = list.filter((ev) => ev.kind === filter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((ev) => String(ev.text || '').toLowerCase().includes(q) || String(ev.agent || '').toLowerCase().includes(q));
    }
    return list;
  }, [events, filter, query]);

  return (
    <section className="crm-ld__block" aria-labelledby="cf-history">
      <h3 id="cf-history" className="crm-ld__h">
        {isAr ? 'اللي حصل' : 'History'}
        {events.length > 0 && <span className="cf-count">{events.length}</span>}
      </h3>
      <form onSubmit={onAddNote} className="cf-note">
        <Textarea
          label={isAr ? 'ملاحظة جديدة' : 'New note'}
          hideLabel
          rows={2}
          placeholder={isAr ? 'اكتب اللي حصل: مكالمة، طلب جديد من العميل…' : 'What happened: a call, a new request…'}
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />
        <Button type="submit" size="sm" icon={<Plus size={16} aria-hidden="true" />} disabled={!newNote.trim()}>
          {isAr ? 'أضف ملاحظة' : 'Add Note'}
        </Button>
      </form>

      {events.length > 0 && (
        <div className="cf-toolbar">
          <div className="cf-filters" role="group" aria-label={isAr ? 'تصفية السجل' : 'Filter history'}>
            <button
              type="button"
              className={`cf-filter-chip ${filter === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilter('all')}
            >
              {isAr ? 'الكل' : 'All'} ({events.length})
            </button>
            {Object.entries(KIND).map(([k, meta]) => {
              const count = events.filter((e) => e.kind === k).length;
              if (count === 0) return null;
              return (
                <button
                  key={k}
                  type="button"
                  className={`cf-filter-chip ${filter === k ? 'is-active' : ''}`}
                  onClick={() => setFilter(k)}
                >
                  <meta.Icon size={12} aria-hidden="true" />
                  {isAr ? meta.ar : meta.en} ({count})
                </button>
              );
            })}
          </div>

          {events.length > 4 && (
            <div className="cf-search-box">
              <Search size={14} aria-hidden="true" />
              <input
                type="text"
                placeholder={isAr ? 'ابحث في السجل والملاحظات...' : 'Search timeline...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={isAr ? 'بحث في السجل' : 'Search timeline'}
              />
            </div>
          )}
        </div>
      )}

      {filteredEvents.length === 0 ? (
        <p className="crm-ld__hint">
          {events.length === 0
            ? (isAr ? 'لسه مفيش حاجة. أي مكالمة أو نتيجة أو ملاحظة بتسجّلها هتظهر هنا.' : 'Nothing yet. Calls, outcomes and notes you log show up here.')
            : (isAr ? 'لا توجد عناصر مطابقة للبحث أو التصفية الحالية.' : 'No entries match current filter.')}
        </p>
      ) : (
        <ol className="cf-events">
          {filteredEvents.map((ev) => {
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
