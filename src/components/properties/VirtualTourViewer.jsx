import { useState, useRef, useEffect } from 'react';
import { Rotate3d, Compass, Maximize2, Minimize2, Play, Pause, Info, Sparkles } from 'lucide-react';
import BrandWatermark from '../common/BrandWatermark';
import { trackEvent } from '../../utils/visitorTracker';

/**
 * VirtualTourViewer Component
 * Panoramic viewer for the listing's own photos (pan by drag / touch, shot-to-shot hotspots).
 */
export default function VirtualTourViewer({ 
  propertyImages = [], 
  propertyTitle = '', 
  lang = 'ar' 
}) {
  const isAr = lang === 'ar';

  // One scene per real photo of THIS listing. No stock pictures and no invented rooms or
  // finishes: the viewer only pans across what the owner actually photographed.
  const shots = propertyImages.filter(Boolean).slice(0, 10);
  const ROOM_SCENES = shots.map((image, i) => ({
    id: `shot-${i}`,
    name_ar: `لقطة ${i + 1} من ${shots.length}`,
    name_en: `Shot ${i + 1} of ${shots.length}`,
    image,
    hotspots: shots.length > 1 ? [
      { id: `next-${i}`, x: 82, y: 50, title_ar: 'اللقطة التالية ←', title_en: 'Next shot →', targetRoom: `shot-${(i + 1) % shots.length}` },
      { id: `prev-${i}`, x: 12, y: 50, title_ar: '→ اللقطة السابقة', title_en: '← Previous shot', targetRoom: `shot-${(i - 1 + shots.length) % shots.length}` },
    ] : [],
  }));

  const [activeRoomId, setActiveRoomId] = useState('shot-0');
  const [rotationX, setRotationX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
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

  if (!currentRoom) {
    return (
      <div className="virtual-tour-360-component" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '220px', padding: '20px', textAlign: 'center' }}>
        <span>{isAr ? 'مفيش صور مرفوعة للوحدة دي لسه.' : 'No photos uploaded for this listing yet.'}</span>
      </div>
    );
  }
  const activeImage = currentRoom.image;

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
          {/* Auto Rotate Toggle */}
          <button
            type="button"
            className={`tour-ctrl-btn ${autoRotate ? 'active' : ''}`}
            onClick={() => setAutoRotate(!autoRotate)}
            title={isAr ? (autoRotate ? 'إيقاف الحركة التلقائية' : 'تشغيل الحركة التلقائية') : 'Toggle auto-pan'}
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
          <span>{isAr ? 'اسحب لتحريك الصورة • صور حقيقية للوحدة' : 'Drag to pan • real photos of this unit'}</span>
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
