import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  LayoutGrid, 
  Map as MapIcon, 
  Building,
  RotateCcw,
  ArrowUpDown
} from 'lucide-react';
import PropertyCard from '../components/properties/PropertyCard';
import PropertyFilters from '../components/properties/PropertyFilters';
import PropertyMapView from '../components/properties/PropertyMapView';
import ZeroResultsFallback from '../components/properties/ZeroResultsFallback';

export default function PropertiesPage({
  lang,
  properties,
  favorites,
  onToggleFavorite,
  compareList = [],
  onToggleCompare,
  onQuickView
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'grid' | 'map'
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [sortBy, setSortBy] = useState('featured'); // 'featured' | 'price_asc' | 'price_desc' | 'size_desc'

  // Initialize filters from URL search params
  const [filters, setFilters] = useState({
    query: searchParams.get('q') || '',
    type: searchParams.get('type') || 'all',
    area: searchParams.get('area') || 'all',
    maxPrice: searchParams.get('budget') ? (searchParams.get('budget') === 'under_3m' ? 3000000 : searchParams.get('budget') === '3m_to_6m' ? 6000000 : 15000000) : 15000000,
    bedrooms: searchParams.get('bedrooms') || 'any'
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      query: '',
      type: 'all',
      area: 'all',
      maxPrice: 15000000,
      bedrooms: 'any'
    });
    setSearchParams({});
  };

  // Filter & Sort Properties
  const filteredProperties = useMemo(() => {
    return properties.filter((prop) => {
      // 🛡️ Exclude soft-deleted, hidden, or draft properties from public visitors
      if (prop.isDeleted || prop.status === 'trash' || prop.status === 'hidden' || prop.status === 'draft') {
        return false;
      }

      // Type filter
      if (filters.type !== 'all' && prop.type !== filters.type) return false;

      // Area filter
      if (filters.area !== 'all' && prop.areaKey !== filters.area) return false;

      // Max Price filter
      if (filters.maxPrice && prop.price > filters.maxPrice) return false;

      // Bedrooms filter
      if (filters.bedrooms !== 'any') {
        if (filters.bedrooms === '4+') {
          if ((prop.bedrooms || 0) < 4) return false;
        } else {
          if ((prop.bedrooms || 0) !== parseInt(filters.bedrooms)) return false;
        }
      }

      // Keyword query search
      if (filters.query && filters.query.trim() !== '') {
        const q = filters.query.toLowerCase().trim();
        const titleAr = (prop.title_ar || '').toLowerCase();
        const titleEn = (prop.title_en || '').toLowerCase();
        const locAr = (prop.locationName_ar || '').toLowerCase();
        const locEn = (prop.locationName_en || '').toLowerCase();
        const descAr = (prop.description_ar || '').toLowerCase();
        if (!titleAr.includes(q) && !titleEn.includes(q) && !locAr.includes(q) && !locEn.includes(q) && !descAr.includes(q)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'size_desc') return b.size - a.size;
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
  }, [properties, filters, sortBy]);

  return (
    <div className="properties-page-wrapper">
      {/* Page Header Bar */}
      <div className="properties-page-header">
        <div className="page-header-container">
          <div>
            <h1>{lang === 'ar' ? 'استكشاف العقارات في سوهاج' : 'Explore Properties in Sohag'}</h1>
            <p>{lang === 'ar' ? 'تصفح أحدث الشقق، الفيلات، المحلات التجارية والأراضي المعروضة حصرياً' : 'Browse the latest verified apartments, commercial units, and lands'}</p>
          </div>

          {/* View Mode Controls */}
          <div className="view-mode-controls">
            <div className="sort-selector-wrap">
              <ArrowUpDown size={14} />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="featured">{lang === 'ar' ? 'المميز أولاً' : 'Featured First'}</option>
                <option value="price_asc">{lang === 'ar' ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</option>
                <option value="price_desc">{lang === 'ar' ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</option>
                <option value="size_desc">{lang === 'ar' ? 'المساحة: الأكبر أولاً' : 'Size: Largest'}</option>
              </select>
            </div>

            <div className="view-toggle-btns">
              <button
                type="button"
                className={`view-btn ${viewMode === 'split' ? 'active' : ''}`}
                onClick={() => setViewMode('split')}
                title={lang === 'ar' ? 'عرض مزدوج (خريطة + قائمة)' : 'Split View'}
              >
                <MapIcon size={16} />
                <span className="hide-mobile">{lang === 'ar' ? 'خريطة وقائمة' : 'Split'}</span>
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title={lang === 'ar' ? 'عرض شبكي' : 'Grid View'}
              >
                <LayoutGrid size={16} />
                <span className="hide-mobile">{lang === 'ar' ? 'شبكة' : 'Grid'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="properties-main-container">
        {/* Filters Top / Sidebar */}
        <PropertyFilters
          lang={lang}
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          totalResults={filteredProperties.length}
        />

        {/* View Layout Container */}
        {viewMode === 'split' ? (
          <div className="split-view-container">
            {/* Cards List Column */}
            <div className="split-cards-column">
              {filteredProperties.length > 0 ? (
                <div className="properties-grid-split">
                  {filteredProperties.map((prop) => (
                    <div 
                      key={prop.id}
                      onMouseEnter={() => setSelectedProperty(prop)}
                      className={`split-card-item ${selectedProperty?.id === prop.id ? 'highlighted' : ''}`}
                    >
                      <PropertyCard
                        property={prop}
                        lang={lang}
                        isFavorite={favorites.includes(prop.id)}
                        onToggleFavorite={onToggleFavorite}
                        isCompared={compareList.some(c => c.id === prop.id)}
                        onToggleCompare={onToggleCompare}
                        onQuickView={onQuickView}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <ZeroResultsFallback
                  lang={lang}
                  onResetFilters={handleResetFilters}
                  suggestedProperties={properties}
                  favorites={favorites}
                  onToggleFavorite={onToggleFavorite}
                  compareList={compareList}
                  onToggleCompare={onToggleCompare}
                  onQuickView={onQuickView}
                />
              )}
            </div>

            {/* Sticky Map Column */}
            <div className="split-map-column">
              <PropertyMapView
                properties={filteredProperties.length > 0 ? filteredProperties : properties}
                selectedProperty={selectedProperty}
                onSelectProperty={setSelectedProperty}
                lang={lang}
                centerArea={filters.area}
              />
            </div>
          </div>
        ) : (
          /* Grid View Layout */
          <div className="grid-view-container">
            {filteredProperties.length > 0 ? (
              <div className="properties-grid-full">
                {filteredProperties.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    lang={lang}
                    isFavorite={favorites.includes(prop.id)}
                    onToggleFavorite={onToggleFavorite}
                    isCompared={compareList.some(c => c.id === prop.id)}
                    onToggleCompare={onToggleCompare}
                    onQuickView={onQuickView}
                  />
                ))}
              </div>
            ) : (
              <ZeroResultsFallback
                lang={lang}
                onResetFilters={handleResetFilters}
                suggestedProperties={properties}
                favorites={favorites}
                onToggleFavorite={onToggleFavorite}
                compareList={compareList}
                onToggleCompare={onToggleCompare}
                onQuickView={onQuickView}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
