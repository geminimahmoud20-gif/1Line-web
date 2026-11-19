import { Layers } from 'lucide-react';
import { clientFileSummary } from '../../../utils/clientFile';

const fmtDay = (ms, isAr) => (ms ? new Date(ms).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** «كل طلبات العميل»: the other requests under the same phone, each one opens its own file */
export default function ClientRequestsCard({ lead, allLeads = [], isAr }) {
  const s = clientFileSummary(lead, allLeads, isAr);
  if (!s.others.length) return null;
  const L = (ar, en) => (isAr ? ar : en);
  const open = (id) => window.dispatchEvent(new CustomEvent('oneline_open_lead', { detail: { leadId: id, lead: allLeads.find((l) => l.id === id) } }));
  return (
    <section className="crm-ld__block crm-ld__client-reqs" aria-labelledby="crm-ld-reqs">
      <h3 id="crm-ld-reqs" className="crm-ld__h"><Layers size={16} aria-hidden="true" />{L('كل طلبات العميل', 'All requests from this client')}</h3>
      <p className="crm-ld__hint">
        {L(`${s.total} طلبات بنفس الرقم`, `${s.total} requests under this phone`)}
        {s.open > 0 && ` · ${L(`${s.open} مفتوح`, `${s.open} open`)}`}
        {' · '}{s.hasAccount ? L('عنده حساب على الموقع', 'Has a site account') : L('مفيش حساب على الموقع', 'No site account')}
      </p>
      <ul className="crm-ld__reqs">
        {s.others.map((o) => (
          <li key={o.id} className={`crm-ld__req${o.archived ? ' is-archived' : ''}`}>
            <div>
              <strong>{o.kind}</strong>
              <small>{[o.source, o.stage, fmtDay(o.createdMs, isAr), o.owner].filter(Boolean).join(' · ')}{o.archived ? ` · ${L('مؤرشف', 'archived')}` : ''}</small>
            </div>
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => open(o.id)}>{L('افتح', 'Open')}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
