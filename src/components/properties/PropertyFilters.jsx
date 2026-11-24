import { useState, useEffect } from 'react';
import { hasNoRooms } from '../../utils/propertyKinds';
import {
  Search, SlidersHorizontal, RotateCcw, X, Sparkles, ShieldCheck, FileCheck, Waves, PieChart,
  ChevronDown, ChevronUp, KeyRound, Check, Building2, MapPin, Wallet, BedDouble
} from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { getAreas } from '../../utils/areasData';
import './property-filters-mobile.css';
import { countLabel } from '../../utils/arabicCount';
import AreaOptions from '../common/AreaOptions';
import './PropertyFilters.app.css';

// "Any price" is the page's cap (PropertiesPage MAX_PRICE_CAP): no upper limit
const ANY_PRICE = 15000000;
const BUDGET_OPTIONS = [
  { value: ANY_PRICE, ar: 'أي ميزانية', en: 'Any budget' },
  ...[1, 2, 3, 5, 8, 12].map((m) => ({ value: m * 1000000, ar: `حتى ${m} ${m <= 10 && m > 2 ? 'ملايين' : 'مليون'}`, en: `Up to ${m}M EGP` }))
];

const SMART_FILTER_TAGS = [
  { id: 'nile_view', label_ar: 'إطلالة نيلية', label_en: 'Nile View', icon: Waves },
  { id: 'registered', label_ar: 'مسجل شهر عقاري', label_en: 'Registered Deed', icon: FileCheck },
  { id: 'licensed', label_ar: 'ترخيص ونموذج 10', label_en: 'Licensed Building', icon: ShieldCheck },
  { id: 'land_share', label_ar: 'حصة بالأرض', label_en: 'Land Share', icon: KeyRound },
  { id: 'investment', label_ar: 'مناسب للاستثمار', label_en: 'Investment', icon: PieChart },
];

