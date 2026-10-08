import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  LayoutGrid, 
  Map as MapIcon, 
  ArrowUpDown,
  ShieldCheck,
  CheckCircle2,
  Users
} from 'lucide-react';
import { FAMILY_KINDS } from '../utils/propertyInsights';
import '../styles/expat-suite.css';
import PropertyCard from '../components/properties/PropertyCard';
import PropertyFilters from '../components/properties/PropertyFilters';
import PropertyMapView from '../components/properties/PropertyMapView';
import ZeroResultsFallback from '../components/properties/ZeroResultsFallback';
import Pagination from '../components/common/Pagination';
import { DEMO_PROPERTIES } from '../data/demoData';
import { updatePageSeo } from '../utils/seoHelper';
import { searchPropertiesSemantic, parseSemanticQuery } from '../utils/semanticSearchEngine';

// Slider ceiling; a maxPrice at the cap means "no upper limit"
const MAX_PRICE_CAP = 15000000;

// Budget keys used by the hero search, lifestyle links and quick filters
function budgetRange(key) {
  switch (key) {
    case 'under_3m': return { minPrice: 0, maxPrice: 3000000 };
    case '3m_to_6m': return { minPrice: 3000000, maxPrice: 6000000 };
    case 'over_6m':
    case 'above_6m': return { minPrice: 6000000, maxPrice: MAX_PRICE_CAP };
    default: return { minPrice: 0, maxPrice: MAX_PRICE_CAP };
  }
}

