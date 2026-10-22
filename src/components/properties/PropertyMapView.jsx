import { useEffect, useRef, useState, useMemo } from 'react';
import { isAgricultural, isIndustrial } from '../../utils/propertyKinds';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // only map pages pay for it (overrides in App.css are more specific)
import './map-layout.css';
import { Layers, Satellite, Map as MapIcon, Maximize2, Minimize2, X, Navigation, TrendingUp, Sparkles, Landmark, Filter, Search } from 'lucide-react';
import { formatCurrencyPrice } from '../../utils/currencyAndBenchmark';
import { mapLayout, pinPriceLabel, escapeHtml } from '../../utils/mapPins';
import { sizeLabel } from '../../utils/propertyKinds';
import { getAreas } from '../../utils/areasData';
import { thumbUrl } from '../../utils/imageThumbs';

// Area centre from the areas the CRM manages ({ lat, lng }), used for the area bubbles
const areaCenterOf = (key) => {
  const c = getAreas().find((a) => a.id === key)?.center;
  return c && Number.isFinite(Number(c.lat)) ? { lat: Number(c.lat), lng: Number(c.lng) } : null;
};

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
    rentalYield: '10.5%',
    demand_ar: 'نشاط استثماري مرتفع ومتنوع',
    demand_en: 'High Diversified Demand',
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
    rentalYield: '12.8%',
    demand_ar: 'أعلى وتيرة نمو للكمبوندات والجامعات',
    demand_en: 'Fastest Capital Growth & Compounds',
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
    rentalYield: '9.2%',
    demand_ar: 'المنطقة السكنية الأكثر سيولة وطلباً',
    demand_en: 'Prime Liquid Residential Core',
    polygon: [
      [26.5720, 31.6970],
      [26.5720, 31.7180],
      [26.5480, 31.7180],
      [26.5480, 31.6970]
    ]
  },
  { 
    id: 'corniche', 
    label_ar: 'كورنيش النيل', 
    label_en: 'Nile Corniche', 
    center: [26.5640, 31.7010], 
    zoom: 16,
    avgPricePerSqm: 29000,
    appreciation: '+22.8%',
    rentalYield: '11.4%',
    demand_ar: 'إطلالة نيلية نادرة وأعلى قيمة سوقية',
    demand_en: 'Ultra-Luxury Nile Waterfront',
    polygon: [
      [26.5760, 31.6980],
      [26.5760, 31.7070],
      [26.5490, 31.7070],
      [26.5490, 31.6980]
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
    rentalYield: '8.8%',
    demand_ar: 'طلب تجاري ومركزي مستقر وسرعة تأجير',
    demand_en: 'Stable Commercial & Central Core',
    polygon: [
      [26.5610, 31.6780],
      [26.5610, 31.6960],
      [26.5410, 31.6960],
      [26.5410, 31.6780]
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
    rentalYield: '8.5%',
    demand_ar: 'توسع عمراني متسارع وأسعار منافسة',
    demand_en: 'Emerging High-Value Hub',
    polygon: [
      [26.5780, 31.7300],
      [26.5780, 31.7650],
      [26.5460, 31.7650],
      [26.5460, 31.7300]
    ]
  },
  { 
    id: 'al_kawthar', 
    label_ar: 'حي الكوثر', 
    label_en: 'Al-Kawthar', 
    center: [26.6200, 31.8100], 
    zoom: 14,
    avgPricePerSqm: 11800,
    appreciation: '+16.2%',
    rentalYield: '13.1%',
    demand_ar: 'منطقة صناعية واستثمارية واعدة للتطوير',
    demand_en: 'Industrial & Investment Zone',
    polygon: [
      [26.6350, 31.7950],
      [26.6350, 31.8250],
      [26.6050, 31.8250],
      [26.6050, 31.7950]
    ]
  }
];

const SOHAG_LANDMARKS = [
  {
    id: 'univ_new',
    name_ar: 'جامعة سوهاج الجديدة (الكوامل)',
    name_en: 'New Sohag University',
    category: 'education',
    coordinates: [26.4680, 31.6750],
    icon: '🎓'
  },
  {
    id: 'airport_sohag',
    name_ar: 'مطار سوهاج الدولي',
    name_en: 'Sohag International Airport',
    category: 'transport',
    coordinates: [26.3350, 31.7350],
    icon: '✈️'
  },
  {
    id: 'hosp_univ',
    name_ar: 'مستشفى سوهاج الجامعي الجديد',
    name_en: 'Sohag University Hospital',
    category: 'health',
    coordinates: [26.4650, 31.6680],
    icon: '🏥'
  },
  {
    id: 'gov_building',
    name_ar: 'ديوان عام محافظة سوهاج',
    name_en: 'Sohag Governorate HQ',
    category: 'civic',
    coordinates: [26.5590, 31.7015],
    icon: '🏛️'
  },
  {
    id: 'corniche_walk',
    name_ar: 'ممشى وكورنيش النيل وسيتي',
    name_en: 'Nile Corniche Promenade',
    category: 'leisure',
    coordinates: [26.5650, 31.7020],
    icon: '🌊'
  },
  {
    id: 'akhmeem_bridge',
    name_ar: 'كوبري أخميم العلوي المعلق',
    name_en: 'Akhmeem Nile Bridge',
    category: 'transport',
    coordinates: [26.5615, 31.7070],
    icon: '🌉'
  }
];

export default function PropertyMapView({
  properties = [],
  selectedProperty,
  onSelectProperty,
  hoveredPropertyId = null,
  onHoverProperty,
  onFilterChange,
  onBoundsChange,
  viewBounds = null,
  currency = 'EGP',
  lang = 'ar'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const landmarksRef = useRef([]);
  const districtPolygonsRef = useRef([]);
  const tileLayerRef = useRef(null);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  
  const [mapType, setMapType] = useState('satellite'); // 'streets' | 'satellite'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeDistrict, setActiveDistrict] = useState('all');
  // Off at first so the unit pins and area circles are readable; one tap turns them on
  const [showBoundaries, setShowBoundaries] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [mapPropertyTypeFilter, setMapPropertyTypeFilter] = useState('all');
  const [districtHudInfo, setDistrictHudInfo] = useState(null);
  const [mapMoved, setMapMoved] = useState(false);
  const [zoom, setZoom] = useState(14);
  const fittingRef = useRef(false);

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

  // Filter properties on the map if the user chooses a type from the map HUD
  const visibleMapProperties = useMemo(() => {
    if (mapPropertyTypeFilter === 'all') return properties;
    if (mapPropertyTypeFilter === 'agricultural') return properties.filter(isAgricultural);
    if (mapPropertyTypeFilter === 'industrial') return properties.filter(isIndustrial);
    return properties.filter(p => p.type === mapPropertyTypeFilter);
  }, [properties, mapPropertyTypeFilter]);

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
        minZoom: 11,
        maxZoom: 19,
        zoomControl: false
      });

      // Zoom controls at top-left
      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Initial Satellite Tile Layer
      tileLayerRef.current = L.tileLayer(satelliteTiles, {
        attribution: '&copy; Esri &mdash; Earthstar Geographics',
        maxZoom: 19
      }).addTo(map);

      // Popup links open the listing inside the app (no full page reload)
      map.on('popupopen', (e) => {
        const link = e.popup.getElement()?.querySelector('a.popup-cta-btn');
        if (!link || link.dataset.spa) return;
        link.dataset.spa = '1';
        link.addEventListener('click', (ev) => {
          if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button === 1) return;
          ev.preventDefault();
          navigateRef.current(link.getAttribute('href'));
        });
      });

      mapInstanceRef.current = map;
    }

    return () => {
      // Release Leaflet (listeners, tiles, the container's _leaflet_id) so a remount starts clean
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      tileLayerRef.current = null;
      markersRef.current = [];
      landmarksRef.current = [];
      districtPolygonsRef.current = [];
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

  // Pins for listings placed on the map in the CRM; one bubble per area for all the others
  const layout = useMemo(() => mapLayout(visibleMapProperties, areaCenterOf), [visibleMapProperties]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = [];

    // Circles closer than ~100px at this zoom merge into one; zooming in splits them again
    const map = mapInstanceRef.current;
    const merged = [];
    layout.bubbles.forEach((g) => {
      const pt = map.project([g.lat, g.lng], zoom);
      const near = merged.find((m) => m.pt.distanceTo(pt) < 100);
      if (near) {
        near.count += g.count;
        near.areaKeys.push(g.areaKey);
        if (g.minPrice > 0 && (near.minPrice === 0 || g.minPrice < near.minPrice)) near.minPrice = g.minPrice;
      } else {
        merged.push({ ...g, pt, areaKeys: [g.areaKey] });
      }
    });

    merged.forEach((g) => {
      bounds.push([g.lat, g.lng]);
      const area = getAreas().find((x) => x.id === g.areaKey);
      const single = g.areaKeys.length === 1;
      const areaName = escapeHtml(single
        ? ((isAr ? (area?.name_ar || area?.label_ar) : (area?.name_en || area?.name_ar)) || g.areaKey)
        : (isAr ? `${g.areaKeys.length} مناطق قريبة` : `${g.areaKeys.length} nearby areas`));
      const from = g.minPrice > 0 ? (isAr ? `من ${pinPriceLabel(g.minPrice, true)}` : `from ${pinPriceLabel(g.minPrice, false)}`) : '';
      const html = `
        <div class="map-area-bubble" title="${areaName}">
          <strong>${g.count}</strong>
          <span>${isAr ? 'وحدة' : 'units'}${from ? ` · ${from}` : ''}</span>
          <small>${areaName}</small>
        </div>`;
      const icon = L.divIcon({ className: 'custom-leaflet-area-bubble', html, iconSize: [108, 52], iconAnchor: [54, 26] });
      const marker = L.marker([g.lat, g.lng], { icon, keyboard: true, title: areaName }).addTo(mapInstanceRef.current);
      marker.on('click', () => {
        if (!single) { map.flyTo([g.lat, g.lng], Math.min(zoom + 2, 17), { duration: 0.6 }); return; }
        if (onFilterChange) onFilterChange('area', g.areaKey);
        map.flyTo([g.lat, g.lng], 15, { duration: 0.8 });
      });
      markersRef.current.push(marker);
    });

    layout.pins.forEach(prop => {
      const lat = Number(prop.coordinates.lat);
      const lng = Number(prop.coordinates.lng);
      bounds.push([lat, lng]);

      const title = escapeHtml(isAr ? prop.title_ar : (prop.title_en || prop.title_ar));
      const location = escapeHtml(isAr ? prop.locationName_ar : (prop.locationName_en || prop.locationName_ar));
      const isSelected = selectedProperty?.id === prop.id;
      const isHovered = hoveredPropertyId === prop.id;

      const priceObj = formatCurrencyPrice(prop.price, currency, lang);
      const pinLabel = escapeHtml(pinPriceLabel(prop.price, isAr));
      const hasPrice = Number(prop.price) > 0;
      const image = escapeHtml(prop.images && prop.images[0] ? thumbUrl(prop.images[0]) : '/no-photo.svg');
      const badge = prop.badge_ar ? `<span class="popup-badge-pill">${escapeHtml(isAr ? prop.badge_ar : (prop.badge_en || prop.badge_ar))}</span>` : '';

      // Price pin with a pointer on the listing's spot
      const customPinHtml = `
        <div class="property-map-pin-container ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''}">
          <div class="pin-pulse-radar"></div>
          <div class="pin-bubble-pill">
            <span class="pin-badge-dot"></span>
            <span class="pin-price-label">${pinLabel}</span>
          </div>
          <div class="pin-needle-pointer"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-property-icon',
        html: customPinHtml,
        iconSize: [96, 46],
        iconAnchor: [48, 46],
        popupAnchor: [0, -48]
      });

      const marker = L.marker([lat, lng], {
        icon: customIcon,
        zIndexOffset: (isSelected || isHovered) ? 1000 : 0
      }).addTo(mapInstanceRef.current);

      const popupContent = `
        <div class="luxury-map-popup-card">
          <div class="popup-thumb-wrap">
            <img src="${image}" alt="${title}" class="popup-thumb-img" />
            ${badge}
          </div>
          <div class="popup-details-body">
            <h5 class="popup-property-title">${title}</h5>
            <div class="popup-loc-row">
              <span>📍 ${location}</span>
            </div>
            <div class="popup-price-row">
              <div>
                <strong class="popup-price">${hasPrice ? `${escapeHtml(priceObj.primary)} ${escapeHtml(priceObj.symbol)}` : escapeHtml(pinPriceLabel(0, isAr))}</strong>${hasPrice && priceObj.approx ? `<div class="popup-approx">${escapeHtml(priceObj.approx)}</div>` : ''}
              </div>
              <span class="popup-size">${escapeHtml(sizeLabel(prop, isAr))}</span>
            </div>
            <a href="/properties/${encodeURIComponent(prop.id)}" class="popup-cta-btn">
              ${isAr ? 'تفاصيل الوحدة ↗' : 'View details ↗'}
            </a>
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

    if (bounds.length > 0 && mapInstanceRef.current && !selectedProperty && activeDistrict === 'all' && !viewBounds) {
      fittingRef.current = true;
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [layout, zoom, isAr, lang, selectedProperty, hoveredPropertyId, onSelectProperty, onHoverProperty, onFilterChange, activeDistrict, currency, viewBounds]);

  // "ابحث في المنطقة دي": after the visitor pans or zooms, offer to limit the list to the view
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return undefined;
    const onMoveEnd = () => {
      setZoom(map.getZoom());
      if (fittingRef.current) { fittingRef.current = false; return; }
      setMapMoved(true);
    };
    map.on('moveend', onMoveEnd);
    return () => { map.off('moveend', onMoveEnd); };
  }, []);

  const searchThisArea = () => {
    const map = mapInstanceRef.current;
    if (!map || !onBoundsChange) return;
    const b = map.getBounds();
    onBoundsChange({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() });
    setMapMoved(false);
  };

  // Landmarks Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    landmarksRef.current.forEach(l => l.remove());
    landmarksRef.current = [];

    if (!showLandmarks) return;

    SOHAG_LANDMARKS.forEach(lm => {
      const lmIconHtml = `
        <div class="landmark-map-pin">
          <div class="landmark-halo"></div>
          <div class="landmark-icon-badge">${lm.icon}</div>
        </div>
      `;

      const customLmIcon = L.divIcon({
        className: 'custom-landmark-icon',
        html: lmIconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20]
      });

      const lmMarker = L.marker(lm.coordinates, {
        icon: customLmIcon,
        zIndexOffset: 50
      }).addTo(mapInstanceRef.current);

      const lmTooltip = `
        <div style="font-family: Cairo, sans-serif; direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'}; font-size: 0.82rem; font-weight: 700; color: #0f172a; padding: 2px;">
          ${lm.icon} ${isAr ? lm.name_ar : lm.name_en}
        </div>
      `;

      lmMarker.bindTooltip(lmTooltip, {
        sticky: true,
        className: 'landmark-leaflet-tooltip'
      });

      landmarksRef.current.push(lmMarker);
    });
  }, [showLandmarks, isAr]);

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
          <div style="color: #475569; font-size: 0.75rem;">${isAr ? 'متوسط سعر المتر:' : 'Avg Sqm:'} <strong style="color: #0d48a1;">${dist.avgPricePerSqm.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}</strong></div>
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
        16,
        { duration: 1.2 }
      );
    }
  }, [selectedProperty]);

  // Calculate count of properties in active HUD district
  const districtPropCount = useMemo(() => {
    if (!districtHudInfo || districtHudInfo.id === 'all') return properties.length;
    return properties.filter(p => p.areaKey === districtHudInfo.id).length;
  }, [districtHudInfo, properties]);

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
          <span>{isAr ? 'قمر صناعي' : 'Satellite'}</span>
        </button>
        <button
          type="button"
          className={`layer-btn ${mapType === 'streets' ? 'active' : ''}`}
          onClick={() => setMapType('streets')}
        >
          <MapIcon size={14} />
          <span>{isAr ? 'الشوارع' : 'Streets'}</span>
        </button>

        <div className="map-pill-divider" />

        <button
          type="button"
          className={`layer-btn ${showBoundaries ? 'active' : ''}`}
          onClick={() => setShowBoundaries(prev => !prev)}
          title={isAr ? 'عرض حدود ونطاقات الأحياء ومؤشرات المتر' : 'Toggle District Boundaries'}
        >
          <Layers size={14} />
          <span>{isAr ? 'نطاقات الأحياء' : 'Zones'}</span>
        </button>

        <button
          type="button"
          className={`layer-btn ${showLandmarks ? 'active' : ''}`}
          onClick={() => setShowLandmarks(prev => !prev)}
          title={isAr ? 'عرض معالم سوهاج والجامعات والمستشفيات' : 'Toggle Sohag Landmarks'}
        >
          <Landmark size={14} />
          <span>{isAr ? 'معالم سوهاج' : 'Landmarks'}</span>
        </button>

        <div className="map-pill-divider" />

        <button
          type="button"
          className="layer-btn btn-fullscreen-toggle"
          onClick={toggleFullscreen}
          title={isAr ? (isFullscreen ? 'إنهاء ملء الشاشة' : 'تكبير الخريطة ملء الشاشة') : 'Toggle Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          <span>{isAr ? (isFullscreen ? 'تصغير' : 'ملء الشاشة') : (isFullscreen ? 'Min' : 'Full')}</span>
        </button>
      </div>

      {/* Floating Map Property Type Quick Filter Chips */}
      <div className="map-type-quick-chips">
        {[
          { id: 'all', label_ar: 'الكل', label_en: 'All' },
          { id: 'apartment', label_ar: 'شقق', label_en: 'Apartments' },
          { id: 'villa', label_ar: 'فيلات', label_en: 'Villas' },
          { id: 'commercial', label_ar: 'تجاري', label_en: 'Commercial' },
          { id: 'land', label_ar: 'أراضي', label_en: 'Land' },
          { id: 'agricultural', label_ar: 'زراعي', label_en: 'Farmland' },
          { id: 'industrial', label_ar: 'صناعي', label_en: 'Industrial' }
        ].map(item => (
          <button
            key={item.id}
            type="button"
            className={`map-type-chip ${mapPropertyTypeFilter === item.id ? 'active' : ''}`}
            onClick={() => setMapPropertyTypeFilter(item.id)}
          >
            {isAr ? item.label_ar : item.label_en}
          </button>
        ))}
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
        <div className="district-intelligence-hud-card">
          <div className="hud-card-header">
            <div className="hud-header-title">
              <Sparkles size={16} className="text-gold" />
              <strong>{isAr ? districtHudInfo.label_ar : districtHudInfo.label_en}</strong>
            </div>
            <button
              type="button"
              className="hud-close-btn"
              onClick={() => setDistrictHudInfo(null)}
              aria-label="إغلاق"
            >
              <X size={14} />
            </button>
          </div>

          <div className="hud-metrics-grid">
            <div className="hud-metric-box">
              <span className="hud-metric-label">{isAr ? 'متوسط المتر' : 'Avg Sqm'}</span>
              <strong className="hud-metric-val">{districtHudInfo.avgPricePerSqm.toLocaleString('en-US')} ج.م</strong>
            </div>
            <div className="hud-metric-box growth-box">
              <span className="hud-metric-label">{isAr ? 'النمو السنوي' : 'Growth'}</span>
              <strong className="hud-metric-val growth-val">{districtHudInfo.appreciation} 📈</strong>
            </div>
            <div className="hud-metric-box">
              <span className="hud-metric-label">{isAr ? 'العائد المتوقع' : 'ROI'}</span>
              <strong className="hud-metric-val text-gold">{districtHudInfo.rentalYield}</strong>
            </div>
            <div className="hud-metric-box">
              <span className="hud-metric-label">{isAr ? 'العقارات المتاحة' : 'Units'}</span>
              <strong className="hud-metric-val">{districtPropCount}</strong>
            </div>
          </div>

          <div className="hud-demand-note">
            <TrendingUp size={12} className="text-gold" />
            <span>{isAr ? districtHudInfo.demand_ar : districtHudInfo.demand_en}</span>
          </div>

          {onFilterChange && districtHudInfo.id !== 'all' && (
            <button
              type="button"
              className="hud-filter-action-btn"
              onClick={() => onFilterChange('area', districtHudInfo.id)}
            >
              <Filter size={12} />
              <span>{isAr ? `تصفية عقارات ${districtHudInfo.label_ar}` : `Filter ${districtHudInfo.label_en}`}</span>
            </button>
          )}
        </div>
      )}

      {mapMoved && onBoundsChange && (
        <button type="button" className="map-search-area-btn" onClick={searchThisArea}>
          <Search size={14} aria-hidden="true" /> {isAr ? 'ابحث في المنطقة دي' : 'Search this area'}
        </button>
      )}

      <p className="map-legend-note" role="note">
        {isAr
          ? `الدبوس = موقع الوحدة بالظبط. الدايرة = وحدات المنطقة (دوس عليها تتفلتر).${layout.unplaced ? ` ${layout.unplaced} وحدة مالهاش منطقة على الخريطة.` : ''}`
          : `Pin = exact spot. Circle = listings in that area (tap to filter).${layout.unplaced ? ` ${layout.unplaced} listings have no area on the map.` : ''}`}
      </p>

      <div ref={mapContainerRef} className="interactive-leaflet-map" />
    </div>
  );
}
