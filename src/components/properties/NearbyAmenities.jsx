import { useState } from 'react';
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

export default function NearbyAmenities({ property, lang = 'ar' }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const isAr = lang === 'ar';

  // Specific real-world landmark amenities in Sohag based on property areaKey
  const getAmenitiesData = (areaKey) => {
    switch (areaKey) {
      case 'new_sohag':
        return [
          { id: 1, category: 'education', name_ar: 'جامعة سوهاج (المقر الجديد)', name_en: 'Sohag University (New Campus)', distance: '1.2 كم', timeWalk: '15 دقيقة', timeDrive: '3 دقائق', icon: School },
          { id: 2, category: 'health', name_ar: 'مستشفى سوهاج الجامعي الجديد', name_en: 'New Sohag University Hospital', distance: '1.8 كم', timeWalk: '20 دقيقة', timeDrive: '4 دقائق', icon: Hospital },
          { id: 3, category: 'shopping', name_ar: 'مول سيتي سنتر سوهاج الجديدة', name_en: 'City Center Mall New Sohag', distance: '800 متر', timeWalk: '9 دقائق', timeDrive: '2 دقيقة', icon: ShoppingBag },
          { id: 4, category: 'transport', name_ar: 'موقف النقل الداخلي لمدينة سوهاج', name_en: 'New Sohag Transit Station', distance: '950 متر', timeWalk: '11 دقيقة', timeDrive: '3 دقائق', icon: Train },
          { id: 5, category: 'lifestyle', name_ar: 'نادي ونادي الطفل سوهاج الجديدة', name_en: 'New Sohag Sports & Kids Club', distance: '600 متر', timeWalk: '7 دقائق', timeDrive: '2 دقيقة', icon: Coffee }
        ];
      case 'east':
      default:
        return [
          { id: 1, category: 'lifestyle', name_ar: 'كورنيش النيل الشرقي وحديقة الفردوس', name_en: 'East Nile Corniche & Ferdous Park', distance: '400 متر', timeWalk: '5 دقائق', timeDrive: '1 دقيقة', icon: Coffee },
          { id: 2, category: 'education', name_ar: 'مجمع مدارس شرق سوهاج واللغات', name_en: 'East Sohag Language Schools Complex', distance: '750 متر', timeWalk: '9 دقائق', timeDrive: '2 دقيقة', icon: School },
          { id: 3, category: 'health', name_ar: 'مستشفى الهلال والمراكز الطبية التخصصية', name_en: 'El-Helal Hospital & Medical Clinics', distance: '900 متر', timeWalk: '10 دقائق', timeDrive: '3 دقائق', icon: Hospital },
          { id: 4, category: 'transport', name_ar: 'محطة قطار سوهاج الرئيسية', name_en: 'Sohag Main Railway Station', distance: '1.5 كم', timeWalk: '18 دقيقة', timeDrive: '4 دقائق', icon: Train },
          { id: 5, category: 'shopping', name_ar: 'منطقة التسوق بشارع الجمهورية و15', name_en: 'Gomhoreya & 15th St Shopping District', distance: '600 متر', timeWalk: '7 دقائق', timeDrive: '2 دقيقة', icon: ShoppingBag }
        ];
    }
  };

  const amenities = getAmenitiesData(property?.areaKey);

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
