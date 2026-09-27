import { Sun, Compass, Wind, Eye, Navigation } from 'lucide-react';

export default function SunlightCompassWidget({ property, lang = 'ar' }) {
  const isAr = lang === 'ar';

  // Orientation is unit-specific: without recorded data there is nothing true to show.
  const orientationData = property?.orientation;
  if (!orientationData || !(orientationData.direction_ar || orientationData.direction_en)) return null;

  // Great-circle bearing to the Kaaba from the unit's coordinates (Sohag centre as fallback)
  const qibla = (() => {
    const toRad = (d) => (d * Math.PI) / 180;
    const lat1 = toRad(Number(property?.coordinates?.lat) || 26.5569);
    const lon1 = toRad(Number(property?.coordinates?.lng) || 31.6948);
    const lat2 = toRad(21.4225);
    const lon2 = toRad(39.8262);
    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
  })();

  return (
    <div className="sunlight-compass-card">
      <div className="compass-widget-header">
        <div className="compass-title-wrap">
          <div className="compass-icon-glow">
            <Compass size={20} className="text-white" />
          </div>
          <div>
            <h4>{isAr ? 'بوصلة اتجاه الوحدة والتهوية والشمس والقبلة' : 'Orientation, Sunlight, Breeze & Qibla Compass'}</h4>
            <p>{isAr ? 'بيانات اتجاه الرياح الطبيعية وساعات سطوع الشمس واتجاه القبلة الدقيق' : 'Natural ventilation, cross breeze, direct sunlight, and Qibla alignment'}</p>
          </div>
        </div>
      </div>

      <div className="compass-features-grid">
        {/* 1. Orientation Direction */}
        <div className="compass-feature-box">
          <div className="feat-icon-circle bg-blue">
            <Compass size={18} />
          </div>
          <div>
            <span className="feat-lbl">{isAr ? 'اتجاه الواجهة' : 'Unit Facing'}</span>
            <strong className="feat-val">{isAr ? orientationData.direction_ar : (orientationData.direction_en || orientationData.direction_ar)}</strong>
          </div>
        </div>

        {/* 2. Sunlight Hours */}
        <div className="compass-feature-box">
          <div className="feat-icon-circle bg-gold">
            <Sun size={18} />
          </div>
          <div>
            <span className="feat-lbl">{isAr ? 'ساعات الشمس اليومية' : 'Daily Sunlight'}</span>
            <strong className="feat-val">{orientationData.sunlightHours ? `${orientationData.sunlightHours} ${isAr ? 'ساعات إضاءة طبيعية' : 'Hours direct sun'}` : '—'}</strong>
          </div>
        </div>

        {/* 3. Natural Ventilation */}
        <div className="compass-feature-box">
          <div className="feat-icon-circle bg-green">
            <Wind size={18} />
          </div>
          <div>
            <span className="feat-lbl">{isAr ? 'التهوية ودوران الهواء' : 'Natural Ventilation'}</span>
            <strong className="feat-val">{(isAr ? orientationData.ventilationRating_ar : (orientationData.ventilationRating_en || orientationData.ventilationRating_ar)) || '—'}</strong>
          </div>
        </div>

        {/* 4. Qibla Direction */}
        <div className="compass-feature-box">
          <div className="feat-icon-circle bg-purple">
            <Navigation size={18} />
          </div>
          <div>
            <span className="feat-lbl">{isAr ? 'اتجاه القبلة الشريفة' : 'Qibla Direction'}</span>
            <strong className="feat-val text-primary">
              <bdi>{qibla}°</bdi> {isAr ? 'من الشمال باتجاه عقارب الساعة' : 'clockwise from north'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
