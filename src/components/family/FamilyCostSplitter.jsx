import { useMemo, useState } from 'react';
import { Users, Minus, Plus, Home, TrendingUp, Info } from 'lucide-react';
import { splitFamilyCost, computeFinanceBreakdown } from '../../utils/propertyInsights';
import { formatApprox } from '../../utils/fxRates';
import '../../styles/expat-suite.css';

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));


/**
 * حاسبة بيت العيلة: split the down payment and installments between siblings,
 * plus a mini rental study for the units the family won't live in.
 * With a listing it uses the listing's real plan; without one the visitor enters a price.
 */
export default function FamilyCostSplitter({ property = null, lang = 'ar', currency = 'EGP', compact = false }) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);

  const fb = property ? computeFinanceBreakdown(property) : null;
  const [price, setPrice] = useState(property ? fb?.cashPrice || 0 : 6000000);
  const [downPct, setDownPct] = useState(property?.downPayment && property?.price ? Math.round((property.downPayment / property.price) * 100) : 25);
  const [years, setYears] = useState(Number(property?.installmentYears) || 5);

  const [members, setMembers] = useState(3);
  const [mode, setMode] = useState('equal');
  const [shares, setShares] = useState([34, 33, 33]);

  const totalUnits = Number(property?.family?.units) || 0;
  const [units, setUnits] = useState(totalUnits || 4);
  const [rentPerUnit, setRentPerUnit] = useState('');

  // Plan: the listing's own plan when present, otherwise a simple interest-free estimate
  const plan = useMemo(() => {
    if (fb?.plan) return { down: fb.plan.down, monthly: fb.plan.monthly + fb.plan.quarterly / 3, months: fb.plan.months, source: 'listing' };
    const P = Number(price) || 0;
    const down = P * clamp(downPct, 0, 100) / 100;
    const months = clamp(years, 1, 15) * 12;
    return { down, monthly: (P - down) / months, months, source: 'estimate' };
  }, [fb, price, downPct, years]);

  const effectiveShares = mode === 'equal' ? Array.from({ length: members }, () => 100 / members) : shares.slice(0, members);
  const split = splitFamilyCost({ down: plan.down, monthly: plan.monthly, cashPrice: fb?.cashPrice || Number(price) || 0 }, effectiveShares);
  const sharesSum = Math.round(effectiveShares.reduce((s, v) => s + (Number(v) || 0), 0));

  const setMemberCount = (n) => {
    const next = clamp(n, 2, 8);
    setMembers(next);
    const even = Math.floor(100 / next);
    setShares(Array.from({ length: next }, (_, i) => (i === 0 ? 100 - even * (next - 1) : even)));
  };

  const rentedUnits = Math.max(0, units - members);
  const monthlyRent = rentedUnits * (Number(rentPerUnit) || 0);
  const coverPct = plan.monthly > 0 ? (monthlyRent / plan.monthly) * 100 : 0;
  const basePrice = fb?.cashPrice || Number(price) || 0;
  const grossYield = basePrice ? (monthlyRent * 12 / basePrice) * 100 : 0;

  const fx = (v) => (currency !== 'EGP' ? formatApprox(v, currency, lang) : '');

  return (
    <div className={`xs-fam ${compact ? 'xs-fam--compact' : ''}`}>
      {!property && (
        <div className="xs-fam-inputs">
          <label className="xs-field">
            <span>{L('سعر العقار', 'Property price')}</span>
            <div className="xs-input-suffix"><input type="number" min="0" step="50000" value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))} /><em>{L('ج.م', 'EGP')}</em></div>
          </label>
          <label className="xs-field">
            <span>{L('نسبة المقدم', 'Down payment')}</span>
            <div className="xs-input-suffix"><input type="number" min="0" max="100" value={downPct} onChange={(e) => setDownPct(clamp(Number(e.target.value) || 0, 0, 100))} /><em>%</em></div>
          </label>
          <label className="xs-field">
            <span>{L('سنوات التقسيط', 'Years')}</span>
            <div className="xs-input-suffix"><input type="number" min="1" max="15" value={years} onChange={(e) => setYears(clamp(Number(e.target.value) || 1, 1, 15))} /><em>{L('سنة', 'yrs')}</em></div>
          </label>
        </div>
      )}

      <div className="xs-fam-controls">
        <div className="xs-stepper" aria-label={L('عدد أفراد العيلة المشاركين', 'Family members sharing')}>
          <span><Users size={15} aria-hidden="true" /> {L('عدد المشاركين', 'Members')}</span>
          <button type="button" onClick={() => setMemberCount(members - 1)} aria-label={L('أقل', 'Fewer')} disabled={members <= 2}><Minus size={14} /></button>
          <strong aria-live="polite">{members}</strong>
          <button type="button" onClick={() => setMemberCount(members + 1)} aria-label={L('أكثر', 'More')} disabled={members >= 8}><Plus size={14} /></button>
        </div>
        <div className="xs-seg" role="radiogroup" aria-label={L('طريقة التوزيع', 'Split method')}>
          <button type="button" role="radio" aria-checked={mode === 'equal'} className={mode === 'equal' ? 'is-on' : ''} onClick={() => setMode('equal')}>{L('بالتساوي', 'Equal')}</button>
          <button type="button" role="radio" aria-checked={mode === 'custom'} className={mode === 'custom' ? 'is-on' : ''} onClick={() => setMode('custom')}>{L('نسب مختلفة', 'Custom %')}</button>
        </div>
      </div>

      <ul className="xs-fam-list">
        {split.map((s, i) => (
          <li key={i} className="xs-fam-member" style={{ '--share': `${s.share}%` }}>
            <div className="xs-fam-member-head">
              <span className="xs-fam-avatar" aria-hidden="true">{i + 1}</span>
              <strong>{isAr ? `الفرد ${i + 1}` : `Member ${i + 1}`}</strong>
              {mode === 'custom' ? (
                <label className="xs-fam-share">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={shares[i] ?? 0}
                    onChange={(e) => setShares((arr) => { const next = [...arr]; next[i] = clamp(Number(e.target.value) || 0, 0, 100); return next; })}
                    aria-label={L(`نسبة الفرد ${i + 1}`, `Member ${i + 1} share`)}
                  />
                  <em>%</em>
                </label>
              ) : (
                <span className="xs-fam-pct"><bdi>{Math.round(s.share)}%</bdi></span>
              )}
            </div>
            <div className="xs-fam-bar"><span /></div>
            <div className="xs-fam-nums">
              <span>{L('المقدم', 'Down')} <b><bdi>{fmt(s.down)}</bdi></b>{fx(s.down) && <em><bdi>{fx(s.down)}</bdi></em>}</span>
              <span>{L('شهرياً', 'Monthly')} <b><bdi>{fmt(s.monthly)}</bdi></b>{fx(s.monthly) && <em><bdi>{fx(s.monthly)}</bdi></em>}</span>
            </div>
          </li>
        ))}
      </ul>
      {mode === 'custom' && sharesSum !== 100 && (
        <p className="xs-warn-line">{L(`مجموع النسب ${sharesSum}% — الحساب بيوزّع على أساس النسبة من المجموع.`, `Shares total ${sharesSum}% — amounts are scaled proportionally.`)}</p>
      )}

      {/* Mini rental study */}
      <div className="xs-fam-rent">
        <h4><Home size={15} aria-hidden="true" /> {L('دراسة جدوى مصغرة: إيجار الوحدات الزيادة', 'Mini study: renting the spare units')}</h4>
        <div className="xs-fam-inputs">
          <label className="xs-field">
            <span>{L('إجمالي الوحدات', 'Total units')}</span>
            <input type="number" min="1" max="60" value={units} onChange={(e) => setUnits(clamp(Number(e.target.value) || 1, 1, 60))} />
          </label>
          <label className="xs-field">
            <span>{L('إيجار الوحدة شهرياً', 'Rent per unit / month')}</span>
            <div className="xs-input-suffix"><input type="number" min="0" step="250" placeholder={L('من إيجارات المنطقة', 'from local rents')} value={rentPerUnit} onChange={(e) => setRentPerUnit(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0))} /><em>{L('ج.م', 'EGP')}</em></div>
          </label>
        </div>
        {rentedUnits === 0 ? (
          <p className="xs-fin-note">{L('كل الوحدات هتسكنها العيلة — مفيش وحدات للإيجار.', 'Every unit is used by the family — none left to rent.')}</p>
        ) : !rentPerUnit ? (
          <p className="xs-fin-note">{L(`هيتبقى ${rentedUnits} وحدة للإيجار — اكتب الإيجار المتوقع للوحدة عشان نحسب العائد.`, `${rentedUnits} units left to rent — enter the expected rent to see the yield.`)}</p>
        ) : (
          <div className="xs-fam-kpis">
            <div><span>{L('دخل الإيجار الشهري', 'Monthly rent income')}</span><strong><bdi>{fmt(monthlyRent)}</bdi> {L('ج.م', 'EGP')}</strong></div>
            <div><span>{L('يغطي من القسط الشهري', 'Covers of the installment')}</span><strong><bdi>{Math.round(coverPct)}%</bdi></strong></div>
            <div><span>{L('العائد السنوي على السعر', 'Gross annual yield')}</span><strong><TrendingUp size={14} aria-hidden="true" /> <bdi>{(Math.round(grossYield * 10) / 10).toLocaleString('en-US')}%</bdi></strong></div>
          </div>
        )}
      </div>

      <p className="xs-fin-foot">
        <Info size={13} aria-hidden="true" />
        {plan.source === 'listing'
          ? L('الأرقام من نظام السداد المسجل لهذا العقار. التوزيع بين الأفراد اتفاق عائلي، والتعاقد يكون باسم من تختارونه.', 'Figures use this listing\'s payment plan. The split is a family arrangement; the contract is in the names you choose.')
          : L('تقدير تقسيط مباشر بدون فوائد للتوضيح فقط — نظام السداد الفعلي يختلف حسب العقار.', 'Interest-free estimate for illustration — actual plans vary by property.')}
      </p>
    </div>
  );
}
