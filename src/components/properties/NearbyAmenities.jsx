import { useState, useEffect } from 'react';
import { 
  School, 
  Hospital, 
  ShoppingBag, 
  Coffee, 
  Train, 
  MapPin, 
  Clock, 
  Navigation,
  Sparkles
} from 'lucide-react';
import { getAreaById } from '../../utils/areasData';

const getCategoryIcon = (category) => {
  switch (category) {
    case 'education': return School;
    case 'health': return Hospital;
    case 'shopping': return ShoppingBag;
    case 'transport': return Train;
    case 'lifestyle': return Coffee;
    default: return MapPin;
  }
};

export default function NearbyAmenities({ property, lang = 'ar' }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [, setTick] = useState(0);
  const isAr = lang === 'ar';

  // Live listen for area data modifications from CRM
  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1);
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

  const areaData = getAreaById(property?.areaKey);

  // Dynamic Resolution: Property-specific overrides -> Area amenities from CRM -> Fallback defaults
  const rawAmenities = (Array.isArray(property?.nearbyAmenities) && property.nearbyAmenities.length > 0)
    ? property.nearbyAmenities
    : (Array.isArray(areaData?.amenities) && areaData.amenities.length > 0)
      ? areaData.amenities
      : [
          { id: 1, category: 'lifestyle', name_ar: 'كورنيش النيل والحدائق العامة', name_en: 'Nile Corniche Promenade', distance: '500 متر', timeWalk: '6 دقائق', timeDrive: '1 دقيقة' },
          { id: 2, category: 'education', name_ar: 'المجمعات التعليمية والمدارس النموذجية', name_en: 'Schools & Educational Hubs', distance: '800 متر', timeWalk: '10 دقائق', timeDrive: '2 دقيقة' },
          { id: 3, category: 'health', name_ar: 'المستشفيات والعيادات الطبية التخصصية', name_en: 'Specialized Medical Centers', distance: '1.0 كم', timeWalk: '12 دقيقة', timeDrive: '3 دقائق' },
          { id: 4, category: 'transport', name_ar: 'محطات النقل والمحاور الرئيسية', name_en: 'Transit Terminals & Main Arteries', distance: '900 متر', timeWalk: '11 دقيقة', timeDrive: '2 دقيقة' },
          { id: 5, category: 'shopping', name_ar: 'المراكز التجارية وسلاسل التجزئة', name_en: 'Retail & Shopping Centers', distance: '600 متر', timeWalk: '7 دقائق', timeDrive: '2 دقيقة' }
        ];

  const amenities = rawAmenities.map((item, idx) => ({
    ...item,
    id: item.id || idx + 1,
    icon: typeof item.icon === 'function' ? item.icon : getCategoryIcon(item.category)
  }));

  const filteredAmenities = activeCategory === 'all'
    ? amenities
    : amenities.filter(a => a.category === activeCategory);

  return (
    <div className="nearby-amenities-card">
      <div className="amenities-header">
        <div className="amenities-title-wrap">
          <div className="amenities-icon-glow">
            <MapPin size={22} className="text-white" />
          </div>
          <div>
            <h3>{isAr ? 'الخدمات الحيوية والمعالم القريبة' : 'Nearby Amenities & Key Landmarks'}</h3>
            <p>{isAr ? 'استكشف أهم المرافق والمستشفيات والمدارس المحيطة بهذا العقار' : 'Discover schools, hospitals, and transit points near this unit'}</p>
          </div>
        </div>

        {/* Categories Tab Filter */}
        <div className="amenities-category-tabs">
          <button
            type="button"
            className={`amenity-tab-btn ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            {isAr ? 'الكل' : 'All'}
          </button>
          <button
            type="button"
            className={`amenity-tab-btn ${activeCategory === 'education' ? 'active' : ''}`}
            onClick={() => setActiveCategory('education')}
          >
            <School size={14} />
            <span>{isAr ? 'التعليم' : 'Education'}</span>
          </button>
          <button
            type="button"
            className={`amenity-tab-btn ${activeCategory === 'health' ? 'active' : ''}`}
            onClick={() => setActiveCategory('health')}
          >
            <Hospital size={14} />
            <span>{isAr ? 'الصحة' : 'Health'}</span>
          </button>
          <button
            type="button"
            className={`amenity-tab-btn ${activeCategory === 'shopping' ? 'active' : ''}`}
            onClick={() => setActiveCategory('shopping')}
          >
            <ShoppingBag size={14} />
            <span>{isAr ? 'التسوق' : 'Shopping'}</span>
          </button>
          <button
            type="button"
            className={`amenity-tab-btn ${activeCategory === 'transport' ? 'active' : ''}`}
            onClick={() => setActiveCategory('transport')}
          >
            <Train size={14} />
            <span>{isAr ? 'المواصلات' : 'Transit'}</span>
          </button>
          <button
            type="button"
            className={`amenity-tab-btn ${activeCategory === 'lifestyle' ? 'active' : ''}`}
            onClick={() => setActiveCategory('lifestyle')}
          >
            <Coffee size={14} />
            <span>{isAr ? 'الترفيه' : 'Leisure'}</span>
          </button>
        </div>
      </div>

      {/* Amenities Grid */}
      <div className="amenities-items-grid">
        {filteredAmenities.map((item) => {
          const IconComponent = item.icon;
          return (
            <div key={item.id} className="amenity-item-card">
              <div className="amenity-item-icon-box">
                <IconComponent size={20} />
              </div>
              <div className="amenity-item-content">
                <h4>{isAr ? item.name_ar : item.name_en}</h4>
                <div className="amenity-metrics-row">
                  <span className="metric-dist">
                    <Navigation size={13} />
                    {item.distance}
                  </span>
                  <span className="metric-time">
                    <Clock size={13} />
                    {isAr ? `${item.timeDrive} بالسيارة (${item.timeWalk} سيراً)` : `${item.timeDrive} drive (${item.timeWalk} walk)`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
