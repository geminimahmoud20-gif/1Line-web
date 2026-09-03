import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  Satellite, 
  Map as MapIcon, 
  Check, 
  X, 
  Navigation, 
  Layers,
  Sparkles,
  Search
} from 'lucide-react';
import { getAreas } from '../../utils/areasData';

export default function InteractiveMapPickerModal({
  isOpen,
  onClose,
  initialCoordinates = { lat: 26.5569, lng: 31.7001 },
  onConfirmCoordinates,
  lang = 'ar',
  triggerToast
}) {
  if (!isOpen) return null;

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
    if (!mapContainerRef.current) return;

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
  }, []);

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
      mapInstanceRef.current.setView([targetArea.center.lat, targetArea.center.lng], 16);
      markerRef.current.setLatLng([targetArea.center.lat, targetArea.center.lng]);
      setCurrentCoords({
        lat: targetArea.center.lat,
        lng: targetArea.center.lng
      });
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
      <div className="property-form-modal-card animate-fadeIn" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', width: '92%' }}>
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
            marginBottom: '12px',
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

            {/* Map Style Controls */}
            <div style={{ display: 'flex', gap: '6px' }}>
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

          {/* Interactive Leaflet Map Container */}
          <div
            ref={mapContainerRef}
            style={{
              height: '420px',
              width: '100%',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--border-light)',
              overflow: 'hidden',
              position: 'relative'
            }}
          />

          {/* Coordinates Live Readout Bar */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 16px',
            marginTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
              <span>
                <strong style={{ color: 'var(--accent-gold)' }}>خط العرض (Latitude):</strong> {currentCoords.lat}
              </span>
              <span>
                <strong style={{ color: 'var(--accent-gold)' }}>خط الطول (Longitude):</strong> {currentCoords.lng}
              </span>
            </div>

            <span className="badge" style={{ background: 'var(--emerald-bg)', color: 'var(--emerald)', fontSize: '0.75rem' }}>
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
