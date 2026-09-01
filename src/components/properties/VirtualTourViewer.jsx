import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Rotate3d, 
  Compass, 
  Maximize2, 
  Minimize2, 
  Sun, 
  Moon, 
  Play, 
  Pause, 
  Info, 
  Eye,
  ChevronRight,
  ChevronLeft,
  Sparkles
} from 'lucide-react';
import BrandWatermark from '../common/BrandWatermark';
import { trackEvent } from '../../utils/visitorTracker';

/**
 * VirtualTourViewer Component
 * Immersive 360° interactive room-by-room virtual property tour simulator.
 */
export default function VirtualTourViewer({ 
  propertyImages = [], 
  propertyTitle = '', 
  lang = 'ar' 
}) {
  const isAr = lang === 'ar';

  // Room Scenes with High-Res Panoramas & Hotspots
  const ROOM_SCENES = [
    {
      id: 'reception',
      name_ar: 'الريسبشن وصالة الاستقبال',
      name_en: 'Grand Reception & Living Hall',
      image: propertyImages[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80',
      nightImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80',
      hotspots: [
        { id: 'h1', x: 30, y: 55, title_ar: 'أرضيات بورسلين إسباني نخب أول', title_en: 'Spanish Porcelain Floor', targetRoom: null },
        { id: 'h2', x: 75, y: 45, title_ar: 'انتقل إلى: جناح النوم الماستر 🛏️', title_en: 'Go to Master Bedroom 🛏️', targetRoom: 'bedroom' }
      ]
    },
    {
      id: 'bedroom',
      name_ar: 'غرفة النوم الرئيسية (Master Suite)',
      name_en: 'Master Bedroom Suite',
      image: propertyImages[1] || 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1920&q=80',
      nightImage: 'https://images.unsplash.com/photo-1540518614846-7ede433c4570?auto=format&fit=crop&w=1920&q=80',
      hotspots: [
        { id: 'h3', x: 25, y: 50, title_ar: 'حمام ماستر ملحق وغرفة ملابس', title_en: 'En-Suite Bathroom & Dressing', targetRoom: null },
        { id: 'h4', x: 80, y: 50, title_ar: 'انتقل إلى: الشرفة والإطلالة 🌿', title_en: 'Go to Balcony & View 🌿', targetRoom: 'balcony' }
      ]
    },
    {
      id: 'balcony',
      name_ar: 'الشرفة والإطلالة البانورامية',
      name_en: 'Panoramic Balcony & Views',
      image: propertyImages[2] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1920&q=80',
      nightImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80',
      hotspots: [
        { id: 'h5', x: 50, y: 35, title_ar: 'إطلالة بحرية مفتوحة على حدائق الكمبوند', title_en: 'Open Garden View', targetRoom: null },
        { id: 'h6', x: 15, y: 60, title_ar: 'العودة إلى: الريسبشن 🛋️', title_en: 'Back to Reception 🛋️', targetRoom: 'reception' }
      ]
    },
    {
      id: 'kitchen',
      name_ar: 'المطبخ الأمريكي المفتوح',
      name_en: 'Modern Open-Concept Kitchen',
      image: propertyImages[3] || 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1920&q=80',
      nightImage: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1920&q=80',
      hotspots: [
        { id: 'h7', x: 40, y: 55, title_ar: 'تجهيزات كهربائية وغاز طبيعي وتوصيلات مدمجة', title_en: 'Built-in Utilities', targetRoom: null },
        { id: 'h8', x: 75, y: 50, title_ar: 'العودة إلى: الريسبشن 🛋️', title_en: 'Back to Reception 🛋️', targetRoom: 'reception' }
      ]
    }
  ];

  const [activeRoomId, setActiveRoomId] = useState('reception');
  const [rotationX, setRotationX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isNightMode, setIsNightMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeHotspotInfo, setActiveHotspotInfo] = useState(null);

  const containerRef = useRef(null);
  const currentRoom = ROOM_SCENES.find((r) => r.id === activeRoomId) || ROOM_SCENES[0];

  // Auto-Rotation loop
  useEffect(() => {
    if (!autoRotate || isDragging) return;
    const interval = setInterval(() => {
      setRotationX((prev) => (prev - 0.4) % 1000);
    }, 30);
    return () => clearInterval(interval);
  }, [autoRotate, isDragging]);

  // Drag handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setAutoRotate(false);
    setDragStartX(e.clientX - rotationX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setRotationX(e.clientX - dragStartX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setAutoRotate(false);
      setDragStartX(e.touches[0].clientX - rotationX);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setRotationX(e.touches[0].clientX - dragStartX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleSwitchRoom = (roomId) => {
    setActiveRoomId(roomId);
    setRotationX(0);
    setActiveHotspotInfo(null);
    trackEvent('virtual_tour_room_switched', { roomId, propertyTitle });
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const activeImage = isNightMode ? currentRoom.nightImage : currentRoom.image;

  return (
    <div 
      className={`virtual-tour-360-component ${isFullscreen ? 'fullscreen-mode' : ''}`}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Floating Control Bar */}
      <div className="tour-top-bar">
        <div className="tour-current-room-badge">
          <Rotate3d size={16} className="text-gold spin-slow" />
          <span>{isAr ? currentRoom.name_ar : currentRoom.name_en}</span>
        </div>

        <div className="tour-controls-cluster">
          {/* Day / Night Toggle */}
          <button
            type="button"
            className="tour-ctrl-btn"
            onClick={() => setIsNightMode(!isNightMode)}
            title={isAr ? (isNightMode ? 'تفعيل الإضاءة النهارية' : 'تفعيل الإضاءة المسائية الدافئة') : 'Toggle Lighting'}
          >
            {isNightMode ? <Sun size={15} className="text-gold" /> : <Moon size={15} />}
          </button>

          {/* Auto Rotate Toggle */}
          <button
            type="button"
            className={`tour-ctrl-btn ${autoRotate ? 'active' : ''}`}
            onClick={() => setAutoRotate(!autoRotate)}
            title={isAr ? (autoRotate ? 'إيقاف الدوران التلقائي' : 'تشغيل الدوران التلقائي 360°') : 'Toggle Auto-Rotate'}
          >
            {autoRotate ? <Pause size={15} /> : <Play size={15} />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            className="tour-ctrl-btn"
            onClick={toggleFullscreen}
            title={isAr ? 'ملء الشاشة' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Main 360 Canvas Stage */}
      <div 
        className="tour-canvas-stage"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div 
          className="tour-panorama-strip"
          style={{
            transform: `scale(1.35) translateX(${rotationX % 800}px)`,
            backgroundImage: `url(${activeImage})`,
            transition: isDragging ? 'none' : 'transform 0.1s linear'
          }}
        />

        {/* Brand Watermark Overlay */}
        <BrandWatermark size="md" position="bottom-right" />

        {/* Interactive Hotspots Overlaid */}
        {currentRoom.hotspots.map((spot) => {
          const hotspotOffsetX = (spot.x + ((rotationX * 0.15) % 100) + 100) % 100;
          return (
            <div
              key={spot.id}
              className="tour-hotspot-pin"
              style={{
                left: `${hotspotOffsetX}%`,
                top: `${spot.y}%`
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (spot.targetRoom) {
                  handleSwitchRoom(spot.targetRoom);
                } else {
                  setActiveHotspotInfo(isAr ? spot.title_ar : spot.title_en);
                }
              }}
            >
              <div className="hotspot-pulse-ring" />
              <div className="hotspot-core-dot">
                <Sparkles size={12} />
              </div>
              <div className="hotspot-tooltip-card">
                <span>{isAr ? spot.title_ar : spot.title_en}</span>
              </div>
            </div>
          );
        })}

        {/* Active Hotspot Info Toast */}
        {activeHotspotInfo && (
          <div className="tour-hotspot-toast" onClick={() => setActiveHotspotInfo(null)}>
            <Info size={16} className="text-gold" />
            <span>{activeHotspotInfo}</span>
          </div>
        )}

        {/* Drag Hint Overlay */}
        <div className="tour-gesture-hint">
          <Compass size={14} className="spin-slow" />
          <span>{isAr ? 'اسحب في أي اتجاه للتنقل 360° واستكشاف الغرفة' : 'Drag around to explore in 360°'}</span>
        </div>
      </div>

      {/* Bottom Room Selector Strip */}
      <div className="tour-bottom-rooms-strip">
        {ROOM_SCENES.map((room) => (
          <button
            key={room.id}
            type="button"
            className={`tour-room-pill ${room.id === activeRoomId ? 'active' : ''}`}
            onClick={() => handleSwitchRoom(room.id)}
          >
            <span className="room-thumb-mini" style={{ backgroundImage: `url(${room.image})` }} />
            <span>{isAr ? room.name_ar : room.name_en}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
