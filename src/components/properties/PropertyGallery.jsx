import { useState } from 'react';
import { 
  Maximize2, 
  Sparkles, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Image as ImageIcon,
  Layers,
  Compass,
  Rotate3d
} from 'lucide-react';

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

  const isAr = lang === 'ar';

  const handleOpenLightbox = (index) => {
    setActiveImageIndex(index);
    setLightboxOpen(true);
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

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
            <div className="gallery-hover-overlay">
              <div className="view-all-pill">
                <Maximize2 size={16} />
                <span>{isAr ? 'عرض ملء الشاشة' : 'View Fullscreen'}</span>
              </div>
            </div>
          </div>

          {/* Side Smaller Bento Thumbnails */}
          <div className="gallery-side-thumbs">
            {images.slice(1, 4).map((imgUrl, idx) => (
              <div
                key={idx}
                className="gallery-sub-item"
                onClick={() => handleOpenLightbox(idx + 1)}
              >
                <img src={imgUrl} alt={`${title} ${idx + 2}`} />
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
          <div className="panorama-viewer-frame">
            <img
              src={images[0]}
              alt="360 Panorama"
              style={{ transform: `scale(1.25) translateX(${panoramaRotation}px)` }}
              className="panorama-dynamic-img"
            />
            <div className="panorama-controls-overlay">
              <div className="panorama-badge">
                <Rotate3d size={16} className="spin-icon" />
                <span>{isAr ? 'اسحب أو انقر لتدوير المنظور 360°' : 'Interactive 360° Panorama'}</span>
              </div>
              <div className="panorama-rotation-buttons">
                <button
                  type="button"
                  className="btn-pano-rotate"
                  onClick={() => setPanoramaRotation((p) => p + 60)}
                >
                  ◀ {isAr ? 'تدوير لليسار' : 'Pan Left'}
                </button>
                <button
                  type="button"
                  className="btn-pano-rotate"
                  onClick={() => setPanoramaRotation((p) => p - 60)}
                >
                  {isAr ? 'تدوير لليمين' : 'Pan Right'} ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && (
        <div className="gallery-lightbox-modal" onClick={() => setLightboxOpen(false)}>
          <button
            type="button"
            className="lightbox-close-btn"
            onClick={() => setLightboxOpen(false)}
          >
            <X size={24} />
          </button>

          <button type="button" className="lightbox-nav-btn prev-btn" onClick={handlePrev}>
            {isAr ? <ChevronRight size={32} /> : <ChevronLeft size={32} />}
          </button>

          <div className="lightbox-image-wrap" onClick={(e) => e.stopPropagation()}>
            <img src={images[activeImageIndex]} alt={title} className="lightbox-active-img" />
            <div className="lightbox-counter-pill">
              {activeImageIndex + 1} / {images.length}
            </div>
          </div>

          <button type="button" className="lightbox-nav-btn next-btn" onClick={handleNext}>
            {isAr ? <ChevronLeft size={32} /> : <ChevronRight size={32} />}
          </button>

          {/* Lightbox Thumbnails Strip */}
          <div className="lightbox-thumbs-strip" onClick={(e) => e.stopPropagation()}>
            {images.map((imgUrl, i) => (
              <img
                key={i}
                src={imgUrl}
                alt=""
                className={`lightbox-strip-thumb ${i === activeImageIndex ? 'active' : ''}`}
                onClick={() => setActiveImageIndex(i)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
