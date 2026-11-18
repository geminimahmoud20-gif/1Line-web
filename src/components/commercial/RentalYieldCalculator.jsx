import { useState } from 'react';
import { Calculator, Timer, Percent, Scale, Info, AlertTriangle } from 'lucide-react';
import { computeRentalYield, yieldSanity } from '../../utils/propertyInsights';
import { formatApprox } from '../../utils/fxRates';
import '../../styles/expat-suite.css';

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const one = (n) => (Math.round(n * 10) / 10).toLocaleString('en-US');

/**
 * Commercial rent calculator: monthly rent → gross yield, net yield (cap rate) and payback.
 * The rent is typed for the whole unit by default (that is how owners quote it); «للمتر» switches
 * to rent per m². With a listing, price and size are fixed and the rent defaults to the CRM estimate.
 */
export default function RentalYieldCalculator({ property = null, defaultRentPerSqm = 0, lang = 'ar', currency = 'EGP' }) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const [price, setPrice] = useState(property?.price || 3000000);
  const [size, setSize] = useState(property?.size || 60);
  // 'unit' = the whole shop's monthly rent, 'sqm' = rent per m². A CRM estimate is per m².
  const [rentMode, setRentMode] = useState(defaultRentPerSqm ? 'sqm' : 'unit');
  const [rent, setRent] = useState(defaultRentPerSqm || '');
  const [occupancy, setOccupancy] = useState(90);
  const [opex, setOpex] = useState(10);

  const rentPerSqm = rent === '' ? 0 : (rentMode === 'unit' ? Number(rent) / (Number(size) || 1) : Number(rent));
  const r = computeRentalYield({ price, size, rentPerSqm, occupancyPct: occupancy, opexPct: opex });
  const sanity = yieldSanity(r);
  // Switching the unit converts the typed number so the result doesn't jump
  const switchMode = (mode) => {
    if (mode === rentMode) return;
    if (rent !== '') {
      const s = Number(size) || 1;
      setRent(Math.round(mode === 'unit' ? Number(rent) * s : Number(rent) / s));
    }
    setRentMode(mode);
  };
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
        <div className="xs-field">
          <span>{L('الإيجار الشهري المتوقع', 'Expected monthly rent')}</span>
          <div className="xs-seg" role="group" aria-label={L('الإيجار محسوب', 'Rent is for')}>
            <button type="button" className={rentMode === 'unit' ? 'is-on' : ''} aria-pressed={rentMode === 'unit'} onClick={() => switchMode('unit')}>{L('للوحدة كلها', 'Whole unit')}</button>
            <button type="button" className={rentMode === 'sqm' ? 'is-on' : ''} aria-pressed={rentMode === 'sqm'} onClick={() => switchMode('sqm')}>{L('للمتر', 'Per m²')}</button>
          </div>
          <div className="xs-input-suffix">
            <input
              type="number"
              min="0"
              step={rentMode === 'unit' ? 500 : 10}
              inputMode="numeric"
              aria-label={rentMode === 'unit' ? L('الإيجار الشهري للوحدة كلها', 'Monthly rent, whole unit') : L('الإيجار الشهري للمتر', 'Monthly rent per m²')}
              value={rent}
              placeholder={rentMode === 'unit' ? L('مثال: 15000', 'e.g. 15000') : L('مثال: 250', 'e.g. 250')}
              onChange={(e) => setRent(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0))}
            />
            <em>{rentMode === 'unit' ? L('ج.م/شهر', 'EGP/month') : L('ج.م/م²', 'EGP/m²')}</em>
          </div>
          {rent !== '' && Number(rent) > 0 && (
            <small className="xs-field-hint">
              {rentMode === 'unit'
                ? L(`يعني ${fmt(rentPerSqm)} ج.م للمتر في الشهر`, `= ${fmt(rentPerSqm)} EGP per m² a month`)
                : L(`يعني ${fmt(rentPerSqm * (Number(size) || 0))} ج.م للوحدة كلها في الشهر`, `= ${fmt(rentPerSqm * (Number(size) || 0))} EGP a month for the unit`)}
            </small>
          )}
        </div>
        <label className="xs-field">
          <span>{L('نسبة الإشغال', 'Occupancy')} <b>{occupancy}%</b></span>
          <input type="range" min="50" max="100" step="5" value={occupancy} onChange={(e) => setOccupancy(Number(e.target.value))} />
        </label>
        <label className="xs-field">
          <span>{L('مصاريف تشغيل وصيانة', 'Operating costs')} <b>{opex}%</b></span>
          <input type="range" min="0" max="40" step="1" value={opex} onChange={(e) => setOpex(Number(e.target.value))} />
        </label>
      </div>

      {sanity && (
        <p className="xs-yield-warn" role="alert">
          <AlertTriangle size={15} aria-hidden="true" />
          {sanity === 'high'
            ? L(`الإيجار ده بيرجّع ${one(r.grossYieldPct)}% من سعر الشراء في السنة، والطبيعي للمحلات والمكاتب حوالي 6–15%. اتأكد إنك كاتب الإيجار ${rentMode === 'sqm' ? 'للمتر مش للمحل كله' : 'للمحل كله في الشهر'}.`, `This rent returns ${one(r.grossYieldPct)}% of the price a year; shops and offices usually return 6–15%. Check the rent and whether it is per m² or for the whole unit.`)
            : L(`العائد ${one(r.grossYieldPct)}% في السنة، أقل بكتير من الطبيعي (6–15%). اتأكد من الإيجار وسعر الشراء.`, `The yield is ${one(r.grossYieldPct)}% a year, far below the usual 6–15%. Check the rent and price.`)}
        </p>
      )}

      {r ? (
        <div className="xs-yield-out">
          <div className="xs-yield-kpi is-main">
            <span><Percent size={14} aria-hidden="true" /> {L('صافي العائد السنوي', 'Net yield (cap rate)')}</span>
            <strong><bdi>{one(r.capRatePct)}%</bdi></strong>
            <small>{L(`العائد الإجمالي ${one(r.grossYieldPct)}%`, `Gross yield ${one(r.grossYieldPct)}%`)}</small>
          </div>
          <div className="xs-yield-kpi">
            <span><Timer size={14} aria-hidden="true" /> {L('استرداد رأس المال', 'Payback')}</span>
            {r.paybackYears < 2
              ? <strong><bdi>{Math.max(1, Math.round(r.paybackYears * 12))}</bdi> <small>{L('شهر', 'months')}</small></strong>
              : <strong><bdi>{one(r.paybackYears)}</bdi> <small>{L('سنة', 'yrs')}</small></strong>}
            <div className="xs-gauge" aria-hidden="true"><span style={{ width: `${gauge}%` }} /></div>
          </div>
          <div className="xs-yield-kpi">
            <span><Calculator size={14} aria-hidden="true" /> {L('صافي الدخل السنوي', 'Net annual income')}</span>
            <strong><bdi>{fmt(r.netAnnual)}</bdi> <small>{L('ج.م', 'EGP')}</small></strong>
            {fx(r.netAnnual) && <small><bdi>{fx(r.netAnnual)}</bdi></small>}
          </div>
          <div className="xs-yield-kpi">
            <span><Scale size={14} aria-hidden="true" /> {L('سعر الشراء يساوي إيجار', 'Price equals rent of')}</span>
            <strong><bdi>{Math.round(r.rentMultiple)}</bdi> <small>{L('شهر', 'months')}</small></strong>
            <small>{L(`متر البيع ${fmt(r.salePerSqm)} ج.م`, `Sale ${fmt(r.salePerSqm)} EGP/m²`)}</small>
          </div>
        </div>
      ) : (
        <p className="xs-fin-note">{L('اكتب الإيجار الشهري المتوقع (من إيجارات فعلية في نفس الشارع) عشان نحسب العائد وفترة الاسترداد.', 'Enter the expected monthly rent (from real rents on the street) to see yield and payback.')}</p>
      )}

      <p className="xs-fin-foot">
        <Info size={13} aria-hidden="true" />
        {L('حساب استرشادي قبل الضرائب وتكلفة التمويل. نراجع معك إيجارات مقارنة فعلية قبل القرار.', 'Indicative, before tax and financing costs. We review real comparable rents with you before you decide.')}
      </p>
    </div>
  );
}
