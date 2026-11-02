import { UserRound, Lock } from 'lucide-react';
import { LISTED_BY, listedByLabel } from '../../utils/listingContact';
import { readablePhone } from '../../utils/phoneDisplay';
import './listing-contact.css';

/**
 * «صاحب الوحدة» on the listing form: who offers the unit (owner, broker…) and their name and phone.
 * The phone is saved as a client in «العملاء», never on the listing (listings are public).
 * `contactLead`: the client already linked to this unit, shown instead of the inputs.
 */
export default function ListingContactFields({ form, setForm, contactLead, required, isAr }) {
  const L = (ar, en) => (isAr ? ar : en);
  const linked = contactLead || form.sourceLeadId;
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
            {contactLead ? (
              <>
                <strong>{contactLead.name || L('بدون اسم', 'No name')}</strong>
                {(contactLead.phone || contactLead.whatsapp)
                  ? <a href={`tel:${contactLead.phone || contactLead.whatsapp}`} dir="ltr">{readablePhone(contactLead.phone || contactLead.whatsapp)}</a>
                  : <small>{L('الرقم مخفي حسب صلاحيتك', 'Phone hidden for your role')}</small>}
                {form.listedBy && <small>{listedByLabel(form.listedBy, isAr)}</small>}
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
