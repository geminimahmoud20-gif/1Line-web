import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { monthlyFor, paymentProblem, termLabel } from '../../utils/paymentTerms';
import './property-extras.css';

// Cash or installment. Cash hides every installment field; installment asks for the down payment,
// the term and the installment total, and works out the monthly installment itself.
export default function PaymentTermsEditor({ form, setForm, isAr = true }) {
  const L = (ar, en) => (isAr ? ar : en);
  const isPlan = form.paymentType === 'installment';
  const months = Number(form.installmentMonths) || 0;
  // The term is typed in years when it is whole years, else in months; stored in months either way
  const [unit, setUnit] = useState(() => (months && months % 12 === 0 ? 'years' : 'months'));
  const termValue = months ? (unit === 'years' ? Math.round((months / 12) * 100) / 100 : months) : '';
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setTerm = (value, u = unit) => {
    const n = Math.max(0, Number(value) || 0);
    set({ installmentMonths: n ? Math.round(u === 'years' ? n * 12 : n) : '' });
  };
  // Switching the unit keeps the same term: 18 months shows as 1.5 years
  const changeUnit = (u) => setUnit(u);

  const total = Number(form.installmentTotal) || Number(form.price) || 0;
  const monthly = monthlyFor({ total, down: form.downPayment, months });
  const problem = paymentProblem(form, isAr);
  const money = (n) => `${Math.round(n).toLocaleString('en-US')} ${L('ج.م', 'EGP')}`;

  return (
    <section className="pxe-sec is-open pxe-pay">
      <div className="pxe-sec-head" role="presentation">
        <Wallet size={16} aria-hidden="true" />
        <span className="pxe-sec-title">{L('طريقة السداد', 'Payment')}</span>
        <small>{L('تظهر للعميل في صفحة الوحدة', 'Shown on the listing')}</small>
      </div>
      <div className="pxe-sec-body">
        <div className="pxe-pay-switch" role="radiogroup" aria-label={L('طريقة السداد', 'Payment')}>
          {[['cash', L('كاش', 'Cash')], ['installment', L('تقسيط', 'Installments')]].map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={(form.paymentType || 'cash') === v}
              className={(form.paymentType || 'cash') === v ? 'is-on' : ''}
              onClick={() => set({ paymentType: v })}
            >
              {label}
            </button>
          ))}
        </div>

        {!isPlan ? (
          <p className="pxe-note">{L('الوحدة هتظهر «السداد: كاش»، ومفيش أي بيانات تقسيط هتتعرض.', 'The listing shows "Payment: cash" with no installment details.')}</p>
        ) : (
          <>
            <div className="pxe-grid">
              <label className="pxe-field">
                <span>{L('المقدم', 'Down payment')}</span>
                <div className="pxe-input-wrap">
                  <input type="number" min="0" inputMode="numeric" value={form.downPayment || ''} placeholder="0"
                    onChange={(e) => set({ downPayment: Math.max(0, Number(e.target.value) || 0) })} />
                  <em>{L('ج.م', 'EGP')}</em>
                </div>
              </label>
              <label className="pxe-field">
                <span>{L('المدة', 'Term')}</span>
                <div className="pxe-pay-term">
                  <input type="number" min="1" step={unit === 'years' ? '0.5' : '1'} inputMode="decimal" value={termValue}
                    onChange={(e) => setTerm(e.target.value)} />
                  <select value={unit} onChange={(e) => changeUnit(e.target.value)} aria-label={L('وحدة المدة', 'Term unit')}>
                    <option value="months">{L('شهور', 'months')}</option>
                    <option value="years">{L('سنين', 'years')}</option>
                  </select>
                </div>
              </label>
              <label className="pxe-field">
                <span>{L('إجمالي سعر التقسيط', 'Installment total')}</span>
                <div className="pxe-input-wrap">
                  <input type="number" min="0" inputMode="numeric" value={form.installmentTotal || ''}
                    placeholder={form.price ? String(form.price) : ''}
                    onChange={(e) => set({ installmentTotal: Math.max(0, Number(e.target.value) || 0) || '' })} />
                  <em>{L('ج.م', 'EGP')}</em>
                </div>
                <small className="pxe-hint">{L('سيبه فاضي لو نفس سعر الكاش', 'Leave empty if it equals the cash price')}</small>
              </label>
            </div>

            <div className={`pxe-check ${problem ? 'is-warn' : 'is-ok'}`} role="status" aria-live="polite">
              {problem || (
                <>
                  <strong>{L('القسط الشهري: ', 'Monthly installment: ')}{money(monthly)}</strong>
                  {' — '}
                  {L(
                    `(${money(total)} − مقدم ${money(Number(form.downPayment) || 0)}) ÷ ${months} شهر${months % 12 === 0 ? ` (${termLabel(months)})` : ''}`,
                    `(${money(total)} − ${money(Number(form.downPayment) || 0)} down) ÷ ${months} months`
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
