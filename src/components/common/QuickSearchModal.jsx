import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  Building, 
  MapPin, 
  Layers, 
  Calculator, 
  TrendingUp, 
  Lock, 
  FileText, 
  ArrowRight,
  ArrowLeft,
  CornerDownLeft,
  Sparkles
} from 'lucide-react';
import { getAreas } from '../../utils/areasData.js';
import { MEGA_PROJECTS } from '../../data/projectsData.js';
import { formatCurrencyPrice } from '../../utils/currencyAndBenchmark.js';

export default function QuickSearchModal({
  isOpen,
  onClose,
  properties = [],
  lang = 'ar',
  currency = 'EGP',
  onOpenAddDemand
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const navigate = useNavigate();
  const isAr = lang === 'ar';

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 60);
    }
  }, [isOpen]);

  const areas = useMemo(() => {
    try {
      return getAreas().filter(a => a.id !== 'all');
    } catch {
      return [];
    }
  }, []);

  // Quick preset keywords
  const popularTags = isAr ? [
    { label: 'سوهاج الجديدة', query: 'سوهاج الجديدة' },
    { label: 'كورنيش النيل', query: 'كورنيش' },
    { label: 'شرق سوهاج', query: 'شرق' },
    { label: 'منطقة الثقافة', query: 'الثقافة' },
    { label: 'طهطا', query: 'طهطا' },
    { label: 'شقق سكنية', query: 'شقة' },
    { label: 'فيلات', query: 'فيلا' },
    { label: 'محلات ومقرات', query: 'تجاري' }
  ] : [
    { label: 'New Sohag', query: 'New Sohag' },
    { label: 'Corniche', query: 'Corniche' },
    { label: 'East Sohag', query: 'East' },
    { label: 'El Thakafa', query: 'Thakafa' },
    { label: 'Tahta', query: 'Tahta' },
    { label: 'Apartments', query: 'Apartment' },
    { label: 'Villas', query: 'Villa' },
    { label: 'Commercial', query: 'Commercial' }
  ];

  // System navigation tools
  const tools = useMemo(() => [
    {
      id: 'tool-financing',
      type: 'tool',
      title: isAr ? 'حاسبة التمويل والأقساط العقارية' : 'Financing & Mortgage Calculator',
      desc: isAr ? 'احسب قسطك الشهري والدفعة المقدمة وجدول السداد' : 'Calculate monthly installments and down payment',
      icon: Calculator,
      action: () => { navigate('/financing'); onClose(); }
    },
    {
      id: 'tool-market',
      type: 'tool',
      title: isAr ? 'مؤشرات ذكاء السوق وعوائد الإيجار' : 'Market Intelligence & ROI',
      desc: isAr ? 'متوسط أسعار المتر ومعدلات النمو في كل مراكز سوهاج' : 'Live price benchmarks and rental yields in Sohag',
      icon: TrendingUp,
      action: () => { navigate('/market-intelligence'); onClose(); }
    },
    {
      id: 'tool-demand',
      type: 'tool',
      title: isAr ? 'تسجيل طلب عقاري بمواصفات خاصة' : 'Submit Custom Property Request',
      desc: isAr ? 'لم تجد طلبك؟ يسجل فريقنا طلبك ويبحث لك في كافة مناطق سوهاج' : 'Let our team source properties matching your exact specs',
      icon: FileText,
      action: () => { 
        onClose();
        if (onOpenAddDemand) onOpenAddDemand();
      }
    }
  ], [isAr, navigate, onClose, onOpenAddDemand]);

  // Filtered Results
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { properties: [], areas: [], projects: [], tools };
    }

    // 1. Matching Properties
    const matchedProperties = properties.filter((p) => {
      const titleAr = (p.title_ar || '').toLowerCase();
      const titleEn = (p.title_en || '').toLowerCase();
      const locAr = (p.locationName_ar || '').toLowerCase();
      const locEn = (p.locationName_en || '').toLowerCase();
      const id = (p.id || '').toLowerCase();
      const type = (p.type || '').toLowerCase();
      return titleAr.includes(q) || titleEn.includes(q) || locAr.includes(q) || locEn.includes(q) || id.includes(q) || type.includes(q);
    }).slice(0, 5);

    // 2. Matching Areas
    const matchedAreas = areas.filter((a) => {
      const nameAr = (a.name_ar || '').toLowerCase();
      const nameEn = (a.name_en || '').toLowerCase();
      const labelAr = (a.label_ar || '').toLowerCase();
      const id = (a.id || '').toLowerCase();
      return nameAr.includes(q) || nameEn.includes(q) || labelAr.includes(q) || id.includes(q);
    }).slice(0, 4);

    // 3. Matching Mega Projects
    const matchedProjects = (MEGA_PROJECTS || []).filter((proj) => {
      const titleAr = (proj.title_ar || '').toLowerCase();
      const titleEn = (proj.title_en || '').toLowerCase();
      const devAr = (proj.developer_ar || '').toLowerCase();
      const devEn = (proj.developer_en || '').toLowerCase();
      return titleAr.includes(q) || titleEn.includes(q) || devAr.includes(q) || devEn.includes(q);
    }).slice(0, 3);

    // 4. Matching Tools
    const matchedTools = tools.filter((t) => {
      return t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);
    });

    return {
      properties: matchedProperties,
      areas: matchedAreas,
      projects: matchedProjects,
      tools: matchedTools
    };
  }, [query, properties, areas, tools]);

  // Flatten items for keyboard navigation
  const flatItems = useMemo(() => {
    const items = [];
    searchResults.properties.forEach(p => items.push({ type: 'property', data: p }));
    searchResults.areas.forEach(a => items.push({ type: 'area', data: a }));
    searchResults.projects.forEach(proj => items.push({ type: 'project', data: proj }));
    searchResults.tools.forEach(t => items.push({ type: 'tool', data: t }));
    return items;
  }, [searchResults]);

  const handleSelect = (item) => {
    if (!item) return;
    onClose();
    if (item.type === 'property') {
      navigate(`/properties/${item.data.id}`);
    } else if (item.type === 'area') {
      navigate(`/properties?area=${item.data.id}`);
    } else if (item.type === 'project') {
      navigate('/projects');
    } else if (item.type === 'tool') {
      item.data.action();
    }
  };

  // Keyboard navigation inside modal
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (flatItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flatItems.length) % (flatItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems.length > 0 && flatItems[selectedIndex]) {
        handleSelect(flatItems[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  const totalResults = searchResults.properties.length + searchResults.areas.length + searchResults.projects.length + searchResults.tools.length;
  let runningIndex = 0;

  return (
    <div className="modal-backdrop-luxury omnisearch-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="omnisearch-card" onClick={(e) => e.stopPropagation()}>
        {/* Search Header Input Row */}
        <div className="omnisearch-input-wrap">
          <Search size={20} className="omnisearch-icon" />
          <input
            ref={inputRef}
            type="text"
            className="omnisearch-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={isAr ? 'ابحث عن عقار، حي (الكورنيش، شرق، سوهاج الجديدة)، كمبوند، أو أداة...' : 'Search properties, districts, compounds, or tools...'}
            aria-label={isAr ? 'البحث السريع' : 'Quick Search'}
          />
          {query ? (
            <button
              type="button"
              className="omnisearch-clear-btn"
              onClick={() => {
                setQuery('');
                if (inputRef.current) inputRef.current.focus();
              }}
              title={isAr ? 'مسح البحث' : 'Clear search'}
            >
              <X size={16} />
            </button>
          ) : (
            <kbd className="omnisearch-esc-pill">ESC</kbd>
          )}
        </div>

        {/* Popular Query Tag Chips */}
        {!query && (
          <div className="omnisearch-popular-tags">
            <span className="tags-label">
              <Sparkles size={12} className="text-gold" />
              {isAr ? 'عمليات البحث الشائعة:' : 'Popular Searches:'}
            </span>
            <div className="tags-chips-list">
              {popularTags.map(tag => (
                <button
                  key={tag.label}
                  type="button"
                  className="search-tag-chip"
                  onClick={() => {
                    setQuery(tag.query);
                    if (inputRef.current) inputRef.current.focus();
                  }}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Container */}
        <div className="omnisearch-results-scroll" ref={resultsRef}>
          {query && totalResults === 0 ? (
            <div className="omnisearch-empty-state">
              <Building size={36} className="text-muted" />
              <h4>{isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching results found'}</h4>
              <p>{isAr ? 'جرب البحث باسم الحي (مثلاً: الكورنيش، طهطا) أو نوع العقار أو أداة التمويل' : 'Try searching by district name, property type or financing calculator'}</p>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  onClose();
                  if (onOpenAddDemand) onOpenAddDemand();
                }}
              >
                <FileText size={14} />
                <span>{isAr ? 'تسجيل طلب مخصص لنبحث لك' : 'Submit Custom Request'}</span>
              </button>
            </div>
          ) : (
            <>
              {/* Properties Section */}
              {searchResults.properties.length > 0 && (
                <div className="omnisearch-section">
                  <div className="section-title-label">
                    <Building size={14} />
                    <span>{isAr ? `عقارات مميزة (${searchResults.properties.length})` : `Properties (${searchResults.properties.length})`}</span>
                  </div>
                  <div className="results-group-list">
                    {searchResults.properties.map((p) => {
                      const thisIndex = runningIndex++;
                      const isSelected = selectedIndex === thisIndex;
                      const priceObj = formatCurrencyPrice(p.price, currency, lang);
                      return (
                        <div
                          key={p.id}
                          className={`omnisearch-item-row ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelect({ type: 'property', data: p })}
                          onMouseEnter={() => setSelectedIndex(thisIndex)}
                        >
                          <img
                            src={p.images?.[0] || p.image || '/favicon.svg'}
                            alt={p.title_ar}
                            className="item-thumb-img"
                            loading="lazy"
                          />
                          <div className="item-text-info">
                            <span className="item-main-title">{isAr ? p.title_ar : p.title_en}</span>
                            <span className="item-sub-meta">
                              <MapPin size={11} />
                              {isAr ? p.locationName_ar : p.locationName_en}
                            </span>
                          </div>
                          <div className="item-end-price">
                            <strong className="item-price-val">{priceObj.primary} {priceObj.symbol}</strong>
                            <span className="item-badge-pill">{p.id.toUpperCase()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Districts & Areas Section */}
              {searchResults.areas.length > 0 && (
                <div className="omnisearch-section">
                  <div className="section-title-label">
                    <MapPin size={14} />
                    <span>{isAr ? `مناطق وأحياء سوهاج (${searchResults.areas.length})` : `Districts & Areas (${searchResults.areas.length})`}</span>
                  </div>
                  <div className="results-group-list">
                    {searchResults.areas.map((a) => {
                      const thisIndex = runningIndex++;
                      const isSelected = selectedIndex === thisIndex;
                      const benchmarkObj = formatCurrencyPrice(a.avgPricePerMeter, currency, lang);
                      return (
                        <div
                          key={a.id}
                          className={`omnisearch-item-row area-item-row ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelect({ type: 'area', data: a })}
                          onMouseEnter={() => setSelectedIndex(thisIndex)}
                        >
                          <div className="item-icon-box area-icon-box">
                            <MapPin size={16} />
                          </div>
                          <div className="item-text-info">
                            <span className="item-main-title">{isAr ? a.name_ar : a.name_en}</span>
                            <span className="item-sub-meta">{isAr ? a.description_ar : a.label_en}</span>
                          </div>
                          <div className="item-end-price">
                            <span className="area-meter-label">{isAr ? 'متوسط المتر' : 'Avg/m²'}</span>
                            <strong className="area-meter-val">{benchmarkObj.primary} {benchmarkObj.symbol}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mega Projects Section */}
              {searchResults.projects.length > 0 && (
                <div className="omnisearch-section">
                  <div className="section-title-label">
                    <Layers size={14} />
                    <span>{isAr ? `المشروعات والكمبوندات (${searchResults.projects.length})` : `Mega Projects (${searchResults.projects.length})`}</span>
                  </div>
                  <div className="results-group-list">
                    {searchResults.projects.map((proj) => {
                      const thisIndex = runningIndex++;
                      const isSelected = selectedIndex === thisIndex;
                      return (
                        <div
                          key={proj.id}
                          className={`omnisearch-item-row ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelect({ type: 'project', data: proj })}
                          onMouseEnter={() => setSelectedIndex(thisIndex)}
                        >
                          <div className="item-icon-box project-icon-box">
                            <Layers size={16} />
                          </div>
                          <div className="item-text-info">
                            <span className="item-main-title">{isAr ? proj.title_ar : proj.title_en}</span>
                            <span className="item-sub-meta">{isAr ? proj.developer_ar : proj.developer_en}</span>
                          </div>
                          <div className="item-end-price">
                            <span className="project-status-pill">{proj.progress}% {isAr ? 'إنجاز' : 'Done'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Platform Tools Section */}
              {searchResults.tools.length > 0 && (
                <div className="omnisearch-section">
                  <div className="section-title-label">
                    <Sparkles size={14} />
                    <span>{isAr ? 'أدوات وخدمات ذكية' : 'Smart Tools & Services'}</span>
                  </div>
                  <div className="results-group-list">
                    {searchResults.tools.map((tool) => {
                      const thisIndex = runningIndex++;
                      const isSelected = selectedIndex === thisIndex;
                      const ToolIcon = tool.icon;
                      return (
                        <div
                          key={tool.id}
                          className={`omnisearch-item-row tool-item-row ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelect({ type: 'tool', data: tool })}
                          onMouseEnter={() => setSelectedIndex(thisIndex)}
                        >
                          <div className="item-icon-box tool-icon-box">
                            <ToolIcon size={16} />
                          </div>
                          <div className="item-text-info">
                            <span className="item-main-title">{tool.title}</span>
                            <span className="item-sub-meta">{tool.desc}</span>
                          </div>
                          <div className="item-end-price">
                            {isAr ? <ArrowLeft size={16} className="tool-arrow-icon" /> : <ArrowRight size={16} className="tool-arrow-icon" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="omnisearch-footer-hints">
          <div className="hint-pill">
            <kbd>↑</kbd> <kbd>↓</kbd>
            <span>{isAr ? 'للتنقل' : 'Navigate'}</span>
          </div>
          <div className="hint-pill">
            <kbd className="enter-kbd"><CornerDownLeft size={10} /></kbd>
            <span>{isAr ? 'للاختيار' : 'Select'}</span>
          </div>
          <div className="hint-pill">
            <kbd>ESC</kbd>
            <span>{isAr ? 'للخروج' : 'Close'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
