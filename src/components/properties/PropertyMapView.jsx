import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Layers, Satellite, Map as MapIcon, Maximize2, Minimize2, X, Navigation, TrendingUp, Sparkles, Building2 } from 'lucide-react';

// Fix Leaflet Default Marker Icon issues in Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SOHAG_DISTRICTS = [
  { 
    id: 'all', 
    label_ar: 'جميع المناطق', 
    label_en: 'All Zones', 
    center: [26.5569, 31.6990], 
    zoom: 13,
    avgPricePerSqm: 19500,
    appreciation: '+21.0%',
    demand_ar: 'نشاط استثماري مرتفع',
    demand_en: 'High Activity',
    polygon: null
  },
  { 
    id: 'new_sohag', 
    label_ar: 'سوهاج الجديدة', 
    label_en: 'New Sohag', 
    center: [26.4765, 31.6620], 
    zoom: 14,
    avgPricePerSqm: 18500,
    appreciation: '+25.4%',
    demand_ar: 'أعلى وتيرة نمو وكمبوندات',
    demand_en: 'Fastest Capital Growth',
    polygon: [
      [26.4950, 31.6400],
      [26.4950, 31.6850],
      [26.4580, 31.6850],
      [26.4580, 31.6400]
    ]
  },
  { 
    id: 'east', 
    label_ar: 'سوهاج شرق', 
    label_en: 'East Sohag', 
    center: [26.5610, 31.7040], 
    zoom: 15,
    avgPricePerSqm: 24000,
    appreciation: '+18.5%',
    demand_ar: 'المنطقة السكنية الأكثر سيولة',
    demand_en: 'Prime Liquid Residential',
    polygon: [
      [26.5720, 31.6970],
      [26.5720, 31.7180],
      [26.5480, 31.7180],
      [26.5480, 31.6970]
    ]
  },
  { 
    id: 'west', 
    label_ar: 'سوهاج غرب', 
    label_en: 'West Sohag', 
    center: [26.5520, 31.6880], 
    zoom: 15,
    avgPricePerSqm: 16500,
    appreciation: '+13.2%',
    demand_ar: 'طلب تجاري ومركزي مستقر',
    demand_en: 'Stable Commercial Core',
    polygon: [
      [26.5610, 31.6780],
      [26.5610, 31.6960],
      [26.5410, 31.6960],
      [26.5410, 31.6780]
    ]
  },
  { 
    id: 'corniche', 
    label_ar: 'الكورنيش الشرقي', 
    label_en: 'Corniche', 
    center: [26.5640, 31.7010], 
    zoom: 16,
    avgPricePerSqm: 29000,
    appreciation: '+22.8%',
    demand_ar: 'إطلالة نيلية نادرة وأعلى سعر',
    demand_en: 'Ultra-Luxury Nile Waterfront',
    polygon: [
      [26.5760, 31.6980],
      [26.5760, 31.7070],
      [26.5490, 31.7070],
      [26.5490, 31.6980]
    ]
  },
  { 
    id: 'akhmeem', 
    label_ar: 'أخميم', 
    label_en: 'Akhmeem', 
    center: [26.5630, 31.7450], 
    zoom: 14,
    avgPricePerSqm: 14200,
    appreciation: '+15.6%',
    demand_ar: 'توسع عمراني وأسعار اقتصادية',
    demand_en: 'Emerging Affordable Hub',
    polygon: [
      [26.5780, 31.7300],
      [26.5780, 31.7650],
      [26.5460, 31.7650],
      [26.5460, 31.7300]
    ]
  }
];

