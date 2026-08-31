import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Layers, Satellite, Map as MapIcon, Maximize2, Minimize2, X, Navigation } from 'lucide-react';

// Fix Leaflet Default Marker Icon issues in Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function PropertyMapView({
  properties = [],
  selectedProperty,
  onSelectProperty,
  lang = 'ar'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const tileLayerRef = useRef(null);
  const [mapType, setMapType] = useState('satellite'); // 'streets' | 'satellite'
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isAr = lang === 'ar';

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

      // Price Formatting in Millions
      const priceFormatted = (prop.price / 1000000).toFixed(1) + (isAr ? ' م.ج' : 'M');

      // Luxury Beacon Pin with Pointer Needle directly hitting the property unit
      const customPinHtml = `
        <div class="property-map-pin-container ${isSelected ? 'is-selected' : ''}">
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

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(mapInstanceRef.current);

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

      markersRef.current.push(marker);
    });

    if (bounds.length > 0 && mapInstanceRef.current && !selectedProperty) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [properties, isAr, selectedProperty, onSelectProperty]);

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
          className="layer-btn btn-fullscreen-toggle"
          onClick={toggleFullscreen}
          title={isAr ? (isFullscreen ? 'إنهاء ملء الشاشة' : 'تكبير الخريطة ملء الشاشة') : 'Toggle Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          <span>{isAr ? (isFullscreen ? 'تصغير' : 'ملء الشاشة') : (isFullscreen ? 'Minimize' : 'Expand')}</span>
        </button>
      </div>

      <div ref={mapContainerRef} className="interactive-leaflet-map" />
    </div>
  );
}