export default function PropertiesPage({
  lang,
  currency = 'EGP',
  properties,
  favorites,
  onToggleFavorite,
  compareList = [],
  onToggleCompare,
  onQuickView
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' (الافتراضي الشبكي الفاخر) | 'split' (خريطة وقائمة)
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState(null);
  const [sortBy, setSortBy] = useState('featured'); // 'featured' | 'price_asc' | 'price_desc' | 'size_desc'
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 9;

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
    ...budgetRange(searchParams.get('budget')),
    bedrooms: searchParams.get('bedrooms') || 'all',
    completionStatus: 'all',
    finishing: 'all',
    paymentPlan: searchParams.get('paymentPlan') || (searchParams.get('financing') === 'true' ? 'installments' : 'all'),
    maxInstallmentYears: 'all',
    smartTags: []
  });

  // بيت العيلة filter lives in the URL only (?family=full_building …), set from the homepage hub or the chips below
  const familyFilter = searchParams.get('family') || 'all';
  const setFamilyFilter = (kind) => {
    const next = new URLSearchParams(searchParams);
    if (!kind || kind === 'all') next.delete('family'); else next.set('family', kind);
    setSearchParams(next);
  };

  // Synchronize URL search params (e.g. from Omnisearch or external links) with active filters.
  // Adjusted during render when the URL changes, so the list never renders once with stale filters.
  const [syncedParams, setSyncedParams] = useState(searchParams);
  if (syncedParams !== searchParams) {
    setSyncedParams(searchParams);
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all';
    const area = searchParams.get('area') || 'all';
    const { minPrice, maxPrice } = budgetRange(searchParams.get('budget'));
    const bedrooms = searchParams.get('bedrooms') || 'all';
    const paymentPlan = searchParams.get('paymentPlan') || (searchParams.get('financing') === 'true' ? 'installments' : 'all');

    setFilters(prev => {
      if (prev.query === q && prev.type === type && prev.area === area && prev.maxPrice === maxPrice && prev.minPrice === minPrice && prev.bedrooms === bedrooms && prev.paymentPlan === paymentPlan) {
        return prev;
      }
      return { ...prev, query: q, type, area, minPrice, maxPrice, bedrooms, paymentPlan };
    });
  }

  // Reset pagination on filter or sort change without cascading effect renders
  const [prevFilterState, setPrevFilterState] = useState({ filters, sortBy, familyFilter });
  if (prevFilterState.filters !== filters || prevFilterState.sortBy !== sortBy || prevFilterState.familyFilter !== familyFilter) {
    setPrevFilterState({ filters, sortBy, familyFilter });
    setCurrentPage(1);
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      query: '',
      type: 'all',
      area: 'all',
      minPrice: 0,
      maxPrice: MAX_PRICE_CAP,
      bedrooms: 'all',
      completionStatus: 'all',
      finishing: 'all',
      paymentPlan: 'all',
      maxInstallmentYears: 'all',
      smartTags: []
    });
    setSearchParams({});
  };

  // Safe properties pool fallback to ensure verified catalog is never empty
  const safeProperties = (Array.isArray(properties) && properties.length > 0) ? properties : DEMO_PROPERTIES;

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
      // Family hub filter
      if (familyFilter !== 'all' && prop.family?.kind !== familyFilter) return false;

      // Type filter
      if (filters.type && filters.type !== 'all' && prop.type !== filters.type) return false;

      // Area filter
      if (filters.area && filters.area !== 'all' && prop.areaKey !== filters.area) return false;

      // Max Price filter
      if (filters.maxPrice && filters.maxPrice < MAX_PRICE_CAP && prop.price > filters.maxPrice) return false;
      if (filters.minPrice && prop.price < filters.minPrice) return false;

      // Bedrooms filter - strictly applies to residential properties only
      if (filters.bedrooms && filters.bedrooms !== 'any' && filters.bedrooms !== 'all' && String(filters.bedrooms).trim() !== '') {
        const isNonResidential = prop.type === 'commercial' || prop.type === 'land' || prop.type === 'office' || prop.category === 'commercial' || prop.category === 'land' || prop.category === 'administrative';
        if (isNonResidential) return false;

        if (filters.bedrooms === '4+') {
          if ((prop.bedrooms || 0) < 4) return false;
        } else {
          const parsedBeds = parseInt(filters.bedrooms, 10);
          if (!isNaN(parsedBeds) && (prop.bedrooms || 0) !== parsedBeds) return false;
        }
      }

      // Completion / Delivery Status filter
      if (filters.completionStatus && filters.completionStatus !== 'all') {
        if (filters.completionStatus === 'ready') {
          const isReady = prop.completionStatus === 'ready' || 
            (prop.description_ar && prop.description_ar.includes('فوري')) || 
            (prop.description_en && prop.description_en.toLowerCase().includes('ready'));
          if (!isReady) return false;
        } else if (filters.completionStatus === 'under_construction') {
          const isUnder = prop.completionStatus === 'under_construction' || 
            prop.completionStatus === 'off_plan' ||
            (prop.description_ar && prop.description_ar.includes('إنشاء'));
          if (!isUnder) return false;
        }
      }

      // Finishing Quality filter
      if (filters.finishing && filters.finishing !== 'all') {
        if (filters.finishing === 'lux') {
          const isLux = (prop.finishing_ar && (prop.finishing_ar.includes('لوكس') || prop.finishing_ar.includes('سوبر'))) ||
            (prop.finishing_en && prop.finishing_en.toLowerCase().includes('lux'));
          if (!isLux) return false;
        } else if (filters.finishing === 'core') {
          const isCore = (prop.finishing_ar && (prop.finishing_ar.includes('محارة') || prop.finishing_ar.includes('نصف'))) ||
            (prop.finishing_en && prop.finishing_en.toLowerCase().includes('core'));
          if (!isCore) return false;
        }
      }

      // Payment Plan filter
      if (filters.paymentPlan && filters.paymentPlan !== 'all') {
        if (filters.paymentPlan === 'cash') {
          if (prop.installmentYears && prop.installmentYears > 0 && (!prop.purpose || prop.purpose === 'sale')) {
            // allows cash-only properties
          }
        } else if (filters.paymentPlan === 'installments') {
          if (!prop.installmentYears || prop.installmentYears === 0) return false;
        }
      }

      // Installment Years
      if (filters.maxInstallmentYears && filters.maxInstallmentYears !== 'all') {
        const reqYears = parseInt(filters.maxInstallmentYears, 10);
        if (reqYears === 3 && (prop.installmentYears || 0) > 3) return false;
        if (reqYears === 5 && (prop.installmentYears || 0) > 5) return false;
        if (reqYears === 7 && (prop.installmentYears || 0) < 7) return false;
      }

      // Smart Tags Filter
      if (filters.smartTags && filters.smartTags.length > 0) {
        for (const tag of filters.smartTags) {
          if (tag === 'nile_view') {
            const hasNile = prop.title_ar?.includes('نيل') || 
              prop.locationName_ar?.includes('نيل') || 
              prop.areaKey === 'corniche' || 
              (prop.features_ar && prop.features_ar.some(f => f.includes('نيل')));
            if (!hasNile) return false;
          }
          if (tag === 'registered') {
            const isReg = prop.legalStatus?.ownershipType_ar?.includes('مسجل') || 
              prop.legalStatus?.ownershipType_en?.toLowerCase().includes('registered') ||
              (prop.features_ar && prop.features_ar.some(f => f.includes('مسجل')));
            if (!isReg) return false;
          }
          if (tag === 'licensed') {
            const isLic = Boolean(prop.legalStatus?.licenseStatus_ar || prop.legalStatus?.reconciliationStatus_ar);
            if (!isLic) return false;
          }
          if (tag === 'land_share') {
            const hasShare = Boolean(prop.legalStatus?.landShare_ar) || 
              (prop.features_ar && prop.features_ar.some(f => f.includes('حصة بالأرض') || f.includes('حصة في الأرض') || f.includes('حصة شائعة')));
            if (!hasShare) return false;
          }
          if (tag === 'investment') {
            const isInv = prop.type === 'commercial' || 
              (prop.badge_ar && prop.badge_ar.includes('عائد')) || 
              (prop.badge_en && prop.badge_en.includes('ROI')) || 
              prop.areaKey === 'new_sohag';
            if (!isInv) return false;
          }
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
  }, [safeProperties, filters, sortBy, familyFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProperties.length / PAGE_SIZE));
  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProperties.slice(start, start + PAGE_SIZE);
  }, [filteredProperties, currentPage, PAGE_SIZE]);

  return (
    <div className="properties-page-wrapper">
      {/* Page Header Bar - Compact Executive Luxury */}
      <div className="properties-page-header compact-page-header">
        <div className="page-header-container">
          <div className="page-header-titles">
            <div className="page-header-main-row">
              <h1 className="page-header-title">
                {lang === 'ar' ? 'استكشاف العقارات في سوهاج' : 'Explore Properties in Sohag'}
              </h1>
              <span className="results-count-badge">
                {filteredProperties.length} {lang === 'ar' ? 'عقار متاح' : 'Units'}
              </span>
            </div>
            <p className="page-header-subtitle">
              {lang === 'ar' ? 'تصفح أحدث الشقق، الفيلات، المحلات التجارية والأراضي المعروضة حصرياً والمعتمدة رسمياً' : 'Browse verified apartments, commercial units, and lands'}
            </p>
          </div>

          {/* View Mode Controls */}
          <div className="view-mode-controls">
            <div className="sort-selector-wrap">
              <ArrowUpDown size={13} />
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
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title={lang === 'ar' ? 'عرض شبكة العقارات الفاخرة' : 'Luxury Grid View'}
                aria-label={lang === 'ar' ? 'عرض شبكة العقارات الفاخرة' : 'Luxury Grid View'}
              >
                <LayoutGrid size={15} />
                <span className="hide-mobile">{lang === 'ar' ? 'شبكة العقارات' : 'Grid'}</span>
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'split' ? 'active' : ''}`}
                onClick={() => setViewMode('split')}
                title={lang === 'ar' ? 'عرض تفاعلي (خريطة + قائمة)' : 'Split View'}
                aria-label={lang === 'ar' ? 'عرض تفاعلي (خريطة + قائمة)' : 'Split View'}
              >
                <MapIcon size={15} />
                <span className="hide-mobile">{lang === 'ar' ? 'خريطة وقائمة' : 'Split'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🛡️ 1LINE CERTIFIED STANDARD EXPLAINER (شريط المعيار المعتمد المدمج الأنيق) */}
      <div className="properties-certified-explainer-strip compact-trust-strip">
        <div className="certified-explainer-inner">
          <div className="certified-badge-pill">
            <ShieldCheck size={14} className="text-emerald" />
            <span>{lang === 'ar' ? 'معيار 1Line المعتمد:' : '1Line Certified:'}</span>
          </div>
          <div className="certified-points-row">
            {/* Process commitments (what 1Line does), not per-listing certifications */}
            <span className="cert-point">
              <CheckCircle2 size={12} className="text-gold" />
              <span>{lang === 'ar' ? 'مراجعة المستندات قبل العرض' : 'Documents reviewed before listing'}</span>
            </span>
            <span className="cert-dot">•</span>
            <span className="cert-point">
              <CheckCircle2 size={12} className="text-gold" />
              <span>{lang === 'ar' ? 'تسعير بمقارنات فعلية في المنطقة' : 'Priced from local comparables'}</span>
            </span>
            <span className="cert-dot">•</span>
            <span className="cert-point">
              <CheckCircle2 size={12} className="text-gold" />
              <span>{lang === 'ar' ? 'كل التكاليف مكتوبة قبل الحجز' : 'All costs in writing before reserving'}</span>
            </span>
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

        {/* بيت العيلة — family-sized categories */}
        <nav className="xs-family-chips" aria-label={lang === 'ar' ? 'تصنيفات بيت العيلة' : 'Family categories'}>
          <span className="xs-family-chips-label"><Users size={14} aria-hidden="true" /> {lang === 'ar' ? 'بيت العيلة:' : 'Family hub:'}</span>
          <button type="button" className={familyFilter === 'all' ? 'is-on' : ''} onClick={() => setFamilyFilter('all')} aria-pressed={familyFilter === 'all'}>
            {lang === 'ar' ? 'الكل' : 'All'}
          </button>
          {FAMILY_KINDS.map((k) => (
            <button key={k.id} type="button" className={familyFilter === k.id ? 'is-on' : ''} onClick={() => setFamilyFilter(k.id)} aria-pressed={familyFilter === k.id}>
              {lang === 'ar' ? k.ar : k.en}
            </button>
          ))}
        </nav>

        {/* 🤖 AI Semantic Recognition Active Banner */}
        {parsedSemantic && parsedSemantic.tagsFound && parsedSemantic.tagsFound.length > 0 && (
          <div className="semantic-active-tags-banner" style={{
            background: 'linear-gradient(90deg, rgba(217, 119, 6, 0.12), rgba(2, 132, 199, 0.08))',
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
        <div id="properties-catalog-anchor" style={{ scrollMarginTop: '110px' }} />
        {viewMode === 'split' ? (
          <div className="split-view-container">
            {/* Cards List Column */}
            <div className="split-cards-column">
              {filteredProperties.length > 0 ? (
                <>
                  <div className="properties-grid-split">
                    {paginatedProperties.map((prop) => (
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
                          currency={currency}
                          isFavorite={favorites.includes(prop.id)}
                          onToggleFavorite={onToggleFavorite}
                          isCompared={compareList.some(c => c.id === prop.id)}
                          onToggleCompare={onToggleCompare}
                          onQuickView={onQuickView}
                        />
                      </div>
                    ))}
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredProperties.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setCurrentPage}
                    isAr={lang === 'ar'}
                    scrollToId="properties-catalog-anchor"
                  />
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
                onFilterChange={handleFilterChange}
                currency={currency}
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
                  {paginatedProperties.map((prop) => (
                    <PropertyCard
                      key={prop.id}
                      property={prop}
                      lang={lang}
                      currency={currency}
                      isFavorite={favorites.includes(prop.id)}
                      onToggleFavorite={onToggleFavorite}
                      isCompared={compareList.some(c => c.id === prop.id)}
                      onToggleCompare={onToggleCompare}
                      onQuickView={onQuickView}
                    />
                  ))}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredProperties.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                  isAr={lang === 'ar'}
                  scrollToId="properties-catalog-anchor"
                />
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
