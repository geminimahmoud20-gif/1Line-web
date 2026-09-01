import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { SOHAG_AREAS, PROPERTY_TYPES } from '../../data/propertiesData';

export default function PropertyFilters({
  lang,
  filters,
  onFilterChange,
  onResetFilters,
  totalResults
}) {
  return (
    <div className="properties-filters-card">
      <div className="filter-header-bar">
        <div className="filter-title-wrap">
          <SlidersHorizontal size={18} />
          <h3>{lang === 'ar' ? 'فلاتر البحث المتقدمة' : 'Advanced Filters'}</h3>
          <span className="results-count-badge">
            {totalResults} {lang === 'ar' ? 'عقار متطابق' : 'Properties found'}
          </span>
        </div>

        <button
          type="button"
          className="filter-reset-btn"
          onClick={onResetFilters}
          title={lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
        >
          <RotateCcw size={14} />
          <span>{lang === 'ar' ? 'إعادة ضبط' : 'Reset'}</span>
        </button>
      </div>

      <div className="filter-grid-inputs">
        {/* Search Keyword */}
        <div className="filter-item search-item">
          <label>{lang === 'ar' ? 'بحث بالكلمة' : 'Keyword Search'}</label>
          <div className="filter-input-with-icon">
            <Search size={16} />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'ابحث بالمنطقة، الشارع، أو نوع العقار...' : 'Search by area, street, or type...'}
              value={filters.query || ''}
              onChange={(e) => onFilterChange('query', e.target.value)}
            />
          </div>
        </div>

        {/* Property Type */}
        <div className="filter-item">
          <label>{lang === 'ar' ? 'نوع العقار' : 'Property Type'}</label>
          <select
            value={filters.type || 'all'}
            onChange={(e) => onFilterChange('type', e.target.value)}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {lang === 'ar' ? t.name_ar : t.name_en}
              </option>
            ))}
          </select>
        </div>

        {/* Location / Area */}
        <div className="filter-item">
          <label>{lang === 'ar' ? 'المنطقة' : 'Location'}</label>
          <select
            value={filters.area || 'all'}
            onChange={(e) => onFilterChange('area', e.target.value)}
          >
            {SOHAG_AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {lang === 'ar' ? a.name_ar : a.name_en}
              </option>
            ))}
          </select>
        </div>

        {/* Max Budget Range with Quick Presets */}
        <div className="filter-item">
          <div className="filter-label-flex">
            <label>{lang === 'ar' ? 'الحد الأقصى للميزانية' : 'Max Budget'}</label>
            <span className="price-tag-value">
              {filters.maxPrice ? parseInt(filters.maxPrice).toLocaleString() : '15,000,000'} {lang === 'ar' ? 'ج.م' : 'EGP'}
            </span>
          </div>
          <input
            type="range"
            min="1000000"
            max="15000000"
            step="250000"
            value={filters.maxPrice || 15000000}
            onChange={(e) => onFilterChange('maxPrice', parseInt(e.target.value))}
            className="filter-range-slider"
          />
          <div className="filter-quick-chips-strip" style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
            {[
              { val: 2000000, label_ar: '2 مليون', label_en: '2M' },
              { val: 3500000, label_ar: '3.5 مليون', label_en: '3.5M' },
              { val: 5000000, label_ar: '5 مليون', label_en: '5M' },
              { val: 8000000, label_ar: '8 مليون', label_en: '8M' },
              { val: 15000000, label_ar: 'الكل', label_en: 'Max' }
            ].map(b => (
              <button
                key={b.val}
                type="button"
                className={`bedroom-pill ${filters.maxPrice === b.val ? 'active' : ''}`}
                onClick={() => onFilterChange('maxPrice', b.val)}
                style={{ fontSize: '0.7rem', padding: '2px 7px' }}
              >
                {lang === 'ar' ? b.label_ar : b.label_en}
              </button>
            ))}
          </div>
        </div>

        {/* Bedrooms selector */}
        <div className="filter-item">
          <label>{lang === 'ar' ? 'عدد الغرف الأدنى' : 'Min Bedrooms'}</label>
          <div className="bedrooms-pills">
            {['any', '1', '2', '3', '4+'].map((beds) => (
              <button
                key={beds}
                type="button"
                className={`bedroom-pill ${filters.bedrooms === beds ? 'active' : ''}`}
                onClick={() => onFilterChange('bedrooms', beds)}
              >
                {beds === 'any' ? (lang === 'ar' ? 'الكل' : 'Any') : beds}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Location Chips Row */}
      <div className="filter-quick-locations-bar" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.76rem', fontWeight: '800', color: 'var(--text-muted)' }}>
          {lang === 'ar' ? 'أبرز المناطق:' : 'Top Locations:'}
        </span>
        {SOHAG_AREAS.slice(0, 6).map((area) => (
          <button
            key={area.id}
            type="button"
            className={`bedroom-pill ${filters.area === area.id ? 'active' : ''}`}
            onClick={() => onFilterChange('area', area.id)}
            style={{ fontSize: '0.74rem', padding: '3px 10px' }}
          >
            {lang === 'ar' ? area.name_ar : area.name_en}
          </button>
        ))}
      </div>
    </div>
  );
}
