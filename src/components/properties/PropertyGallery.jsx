import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Maximize2, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Image as ImageIcon, 
  Layers, 
  Rotate3d, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RefreshCw, 
  Download 
} from 'lucide-react';
import { trackEvent } from '../../utils/visitorTracker';
import BrandWatermark from '../common/BrandWatermark';
import VirtualTourViewer from './VirtualTourViewer';

export default function PropertyGallery({
  images = [],
  title = '',
  virtualTour = true,
  lang = 'ar',
  floorPlan = null
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeViewMode, setActiveViewMode] = useState('photos'); // 'photos' | 'floorplan' | '360'

  // Zoom, Pan & Rotation States
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Touch Swipe for Mobile Navigation
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const thumbsContainerRef = useRef(null);

  const isAr = lang === 'ar';
  const imgContainerRef = useRef(null);

  // Reset zoom and pan when switching images
  const resetTransform = useCallback(() => {
    setZoomLevel(1);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  const handleOpenLightbox = (index) => {
    setActiveImageIndex(index);
    resetTransform();
    setLightboxOpen(true);
    trackEvent('property_gallery_opened', { index, title });
  };

  const handleCloseLightbox = useCallback(() => {
    setLightboxOpen(false);
    resetTransform();
  }, [resetTransform]);

  const handleNext = useCallback((e) => {
    e?.stopPropagation();
    resetTransform();
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length, resetTransform]);

  const handlePrev = useCallback((e) => {
    e?.stopPropagation();
    resetTransform();
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length, resetTransform]);

  const handleZoomIn = (e) => {
    e?.stopPropagation();
    setZoomLevel((prev) => Math.min(3.5, Number((prev + 0.5).toFixed(1))));
  };

  const handleZoomOut = (e) => {
    e?.stopPropagation();
    setZoomLevel((prev) => {
      const next = Math.max(1, Number((prev - 0.5).toFixed(1)));
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleRotate = (e) => {
    e?.stopPropagation();
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDoubleClick = (e) => {
    e?.stopPropagation();
    if (zoomLevel > 1) {
      resetTransform();
    } else {
      setZoomLevel(2);
    }
  };

  // Drag / Pan Handlers
  const handleMouseDown = (e) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleCloseLightbox();
      else if (e.key === 'ArrowRight') isAr ? handlePrev() : handleNext();
      else if (e.key === 'ArrowLeft') isAr ? handleNext() : handlePrev();
      else if (e.key === '+' || e.key === '=') handleZoomIn();
      else if (e.key === '-' || e.key === '_') handleZoomOut();
      else if (e.key === '0' || e.key === 'r') resetTransform();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, isAr, handleNext, handlePrev, resetTransform, handleCloseLightbox]);

  // Mobile Touch Swipe Handling (Natural Swipe Left / Right on Touchscreens)
  const handleTouchStart = (e) => {
    if (zoomLevel > 1) return; // Allow panning when zoomed
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (zoomLevel > 1 || touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Minimum swipe threshold of 45px, ensure predominantly horizontal movement
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX > 0) {
        // Swiped Right -> Previous in LTR, Next in RTL
        isAr ? handlePrev() : handlePrev();
      } else {
        // Swiped Left -> Next in LTR, Prev in RTL
        isAr ? handleNext() : handleNext();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Keep active thumbnail centered in bottom thumbnail strip
  useEffect(() => {
    if (!lightboxOpen || !thumbsContainerRef.current) return;
    const activeThumb = thumbsContainerRef.current.children[activeImageIndex];
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeImageIndex, lightboxOpen]);

  const [floorPlanError, setFloorPlanError] = useState(false);

  return (
    <div className="property-gallery-component">
      {/* Tri-Media Tab Switcher */}
      <div className="gallery-media-mode-tabs">
        <button
          type="button"
          className={`media-tab-btn ${activeViewMode === 'photos' ? 'active' : ''}`}
          onClick={() => setActiveViewMode('photos')}
        >
          <ImageIcon size={15} />
          <span>{isAr ? `معرض الصور (${images.length})` : `Photos (${images.length})`}</span>
        </button>

        <button
          type="button"
          className={`media-tab-btn ${activeViewMode === 'floorplan' ? 'active' : ''}`}
          onClick={() => setActiveViewMode('floorplan')}
        >
          <Layers size={15} />
          <span>{isAr ? 'المخطط الهندسي للدور (Floor Plan)' : 'Architectural Floor Plan'}</span>
        </button>

        {virtualTour && (
          <button
            type="button"
            className={`media-tab-btn tab-360 ${activeViewMode === '360' ? 'active' : ''}`}
            onClick={() => setActiveViewMode('360')}
          >
            <Rotate3d size={15} />
            <span>{isAr ? 'جولة تفاعلية بانورامية 360°' : '360° Virtual Tour'}</span>
          </button>
        )}
      </div>

      {/* 1. Photos Bento Grid Mode */}
      {activeViewMode === 'photos' && (
        <div className="property-gallery-grid">
          {/* Main Large Hero Image */}
          <div className="gallery-main-item" onClick={() => handleOpenLightbox(0)}>
            <img src={images[0]} alt={title} />
            <BrandWatermark size="md" position="bottom-right" />
            <div className="gallery-hover-overlay">
              <div className="view-all-pill">
                <Maximize2 size={16} />
                <span>{isAr ? 'عرض وتكبير ملء الشاشة' : 'View & Zoom Fullscreen'}</span>
              </div>
            </div>
          </div>

          {/* Side Smaller Bento Thumbnails */}
          <div className="gallery-side-thumbs">
            {images.slice(1, 4).map((imgUrl, idx) => (
              <div
                key={idx}
                className="gallery-sub-item gallery-thumb-item"
                onClick={() => handleOpenLightbox(idx + 1)}
              >
                <img src={imgUrl} alt={`${title} ${idx + 2}`} />
                <BrandWatermark size="sm" position="bottom-right" variant="emblem-only" />
                {idx === 2 && images.length > 4 && (
                  <div className="gallery-more-overlay">
                    <span>+{images.length - 4} {isAr ? 'صور إضافية' : 'More'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Architectural Floor Plan View */}
      {activeViewMode === 'floorplan' && (
        <div className="gallery-floorplan-container" onClick={() => handleOpenLightbox(0)}>
          <div className="floorplan-badge-tag">
            <Layers size={14} />
            <span>{isAr ? 'مخطط تقسيم الغرف والأبعاد الهندسية (انقر للتكبير)' : 'Architectural Room Dimensions & Layout (Click to Zoom)'}</span>
          </div>
          {floorPlan && !floorPlanError ? (
            <img 
              src={floorPlan} 
              alt={title || "Floor Plan"} 
              className="floorplan-main-img" 
              onError={() => setFloorPlanError(true)}
            />
          ) : (
            <div className="floorplan-svg-wrap">
              <svg 
                viewBox="0 0 1200 800" 
                className="floorplan-main-svg"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="1200" height="800" fill="#081426" />
                <defs>
                  <pattern id="cadgrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#142e54" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="1200" height="800" fill="url(#cadgrid)" />
                {/* Outer CAD Border */}
                <rect x="100" y="80" width="1000" height="640" fill="none" stroke="#38bdf8" strokeWidth="3.5" rx="4" />
                
                {/* Partitions */}
                <line x1="520" y1="80" x2="520" y2="720" stroke="#38bdf8" strokeWidth="2.5" />
                <line x1="100" y1="400" x2="520" y2="400" stroke="#38bdf8" strokeWidth="2.5" />
                <line x1="520" y1="380" x2="1100" y2="380" stroke="#38bdf8" strokeWidth="2.5" />
                
                {/* Reception */}
                <text x="310" y="210" fill="#fdcb42" fontFamily="sans-serif" fontSize="22" fontWeight="bold" textAnchor="middle">
                  {isAr ? 'الريسبشن المفتوح (Grand Reception)' : 'Grand Reception Area'}
                </text>
                <text x="310" y="250" fill="#94a3b8" fontFamily="sans-serif" fontSize="16" textAnchor="middle">
                  8.5m x 5.4m • {isAr ? 'أرضيات رخام وبورسلين فاخرة' : 'Premium Marble Flooring'}
                </text>
                
                {/* Kitchen */}
                <text x="310" y="520" fill="#fdcb42" fontFamily="sans-serif" fontSize="22" fontWeight="bold" textAnchor="middle">
                  {isAr ? 'المطبخ والخدمات (Gourmet Kitchen)' : 'Gourmet Kitchen & Pantry'}
                </text>
                <text x="310" y="560" fill="#94a3b8" fontFamily="sans-serif" fontSize="16" textAnchor="middle">
                  4.2m x 3.6m • {isAr ? 'شرفة خدمات وتوصيلات غاز' : 'Balcony & Gas Outlets'}
                </text>
                
                {/* Master Suite */}
                <text x="810" y="200" fill="#fdcb42" fontFamily="sans-serif" fontSize="22" fontWeight="bold" textAnchor="middle">
                  {isAr ? 'الجناح الرئيسي (Master Suite)' : 'Master Bedroom Suite'}
                </text>
                <text x="810" y="240" fill="#94a3b8" fontFamily="sans-serif" fontSize="16" textAnchor="middle">
                  5.6m x 4.4m • Dressing Room • {isAr ? 'حمام خاص' : 'Ensuite Bath'}
                </text>
                
                {/* Family Bedrooms */}
                <text x="810" y="500" fill="#fdcb42" fontFamily="sans-serif" fontSize="22" fontWeight="bold" textAnchor="middle">
                  {isAr ? 'أجنحة النوم (Family Bedrooms)' : 'Family & Guest Bedrooms'}
                </text>
                <text x="810" y="540" fill="#94a3b8" fontFamily="sans-serif" fontSize="16" textAnchor="middle">
                  4.2m x 4.0m • 4.0m x 3.8m • {isAr ? 'إطلالة بحرية' : 'Open Views'}
                </text>

                {/* 1Line CAD Seal */}
                <rect x="120" y="100" width="310" height="42" rx="10" fill="#0b4ea2" opacity="0.9" />
                <text x="275" y="127" fill="#ffffff" fontFamily="sans-serif" fontSize="13" fontWeight="bold" textAnchor="middle">
                  1LINE CERTIFIED CAD SCHEMATIC
                </text>
              </svg>
            </div>
          )}
        </div>
      )}

      {/* 3. 360 Virtual Tour Simulation View */}
      {activeViewMode === '360' && (
        <div className="gallery-360-container">
          <VirtualTourViewer
            propertyImages={images}
            propertyTitle={title}
            lang={lang}
          />
        </div>
      )}

      {/* 🌟 FULLSCREEN INTERACTIVE LIGHTBOX & HD ZOOM VIEWER */}
      {lightboxOpen && (
        <div 
          className="gallery-lightbox-modal" 
          onClick={handleCloseLightbox}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Floating Control Bar */}
          <div className="lightbox-top-toolbar" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-title-counter">
              <strong>{title}</strong>
              <span className="lightbox-counter-pill">
                {activeImageIndex + 1} / {images.length}
              </span>
            </div>

            {/* Interactive Zoom & Transformation Controls */}
            <div className="lightbox-zoom-actions">
              <button 
                type="button" 
                className="lightbox-tool-btn" 
                onClick={handleZoomIn}
                title={isAr ? 'تكبير الصورة (+)' : 'Zoom In (+)'}
                disabled={zoomLevel >= 3.5}
              >
                <ZoomIn size={16} />
              </button>

              <span className="zoom-level-tag">{Math.round(zoomLevel * 100)}%</span>

              <button 
                type="button" 
                className="lightbox-tool-btn" 
                onClick={handleZoomOut}
                title={isAr ? 'تصغير الصورة (-)' : 'Zoom Out (-)'}
                disabled={zoomLevel <= 1}
              >
                <ZoomOut size={16} />
              </button>

              <button 
                type="button" 
                className="lightbox-tool-btn" 
                onClick={resetTransform}
                title={isAr ? 'إعادة ضبط الحجم الطبيعي (0)' : 'Reset Zoom'}
              >
                <RefreshCw size={15} />
              </button>

              <button 
                type="button" 
                className="lightbox-tool-btn" 
                onClick={handleRotate}
                title={isAr ? 'تدوير 90 درجة' : 'Rotate'}
              >
                <RotateCw size={15} />
              </button>

              <a
                href={images[activeImageIndex]}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="lightbox-tool-btn"
                title={isAr ? 'فتح أو تحميل الصورة بدقة أصلية' : 'Download Full HD'}
              >
                <Download size={15} />
              </a>

              <button
                type="button"
                className="lightbox-tool-btn lightbox-close-tool"
                onClick={handleCloseLightbox}
                title={isAr ? 'إغلاق (Esc)' : 'Close (Esc)'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button 
            type="button" 
            className="lightbox-nav-btn prev-btn" 
            onClick={handlePrev}
            title={isAr ? 'الصورة السابقة' : 'Previous'}
          >
            {isAr ? <ChevronRight size={32} /> : <ChevronLeft size={32} />}
          </button>

          {/* Center Stage Image Viewer */}
          <div 
            className="lightbox-stage-container"
            ref={imgContainerRef}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            style={{
              cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
          >
            <img 
              src={images[activeImageIndex]} 
              alt={title} 
              className="lightbox-active-img"
              draggable={false}
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)'
              }}
            />

            {/* Permanent Watermark on Lightbox Fullscreen */}
            <BrandWatermark size="lg" position="bottom-right" />

            {zoomLevel > 1 && (
              <div className="zoom-pan-hint">
                <span>{isAr ? 'اسحب بالماوس لتحريك الصورة وتفقد التفاصيل' : 'Drag to pan around'}</span>
              </div>
            )}
          </div>

          <button 
            type="button" 
            className="lightbox-nav-btn next-btn" 
            onClick={handleNext}
            title={isAr ? 'الصورة التالية' : 'Next'}
          >
            {isAr ? <ChevronLeft size={32} /> : <ChevronRight size={32} />}
          </button>

          {/* Bottom Thumbnails Strip */}
          <div className="lightbox-thumbs-strip-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-thumbs-strip" ref={thumbsContainerRef}>
              {images.map((imgUrl, i) => (
                <div
                  key={i}
                  className={`lightbox-strip-thumb-box ${i === activeImageIndex ? 'active' : ''}`}
                  onClick={() => {
                    resetTransform();
                    setActiveImageIndex(i);
                  }}
                >
                  <img src={imgUrl} alt="" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
