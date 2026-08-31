import { Sun, Compass, Wind, Eye, Navigation } from 'lucide-react';

export default function SunlightCompassWidget({ property, lang = 'ar' }) {
  const isAr = lang === 'ar';

  // Default orientation data for property
  const orientationData = property?.orientation || {
    direction_ar: 'بحري شرقي (أفضل اتجاه لصعيد مصر)',
    direction_en: 'North-East (Optimal Natural Cooling)',
    sunlightHours: 6.5,
    ventilationRating_ar: 'ممتازة (تيار هواء طبيعي دائم)',
    ventilationRating_en: 'Excellent (Natural Cross Breeze)',
    viewType_ar: 'إطلالة مفتوحة غير مجروحة',
    viewType_en: 'Open Unobstructed Street View',
    qiblaDegree: '138° جنوب شرق'
  };

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
            <strong className="feat-val">{isAr ? orientationData.direction_ar : orientationData.direction_en}</strong>
          </div>
        </div>

        {/* 2. Sunlight Hours */}
        <div className="compass-feature-box">
          <div className="feat-icon-circle bg-gold">
            <Sun size={18} />
          </div>
          <div>
            <span className="feat-lbl">{isAr ? 'ساعات الشمس اليومية' : 'Daily Sunlight'}</span>
            <strong className="feat-val">{orientationData.sunlightHours} {isAr ? 'ساعات إضاءة طبيعية' : 'Hours direct sun'}</strong>
          </div>
        </div>

        {/* 3. Natural Ventilation */}
        <div className="compass-feature-box">
          <div className="feat-icon-circle bg-green">
            <Wind size={18} />
          </div>
          <div>
            <span className="feat-lbl">{isAr ? 'التهوية ودوران الهواء' : 'Natural Ventilation'}</span>
            <strong className="feat-val">{isAr ? orientationData.ventilationRating_ar : orientationData.ventilationRating_en}</strong>
          </div>
        </div>

        {/* 4. Qibla Direction */}
        <div className="compass-feature-box">
          <div className="feat-icon-circle bg-purple">
            <Navigation size={18} />
          </div>
          <div>
            <span className="feat-lbl">{isAr ? 'اتجاه القبلة الشريفة' : 'Qibla Direction'}</span>
            <strong className="feat-val text-primary">{isAr ? '138° جنوب شرق (سوهاج)' : '138° South-East'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
