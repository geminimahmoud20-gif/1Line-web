import { useState, useEffect } from 'react';
import { hasNoRooms } from '../../utils/propertyKinds';
import { Search, SlidersHorizontal, RotateCcw, X, Sparkles, ShieldCheck, FileCheck, Waves, PieChart, ChevronDown, ChevronUp, KeyRound, Check } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { getAreas } from '../../utils/areasData';
import './property-filters-mobile.css';
import { countLabel } from '../../utils/arabicCount';

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
        label: filters.finishing === 'lux' ? (isAr ? 'تشطيب سوبر لوكس' : 'Super Lux') : (isAr ? 'نصف تشطيب' : 'Core & Shell'),
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

  return (
    <div className={`properties-filters-card luxury-filters-container compact-filters-card ${mobileOpen ? 'pf-open' : 'pf-folded'}`}>
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

      {/* Top Header Bar - Streamlined */}
      <div className="filter-header-bar compact-header-bar">
        <div className="filter-title-wrap">
          <div className="filter-title-icon-badge">
            <SlidersHorizontal size={16} />
          </div>
          <div className="filter-title-text-group">
            <h3 className="filter-main-title">{isAr ? 'ابحث وفلتر' : 'Search & filter'}</h3>
          </div>
        </div>

        <div className="filter-header-actions">
          <button
            type="button"
            className={`filter-toggle-adv-btn ${showAdvanced ? 'active' : ''}`}
            onClick={() => setShowAdvanced(prev => !prev)}
          >
            <span>{isAr ? (showAdvanced ? 'خيارات أقل' : 'فلاتر أكتر') : (showAdvanced ? 'Less Filters' : 'More Filters')}</span>
            {advancedCount > 0 && <b className="pf-count">{advancedCount}</b>}
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            type="button"
            className="filter-reset-btn"
            onClick={onResetFilters}
            title={isAr ? 'إعادة ضبط كافة الفلاتر' : 'Reset all filters'}
          >
            <RotateCcw size={13} />
            <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* Primary Filter Grid - Balanced Single-Height Row */}
      <div className="filter-grid-inputs compact-grid-inputs">
        {/* Search Keyword */}
        <div className="filter-item search-item">
          <label className="compact-label">{isAr ? 'بحث بالاسم أو الكلمة الدلالية' : 'Keyword Search'}</label>
          <div className="filter-input-with-icon">
            <Search size={15} />
            <input
              type="text"
              placeholder={isAr ? 'ابحث بالمنطقة، الشارع، أو نوع العقار...' : 'Search by area, street, or type...'}
              value={filters.query || ''}
              onChange={(e) => onFilterChange('query', e.target.value)}
            />
            {filters.query && (
              <button
                type="button"
                className="filter-clear-input-btn"
                onClick={() => onFilterChange('query', '')}
                aria-label="مسح النص"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Property Type */}
        {/* Property Type with Sector Grouping */}
        <div className="filter-item">
          <label className="compact-label">{isAr ? 'نوع العقار والقطاع' : 'Property Type & Sector'}</label>
          <select
            value={filters.type || 'all'}
            onChange={(e) => {
              const newType = e.target.value;
              onFilterChange('type', newType);
              if (hasNoRooms(newType)) {
                onFilterChange('bedrooms', 'all');
              }
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

        {/* Location / Area */}
        <div className="filter-item">
          <label className="compact-label">{isAr ? 'المنطقة' : 'Location'}</label>
          <select
            value={filters.area || 'all'}
            onChange={(e) => onFilterChange('area', e.target.value)}
          >
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {isAr ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}
              </option>
            ))}
          </select>
        </div>

        {/* Max budget: one list with the amounts written out ("حتى 2 مليون"), no slider */}
        <div className="filter-item">
          <label className="compact-label">{isAr ? 'الميزانية' : 'Budget'}</label>
          <select
            value={BUDGET_OPTIONS.some((o) => o.value === Number(filters.maxPrice)) ? Number(filters.maxPrice) : ANY_PRICE}
            onChange={(e) => onFilterChange('maxPrice', Number(e.target.value))}
          >
            {BUDGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{isAr ? o.ar : o.en}</option>)}
          </select>
        </div>

        {/* Bedrooms: only where rooms apply (not land, shops, farms, factories…) */}
        {!(hasNoRooms(filters.type) && filters.type !== 'office') && (
          <div className="filter-item bedrooms-filter-item">
            <label className="compact-label">{isAr ? 'عدد الغرف' : 'Bedrooms'}</label>
            <div className="bedroom-pills compact-bedroom-pills">
              {['all', '1', '2', '3', '4+'].map((beds) => (
                <button
                  key={beds}
                  type="button"
                  className={`bedroom-pill ${
                    (filters.bedrooms === beds || ((!filters.bedrooms || filters.bedrooms === 'any') && beds === 'all')) ? 'active' : ''
                  }`}
                  aria-pressed={filters.bedrooms === beds || ((!filters.bedrooms || filters.bedrooms === 'any') && beds === 'all')}
                  onClick={() => onFilterChange('bedrooms', beds)}
                >
                  {beds === 'all' ? (isAr ? 'الكل' : 'All') : beds}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Secondary Filter Drawer */}
      {showAdvanced && (
        <div className="filter-advanced-drawer compact-adv-drawer">
          <div className="filter-grid-inputs adv-grid">
            {/* Delivery / Completion Status */}
            <div className="filter-item">
              <label className="compact-label">{isAr ? 'حالة الاستلام' : 'Delivery Status'}</label>
              <select
                value={filters.completionStatus || 'all'}
                onChange={(e) => onFilterChange('completionStatus', e.target.value)}
              >
                <option value="all">{isAr ? 'جميع الحالات' : 'All Delivery Statuses'}</option>
                <option value="ready">{isAr ? 'جاهز للاستلام الفوري' : 'Ready to Move'}</option>
                <option value="under_construction">{isAr ? 'تحت الإنشاء / تسليم لاحق' : 'Under Construction'}</option>
              </select>
            </div>

            {/* Finishing Type */}
            <div className="filter-item">
              <label className="compact-label">{isAr ? 'مستوى التشطيب' : 'Finishing Quality'}</label>
              <select
                value={filters.finishing || 'all'}
                onChange={(e) => onFilterChange('finishing', e.target.value)}
              >
                <option value="all">{isAr ? 'كافة مستويات التشطيب' : 'All Finishing'}</option>
                <option value="lux">{isAr ? 'ألترا سوبر لوكس / كامل' : 'Ultra Super Lux'}</option>
                <option value="core">{isAr ? 'نصف تشطيب / محارة' : 'Core & Shell'}</option>
              </select>
            </div>

          </div>

          {/* Words in the listing text: a search aid, not a document check */}
          <div className="toolbar-row toolbar-tags-row">
            <span className="toolbar-section-label">
              <Sparkles size={12} className="text-gold" />
              {isAr ? 'مذكور في الوصف:' : 'Mentioned in the listing:'}
            </span>
            <div className="toolbar-pills-scroll">
              {SMART_FILTER_TAGS.map((tag) => {
                const isTagActive = (filters.smartTags || []).includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`smart-tag-pill compact-smart-tag ${isTagActive ? 'active' : ''}`}
                    aria-pressed={isTagActive}
                    onClick={() => handleToggleTag(tag.id)}
                  >
                    {isTagActive && <Check size={11} className="tag-check" />}
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
        <div className="filter-active-chips-bar compact-active-chips">
          <span className="active-chips-title">{isAr ? 'الفلاتر المفعلة:' : 'Active Filters:'}</span>
          <div className="active-chips-list">
            {activeChips.map((chip) => (
              <div key={chip.id} className="active-filter-chip compact-active-chip">
                <span>{chip.label}</span>
                <button
                  type="button"
                  className="chip-remove-btn"
                  onClick={chip.onRemove}
                  title={isAr ? 'إلغاء هذا الفلتر' : 'Remove filter'}
                  aria-label="إزالة الفلتر"
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
