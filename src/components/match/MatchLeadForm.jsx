import { useState } from 'react';
import { PhoneCall, Check } from 'lucide-react';
import PhoneInputField from '../PhoneInputField';
import { nameProblem, phoneProblem } from '../../utils/contactValidation';
import { useProperties } from '../../context/PropertiesContext';
import { kindOf } from '../../utils/buyerMatch';

const numOf = (v) => Number(String(v ?? '').replace(/\D/g, '')) || 0;

/**
 * «سيب رقمك ونكلمك» under the matches: saves the buyer as a lead (with the campaign that
 * brought them) so the team can call back, instead of relying on the visitor opening WhatsApp.
 */
export default function MatchLeadForm({ answers, message, areaName }) {
  const { handleAddNewLead } = useProperties();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('+20');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const nameErr = nameProblem(name.trim(), true);
    if (nameErr) { setError(nameErr); return; }
    const raw = phone.trim().replace(/[\s\-()]/g, '');
    const phoneErr = phoneProblem(raw, country, true);
    if (phoneErr) { setError(phoneErr); return; }
    setError('');
    setBusy(true);
    const full = `${country}${raw.startsWith('0') ? raw.slice(1) : raw}`;
    const budget = answers.payment === 'cash' ? numOf(answers.budget) : 0;
    try {
      await handleAddNewLead({
        name: name.trim(),
        clientName: name.trim(),
        phone: full,
        whatsapp: full,
        propertyType: answers.kind ? kindOf(answers.kind).id : 'residential',
        area: answers.areas?.[0] || '',
        budget: budget || '',
        notes: message,
        details: { areas: (answers.areas || []).map(areaName), payment: answers.payment, down: answers.down, monthly: answers.monthly },
        type: 'buyer_instant',
        status: 'new',
        timestamp: new Date().toISOString()
      }, { type: 'buyer_instant' }, 'رشّحلي عقاري');
      setDone(true);
    } catch {
      setError('حصلت مشكلة في الإرسال، جرّب تاني أو ابعت على واتساب.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mt-card mt-lead is-done" role="status">
        <Check size={20} aria-hidden="true" />
        <div>
          <h2>وصلنا طلبك</h2>
          <p>واحد من فريق 1Line هيكلمك قريب بالترشيحات المناسبة.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="mt-card mt-lead" onSubmit={submit} noValidate>
      <h2>سيب رقمك ونكلمك بالأنسب</h2>
      <p>فريقنا هيتصل بيك بترشيحات أدق ويرتّب المعاينة. من غير أي التزام.</p>
      <label className="mt-lead-field">
        <span>الاسم</span>
        <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} autoComplete="name" required />
      </label>
      <div className="mt-lead-field">
        <span><PhoneCall size={15} aria-hidden="true" /> رقم الموبايل</span>
        <PhoneInputField
          id="match-lead-phone"
          value={phone}
          phone={phone}
          onChange={(v) => { setPhone(v); setError(''); }}
          setPhone={(v) => { setPhone(v); setError(''); }}
          country={country}
          countryCode={country}
          onCountryChange={setCountry}
          setCountry={setCountry}
          isAr
          placeholder="01012345678"
          required
        />
      </div>
      {error && <p className="mt-lead-error" role="alert">{error}</p>}
      <button type="submit" className="mt-btn is-primary" disabled={busy}>{busy ? 'بنبعت…' : 'كلّموني'}</button>
    </form>
  );
}
