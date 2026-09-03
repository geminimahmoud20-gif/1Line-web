import { useState, useEffect } from 'react';
import { X, SlidersHorizontal, Check, RotateCcw } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { getAreas } from '../../utils/areasData';

export default function MobileFilterBottomSheet({
  isOpen,
  onClose,
  filters,
  onChange,
  onReset,
  totalResultsCount = 0,
  lang = 'ar'
}) {
  const [areas, setAreas] = useState(() => getAreas());

  useEffect(() => {
    const handleUpdate = () => {
      setAreas(getAreas());
    };
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;
  const isAr = lang === 'ar';

  return (
    <div className="mobile-filter-backdrop" onClick={onClose}>
      <div className="mobile-filter-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="filter-drawer-header">
          <div className="drawer-title-row">
            <SlidersHorizontal size={18} className="text-primary" />
            <h3>{isAr ? 'تصفية وبحث العقارات' : 'Filter Properties'}</h3>
          </div>

          <div className="drawer-header-actions">
            <button type="button" className="btn-drawer-reset" onClick={onReset}>
              <RotateCcw size={14} />
              <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
            </button>
            <button type="button" className="drawer-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Fields */}
        <div className="filter-drawer-body">
          {/* Location Area */}
          <div className="drawer-field-group">
            <label className="drawer-lbl">{isAr ? 'المنطقة في سوهاج' : 'Location'}</label>
            <div className="drawer-pills-wrap">
              {areas.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`drawer-pill-btn ${filters.area === a.id ? 'active' : ''}`}
                  onClick={() => onChange('area', a.id)}
                >
                  {isAr ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}
                </button>
              ))}
            </div>
          </div>

          {/* Property Type */}
          <div className="drawer-field-group">
            <label className="drawer-lbl">{isAr ? 'نوع العقار' : 'Property Type'}</label>
            <div className="drawer-pills-wrap">
              {PROPERTY_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`drawer-pill-btn ${filters.type === t.id ? 'active' : ''}`}
                  onClick={() => onChange('type', t.id)}
                >
                  {isAr ? t.name_ar : t.name_en}
                </button>
              ))}
            </div>
          </div>

          {/* Bedrooms */}
          <div className="drawer-field-group">
            <label className="drawer-lbl">{isAr ? 'عدد غرف النوم' : 'Bedrooms'}</label>
            <div className="drawer-pills-wrap">
              {[
                { id: 'all', label_ar: 'الكل', label_en: 'All' },
                { id: '1', label_ar: '1 غرفة', label_en: '1 Bed' },
                { id: '2', label_ar: '2 غرف', label_en: '2 Beds' },
                { id: '3', label_ar: '3 غرف', label_en: '3 Beds' },
                { id: '4', label_ar: '4+ غرف', label_en: '4+ Beds' }
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`drawer-pill-btn ${filters.bedrooms === b.id ? 'active' : ''}`}
                  onClick={() => onChange('bedrooms', b.id)}
                >
                  {isAr ? b.label_ar : b.label_en}
                </button>
              ))}
            </div>
          </div>

          {/* Max Price Slider */}
          <div className="drawer-field-group">
            <div className="slider-label-row">
              <label className="drawer-lbl">{isAr ? 'أقصى ميزانية' : 'Max Budget'}</label>
              <strong>{filters.maxPrice ? `${(filters.maxPrice / 1000000).toFixed(1)} مليون ج.م` : 'غير محدد'}</strong>
            </div>
            <input
              type="range"
              min="1000000"
              max="15000000"
              step="250000"
              value={filters.maxPrice || 15000000}
              onChange={(e) => onChange('maxPrice', parseInt(e.target.value))}
              className="drawer-range-slider"
            />
          </div>
        </div>

        {/* Footer Apply Button */}
        <div className="filter-drawer-footer">
          <button type="button" className="btn btn-primary btn-full" onClick={onClose}>
            <span>{isAr ? `إظهار ${totalResultsCount} عقاراً مطابقاً` : `Show ${totalResultsCount} Properties`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
