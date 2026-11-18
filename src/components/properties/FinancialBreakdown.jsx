import { Receipt, Wallet, Wrench, Landmark, FileText, Info } from 'lucide-react';
import { computeFinanceBreakdown } from '../../utils/propertyInsights';
import { formatApprox } from '../../utils/fxRates';
import { installmentsPhrase, everyLabel, yearlyPhrase } from '../../utils/paymentTerms';
import '../../styles/expat-suite.css';

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const pct = (n) => `${(Math.round(n * 10) / 10).toLocaleString('en-US')}%`;

function Money({ value, currency, lang, strong = false, muted = false }) {
  const isAr = lang === 'ar';
  const fx = currency !== 'EGP' ? formatApprox(value, currency, lang) : '';
  return (
    <span className={`xs-money ${strong ? 'is-strong' : ''} ${muted ? 'is-muted' : ''}`}>
      <span className="xs-money-main"><bdi>{fmt(value)}</bdi> <small>{isAr ? 'ج.م' : 'EGP'}</small></span>
      {fx && <em><bdi>{fx}</bdi></em>}
    </span>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="xs-fin-row">
      <span className="xs-fin-label">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <span className="xs-fin-value">{children}</span>
    </div>
  );
}

/**
 * مصفوفة الشفافية المالية — every figure the buyer pays, from the listing's own data.
 * Sections without data are omitted rather than guessed.
 */
