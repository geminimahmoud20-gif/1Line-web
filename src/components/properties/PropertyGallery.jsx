import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Maximize2, 
  Minimize2,
  X, 
  ChevronRight, 
  ChevronLeft, 
  Image as ImageIcon, 
  Layers, 
  Rotate3d, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RefreshCw 
} from 'lucide-react';
import { trackEvent } from '../../utils/visitorTracker';
import BrandWatermark from '../common/BrandWatermark';
import { isWatermarked } from '../../utils/watermark';
import VirtualTourViewer from './VirtualTourViewer';
import { thumbUrl, thumbFallback } from '../../utils/imageThumbs';

export default function PropertyGallery({
  images: rawImages = [],
  title = '',
  virtualTour = false,
  lang = 'ar',
  floorPlan = null
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  // The "no photo" placeholder is not a photo of the unit
  const images = (Array.isArray(rawImages) ? rawImages : []).filter((u) => u && !/no-photo\.svg/.test(u));
  const [viewMode, setActiveViewMode] = useState('photos'); // 'photos' | 'floorplan' | '360'

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

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
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
        // Swiped Right -> Next in RTL, Previous in LTR
        isAr ? handleNext() : handlePrev();
      } else {
        // Swiped Left -> Previous in RTL, Next in LTR
        isAr ? handlePrev() : handleNext();
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
  // Only a real plan uploaded for this unit is shown: no generic drawing with made-up dimensions
  const hasPlan = Boolean(floorPlan) && !floorPlanError;
  const activeViewMode = viewMode === 'floorplan' && !hasPlan ? 'photos' : viewMode;
  const tabCount = 1 + (hasPlan ? 1 : 0) + (virtualTour ? 1 : 0);

  return (
    <div className="property-gallery-component">
      {/* Tri-Media Tab Switcher: only when there is more than the photos to switch to */}
      {tabCount > 1 && (
        <div className="gallery-media-mode-tabs">
          <button
            type="button"
            className={`media-tab-btn ${activeViewMode === 'photos' ? 'active' : ''}`}
            onClick={() => setActiveViewMode('photos')}
          >
            <ImageIcon size={15} />
            <span>{isAr ? `معرض الصور (${images.length})` : `Photos (${images.length})`}</span>
          </button>

          {hasPlan && (
            <button
              type="button"
              className={`media-tab-btn ${activeViewMode === 'floorplan' ? 'active' : ''}`}
              onClick={() => setActiveViewMode('floorplan')}
            >
              <Layers size={15} />
              <span>{isAr ? 'المخطط الهندسي' : 'Floor plan'}</span>
            </button>
          )}

          {virtualTour && (
            <button
              type="button"
              className={`media-tab-btn tab-360 ${activeViewMode === '360' ? 'active' : ''}`}
              onClick={() => setActiveViewMode('360')}
            >
              <Rotate3d size={15} />
              <span>{isAr ? 'عرض بانورامي للصور' : 'Panoramic photo view'}</span>
            </button>
          )}
        </div>
      )}

      {/* No photos uploaded yet: say so instead of an empty frame */}
      {activeViewMode === 'photos' && images.length === 0 && (
        <div className="gallery-empty-state" role="note">
          <ImageIcon size={28} aria-hidden="true" />
          <strong>{isAr ? 'صور الوحدة لسه بتتجهّز' : 'Photos are being prepared'}</strong>
          <span>{isAr ? 'اطلب الصور أو فيديو للوحدة من المستشار وهيوصلك على واتساب.' : 'Ask your advisor for photos or a video on WhatsApp.'}</span>
        </div>
      )}

      {/* 1. Photos Bento Grid Mode */}
      {activeViewMode === 'photos' && images.length > 0 && (
        <div className="property-gallery-grid">
          {/* Main Large Hero Image */}
          <div className="gallery-main-item" onClick={() => handleOpenLightbox(0)}>
            <img 
              src={images[0]} 
              alt={title} 
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
            {!isWatermarked(images[0]) && <BrandWatermark size="md" position="bottom-right" />}
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
                <img 
                  src={thumbUrl(imgUrl)} 
                  onError={thumbFallback(imgUrl)}
                  alt={`${title} ${idx + 2}`} 
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
                {!isWatermarked(imgUrl) && <BrandWatermark size="sm" position="bottom-right" variant="emblem-only" />}
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
          <img
            src={floorPlan}
            alt={title || 'Floor Plan'}
            className="floorplan-main-img"
            onError={() => setFloorPlanError(true)}
          />
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
              <span className="lightbox-cam-icon">
                <ImageIcon size={15} />
              </span>
              <strong className="lightbox-title-text">{title}</strong>
              <span className="lightbox-counter-pill" dir="ltr">
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
                aria-label="Zoom in"
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
                aria-label="Zoom out"
              >
                <ZoomOut size={16} />
              </button>

              <span className="lightbox-tool-sep" aria-hidden="true" />

              <button 
                type="button" 
                className="lightbox-tool-btn" 
                onClick={resetTransform}
                title={isAr ? 'إعادة ضبط الحجم الطبيعي (0)' : 'Reset Zoom'}
                aria-label="Reset zoom"
              >
                <RefreshCw size={14} />
              </button>

              <button 
                type="button" 
                className="lightbox-tool-btn" 
                onClick={handleRotate}
                title={isAr ? 'تدوير 90 درجة' : 'Rotate'}
                aria-label="Rotate"
              >
                <RotateCw size={14} />
              </button>

              <button 
                type="button" 
                className="lightbox-tool-btn" 
                onClick={toggleFullscreen}
                title={isAr ? (isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة') : (isFullscreen ? 'Exit Fullscreen' : 'Fullscreen')}
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>

              <span className="lightbox-tool-sep" aria-hidden="true" />

              <button
                type="button"
                className="lightbox-tool-btn lightbox-close-tool"
                onClick={handleCloseLightbox}
                title={isAr ? 'إغلاق (Esc)' : 'Close (Esc)'}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button 
            type="button" 
            className="lightbox-nav-btn prev-btn" 
            onClick={handlePrev}
            title={isAr ? 'الصورة السابقة' : 'Previous'}
            aria-label="Previous image"
          >
            {isAr ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          </button>

          {/* Center Stage Image Viewer */}
          <div 
            className="lightbox-stage-container"
            ref={imgContainerRef}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
          >
            <img 
              src={images[activeImageIndex]} 
              alt={title} 
              className="lightbox-active-img"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)'
              }}
            />

            {/* Watermark on the fullscreen view, unless the photo already carries it in the file */}
            {!isWatermarked(images[activeImageIndex]) && <BrandWatermark size="lg" position="bottom-right" />}

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
            aria-label="Next image"
          >
            {isAr ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
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
                  <img src={thumbUrl(imgUrl)} onError={thumbFallback(imgUrl)} alt="" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
