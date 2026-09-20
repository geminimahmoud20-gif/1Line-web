import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  RotateCcw, 
  X, 
  Sparkles, 
  ShieldCheck, 
  FileCheck, 
  Waves, 
  PieChart, 
  ChevronDown, 
  ChevronUp,
  CreditCard,
  KeyRound,
  Check
} from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { getAreas } from '../../utils/areasData';

export const SMART_FILTER_TAGS = [
  { id: 'nile_view', label_ar: 'إطلالة نيلية 🌊', label_en: 'Nile View 🌊', icon: Waves },
  { id: 'registered', label_ar: 'مسجل شهر عقاري 📜', label_en: 'Registered Deed 📜', icon: FileCheck },
  { id: 'licensed', label_ar: 'ترخيص ونموذج 10 🏗️', label_en: 'Licensed Building 🏗️', icon: ShieldCheck },
  { id: 'land_share', label_ar: 'حصة بالأرض 💎', label_en: 'Land Share 💎', icon: KeyRound },
  { id: 'investment', label_ar: 'عائد استثماري مرتفع 📈', label_en: 'High ROI 📈', icon: PieChart },
];

export default function PropertyFilters({
  lang = 'ar',
  filters,
  onFilterChange,
  onResetFilters,
  totalResults
}) {
  const [areas, setAreas] = useState(() => getAreas());
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setAreas(getAreas());
    };
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

  const isAr = lang === 'ar';

  const handleToggleTag = (tagId) => {
    const currentTags = filters.smartTags || [];
    const exists = currentTags.includes(tagId);
    const updated = exists 
      ? currentTags.filter(t => t !== tagId) 
      : [...currentTags, tagId];
    onFilterChange('smartTags', updated);
  };

  // Build active filter badges for the Active Chips bar
  const activeChips = useMemo(() => {
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
        label: `${isAr ? 'حتى' : 'Up to'} ${(Number(filters.maxPrice) / 1000000).toFixed(1)} ${isAr ? 'مليون ج.م' : 'M EGP'}`,
        onRemove: () => onFilterChange('maxPrice', 20000000)
      });
    }

    if (filters.bedrooms && filters.bedrooms !== 'all' && filters.bedrooms !== 'any') {
      list.push({
        id: 'bedrooms',
        label: `${filters.bedrooms} ${isAr ? 'غرف' : 'Beds'}`,
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
  }, [filters, areas, isAr]);

  return (
    <div className="properties-filters-card luxury-filters-container compact-filters-card">
      {/* Top Header Bar - Streamlined */}
      <div className="filter-header-bar compact-header-bar">
        <div className="filter-title-wrap">
          <div className="filter-title-icon-badge">
            <SlidersHorizontal size={16} />
          </div>
          <div className="filter-title-text-group">
            <h3 className="filter-main-title">{isAr ? 'محرك البحث والتصفية العقارية' : 'Smart Property Search Engine'}</h3>
            <span className="results-count-badge filter-inline-badge">
              <Sparkles size={12} className="text-gold" />
              {totalResults} {isAr ? 'عقار معتمد متاح' : 'Verified properties'}
            </span>
          </div>
        </div>

        <div className="filter-header-actions">
          <button
            type="button"
            className={`filter-toggle-adv-btn ${showAdvanced ? 'active' : ''}`}
            onClick={() => setShowAdvanced(prev => !prev)}
          >
            <span>{isAr ? (showAdvanced ? 'خيارات أقل' : 'فلاتر متقدمة إضافية') : (showAdvanced ? 'Less Filters' : 'More Filters')}</span>
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
                aria-label="Clear input"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Property Type */}
        <div className="filter-item">
          <label className="compact-label">{isAr ? 'نوع العقار' : 'Property Type'}</label>
          <select
            value={filters.type || 'all'}
            onChange={(e) => onFilterChange('type', e.target.value)}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {isAr ? t.name_ar : t.name_en}
              </option>
            ))}
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

        {/* Max Budget Range with Non-Wrapping 4-Col Grid Presets */}
        <div className="filter-item budget-filter-item">
          <div className="filter-label-flex">
            <label className="compact-label">{isAr ? 'الحد الأقصى للميزانية' : 'Max Budget'}</label>
            <span className="price-tag-value">
              {filters.maxPrice ? (Number(filters.maxPrice) >= 20000000 ? (isAr ? 'أي سعر' : 'Any') : `${(Number(filters.maxPrice) / 1000000).toFixed(Number(filters.maxPrice) % 1000000 === 0 ? 0 : 1)} ${isAr ? 'م ج.م' : 'M EGP'}`) : (isAr ? '15 م ج.م' : '15M EGP')}
            </span>
          </div>
          <div className="budget-slider-wrap compact-budget-wrap">
            <input
              type="range"
              min="500000"
              max="20000000"
              step="250000"
              value={filters.maxPrice || 15000000}
              onChange={(e) => onFilterChange('maxPrice', e.target.value)}
              className="range-slider compact-range-slider"
            />
            {/* Quick Price Shortcuts - Guaranteed 4 Equal Columns, Zero Wrap */}
            <div className="quick-price-pills-grid">
              <button 
                type="button" 
                className={`price-mini-pill ${filters.maxPrice == 2000000 ? 'active' : ''}`}
                onClick={() => onFilterChange('maxPrice', 2000000)}
              >
                {isAr ? 'حتى 2م' : '≤ 2M'}
              </button>
              <button 
                type="button" 
                className={`price-mini-pill ${filters.maxPrice == 4000000 ? 'active' : ''}`}
                onClick={() => onFilterChange('maxPrice', 4000000)}
              >
                {isAr ? 'حتى 4م' : '≤ 4M'}
              </button>
              <button 
                type="button" 
                className={`price-mini-pill ${filters.maxPrice == 8000000 ? 'active' : ''}`}
                onClick={() => onFilterChange('maxPrice', 8000000)}
              >
                {isAr ? 'حتى 8م' : '≤ 8M'}
              </button>
              <button 
                type="button" 
                className={`price-mini-pill ${!filters.maxPrice || filters.maxPrice == 20000000 || filters.maxPrice == 15000000 ? 'active' : ''}`}
                onClick={() => onFilterChange('maxPrice', 20000000)}
              >
                {isAr ? 'الكل' : 'Any'}
              </button>
            </div>
          </div>
        </div>

        {/* Bedrooms Count */}
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
                onClick={() => onFilterChange('bedrooms', beds)}
              >
                {beds === 'all' ? (isAr ? 'الكل' : 'All') : beds}
              </button>
            ))}
          </div>
        </div>
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

            {/* Payment Scheme */}
            <div className="filter-item">
              <label className="compact-label">{isAr ? 'نظام الدفع' : 'Payment Plan'}</label>
              <select
                value={filters.paymentPlan || 'all'}
                onChange={(e) => onFilterChange('paymentPlan', e.target.value)}
              >
                <option value="all">{isAr ? 'كاش أو تقسيط' : 'Cash or Installments'}</option>
                <option value="installments">{isAr ? 'تقسيط فقط' : 'Installments Only'}</option>
                <option value="cash">{isAr ? 'كاش فقط' : 'Cash Only'}</option>
              </select>
            </div>

            {/* Installment Years (Visible when installments chosen or all) */}
            {filters.paymentPlan !== 'cash' && (
              <div className="filter-item">
                <label className="compact-label">{isAr ? 'فترة التقسيط المتاحة' : 'Installment Period'}</label>
                <select
                  value={filters.maxInstallmentYears || 'all'}
                  onChange={(e) => onFilterChange('maxInstallmentYears', e.target.value)}
                >
                  <option value="all">{isAr ? 'أي مدة تقسيط' : 'Any Years'}</option>
                  <option value="3">{isAr ? 'حتى 3 سنوات' : 'Up to 3 Years'}</option>
                  <option value="5">{isAr ? 'حتى 5 سنوات' : 'Up to 5 Years'}</option>
                  <option value="7">{isAr ? '7 سنوات فأكثر' : '7+ Years'}</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🚀 Quick Unified Toolbar (دمج المناطق والمميزات السريعة في شريط أفقي مدمج وأنيق) */}
      <div className="filter-unified-toolbar">
        {/* Row 1: Top Locations Strip */}
        <div className="toolbar-row toolbar-locations-row">
          <span className="toolbar-section-label">
            {isAr ? 'أبرز المناطق:' : 'Top Locations:'}
          </span>
          <div className="toolbar-pills-scroll">
            <button
              type="button"
              className={`location-chip compact-location-chip ${(!filters.area || filters.area === 'all') ? 'active' : ''}`}
              onClick={() => onFilterChange('area', 'all')}
            >
              {isAr ? 'كل المناطق' : 'All Districts'}
            </button>
            {areas.filter(a => a.id !== 'all').slice(0, 8).map((area) => (
              <button
                key={area.id}
                type="button"
                className={`location-chip compact-location-chip ${filters.area === area.id ? 'active' : ''}`}
                onClick={() => onFilterChange('area', area.id)}
              >
                {isAr ? (area.name_ar || area.label_ar) : (area.name_en || area.label_en)}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Smart Quick Tags Strip */}
        <div className="toolbar-row toolbar-tags-row">
          <span className="toolbar-section-label">
            <Sparkles size={12} className="text-gold" />
            {isAr ? 'المميزات السريعة:' : 'Quick Tags:'}
          </span>
          <div className="toolbar-pills-scroll">
            {SMART_FILTER_TAGS.map((tag) => {
              const isTagActive = (filters.smartTags || []).includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`smart-tag-pill compact-smart-tag ${isTagActive ? 'active' : ''}`}
                  onClick={() => handleToggleTag(tag.id)}
                >
                  {isTagActive && <Check size={11} className="tag-check" />}
                  <span>{isAr ? tag.label_ar : tag.label_en}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
                  aria-label="Remove filter"
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