export default function PropertyFilters({
  lang = 'ar',
  filters,
  onFilterChange,
  onResetFilters,
  totalResults,
  extra = null,
  extraActive = 0
}) {
  const [areas, setAreas] = useState(() => getAreas());
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Phones: filters fold behind one button so listings start right under the search box
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setAreas(getAreas());
    };
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

  const isAr = lang === 'ar';
  const advancedCount = (filters.smartTags || []).length
    + (filters.completionStatus && filters.completionStatus !== 'all' ? 1 : 0)
    + (filters.finishing && filters.finishing !== 'all' ? 1 : 0)
    + extraActive;

  const handleToggleTag = (tagId) => {
    const currentTags = filters.smartTags || [];
    const exists = currentTags.includes(tagId);
    const updated = exists
      ? currentTags.filter(t => t !== tagId)
      : [...currentTags, tagId];
    onFilterChange('smartTags', updated);
  };

  // Build active filter badges for the Active Chips bar
  const activeChips = (() => {
    const list = [];

    if (filters.query && filters.query.trim()) {
      list.push({
        id: 'query',
        label: `${isAr ? 'بحث:' : 'Search:'} "${filters.query}"`,
        onRemove: () => onFilterChange('query', '')
      });
    }

    if (filters.type && filters.type !== 'all') {
      const foundType = PROPERTY_TYPES.find(t => t.id === filters.type);
      list.push({
        id: 'type',
        label: foundType ? (isAr ? foundType.name_ar : foundType.name_en) : filters.type,
        onRemove: () => onFilterChange('type', 'all')
      });
    }

    if (filters.area && filters.area !== 'all') {
      const foundArea = areas.find(a => a.id === filters.area);
      list.push({
        id: 'area',
        label: foundArea ? (isAr ? (foundArea.name_ar || foundArea.label_ar) : (foundArea.name_en || foundArea.label_en)) : filters.area,
        onRemove: () => onFilterChange('area', 'all')
      });
    }

    if (filters.maxPrice && Number(filters.maxPrice) < 20000000 && Number(filters.maxPrice) !== 15000000) {
      list.push({
        id: 'maxPrice',
        label: `${isAr ? 'حتى' : 'Up to'} ${Number((Number(filters.maxPrice) / 1000000).toFixed(1))} ${isAr ? 'مليون ج.م' : 'M EGP'}`,
        onRemove: () => onFilterChange('maxPrice', ANY_PRICE)
      });
    }

    if (filters.bedrooms && filters.bedrooms !== 'all' && filters.bedrooms !== 'any' && !hasNoRooms(filters.type)) {
      list.push({
        id: 'bedrooms',
        label: countLabel('room', filters.bedrooms, isAr),
        onRemove: () => onFilterChange('bedrooms', 'all')
      });
    }

    if (filters.finishing && filters.finishing !== 'all') {
      list.push({
        id: 'finishing',
        label: filters.finishing === 'lux' ? (isAr ? 'متشطب' : 'Finished') : (isAr ? 'على الطوب / نص تشطيب' : 'Core & semi-finished'),
        onRemove: () => onFilterChange('finishing', 'all')
      });
    }

    if (filters.completionStatus && filters.completionStatus !== 'all') {
      list.push({
        id: 'completionStatus',
        label: filters.completionStatus === 'ready' ? (isAr ? 'استلام فوري' : 'Ready to Move') : (isAr ? 'تحت الإنشاء' : 'Under Construction'),
        onRemove: () => onFilterChange('completionStatus', 'all')
      });
    }

    if (filters.paymentPlan && filters.paymentPlan !== 'all') {
      list.push({
        id: 'paymentPlan',
        label: filters.paymentPlan === 'cash' ? (isAr ? 'كاش فوري' : 'Cash') : (isAr ? 'تقسيط' : 'Installments'),
        onRemove: () => onFilterChange('paymentPlan', 'all')
      });
    }

    if (filters.smartTags && filters.smartTags.length > 0) {
      filters.smartTags.forEach(tagId => {
        const found = SMART_FILTER_TAGS.find(t => t.id === tagId);
        if (found) {
          list.push({
            id: `tag-${tagId}`,
            label: isAr ? found.label_ar : found.label_en,
            onRemove: () => handleToggleTag(tagId)
          });
        }
      });
    }

    return list;
  })();

  const showBedrooms = !(hasNoRooms(filters.type) && filters.type !== 'office');

  return (
    <div className={`pbar-filters ${mobileOpen ? 'pf-open' : 'pf-folded'}`}>
      {/* Phones only: one toggle for all filters, with the active count */}
      <button
        type="button"
        className="pf-mobile-toggle"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
        <span>{isAr ? (mobileOpen ? 'إخفاء الفلاتر' : 'الفلاتر والتصفية') : (mobileOpen ? 'Hide filters' : 'Filters')}</span>
        {activeChips.length > 0 && <b className="pf-count">{activeChips.length}</b>}
        <span className="pf-results">{totalResults} {isAr ? 'عقار' : 'results'}</span>
        {mobileOpen ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
      </button>

      {/* One row: search + the filters people use most, with the two actions at the end */}
      <div className="pbar-filters-row">
        <div className="pbar-field pbar-field--search">
          <Search size={15} aria-hidden="true" />
          <input
            type="text"
            placeholder={isAr ? 'ابحث بالمنطقة، الشارع، أو نوع العقار...' : 'Search by area, street, or type...'}
            aria-label={isAr ? 'بحث بالاسم أو الكلمة الدلالية' : 'Keyword search'}
            value={filters.query || ''}
            onChange={(e) => onFilterChange('query', e.target.value)}
          />
          {filters.query && (
            <button
              type="button"
              className="pbar-field-clear"
              onClick={() => onFilterChange('query', '')}
              aria-label={isAr ? 'مسح النص' : 'Clear'}
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="pbar-field">
          <Building2 size={15} aria-hidden="true" />
          <select
            value={filters.type || 'all'}
            aria-label={isAr ? 'نوع العقار والقطاع' : 'Property type & sector'}
            onChange={(e) => {
              const newType = e.target.value;
              onFilterChange('type', newType);
              if (hasNoRooms(newType)) onFilterChange('bedrooms', 'all');
            }}
          >
            <option value="all">{isAr ? 'جميع العقارات والقطاعات' : 'All Types & Sectors'}</option>
            <optgroup label={isAr ? '🏡 القطاع السكني' : 'Residential Sector'}>
              <option value="apartment">{isAr ? 'شقق ودوبلكس سكنية' : 'Apartments & Duplex'}</option>
              <option value="villa">{isAr ? 'فيلات ومنازل مستقلة' : 'Villas & Townhouses'}</option>
            </optgroup>
            <optgroup label={isAr ? '🏬 القطاع التجاري (محلات ومعارض)' : 'Commercial Sector'}>
              <option value="commercial">{isAr ? 'محلات ومساحات تجارية' : 'Commercial Retail Shops'}</option>
            </optgroup>
            <optgroup label={isAr ? '🏢 القطاع الإداري (مكاتب وعيادات)' : 'Administrative Sector'}>
              <option value="office">{isAr ? 'مكاتب ومقرات إدارية وعيادات' : 'Admin Offices & Clinics'}</option>
            </optgroup>
            <optgroup label={isAr ? '📐 قطاع الأراضي والاستثمار' : 'Land & Plots'}>
              <option value="land">{isAr ? 'أراضي ومواقع استثمارية' : 'Investment Land Plots'}</option>
            </optgroup>
            <optgroup label={isAr ? '🌾 القطاع الزراعي' : 'Agricultural Sector'}>
              <option value="agri_land">{isAr ? 'أراضي زراعية' : 'Agricultural Land'}</option>
              <option value="farm">{isAr ? 'مزارع وحدائق فاكهة' : 'Farms & Orchards'}</option>
            </optgroup>
            <optgroup label={isAr ? '🏭 القطاع الصناعي' : 'Industrial Sector'}>
              <option value="factory">{isAr ? 'مصانع وورش' : 'Factories & Workshops'}</option>
              <option value="warehouse">{isAr ? 'مخازن ومستودعات' : 'Warehouses & Storage'}</option>
              <option value="industrial_land">{isAr ? 'أراضي صناعية' : 'Industrial Land'}</option>
            </optgroup>
          </select>
        </div>

        <div className="pbar-field">
          <MapPin size={15} aria-hidden="true" />
          <select value={filters.area || 'all'} aria-label={isAr ? 'المنطقة' : 'Location'} onChange={(e) => onFilterChange('area', e.target.value)}>
            <AreaOptions areas={areas} isAr={isAr} includeAll={areas.some((a) => a?.id === 'all')} />
          </select>
        </div>

        <div className="pbar-field">
          <Wallet size={15} aria-hidden="true" />
          <select
            value={BUDGET_OPTIONS.some((o) => o.value === Number(filters.maxPrice)) ? Number(filters.maxPrice) : ANY_PRICE}
            aria-label={isAr ? 'الميزانية' : 'Budget'}
            onChange={(e) => onFilterChange('maxPrice', Number(e.target.value))}
          >
            {BUDGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{isAr ? o.ar : o.en}</option>)}
          </select>
        </div>

        {showBedrooms && (
          <div className="pbar-field pbar-field--pills" role="group" aria-label={isAr ? 'عدد الغرف' : 'Bedrooms'}>
            <BedDouble size={15} aria-hidden="true" className="pbar-pills-icon" />
            {['all', '1', '2', '3', '4+'].map((beds) => {
              const active = filters.bedrooms === beds || ((!filters.bedrooms || filters.bedrooms === 'any') && beds === 'all');
              return (
                <button
                  key={beds}
                  type="button"
                  className={`pbar-pill ${active ? 'is-on' : ''}`}
                  aria-pressed={active}
                  onClick={() => onFilterChange('bedrooms', beds)}
                >
                  {beds === 'all' ? (isAr ? 'الكل' : 'All') : beds}
                </button>
              );
            })}
          </div>
        )}

        <div className="pbar-row-actions">
          <button type="button" className={`pbar-adv-btn ${showAdvanced ? 'is-on' : ''}`} onClick={() => setShowAdvanced((p) => !p)} aria-expanded={showAdvanced}>
            <SlidersHorizontal size={13} aria-hidden="true" />
            <span>{isAr ? (showAdvanced ? 'خيارات أقل' : 'فلاتر أكتر') : (showAdvanced ? 'Less' : 'More filters')}</span>
            {advancedCount > 0 && <b className="pf-count">{advancedCount}</b>}
          </button>
          <button type="button" className="pbar-reset-btn" onClick={onResetFilters} title={isAr ? 'إعادة ضبط كافة الفلاتر' : 'Reset all filters'}>
            <RotateCcw size={13} aria-hidden="true" />
            <span className="hide-mobile">{isAr ? 'إعادة ضبط' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* Advanced Secondary Filter Drawer */}
      {showAdvanced && (
        <div className="pbar-advanced">
          <div className="pbar-advanced-row">
            <div className="pbar-field">
              <select
                value={filters.completionStatus || 'all'}
                aria-label={isAr ? 'حالة الاستلام' : 'Delivery status'}
                onChange={(e) => onFilterChange('completionStatus', e.target.value)}
              >
                <option value="all">{isAr ? 'جميع حالات الاستلام' : 'All Delivery Statuses'}</option>
                <option value="ready">{isAr ? 'جاهز للاستلام الفوري' : 'Ready to Move'}</option>
                <option value="under_construction">{isAr ? 'تحت الإنشاء / تسليم لاحق' : 'Under Construction'}</option>
              </select>
            </div>

            <div className="pbar-field">
              <select
                value={filters.finishing || 'all'}
                aria-label={isAr ? 'مستوى التشطيب' : 'Finishing quality'}
                onChange={(e) => onFilterChange('finishing', e.target.value)}
              >
                <option value="all">{isAr ? 'كافة مستويات التشطيب' : 'All Finishing'}</option>
                <option value="lux">{isAr ? 'متشطب (كامل ولوكس وأعلى)' : 'Finished (full, lux and up)'}</option>
                <option value="core">{isAr ? 'على الطوب / نص تشطيب' : 'Core & semi-finished'}</option>
              </select>
            </div>
          </div>

          {/* Words in the listing text: a search aid, not a document check */}
          <div className="pbar-tags-row">
            <span className="pbar-tags-label">
              <Sparkles size={12} aria-hidden="true" />
              {isAr ? 'مذكور في الوصف:' : 'Mentioned in the listing:'}
            </span>
            <div className="pbar-tags-scroll">
              {SMART_FILTER_TAGS.map((tag) => {
                const isTagActive = (filters.smartTags || []).includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`pbar-tag ${isTagActive ? 'is-on' : ''}`}
                    aria-pressed={isTagActive}
                    onClick={() => handleToggleTag(tag.id)}
                  >
                    {isTagActive && <Check size={11} aria-hidden="true" />}
                    <span>{isAr ? tag.label_ar : tag.label_en}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {extra}
        </div>
      )}

      {/* Active Filter Chips Bar (Removable Pills) */}
      {activeChips.length > 0 && (
        <div className="pbar-chips">
          <span className="pbar-chips-label">{isAr ? 'الفلاتر المفعلة:' : 'Active filters:'}</span>
          <div className="pbar-chips-list">
            {activeChips.map((chip) => (
              <div key={chip.id} className="pbar-chip">
                <span>{chip.label}</span>
                <button
                  type="button"
                  className="pbar-chip-remove"
                  onClick={chip.onRemove}
                  title={isAr ? 'إلغاء هذا الفلتر' : 'Remove filter'}
                  aria-label={isAr ? 'إزالة الفلتر' : 'Remove filter'}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
