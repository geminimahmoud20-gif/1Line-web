import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  Satellite, 
  Map as MapIcon, 
  Check,
  Navigation,
  Crosshair,
  Sparkles
} from 'lucide-react';
import { getAreas } from '../../utils/areasData';

const SOHAG_HOTSPOTS = [
  { id: 'thakafa', name_ar: 'ميدان الثقافة', name_en: 'Thakafa Sq', lat: 26.5580, lng: 31.6960 },
  { id: 'corniche', name_ar: 'كورنيش النيل', name_en: 'Nile Corniche', lat: 26.5620, lng: 31.7050 },
  { id: 'gomhoreya', name_ar: 'شارع الجمهورية', name_en: 'Gomhoureya St', lat: 26.5590, lng: 31.6990 },
  { id: 'city_st', name_ar: 'سيتي والشبان', name_en: 'City & Youth', lat: 26.5540, lng: 31.6920 },
  { id: 'new_sohag', name_ar: 'سوهاج الجديدة', name_en: 'New Sohag', lat: 26.4780, lng: 31.6850 },
  { id: 'kawthar', name_ar: 'مدينة الكوثر', name_en: 'Kawthar City', lat: 26.5450, lng: 31.7950 },
  { id: 'akhmeem', name_ar: 'أخميم', name_en: 'Akhmeem', lat: 26.5630, lng: 31.7450 }
];

