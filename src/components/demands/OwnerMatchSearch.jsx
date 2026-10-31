import { Search, CheckCircle2, Info } from 'lucide-react';
import AreaOptions from '../common/AreaOptions';
import { areaNameOf } from '../../utils/areaLookup';
import { DEMAND_CATEGORIES, requestsCountAr } from './demandCategories';
import ShareSellLink from '../common/ShareSellLink';
import './owner-match-search.css';

// The seller form's type for each request kind (src/components/sell/sellOptions.js)
const SELL_TYPE = { apartment: 'apartment', villa: 'villa', retail: 'retail', office: 'office', land: 'land', agricultural: 'agri_land', industrial: 'factory' };

/**
 * «عندك عقار للبيع؟»: an owner picks the type and area and sees how many published buyer
 * requests match, the grid below filtered to them. Changing a choice clears the old answer.
 */
export default function OwnerMatchSearch({ isAr, areas, search, onChange, result, onSearch, onShowAll, onListProperty }) {
  const L = (ar, en) => (isAr ? ar : en);
  const typeLabel = DEMAND_CATEGORIES.find((c) => c.id === search.type);
  const typeName = typeLabel ? (isAr ? typeLabel.label_ar : typeLabel.label_en) : L('كل الأنواع', 'All types');
  const areaName = search.area ? areaNameOf(search.area, areas, isAr) : L('كل المناطق', 'All areas');
  // What the answer is about, e.g. «شقق سكنية · سوهاج الجديدة»
  const what = `${typeName} · ${areaName}`;

  return (
    <section className="oms" aria-labelledby="oms-title">
      <h2 id="oms-title" className="oms-title">
        <Search size={19} aria-hidden="true" />
        <span>{L('عندك عقار للبيع؟ شوف مين بيدوّر على زيه', 'Selling? See who is looking for one like it')}</span>
      </h2>

      <form
        className="oms-form"
        onSubmit={(e) => { e.preventDefault(); onSearch(); }}
      >
        <label className="oms-field">
          <span>{L('نوع العقار', 'Property type')}</span>
          <select value={search.type} onChange={(e) => onChange({ ...search, type: e.target.value })}>
            <option value="">{L('أي نوع', 'Any type')}</option>
            {DEMAND_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{isAr ? c.single_ar : c.label_en}</option>
            ))}
          </select>
        </label>

        <label className="oms-field">
          <span>{L('المنطقة', 'Area')}</span>
          <select value={search.area} onChange={(e) => onChange({ ...search, area: e.target.value })}>
            <option value="">{L('أي منطقة', 'Any area')}</option>
            <AreaOptions areas={areas} isAr={isAr} />
          </select>
        </label>

        <button type="submit" className="btn btn-primary oms-submit">
          <Search size={17} aria-hidden="true" />
          <span>{L('دوّر على مشترين', 'Find buyers')}</span>
        </button>
      </form>

      <ShareSellLink isAr={isAr} type={SELL_TYPE[search.type] || ''} area={search.area} />

      {result !== null && (
        <div className={`oms-result ${result > 0 ? 'is-found' : 'is-empty'}`} role="status">
          <div className="oms-result-text">
            <strong>
              {result > 0 ? <CheckCircle2 size={18} aria-hidden="true" /> : <Info size={18} aria-hidden="true" />}
              <span>
                {result > 0
                  ? L(`لقينا ${requestsCountAr(result)}`, `${result} matching request${result > 1 ? 's' : ''} below`)
                  : L('مفيش طلبات مطابقة دلوقتي', 'No matching requests right now')}
              </span>
            </strong>
            <span className="oms-result-what">{what}</span>
            <p>
              {result > 0
                ? L('الطلبات تحت. سجّل عقارك وفريقنا يوصّله للمشترين دول مباشرة.', 'List your property and our team will take it to these buyers.')
                : L('سجّل عقارك ونكلمك أول ما ييجي مشتري مناسب، أو شوف كل الطلبات.', 'List your property and we will call you when a buyer fits, or see all requests.')}
            </p>
          </div>
          <div className="oms-result-actions">
            <button type="button" className="btn btn-primary" onClick={onListProperty}>{L('سجّل عقارك', 'List your property')}</button>
            <button type="button" className="btn btn-outline" onClick={onShowAll}>{L('كل الطلبات', 'All requests')}</button>
          </div>
        </div>
      )}
    </section>
  );
}
