import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { getAreas } from '../../utils/areasData';

export default function PropertyFilters({
  lang,
  filters,
  onFilterChange,
  onResetFilters,
  totalResults
}) {
  const [areas, setAreas] = useState(() => getAreas());

  useEffect(() => {
    const handleUpdate = () => {
      setAreas(getAreas());
    };
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);
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
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {lang === 'ar' ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}
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
          <div className="budget-slider-wrap">
            <input
              type="range"
              min="500000"
              max="20000000"
              step="250000"
              value={filters.maxPrice || 15000000}
              onChange={(e) => onFilterChange('maxPrice', e.target.value)}
              className="range-slider"
            />
            {/* Quick Price Shortcuts */}
            <div className="quick-price-pills">
              <button 
                type="button" 
                className={`price-mini-pill ${filters.maxPrice === '2000000' ? 'active' : ''}`}
                onClick={() => onFilterChange('maxPrice', '2000000')}
              >
                {lang === 'ar' ? 'حتى 2 مليون' : '≤ 2M'}
              </button>
              <button 
                type="button" 
                className={`price-mini-pill ${filters.maxPrice === '4000000' ? 'active' : ''}`}
                onClick={() => onFilterChange('maxPrice', '4000000')}
              >
                {lang === 'ar' ? 'حتى 4 مليون' : '≤ 4M'}
              </button>
              <button 
                type="button" 
                className={`price-mini-pill ${filters.maxPrice === '8000000' ? 'active' : ''}`}
                onClick={() => onFilterChange('maxPrice', '8000000')}
              >
                {lang === 'ar' ? 'حتى 8 مليون' : '≤ 8M'}
              </button>
              <button 
                type="button" 
                className={`price-mini-pill ${!filters.maxPrice || filters.maxPrice === '20000000' ? 'active' : ''}`}
                onClick={() => onFilterChange('maxPrice', '20000000')}
              >
                {lang === 'ar' ? 'الكل' : 'Any'}
              </button>
            </div>
          </div>
        </div>

        {/* Bedrooms Count */}
        <div className="filter-item">
          <label>{lang === 'ar' ? 'عدد الغرف' : 'Bedrooms'}</label>
          <div className="bedroom-pills">
            {['all', '1', '2', '3', '4+'].map((beds) => (
              <button
                key={beds}
                type="button"
                className={`bedroom-pill ${
                  (filters.bedrooms === beds || (!filters.bedrooms && beds === 'all')) ? 'active' : ''
                }`}
                onClick={() => onFilterChange('bedrooms', beds === 'all' ? '' : beds)}
              >
                {beds === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : beds}
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
        {areas.slice(0, 7).map((area) => (
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