export default function PropertyMapView({
  properties = [],
  selectedProperty,
  onSelectProperty,
  hoveredPropertyId = null,
  onHoverProperty,
  lang = 'ar'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const districtPolygonsRef = useRef([]);
  const tileLayerRef = useRef(null);
  const [mapType, setMapType] = useState('satellite'); // 'streets' | 'satellite'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeDistrict, setActiveDistrict] = useState('all');
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [districtHudInfo, setDistrictHudInfo] = useState(null);

  const isAr = lang === 'ar';

  const handleFlyToDistrict = (district) => {
    setActiveDistrict(district.id);
    if (district.id !== 'all') {
      setDistrictHudInfo(district);
    } else {
      setDistrictHudInfo(null);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(district.center, district.zoom, { duration: 1.0 });
    }
  };

  // Tile Layer URLs
  const streetTiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const satelliteTiles = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [26.5569, 31.6990], // Prime Sohag Center
        zoom: 14,
        minZoom: 12,
        maxZoom: 19,
        zoomControl: false
      });

      // Place Zoom controls at top-left to avoid clashing with bottom toasts
      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Initial Satellite Tile Layer
      tileLayerRef.current = L.tileLayer(satelliteTiles, {
        attribution: '&copy; Esri &mdash; Earthstar Geographics',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup
    };
  }, []);

  // Handle Layer Switching (Satellite <-> Streets)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    if (mapType === 'satellite') {
      tileLayerRef.current = L.tileLayer(satelliteTiles, {
        attribution: '&copy; Esri Earthstar',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
    } else {
      tileLayerRef.current = L.tileLayer(streetTiles, {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
    }
  }, [mapType]);

  // Handle Fullscreen resize trigger
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);
  };

  // Update Markers with prominent Luxury 3D Location Pins
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = [];

    properties.forEach(prop => {
      if (!prop.coordinates) return;

      const { lat, lng } = prop.coordinates;
      bounds.push([lat, lng]);

      const title = isAr ? prop.title_ar : prop.title_en;
      const location = isAr ? prop.locationName_ar : prop.locationName_en;
      const isSelected = selectedProperty?.id === prop.id;
      const isHovered = hoveredPropertyId === prop.id;

      // Price Formatting in Millions
      const priceFormatted = (prop.price / 1000000).toFixed(1) + (isAr ? ' م.ج' : 'M');

      // Luxury Beacon Pin with Pointer Needle directly hitting the property unit
      const customPinHtml = `
        <div class="property-map-pin-container ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''}">
          <div class="pin-pulse-radar"></div>
          <div class="pin-bubble-pill">
            <span class="pin-badge-dot"></span>
            <span class="pin-price-label">${priceFormatted}</span>
          </div>
          <div class="pin-needle-pointer"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-property-icon',
        html: customPinHtml,
        iconSize: [84, 46],
        iconAnchor: [42, 46],
        popupAnchor: [0, -48]
      });

      const marker = L.marker([lat, lng], { 
        icon: customIcon,
        zIndexOffset: (isSelected || isHovered) ? 1000 : 0
      }).addTo(mapInstanceRef.current);

      const popupContent = `
        <div class="luxury-map-popup-card">
          <div class="popup-thumb-wrap">
            <img src="${prop.images[0]}" alt="${title}" class="popup-thumb-img" />
            <span class="popup-badge-pill">${prop.badge_ar || 'مميز'}</span>
          </div>
          <div class="popup-details-body">
            <h5 class="popup-property-title">${title}</h5>
            <div class="popup-loc-row">
              <span>${location}</span>
            </div>
            <div class="popup-price-row">
              <strong>${prop.price.toLocaleString()} ج.م</strong>
              <span class="popup-size">${prop.size} م²</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { 
        maxWidth: 270, 
        minWidth: 240,
        className: 'custom-property-leaflet-popup' 
      });

      marker.on('click', () => {
        if (onSelectProperty) onSelectProperty(prop);
      });

      marker.on('mouseover', () => {
        if (onHoverProperty) onHoverProperty(prop.id);
      });

      marker.on('mouseout', () => {
        if (onHoverProperty) onHoverProperty(null);
      });

      markersRef.current.push(marker);
    });

    if (bounds.length > 0 && mapInstanceRef.current && !selectedProperty) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [properties, isAr, selectedProperty, hoveredPropertyId, onSelectProperty, onHoverProperty]);

  // Render District Boundary Overlays & Heatmap Polygons
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear previous polygons
    districtPolygonsRef.current.forEach(p => p.remove());
    districtPolygonsRef.current = [];

    if (!showBoundaries) return;

    SOHAG_DISTRICTS.forEach(dist => {
      if (!dist.polygon) return;

      const isDistActive = activeDistrict === dist.id;

      const polygon = L.polygon(dist.polygon, {
        color: isDistActive ? '#ffca28' : '#0d48a1',
        weight: isDistActive ? 3 : 2,
        dashArray: isDistActive ? null : '6, 6',
        fillColor: isDistActive ? '#ffca28' : '#0d48a1',
        fillOpacity: isDistActive ? 0.22 : 0.08
      }).addTo(mapInstanceRef.current);

      const tooltipContent = `
        <div style="font-family: Cairo, sans-serif; text-align: ${isAr ? 'right' : 'left'}; direction: ${isAr ? 'rtl' : 'ltr'}; padding: 4px;">
          <strong style="color: #081226; font-size: 0.85rem; display: block; margin-bottom: 2px;">📍 ${isAr ? dist.label_ar : dist.label_en}</strong>
          <div style="color: #475569; font-size: 0.75rem;">${isAr ? 'متوسط سعر المتر:' : 'Avg Sqm:'} <strong style="color: #0d48a1;">${dist.avgPricePerSqm.toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}</strong></div>
          <div style="color: #10b981; font-size: 0.75rem; font-weight: bold;">${isAr ? 'معدل النمو السنوي:' : 'Annual Growth:'} ${dist.appreciation} 📈</div>
        </div>
      `;

      polygon.bindTooltip(tooltipContent, {
        sticky: true,
        className: 'district-polygon-leaflet-tooltip'
      });

      polygon.on('click', () => {
        handleFlyToDistrict(dist);
      });

      polygon.on('mouseover', () => {
        polygon.setStyle({
          weight: 3,
          color: '#ffca28',
          fillOpacity: 0.26
        });
      });

      polygon.on('mouseout', () => {
        if (activeDistrict !== dist.id) {
          polygon.setStyle({
            weight: 2,
            color: '#0d48a1',
            fillOpacity: 0.08
          });
        }
      });

      districtPolygonsRef.current.push(polygon);
    });
  }, [showBoundaries, activeDistrict, isAr]);

  // Center on selected property
  useEffect(() => {
    if (selectedProperty && selectedProperty.coordinates && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [selectedProperty.coordinates.lat, selectedProperty.coordinates.lng],
        15,
        { duration: 1.2 }
      );
    }
  }, [selectedProperty]);

  return (
    <div className={`property-map-view-wrapper ${isFullscreen ? 'fullscreen-map-active' : ''}`}>
      {/* Floating Map Controls Toolbar */}
      <div className="map-layer-switcher-pill">
        <button
          type="button"
          className={`layer-btn ${mapType === 'satellite' ? 'active' : ''}`}
          onClick={() => setMapType('satellite')}
        >
          <Satellite size={14} />
          <span>{isAr ? 'قمر صناعي (HD)' : 'Satellite'}</span>
        </button>
        <button
          type="button"
          className={`layer-btn ${mapType === 'streets' ? 'active' : ''}`}
          onClick={() => setMapType('streets')}
        >
          <MapIcon size={14} />
          <span>{isAr ? 'خريطة الشوارع' : 'Streets'}</span>
        </button>

        <div className="map-pill-divider" />

        <button
          type="button"
          className={`layer-btn ${showBoundaries ? 'active' : ''}`}
          onClick={() => setShowBoundaries(prev => !prev)}
          title={isAr ? 'عرض حدود ونطاقات الأحياء ومؤشرات المتر' : 'Toggle District Boundaries'}
        >
          <Layers size={14} />
          <span>{isAr ? 'نطاقات الأحياء' : 'Boundaries'}</span>
        </button>

        <div className="map-pill-divider" />

        <button
          type="button"
          className="layer-btn btn-fullscreen-toggle"
          onClick={toggleFullscreen}
          title={isAr ? (isFullscreen ? 'إنهاء ملء الشاشة' : 'تكبير الخريطة ملء الشاشة') : 'Toggle Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          <span>{isAr ? (isFullscreen ? 'تصغير' : 'ملء الشاشة') : (isFullscreen ? 'Minimize' : 'Expand')}</span>
        </button>
      </div>

      {/* Floating District Quick Jump Bar */}
      <div className="map-districts-quick-bar">
        {SOHAG_DISTRICTS.map((dist) => (
          <button
            key={dist.id}
            type="button"
            className={`map-dist-chip ${activeDistrict === dist.id ? 'active' : ''}`}
            onClick={() => handleFlyToDistrict(dist)}
          >
            <Navigation size={12} className={activeDistrict === dist.id ? 'text-gold' : ''} />
            <span>{isAr ? dist.label_ar : dist.label_en}</span>
          </button>
        ))}
      </div>

      {/* Floating District Intelligence HUD Card */}
      {districtHudInfo && (
        <div className="district-intelligence-hud-card" style={{
          position: 'absolute',
          bottom: '24px',
          right: isAr ? '20px' : 'auto',
          left: isAr ? 'auto' : '20px',
          zIndex: 1000,
          background: 'rgba(8, 18, 38, 0.94)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 202, 40, 0.4)',
          borderRadius: '14px',
          padding: '14px 18px',
          maxWidth: '320px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} className="text-gold" />
              <strong style={{ fontSize: '0.95rem', color: '#ffca28' }}>
                {isAr ? districtHudInfo.label_ar : districtHudInfo.label_en}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setDistrictHudInfo(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px', fontSize: '0.78rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '6px 10px', borderRadius: '8px' }}>
              <span style={{ color: '#94a3b8', display: 'block' }}>{isAr ? 'متوسط المتر' : 'Avg Sqm'}</span>
              <strong style={{ color: '#ffffff', fontSize: '0.88rem' }}>{districtHudInfo.avgPricePerSqm.toLocaleString()} ج.م</strong>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '6px 10px', borderRadius: '8px' }}>
              <span style={{ color: '#6ee7b7', display: 'block' }}>{isAr ? 'النمو السنوي' : 'Growth'}</span>
              <strong style={{ color: '#10b981', fontSize: '0.88rem' }}>{districtHudInfo.appreciation} 📈</strong>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={12} className="text-gold" />
            <span>{isAr ? districtHudInfo.demand_ar : districtHudInfo.demand_en}</span>
          </div>
        </div>
      )}

      <div ref={mapContainerRef} className="interactive-leaflet-map" />
    </div>
  );
}