export default function InteractiveMapPickerModal({
  isOpen,
  onClose,
  initialCoordinates = { lat: 26.5569, lng: 31.7001 },
  onConfirmCoordinates,
  lang = 'ar',
  triggerToast
}) {
  const isAr = lang === 'ar';
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const tileLayerRef = useRef(null);

  const [areas, setAreas] = useState(() => getAreas());
  const [currentCoords, setCurrentCoords] = useState(initialCoordinates || { lat: 26.5569, lng: 31.7001 });
  const [mapType, setMapType] = useState('satellite'); // 'satellite' | 'streets'

  useEffect(() => {
    const handleUpdate = () => setAreas(getAreas());
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

  const streetTiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const satelliteTiles = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const startLat = initialCoordinates?.lat || 26.5569;
    const startLng = initialCoordinates?.lng || 31.7001;

    // Initialize Map
    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: 16,
      minZoom: 12,
      maxZoom: 19
    });

    // Add Tile Layer
    tileLayerRef.current = L.tileLayer(satelliteTiles, {
      attribution: '&copy; Esri World Imagery',
      maxZoom: 19
    }).addTo(map);

    // Custom Draggable Pin
    const customPinIcon = L.divIcon({
      className: 'custom-map-picker-pin',
      html: `
        <div style="
          position: relative;
          width: 38px;
          height: 38px;
          background: #d97706;
          border: 3px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 14px rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
        ">
          <span style="transform: rotate(45deg); font-size: 16px;">🏢</span>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 38]
    });

    const marker = L.marker([startLat, startLng], {
      icon: customPinIcon,
      draggable: true
    }).addTo(map);

    marker.on('dragend', (event) => {
      const position = event.target.getLatLng();
      setCurrentCoords({
        lat: Number(position.lat.toFixed(6)),
        lng: Number(position.lng.toFixed(6))
      });
    });

    map.on('click', (event) => {
      marker.setLatLng(event.latlng);
      setCurrentCoords({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6))
      });
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
    };
  }, [isOpen, initialCoordinates?.lat, initialCoordinates?.lng]);

  if (!isOpen) return null;

  // Handle Layer Switch
  const toggleMapLayer = (type) => {
    setMapType(type);
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    if (type === 'satellite') {
      tileLayerRef.current = L.tileLayer(satelliteTiles, { maxZoom: 19 }).addTo(mapInstanceRef.current);
    } else {
      tileLayerRef.current = L.tileLayer(streetTiles, { maxZoom: 19 }).addTo(mapInstanceRef.current);
    }
  };

  // Jump to Area center
  const handleJumpToArea = (areaKey) => {
    const targetArea = areas.find(a => a.id === areaKey);
    if (targetArea && targetArea.center && mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([targetArea.center.lat, targetArea.center.lng], 16, { duration: 1.2 });
      markerRef.current.setLatLng([targetArea.center.lat, targetArea.center.lng]);
      setCurrentCoords({
        lat: Number(targetArea.center.lat.toFixed(6)),
        lng: Number(targetArea.center.lng.toFixed(6))
      });
    }
  };

  // Jump to Hotspot
  const handleJumpToHotspot = (spot) => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([spot.lat, spot.lng], 17, { duration: 1.2 });
      markerRef.current.setLatLng([spot.lat, spot.lng]);
      setCurrentCoords({
        lat: spot.lat,
        lng: spot.lng
      });
      if (triggerToast) {
        triggerToast(isAr ? `تم الانتقال إلى ${spot.name_ar}` : `Moved to ${spot.name_en}`, 'info');
      }
    }
  };

  // Live GPS Geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      if (triggerToast) triggerToast(isAr ? 'خاصية تحديد الموقع غير مدعومة في متصفحك' : 'Geolocation not supported', 'warning');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6))
        };
        setCurrentCoords(coords);
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([coords.lat, coords.lng], 18, { duration: 1.2 });
          markerRef.current.setLatLng([coords.lat, coords.lng]);
        }
        if (triggerToast) triggerToast(isAr ? 'تم تحديد موقعك الميداني الحالي بنجاح! 📍' : 'GPS location pinned!', 'success');
      },
      () => {
        if (triggerToast) triggerToast(isAr ? 'تعذر جلب موقع GPS، يرجى تفعيل صلاحية الموقع' : 'Could not retrieve GPS location', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Manual Coordinates Change
  const handleManualCoordChange = (field, val) => {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const updated = { ...currentCoords, [field]: Number(num.toFixed(6)) };
      setCurrentCoords(updated);
      if (mapInstanceRef.current && markerRef.current && !isNaN(updated.lat) && !isNaN(updated.lng)) {
        mapInstanceRef.current.panTo([updated.lat, updated.lng]);
        markerRef.current.setLatLng([updated.lat, updated.lng]);
      }
    }
  };

  const handleConfirm = () => {
    if (onConfirmCoordinates) {
      onConfirmCoordinates(currentCoords);
    }
    if (triggerToast) {
      triggerToast(isAr ? 'تم تثبيت الموقع الجغرافي الدقيق للعقار بنجاح! 📍' : 'Exact rooftop GPS pinned!', 'success');
    }
    onClose();
  };

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="property-form-modal-card animate-fadeIn" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '880px', width: '94%' }}>
        {/* Header */}
        <div className="modal-form-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={22} className="text-gold" />
            <div>
              <h3 style={{ margin: 0 }}>
                {isAr ? 'تحديد الموقع الدقيق على سطح المبنى (GIS Rooftop Pin-Picker)' : 'Pin-Point Rooftop GPS Picker'}
              </h3>
              <small style={{ color: 'var(--text-secondary)' }}>
                {isAr ? 'اسحب الدبوس أو انقر على سطح العمارة لتحديد موقع العقار بدقة متناهية' : 'Drag pin or click directly on building rooftop'}
              </small>
            </div>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Quick Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            {/* Area Jump Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {isAr ? 'الانتقال السريع لمنطقة:' : 'Jump to District:'}
              </span>
              <select
                onChange={(e) => handleJumpToArea(e.target.value)}
                className="form-input"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              >
                {areas.filter(a => a.id !== 'all').map(a => (
                  <option key={a.id} value={a.id}>{isAr ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}</option>
                ))}
              </select>
            </div>

            {/* GPS & Map Style Controls */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={handleLocateMe}
                style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: 'rgba(16, 185, 129, 0.5)', color: '#34d399' }}
                title={isAr ? 'تحديد موقعي الميداني الحالي بواسطة GPS' : 'Locate my current position'}
              >
                <Crosshair size={13} />
                <span>{isAr ? 'موقعي الميداني' : 'My GPS'}</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm ${mapType === 'satellite' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => toggleMapLayer('satellite')}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                <Satellite size={13} />
                <span>{isAr ? 'أقمار صناعية' : 'Satellite'}</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${mapType === 'streets' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => toggleMapLayer('streets')}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                <MapIcon size={13} />
                <span>{isAr ? 'شوارع' : 'Streets'}</span>
              </button>
            </div>
          </div>

          {/* Quick Landmark Hotspot Chips */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '10px'
          }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Sparkles size={11} className="text-gold" />
              {isAr ? 'معالم سوهاج:' : 'Hotspots:'}
            </span>
            {SOHAG_HOTSPOTS.map((spot) => (
              <button
                key={spot.id}
                type="button"
                onClick={() => handleJumpToHotspot(spot)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e2e8f0',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
              >
                📍 {isAr ? spot.name_ar : spot.name_en}
              </button>
            ))}
          </div>

          {/* Interactive Leaflet Map Container */}
          <div
            ref={mapContainerRef}
            style={{
              height: '400px',
              width: '100%',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--border-light)',
              overflow: 'hidden',
              position: 'relative'
            }}
          />

          {/* Coordinates Live Readout & Manual Fine-Tuning Bar */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.82rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>Lat:</span>
                <input
                  type="number"
                  step="0.000001"
                  value={currentCoords.lat}
                  onChange={(e) => handleManualCoordChange('lat', e.target.value)}
                  className="form-input"
                  style={{ width: '110px', padding: '3px 6px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.4)' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>Lng:</span>
                <input
                  type="number"
                  step="0.000001"
                  value={currentCoords.lng}
                  onChange={(e) => handleManualCoordChange('lng', e.target.value)}
                  className="form-input"
                  style={{ width: '110px', padding: '3px 6px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.4)' }}
                />
              </label>
            </div>

            <span className="badge" style={{ background: 'var(--emerald-bg)', color: 'var(--emerald)', fontSize: '0.72rem' }}>
              ✓ {isAr ? 'إحداثيات عالية الدقة جاهزة للربط' : 'High Precision GPS Ready'}
            </span>
          </div>

          {/* Modal Actions */}
          <div className="cms-modal-actions" style={{ marginTop: '16px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              style={{ background: 'var(--gradient-gold)' }}
            >
              <Check size={16} />
              <span>{isAr ? 'اعتماد وتثبيت الموقع على الخريطة' : 'Confirm & Pin Location'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
