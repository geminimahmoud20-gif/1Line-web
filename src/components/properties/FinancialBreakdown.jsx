import { Receipt, Wallet, CalendarClock, Wrench, Landmark, FileText, Info } from 'lucide-react';
import { computeFinanceBreakdown } from '../../utils/propertyInsights';
import { formatApprox } from '../../utils/fxRates';
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

  const plan = fb.plan;
  const parts = plan ? [
    { key: 'down', label: L('المقدم', 'Down payment'), value: plan.down, cls: 'is-down' },
    { key: 'inst', label: L('الأقساط', 'Installments'), value: plan.total - plan.down - plan.handover, cls: 'is-inst' },
    { key: 'hand', label: L('دفعة الاستلام', 'Handover'), value: plan.handover, cls: 'is-hand' }
  ].filter((p) => p.value > 0) : [];

  const hasExtras = fb.maintenance || fb.overPrice || fb.fees;

  return (
    <section className="xs-fin" aria-labelledby="xs-fin-title">
      <header className="xs-fin-head">
        <span className="xs-fin-icon"><Receipt size={20} aria-hidden="true" /></span>
        <div>
          <h3 id="xs-fin-title">{L('مصفوفة الشفافية المالية', 'Transparent cost breakdown')}</h3>
          <p>{L('كل جنيه هتدفعه، مقسّم بوضوح قبل ما تقرر.', 'Every pound you will pay, laid out before you decide.')}</p>
        </div>
      </header>

      {/* 1. Cash */}
      <div className="xs-fin-block">
        <h4><Wallet size={15} aria-hidden="true" /> {L('السداد كاش', 'Cash')}</h4>
        <Row label={L('سعر الكاش النهائي الصافي', 'Final net cash price')} hint={fb.cashDiscountPct > 0 ? L(`خصم ${pct(fb.cashDiscountPct)} على السعر المعلن`, `${pct(fb.cashDiscountPct)} off the listed price`) : null}>
          {fb.cashDiscountPct > 0 && <s className="xs-strike"><bdi>{fmt(fb.price)}</bdi></s>}
          <Money value={fb.cashPrice} strong {...m} />
        </Row>
      </div>

      {/* 2. Installment plan */}
      {plan && (
        <div className="xs-fin-block">
          <h4><CalendarClock size={15} aria-hidden="true" /> {L('نظام التقسيط التفصيلي', 'Installment plan')}</h4>
          <Row label={L('المقدم', 'Down payment')} hint={pct(plan.downPct)}><Money value={plan.down} {...m} /></Row>
          {plan.monthly > 0 && <Row label={L('القسط الشهري', 'Monthly installment')}><Money value={plan.monthly} {...m} /></Row>}
          {plan.quarterly > 0 && <Row label={L('القسط الربع سنوي', 'Quarterly installment')}><Money value={plan.quarterly} {...m} /></Row>}
          <Row label={L('فترة السداد', 'Term')}>
            <span className="xs-money"><span className="xs-money-main"><bdi>{plan.months}</bdi> <small>{L('شهر', 'months')}</small></span> <em>({plan.years} {L('سنوات', 'years')})</em></span>
          </Row>
          {plan.handover > 0 && <Row label={L('دفعة الاستلام', 'Handover payment')}><Money value={plan.handover} {...m} /></Row>}

          {parts.length > 1 && (
            <div className="xs-fin-bar" role="img" aria-label={parts.map((p) => `${p.label} ${pct((p.value / plan.total) * 100)}`).join('، ')}>
              {parts.map((p) => (
                <span key={p.key} className={p.cls} style={{ flexGrow: p.value }} title={`${p.label}: ${fmt(p.value)}`} />
              ))}
            </div>
          )}
          {parts.length > 1 && (
            <div className="xs-fin-legend">
              {parts.map((p) => (
                <span key={p.key}><i className={p.cls} />{p.label} <bdi>{pct((p.value / plan.total) * 100)}</bdi></span>
              ))}
            </div>
          )}

          {plan.incomplete ? (
            <p className="xs-fin-note xs-fin-note--warn">
              <Info size={13} aria-hidden="true" />
              {L(
                'مجموع الدفعات المسجلة أقل من سعر العقار، يعني جدول السداد هنا مختصر. اطلب الجدول الرسمي الكامل من المستشار قبل الحجز.',
                'The listed payments add up to less than the price, so this schedule is partial. Ask for the full official schedule before reserving.'
              )}
            </p>
          ) : (
            <Row label={L('إجمالي سعر التقسيط', 'Total installment price')}><Money value={plan.total} strong {...m} /></Row>
          )}
          {!plan.incomplete && plan.premiumOverCash > 0 && (
            <Row label={L('الفرق عن الكاش', 'Difference vs cash')} hint={L(`+${pct(plan.premiumPct)}`, `+${pct(plan.premiumPct)}`)}>
              <Money value={plan.premiumOverCash} muted {...m} />
            </Row>
          )}
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
          <h4><FileText size={15} aria-hidden="true" /> {L('المرافق ونقل الملكية (استرشادي)', 'Utilities & transfer (indicative)')}</h4>
          {fb.fees.utilities > 0 && <Row label={L('المرافق والعدادات', 'Utilities & meters')}><Money value={fb.fees.utilities} {...m} /></Row>}
          {fb.fees.transfer > 0 && <Row label={L('نقل الملكية والتسجيل', 'Transfer & registration')}><Money value={fb.fees.transfer} {...m} /></Row>}
          {fb.fees.note_ar && <p className="xs-fin-note">{fb.fees.note_ar}</p>}
        </div>
      )}

      {hasExtras && (
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