export default function FinancialBreakdown({ property, lang = 'ar', currency = 'EGP' }) {
  const isAr = lang === 'ar';
  const fb = computeFinanceBreakdown(property);
  if (!fb) return null;
  const L = (ar, en) => (isAr ? ar : en);
  const m = { currency, lang };

  // Resale units are sold cash: the breakdown only earns its space when there is a cost beyond the
  // price (maintenance, over-price, transfer fees) or a cash discount to explain
  const hasExtras = fb.maintenance || fb.overPrice || fb.fees;
  const plan = fb.plan;
  // The total typed in the CRM, not the rounded-up monthly × months (a few pounds more)
  const planTotal = plan ? (Number(property.installmentTotal) || (plan.incomplete ? fb.price : plan.total)) : 0;
  const premiumPct = plan && fb.cashPrice ? ((planTotal - fb.cashPrice) / fb.cashPrice) * 100 : 0;
  if (!hasExtras && !(fb.cashDiscountPct > 0) && !plan) return null;
  const resale = property.paymentType === 'resale';
  // The total split into what is paid now, the installments, yearly and handover payments (bar + legend)
  const parts = plan ? [
    { key: 'down', label: resale ? L('كاش للمالك', 'To seller') : L('المقدم', 'Down'), value: plan.down },
    { key: 'inst', label: L('الأقساط', 'Installments'), value: plan.installment ? plan.installment.amount * plan.installment.count : plan.monthly * plan.months + plan.quarterly * Math.floor(plan.months / 3) },
    { key: 'year', label: L('الدفعات السنوية', 'Yearly'), value: plan.yearly ? plan.yearly.amount * plan.yearly.count : 0 },
    { key: 'hand', label: L('الاستلام', 'Handover'), value: plan.handover },
    { key: 'rest', label: L('غير مجدول', 'Unscheduled'), value: plan.unscheduled }
  ].filter((x) => x.value > 0).map((x, _, all) => ({ ...x, share: (x.value / all.reduce((t, y) => t + y.value, 0)) * 100 })) : [];

  return (
    <section className="xs-fin" aria-labelledby="xs-fin-title">
      <header className="xs-fin-head">
        <span className="xs-fin-icon"><Receipt size={20} aria-hidden="true" /></span>
        <div>
          <h3 id="xs-fin-title">{L('التكلفة الكاملة للشراء', 'Full cost of buying')}</h3>
          <p>{L('السعر وكل مصروف إضافي، قبل ما تقرر.', 'The price and every extra cost, before you decide.')}</p>
        </div>
      </header>

      {/* 1. Cash — or 2. the installment plan set in CRM → طريقة السداد */}
      {plan ? (
        <>
          <div className="xs-fin-block">
            <h4><Wallet size={15} aria-hidden="true" /> {resale ? L('إعادة بيع: تدفع للمالك وتكمّل الأقساط', 'Resale: pay the seller, take over the installments') : L('خطة السداد', 'Payment plan')}</h4>
            {/* How the total splits: what is paid now, the installments, yearly and handover payments */}
            {parts.length > 1 && (
              <>
                <div className="xs-fin-bar" role="img" aria-label={parts.map((x) => `${x.label} ${pct(x.share)}`).join('، ')}>
                  {parts.map((x) => <span key={x.key} className={`is-${x.key}`} style={{ flexGrow: x.value }} />)}
                </div>
                <div className="xs-fin-legend">
                  {parts.map((x) => <span key={x.key}><i className={`is-${x.key}`} />{x.label} {pct(x.share)}</span>)}
                </div>
              </>
            )}
            <ol className="xs-fin-steps">
              <li>
                <span className="xs-fin-step-label">
                  <b>{resale ? L('المطلوب كاش للمالك', 'Cash to the seller') : L('المقدم', 'Down payment')}</b>
                  <small>{resale ? L('المدفوع + الأوفر، عند التعاقد', 'Paid + premium, at signing') : L('عند التعاقد', 'At signing')}</small>
                </span>
                {plan.down > 0 ? <Money value={plan.down} strong {...m} /> : <span className="xs-money">{L('بدون مقدم', 'None')}</span>}
              </li>
              {plan.installment && (
                <li>
                  <span className="xs-fin-step-label">
                    <b>{L(`القسط ال${everyLabel(plan.installment.every)}`, `Installment (${everyLabel(plan.installment.every, false)})`)}</b>
                    <small>{installmentsPhrase(plan.installment.count, plan.installment.every, isAr)}{L(` · المجموع ${fmt(plan.installment.amount * plan.installment.count)} ج.م`, ` · ${fmt(plan.installment.amount * plan.installment.count)} EGP in all`)}</small>
                  </span>
                  <Money value={plan.installment.amount} strong {...m} />
                </li>
              )}
              {plan.yearly && (
                <li>
                  <span className="xs-fin-step-label">
                    <b>{L('الدفعة السنوية', 'Yearly payment')}</b>
                    <small>{yearlyPhrase(plan.yearly.count, isAr)}{L(` · المجموع ${fmt(plan.yearly.amount * plan.yearly.count)} ج.م`, ` · ${fmt(plan.yearly.amount * plan.yearly.count)} EGP in all`)}</small>
                  </span>
                  <Money value={plan.yearly.amount} {...m} />
                </li>
              )}
              {plan.monthly > 0 && (
                <li>
                  <span className="xs-fin-step-label"><b>{L('القسط الشهري', 'Monthly installment')}</b><small>{L(`${plan.months} قسط`, `${plan.months} installments`)}</small></span>
                  <Money value={plan.monthly} strong {...m} />
                </li>
              )}
              {plan.quarterly > 0 && (
                <li><span className="xs-fin-step-label"><b>{L('القسط ربع السنوي', 'Quarterly installment')}</b></span><Money value={plan.quarterly} {...m} /></li>
              )}
              {plan.handover > 0 && (
                <li><span className="xs-fin-step-label"><b>{L('دفعة الاستلام', 'Handover payment')}</b><small>{L('عند استلام الوحدة', 'At handover')}</small></span><Money value={plan.handover} {...m} /></li>
              )}
              {plan.unscheduled > 0 && (
                <li><span className="xs-fin-step-label"><b>{L('رصيد غير مجدول', 'Unscheduled balance')}</b><small>{L('نؤكده كتابياً قبل الحجز', 'Confirmed in writing before reservation')}</small></span><Money value={plan.unscheduled} muted {...m} /></li>
              )}
            </ol>
          </div>
          <div className="xs-fin-total">
            <span>
              {L('إجمالي ما تدفعه', 'Total you pay')}
              {premiumPct >= 0.5 && <small>{L(`أعلى من الكاش بـ ${pct(premiumPct)}`, `${pct(premiumPct)} above cash`)}</small>}
            </span>
            <Money value={planTotal} strong {...m} />
          </div>
          {fb.cashPrice > 0 && fb.cashPrice < planTotal && Number(property.price) !== planTotal && (
            <p className="xs-fin-note"><Info size={13} aria-hidden="true" />{L(`ولو كاش: ${fmt(fb.cashPrice)} ج.م (توفّر ${fmt(planTotal - fb.cashPrice)} ج.م)`, `Or cash: ${fmt(fb.cashPrice)} EGP (saves ${fmt(planTotal - fb.cashPrice)} EGP)`)}</p>
          )}
        </>
      ) : (
      <div className="xs-fin-block">
        <h4><Wallet size={15} aria-hidden="true" /> {L('السداد كاش', 'Cash')}</h4>
        <Row label={L('سعر الكاش النهائي الصافي', 'Final net cash price')} hint={fb.cashDiscountPct > 0 ? L(`خصم ${pct(fb.cashDiscountPct)} على السعر المعلن`, `${pct(fb.cashDiscountPct)} off the listed price`) : null}>
          {fb.cashDiscountPct > 0 && <s className="xs-strike"><bdi>{fmt(fb.price)}</bdi></s>}
          <Money value={fb.cashPrice} strong {...m} />
        </Row>
      </div>
      )}

      {/* 3. Maintenance */}
      {fb.maintenance && (
        <div className="xs-fin-block">
          <h4><Wrench size={15} aria-hidden="true" /> {L('وديعة الصيانة', 'Maintenance deposit')}</h4>
          <Row label={L('القيمة', 'Amount')} hint={pct(fb.maintenance.pct)}><Money value={fb.maintenance.amount} {...m} /></Row>
          {(fb.maintenance.due_ar || fb.maintenance.due_en) && (
            <Row label={L('موعد التحصيل', 'Due')}><span className="xs-money">{isAr ? fb.maintenance.due_ar : (fb.maintenance.due_en || fb.maintenance.due_ar)}</span></Row>
          )}
        </div>
      )}

      {/* 4. Over-price (lottery / housing units in new Upper Egypt cities) */}
      {fb.overPrice && (
        <div className="xs-fin-block">
          <h4><Landmark size={15} aria-hidden="true" /> {L('الأوفر برايس والمدفوع لجهاز المدينة', 'Over-price & city authority payments')}</h4>
          {fb.overPrice.overPrice > 0 && <Row label={L('الأوفر برايس (للبائع)', 'Over-price (to the seller)')}><Money value={fb.overPrice.overPrice} {...m} /></Row>}
          {fb.overPrice.paidToAuthority > 0 && <Row label={L('المدفوع فعلياً لجهاز المدينة', 'Already paid to the city authority')}><Money value={fb.overPrice.paidToAuthority} {...m} /></Row>}
          {fb.overPrice.note_ar && <p className="xs-fin-note">{fb.overPrice.note_ar}</p>}
        </div>
      )}

      {/* 5. Indicative utilities & transfer */}
      {fb.fees && (
        <div className="xs-fin-block">
          <h4><FileText size={15} aria-hidden="true" /> {L('مراجعة سندات الملكية وتحرير العقود (استرشادي)', 'Title-deed review & contract drafting (indicative)')}</h4>
          {fb.fees.utilities > 0 && <Row label={L('المرافق والعدادات', 'Utilities & meters')}><Money value={fb.fees.utilities} {...m} /></Row>}
          {fb.fees.transfer > 0 && <Row label={L('مراجعة سندات الملكية وتحرير العقود', 'Title-deed review & contract drafting')}><Money value={fb.fees.transfer} {...m} /></Row>}
          {fb.fees.note_ar && <p className="xs-fin-note">{fb.fees.note_ar}</p>}
        </div>
      )}

      {hasExtras && !plan && (
        <div className="xs-fin-total">
          <span>{L('إجمالي ما تجهّزه للشراء كاش', 'All-in budget (cash route)')}</span>
          <Money value={fb.cashAllIn} strong {...m} />
        </div>
      )}

      <p className="xs-fin-foot">
        <Info size={13} aria-hidden="true" />
        {L(
          'الأرقام من بيانات العقار المسجلة لدى 1Line. أي بند غير مذكور هنا نؤكده لك كتابياً قبل الحجز، والتعاقد بالجنيه المصري.',
          'Figures come from the listing data held by 1Line. Anything not listed is confirmed in writing before reservation; contracts are in EGP.'
        )}
      </p>
    </section>
  );
}
