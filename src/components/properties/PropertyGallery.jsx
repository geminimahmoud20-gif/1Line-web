import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Maximize2, 
  Sparkles, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Image as ImageIcon,
  Layers,
  Compass,
  Rotate3d,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Download,
  Share2,
  ExternalLink
} from 'lucide-react';
import { trackEvent } from '../../utils/visitorTracker';
import BrandWatermark from '../common/BrandWatermark';
import VirtualTourViewer from './VirtualTourViewer';

export default function PropertyGallery({
  images = [],
  title = '',
  virtualTour = true,
  lang = 'ar'
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeViewMode, setActiveViewMode] = useState('photos'); // 'photos' | 'floorplan' | '360'
  const [panoramaRotation, setPanoramaRotation] = useState(0);

  // Zoom, Pan & Rotation States
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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

  const handleCloseLightbox = () => {
    setLightboxOpen(false);
    resetTransform();
  };

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
  }, [lightboxOpen, isAr, handleNext, handlePrev, resetTransform]);

  // Sample Architectural Floor Plan schematic URL
  const floorPlanImage = 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80';

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
            <span>{isAr ? 'مخطط تقسيم الغرف والأبعاد الهندسية' : 'Architectural Room Dimensions & Layout'}</span>
          </div>
          <img src={floorPlanImage} alt="Floor Plan" className="floorplan-main-img" />
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
            <div className="lightbox-thumbs-strip">
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
