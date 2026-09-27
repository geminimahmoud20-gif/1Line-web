import { useState } from 'react';
import { Calculator, Timer, Percent, Scale, Info } from 'lucide-react';
import { computeRentalYield } from '../../utils/propertyInsights';
import { formatApprox } from '../../utils/fxRates';
import '../../styles/expat-suite.css';

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const one = (n) => (Math.round(n * 10) / 10).toLocaleString('en-US');

/**
 * Commercial rent calculator: monthly rent per m² → gross yield, cap rate and payback.
 * With a listing, price and size are fixed and the rent defaults to the CRM estimate (if any).
 */
export default function RentalYieldCalculator({ property = null, defaultRentPerSqm = 0, lang = 'ar', currency = 'EGP' }) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const [price, setPrice] = useState(property?.price || 3000000);
  const [size, setSize] = useState(property?.size || 60);
  const [rent, setRent] = useState(defaultRentPerSqm || '');
  const [occupancy, setOccupancy] = useState(90);
  const [opex, setOpex] = useState(10);

  const r = computeRentalYield({ price, size, rentPerSqm: rent, occupancyPct: occupancy, opexPct: opex });
  const fx = (v) => (currency !== 'EGP' ? formatApprox(v, currency, lang) : '');
  // Payback gauge: 20 years = empty, 5 years = full
  const gauge = r ? Math.max(4, Math.min(100, ((20 - r.paybackYears) / 15) * 100)) : 0;

  return (
    <div className="xs-yield">
      <div className="xs-yield-inputs">
        {!property && (
          <>
            <label className="xs-field">
              <span>{L('سعر الشراء', 'Purchase price')}</span>
              <div className="xs-input-suffix"><input type="number" min="0" step="50000" value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))} /><em>{L('ج.م', 'EGP')}</em></div>
            </label>
            <label className="xs-field">
              <span>{L('المساحة', 'Area')}</span>
              <div className="xs-input-suffix"><input type="number" min="1" value={size} onChange={(e) => setSize(Math.max(1, Number(e.target.value) || 1))} /><em>{L('م²', 'm²')}</em></div>
            </label>
          </>
        )}
        <label className="xs-field">
          <span>{L('الإيجار الشهري للمتر', 'Monthly rent per m²')}</span>
          <div className="xs-input-suffix"><input type="number" min="0" step="10" value={rent} placeholder={L('من إيجارات الشارع', 'street rents')} onChange={(e) => setRent(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0))} /><em>{L('ج.م/م²', 'EGP/m²')}</em></div>
        </label>
        <label className="xs-field">
          <span>{L('نسبة الإشغال', 'Occupancy')} <b>{occupancy}%</b></span>
          <input type="range" min="50" max="100" step="5" value={occupancy} onChange={(e) => setOccupancy(Number(e.target.value))} />
        </label>
        <label className="xs-field">
          <span>{L('مصاريف تشغيل وصيانة', 'Operating costs')} <b>{opex}%</b></span>
          <input type="range" min="0" max="40" step="1" value={opex} onChange={(e) => setOpex(Number(e.target.value))} />
        </label>
      </div>

      {r ? (
        <div className="xs-yield-out">
          <div className="xs-yield-kpi is-main">
            <span><Percent size={14} aria-hidden="true" /> {L('معدل الرسملة (Cap Rate)', 'Cap rate')}</span>
            <strong><bdi>{one(r.capRatePct)}%</bdi></strong>
            <small>{L(`العائد الإجمالي ${one(r.grossYieldPct)}%`, `Gross yield ${one(r.grossYieldPct)}%`)}</small>
          </div>
          <div className="xs-yield-kpi">
            <span><Timer size={14} aria-hidden="true" /> {L('استرداد رأس المال', 'Payback')}</span>
            <strong><bdi>{one(r.paybackYears)}</bdi> <small>{L('سنة', 'yrs')}</small></strong>
            <div className="xs-gauge" aria-hidden="true"><span style={{ width: `${gauge}%` }} /></div>
          </div>
          <div className="xs-yield-kpi">
            <span><Calculator size={14} aria-hidden="true" /> {L('صافي الدخل السنوي', 'Net annual income')}</span>
            <strong><bdi>{fmt(r.netAnnual)}</bdi> <small>{L('ج.م', 'EGP')}</small></strong>
            {fx(r.netAnnual) && <small><bdi>{fx(r.netAnnual)}</bdi></small>}
          </div>
          <div className="xs-yield-kpi">
            <span><Scale size={14} aria-hidden="true" /> {L('سعر المتر بيع ÷ إيجار', 'Sale ÷ rent per m²')}</span>
            <strong><bdi>{Math.round(r.rentMultiple)}</bdi> <small>{L('شهر', 'months')}</small></strong>
            <small>{L(`متر البيع ${fmt(r.salePerSqm)} ج.م`, `Sale ${fmt(r.salePerSqm)} EGP/m²`)}</small>
          </div>
        </div>
      ) : (
        <p className="xs-fin-note">{L('اكتب الإيجار الشهري المتوقع للمتر (من إيجارات فعلية في نفس الشارع) عشان نحسب العائد وفترة الاسترداد.', 'Enter the expected monthly rent per m² (from real rents on the street) to see yield and payback.')}</p>
      )}

      <p className="xs-fin-foot">
        <Info size={13} aria-hidden="true" />
        {L('حساب استرشادي قبل الضرائب وتكلفة التمويل. نراجع معك إيجارات مقارنة فعلية قبل القرار.', 'Indicative, before tax and financing costs. We review real comparable rents with you before you decide.')}
      </p>
    </div>
  );
}
