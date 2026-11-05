import { Wallet } from 'lucide-react';
import { paymentFields, paymentProblem, installmentsPhrase, yearlyPhrase, INSTALLMENT_EVERY, isPlanType } from '../../utils/paymentTerms';
import './property-extras.css';

const KINDS = [
  ['cash', 'كاش', 'Cash'],
  ['installment', 'تقسيط', 'Installments'],
  ['resale', 'إعادة بيع (متبقي أقساط)', 'Resale with installments left']
];

// Cash, an installment plan, or a resale with installments left. For a plan the team types what is
// paid now, the installment and how often, and the term; the total is worked out (utils/paymentTerms).
export default function PaymentTermsEditor({ form, setForm, isAr = true }) {
  const L = (ar, en) => (isAr ? ar : en);
  const kind = isPlanType(form.paymentType) ? form.paymentType : 'cash';
  const resale = kind === 'resale';
  // The term is typed as the number of installments (more exact than months or years): stored as
  // months = installments × months between them, so changing «كل» keeps the count
  const every = Number(form.installmentEvery) || 1;
  const count = Number(form.installmentMonths) ? Math.round(Number(form.installmentMonths) / every) : '';
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setCount = (value) => {
    const n = Math.max(0, Math.round(Number(value) || 0));
    set({ installmentMonths: n ? n * every : '' });
  };
  const setEvery = (e) => set({ installmentEvery: e, installmentMonths: count ? count * e : form.installmentMonths });

  const plan = paymentFields(form);
  const problem = paymentProblem(form, isAr);
  const money = (n) => `${Math.round(n).toLocaleString('en-US')} ${L('ج.م', 'EGP')}`;
  const periods = plan.installmentEvery ? Math.ceil((plan.installmentMonths || 0) / plan.installmentEvery) : 0;

  return (
    <section className="pxe-sec is-open pxe-pay">
      <div className="pxe-sec-head" role="presentation">
        <Wallet size={16} aria-hidden="true" />
        <span className="pxe-sec-title">{L('طريقة السداد', 'Payment')}</span>
        <small>{L('تظهر للعميل في صفحة الوحدة', 'Shown on the listing')}</small>
      </div>
      <div className="pxe-sec-body">
        <div className="pxe-pay-switch" role="radiogroup" aria-label={L('طريقة السداد', 'Payment')}>
          {KINDS.map(([v, ar, en]) => (
            <button key={v} type="button" role="radio" aria-checked={kind === v} className={kind === v ? 'is-on' : ''}
              onClick={() => set({ paymentType: v })}>
              {L(ar, en)}
            </button>
          ))}
        </div>

        {kind === 'cash' ? (
          <p className="pxe-note">{L('الوحدة هتظهر «السداد: كاش»، ومفيش أي بيانات تقسيط هتتعرض.', 'The listing shows "Payment: cash" with no installment details.')}</p>
        ) : (
          <>
            <p className="pxe-note">
              {resale
                ? L('وحدة مشتراه بالتقسيط وبتتباع: المشتري يدفع للمالك مبلغ كاش (اللي اتدفع + الأوفر) ويكمّل الأقساط الباقية. الموقع بيعرض المطلوب كاش والأقساط، والإجمالي بيتحسب لوحده.', 'Bought on installments and sold on: the buyer pays the seller cash and takes over the installments left.')
                : L('اكتب المقدم والقسط وكل قد إيه والمدة. الإجمالي بيتحسب لوحده، ومش لازم تكتب سعر الكاش لو مفيش.', 'Type the down payment, the installment, how often and the term; the total is worked out.')}
            </p>
            <div className="pxe-grid">
              <label className="pxe-field">
                <span>{resale ? L('المطلوب كاش للمالك (المدفوع + الأوفر)', 'Cash to the seller') : L('المقدم', 'Down payment')}</span>
                <div className="pxe-input-wrap">
                  <input type="number" min="0" inputMode="numeric" value={form.downPayment || ''} placeholder="0"
                    onChange={(e) => set({ downPayment: Math.max(0, Number(e.target.value) || 0) })} />
                  <em>{L('ج.م', 'EGP')}</em>
                </div>
              </label>
              <label className="pxe-field">
                <span>{L('قيمة القسط', 'Installment')}</span>
                <div className="pxe-input-wrap">
                  <input type="number" min="0" inputMode="numeric" value={form.installmentAmount || ''}
                    placeholder={plan.installmentAmount ? String(plan.installmentAmount) : ''}
                    onChange={(e) => set({ installmentAmount: Math.max(0, Number(e.target.value) || 0) || '' })} />
                  <em>{L('ج.م', 'EGP')}</em>
                </div>
              </label>
              <label className="pxe-field">
                <span>{L('القسط كل', 'Paid')}</span>
                <select value={plan.installmentEvery || 1} onChange={(e) => setEvery(Number(e.target.value))}>
                  {INSTALLMENT_EVERY.map((x) => (
                    <option key={x.months} value={x.months}>{isAr ? `${x.ar} (${x.every_ar})` : x.en}</option>
                  ))}
                </select>
              </label>
              <label className="pxe-field">
                <span>{resale ? L('عدد الأقساط المتبقية', 'Installments left') : L('عدد الأقساط', 'Number of installments')}</span>
                <div className="pxe-input-wrap">
                  <input type="number" min="1" step="1" inputMode="numeric" value={count}
                    onChange={(e) => setCount(e.target.value)} />
                  <em>{L('قسط', 'inst.')}</em>
                </div>
              </label>
            </div>

            {/* Yearly payments on top of the installments: they change the total */}
            <div className="pxe-grid">
              <label className="pxe-field">
                <span>{L('الدفعة السنوية (لو فيه)', 'Yearly payment (if any)')}</span>
                <div className="pxe-input-wrap">
                  <input type="number" min="0" inputMode="numeric" value={form.yearlyPaymentAmount || ''} placeholder="0"
                    onChange={(e) => set({ yearlyPaymentAmount: Math.max(0, Number(e.target.value) || 0) || '' })} />
                  <em>{L('ج.م', 'EGP')}</em>
                </div>
              </label>
              <label className="pxe-field">
                <span>{resale ? L('عدد الدفعات السنوية المتبقية', 'Yearly payments left') : L('عدد الدفعات السنوية', 'Number of yearly payments')}</span>
                <div className="pxe-input-wrap">
                  <input type="number" min="0" step="1" inputMode="numeric" value={form.yearlyPaymentCount || ''} placeholder="0"
                    onChange={(e) => set({ yearlyPaymentCount: Math.max(0, Math.round(Number(e.target.value) || 0)) || '' })} />
                  <em>{L('دفعة', 'pay.')}</em>
                </div>
              </label>
            </div>

            <div className={`pxe-check ${problem ? 'is-warn' : 'is-ok'}`} role="status" aria-live="polite">
              {problem || (
                <>
                  <strong>{L('الإجمالي: ', 'Total: ')}{money(plan.installmentTotal)}</strong>
                  {' — '}
                  {L(
                    `${plan.downPayment ? `${resale ? 'كاش للمالك' : 'مقدم'} ${money(plan.downPayment)} + ` : ''}${installmentsPhrase(periods, plan.installmentEvery)} × ${money(plan.installmentAmount)}${plan.yearlyPaymentAmount ? ` + ${yearlyPhrase(plan.yearlyPaymentCount)} × ${money(plan.yearlyPaymentAmount)}` : ''}`,
                    `${plan.downPayment ? `${money(plan.downPayment)} now + ` : ''}${periods} × ${money(plan.installmentAmount)}${plan.yearlyPaymentAmount ? ` + ${plan.yearlyPaymentCount} × ${money(plan.yearlyPaymentAmount)} yearly` : ''}`
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
