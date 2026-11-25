import { useState, useEffect, useMemo } from 'react';
import { Layers } from 'lucide-react';
import { clientFileSummary } from '../../../utils/clientFile';
import { fetchClientOtherRequests } from '../../../firebaseLazy';
import { Badge } from '../../ui';

const fmtDay = (ms, isAr) => (ms ? new Date(ms).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** «كل طلبات العميل»: every request the person made across all time, fetched in-memory and from cloud */
export default function ClientRequestsCard({ lead, allLeads = [], isAr }) {
  const [cloudRequests, setCloudRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const phone = lead?.phone || lead?.whatsapp;
    if (!phone) return;
    let cancelled = false;
    fetchClientOtherRequests(phone, lead?.id)
      .then((items) => {
        if (!cancelled) {
          setCloudRequests(items || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [lead?.id, lead?.phone, lead?.whatsapp]);

  // Merge in-memory allLeads with cloud-fetched past requests
  const mergedLeads = useMemo(() => {
    const map = new Map();
    (allLeads || []).forEach((l) => { if (l?.id) map.set(String(l.id), l); });
    cloudRequests.forEach((l) => { if (l?.id && !map.has(String(l.id))) map.set(String(l.id), l); });
    return Array.from(map.values());
  }, [allLeads, cloudRequests]);

  const s = clientFileSummary(lead, mergedLeads, isAr);
  if (!s.others.length && !loading) return null;
  const L = (ar, en) => (isAr ? ar : en);
  const open = (id) => {
    const target = mergedLeads.find((l) => String(l.id) === String(id));
    window.dispatchEvent(new CustomEvent('oneline_open_lead', { detail: { leadId: id, lead: target } }));
  };

  return (
    <section className="crm-ld__block crm-ld__client-reqs" aria-labelledby="crm-ld-reqs">
      <div className="crm-ld__block-head">
        <h3 id="crm-ld-reqs" className="crm-ld__h">
          <Layers size={16} aria-hidden="true" />
          {L('كل طلبات العميل', 'All requests from this client')}
        </h3>
        {loading && <Badge tone="neutral">{L('جاري الفحص السحابي...', 'Checking...')}</Badge>}
      </div>
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
