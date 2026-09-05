import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  LayoutGrid, 
  Map as MapIcon, 
  ArrowUpDown
} from 'lucide-react';
import PropertyCard from '../components/properties/PropertyCard';
import PropertyFilters from '../components/properties/PropertyFilters';
import PropertyMapView from '../components/properties/PropertyMapView';
import ZeroResultsFallback from '../components/properties/ZeroResultsFallback';
import { PROPERTIES_DATA } from '../data/propertiesData';
import { updatePageSeo } from '../utils/seoHelper';
import { searchPropertiesSemantic, parseSemanticQuery } from '../utils/semanticSearchEngine';

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
  const [hoveredPropertyId, setHoveredPropertyId] = useState(null);
  const [sortBy, setSortBy] = useState('featured'); // 'featured' | 'price_asc' | 'price_desc' | 'size_desc'
  const [visibleCount, setVisibleCount] = useState(12);

  // Dynamic SEO for Properties Catalog
  useEffect(() => {
    const isAr = lang === 'ar';
    updatePageSeo({
      title: isAr ? 'استكشاف العقارات بسوهاج | شقق وفيلات وأراضي' : 'Properties in Sohag | Apartments & Villas',
      description: isAr 
        ? 'تصفح أحدث العقارات المفحوصة والمعتمدة قانونياً في سوهاج وسوهاج الجديدة مع منصة 1Line.' 
        : 'Explore certified properties in Sohag and New Sohag with 1Line Real Estate.',
      url: '/properties',
      type: 'website'
    });
  }, [lang]);

  // Initialize filters from URL search params
  const [filters, setFilters] = useState({
    query: searchParams.get('q') || '',
    type: searchParams.get('type') || 'all',
    area: searchParams.get('area') || 'all',
    maxPrice: searchParams.get('budget') ? (searchParams.get('budget') === 'under_3m' ? 3000000 : searchParams.get('budget') === '3m_to_6m' ? 6000000 : 15000000) : 15000000,
    bedrooms: searchParams.get('bedrooms') || 'all'
  });

  // Reset pagination on filter or sort change without cascading effect renders
  const [prevFilterState, setPrevFilterState] = useState({ filters, sortBy });
  if (prevFilterState.filters !== filters || prevFilterState.sortBy !== sortBy) {
    setPrevFilterState({ filters, sortBy });
    setVisibleCount(12);
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      query: '',
      type: 'all',
      area: 'all',
      maxPrice: 15000000,
      bedrooms: 'all'
    });
    setSearchParams({});
  };

  // Safe properties pool fallback to ensure verified catalog is never empty
  const safeProperties = (Array.isArray(properties) && properties.length > 0) ? properties : PROPERTIES_DATA;

  // Parse semantic query tags if query is present
  const parsedSemantic = useMemo(() => {
    if (!filters.query || !filters.query.trim()) return null;
    return parseSemanticQuery(filters.query);
  }, [filters.query]);

  // Filter & Sort Properties
  const filteredProperties = useMemo(() => {
    // 1. Initial pool: exclude deleted, trash, hidden, draft
    const pool = safeProperties.filter((prop) => {
      return !(prop.isDeleted || prop.status === 'trash' || prop.status === 'hidden' || prop.status === 'draft');
    });

    // 2. If semantic query exists, rank by semantic engine
    let list = pool;
    if (filters.query && filters.query.trim() !== '') {
      list = searchPropertiesSemantic(pool, filters.query);
    }

    // 3. Apply manual dropdown filters
    return list.filter((prop) => {
      // Type filter
      if (filters.type && filters.type !== 'all' && prop.type !== filters.type) return false;

      // Area filter
      if (filters.area && filters.area !== 'all' && prop.areaKey !== filters.area) return false;

      // Max Price filter
      if (filters.maxPrice && prop.price > filters.maxPrice) return false;

      // Bedrooms filter
      if (filters.bedrooms && filters.bedrooms !== 'any' && filters.bedrooms !== 'all' && String(filters.bedrooms).trim() !== '') {
        if (filters.bedrooms === '4+') {
          if ((prop.bedrooms || 0) < 4) return false;
        } else {
          const parsedBeds = parseInt(filters.bedrooms, 10);
          if (!isNaN(parsedBeds) && (prop.bedrooms || 0) !== parsedBeds) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'size_desc') return b.size - a.size;
      // If semantic score exists and differs, preserve semantic ranking
      if (a._semanticScore !== undefined && b._semanticScore !== undefined && a._semanticScore !== b._semanticScore) {
        return b._semanticScore - a._semanticScore;
      }
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
  }, [safeProperties, filters, sortBy]);

  return (
    <div className="properties-page-wrapper">
      {/* Page Header Bar */}
      <div className="properties-page-header">
        <div className="page-header-container">
          <div className="page-header-titles">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: '900', margin: 0 }}>
                {lang === 'ar' ? 'استكشاف العقارات في سوهاج' : 'Explore Properties in Sohag'}
              </h1>
              <span className="results-count-badge" style={{ fontSize: '0.8rem', padding: '3px 10px', fontWeight: '800' }}>
                {filteredProperties.length} {lang === 'ar' ? 'عقار متاح' : 'Units'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              {lang === 'ar' ? 'تصفح أحدث الشقق، الفيلات، المحلات التجارية والأراضي المعروضة حصرياً' : 'Browse the latest verified apartments, commercial units, and lands'}
            </p>
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

        {/* 🤖 AI Semantic Recognition Active Banner */}
        {parsedSemantic && parsedSemantic.tagsFound && parsedSemantic.tagsFound.length > 0 && (
          <div className="semantic-active-tags-banner" style={{
            background: 'linear-gradient(90deg, rgba(217, 119, 6, 0.12), rgba(15, 23, 42, 0.4))',
            border: '1px solid rgba(217, 119, 6, 0.3)',
            borderRadius: '12px',
            padding: '10px 16px',
            margin: '14px 0 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>
                🎯 {lang === 'ar' ? 'المعايير المحددة لبحثك:' : 'Selected Search Criteria:'}
              </span>
              {parsedSemantic.tagsFound.map((tag, idx) => (
                <span key={idx} style={{
                  background: 'rgba(217, 119, 6, 0.2)',
                  color: 'var(--text-primary)',
                  padding: '3px 9px',
                  borderRadius: '16px',
                  fontSize: '0.78rem',
                  fontWeight: '600'
                }}>
                  {tag.label_ar}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {lang === 'ar' ? 'إلغاء وتصفية الكل' : 'Clear Search'}
            </button>
          </div>
        )}

        {/* View Layout Container */}
        {viewMode === 'split' ? (
          <div className="split-view-container">
            {/* Cards List Column */}
            <div className="split-cards-column">
              {filteredProperties.length > 0 ? (
                <>
                  <div className="properties-grid-split">
                    {filteredProperties.slice(0, visibleCount).map((prop) => (
                      <div 
                        key={prop.id}
                        id={`prop-card-${prop.id}`}
                        onMouseEnter={() => {
                          setSelectedProperty(prop);
                          setHoveredPropertyId(prop.id);
                        }}
                        onMouseLeave={() => setHoveredPropertyId(null)}
                        className={`split-card-item ${selectedProperty?.id === prop.id || hoveredPropertyId === prop.id ? 'highlighted' : ''}`}
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

                  {visibleCount < filteredProperties.length && (
                    <div style={{ textAlign: 'center', marginTop: '24px', padding: '16px 0' }}>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                        {lang === 'ar' 
                          ? `عرض ${Math.min(visibleCount, filteredProperties.length)} من أصل ${filteredProperties.length} عقاراً معتمداً` 
                          : `Showing ${Math.min(visibleCount, filteredProperties.length)} of ${filteredProperties.length} verified properties`}
                      </p>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '8px 20px', fontWeight: 'bold', borderColor: 'var(--accent-gold)', color: 'var(--text-primary)' }}
                        onClick={() => setVisibleCount(prev => prev + 12)}
                      >
                        <span>{lang === 'ar' ? 'عرض المزيد من العقارات ➕' : 'Load More Properties ➕'}</span>
                      </button>
                    </div>
                  )}
                </>
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
                onSelectProperty={(prop) => {
                  setSelectedProperty(prop);
                  if (prop) {
                    const cardEl = document.getElementById(`prop-card-${prop.id}`);
                    if (cardEl) {
                      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                  }
                }}
                hoveredPropertyId={hoveredPropertyId}
                onHoverProperty={(id) => {
                  setHoveredPropertyId(id);
                  if (id) {
                    const cardEl = document.getElementById(`prop-card-${id}`);
                    if (cardEl) {
                      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                  }
                }}
                lang={lang}
                centerArea={filters.area}
              />
            </div>
          </div>
        ) : (
          /* Grid View Layout */
          <div className="grid-view-container">
            {filteredProperties.length > 0 ? (
              <>
                <div className="properties-grid-full">
                  {filteredProperties.slice(0, visibleCount).map((prop) => (
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

                {visibleCount < filteredProperties.length && (
                  <div style={{ textAlign: 'center', marginTop: '30px', padding: '20px 0' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      {lang === 'ar' 
                        ? `عرض ${Math.min(visibleCount, filteredProperties.length)} من أصل ${filteredProperties.length} عقاراً معتمداً` 
                        : `Showing ${Math.min(visibleCount, filteredProperties.length)} of ${filteredProperties.length} verified properties`}
                    </p>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '10px 24px', fontWeight: 'bold', borderColor: 'var(--accent-gold)', color: 'var(--text-primary)' }}
                      onClick={() => setVisibleCount(prev => prev + 12)}
                    >
                      <span>{lang === 'ar' ? 'عرض المزيد من العقارات ➕' : 'Load More Properties ➕'}</span>
                    </button>
                  </div>
                )}
              </>
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
