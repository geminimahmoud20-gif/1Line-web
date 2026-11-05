import { useEffect, useState } from 'react';
import { UserRound, Lock, Unlink } from 'lucide-react';
import { fetchLeadById } from '../../services/leads';
import { LISTED_BY, listedByLabel } from '../../utils/listingContact';
import { readablePhone } from '../../utils/phoneDisplay';
import './listing-contact.css';

/**
 * «صاحب الوحدة» on the listing form: who offers the unit (owner, broker…) and their name and phone.
 * The phone is saved as a client in «العملاء», never on the listing (listings are public).
 * `contactLead`: the client already linked to this unit, shown instead of the inputs. The CRM's
 * live list holds only the newest clients, so a linked client who isn't in it is read by id.
 */
export default function ListingContactFields({ form, setForm, contactLead, required, isAr }) {
  const L = (ar, en) => (isAr ? ar : en);
  const linked = contactLead || form.sourceLeadId;
  const [fetched, setFetched] = useState({ id: null, status: 'idle', lead: null });
  const wantId = !contactLead && form.sourceLeadId ? String(form.sourceLeadId) : null;
  useEffect(() => {
    if (!wantId) return undefined;
    let live = true;
    fetchLeadById(wantId).then((res) => { if (live) setFetched({ id: wantId, ...res }); });
    return () => { live = false; };
  }, [wantId]);
  const lookup = wantId && fetched.id === wantId ? fetched : { status: wantId ? 'loading' : 'idle' };
  const client = contactLead || (lookup.status === 'ok' ? lookup.lead : null);
  // A link to a client that no longer exists: let the team type the owner again
  const unlink = () => setForm({ ...form, sourceLeadId: '' });
  return (
    <fieldset className="lcf">
      <legend className="lcf-title">
        <UserRound size={16} aria-hidden="true" />
        <span>{L('صاحب الوحدة', 'Who offers this unit')}{required ? ' *' : ''}</span>
      </legend>
      <p className="lcf-note">
        <Lock size={13} aria-hidden="true" />
        <span>{L('للفريق بس: الرقم بيتسجل في «العملاء» كعميل بائع ومش بيظهر على الموقع.', 'Team only: the phone is saved in clients and never shown on the site.')}</span>
      </p>

      <div className="lcf-grid">
        <label className="lcf-field">
          <span>{L('مين اللي عارض الوحدة؟', 'Offered by')}{required ? ' *' : ''}</span>
          <select value={form.listedBy || ''} onChange={(e) => setForm({ ...form, listedBy: e.target.value })}>
            <option value="">{L('اختار…', 'Choose…')}</option>
            {LISTED_BY.map((o) => <option key={o.value} value={o.value}>{isAr ? o.ar : o.en}</option>)}
          </select>
        </label>

        {linked ? (
          <div className="lcf-linked" role="status">
            <span className="lcf-linked-label">{L('مربوطة بالعميل', 'Linked client')}</span>
            {client ? (
              <>
                <strong>{client.name || L('بدون اسم', 'No name')}</strong>
                {(client.phone || client.whatsapp)
                  ? <a href={`tel:${client.phone || client.whatsapp}`} dir="ltr">{readablePhone(client.phone || client.whatsapp)}</a>
                  : <small>{L('الرقم مخفي حسب صلاحيتك', 'Phone hidden for your role')}</small>}
                {form.listedBy && <small>{listedByLabel(form.listedBy, isAr)}</small>}
              </>
            ) : lookup.status === 'loading' ? (
              <small>{L('بنجيب بيانات العميل…', 'Loading the client…')}</small>
            ) : lookup.status === 'denied' ? (
              <small>{L('العميل ده على مكتب تاني، ومش ظاهر حسب صلاحيتك', "This client is on another desk and hidden for your role")}</small>
            ) : lookup.status === 'missing' ? (
              <>
                <small className="lcf-warn">{L('العميل المربوط اتمسح أو اتدمج مع عميل تاني', 'The linked client was deleted or merged')}</small>
                <button type="button" className="lcf-unlink" onClick={unlink}>
                  <Unlink size={14} aria-hidden="true" />{L('سجّل صاحب الوحدة من جديد', 'Enter the owner again')}
                </button>
              </>
            ) : (
              <small>{L('العميل محفوظ في «العملاء»', 'Saved in clients')}</small>
            )}
          </div>
        ) : (
          <>
            <label className="lcf-field">
              <span>{L('الاسم', 'Name')}</span>
              <input type="text" autoComplete="off" maxLength={100} value={form.contactName || ''} placeholder={L('مثال: أحمد محمود', 'e.g. Ahmed Mahmoud')} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </label>
            <label className="lcf-field">
              <span>{L('رقم الموبايل', 'Mobile')}{required ? ' *' : ''}</span>
              <input type="tel" inputMode="tel" dir="ltr" autoComplete="off" maxLength={20} value={form.contactPhone || ''} placeholder="01xxxxxxxxx" onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </label>
          </>
        )}
      </div>
    </fieldset>
  );
}
