import { useState, useEffect } from 'react';
import {
  School, Baby, Hospital, Pill, ShoppingCart, ShoppingBag, UtensilsCrossed, Landmark, Banknote, Building2,
  Shield, Train, Route, Fuel, Trees, Dumbbell, Hotel, MapPin, Clock, Navigation
} from 'lucide-react';
import { getAreaById } from '../../utils/areasData';
import { amenityCategory, categoriesIn } from '../../utils/amenityCategories';
import { amenityMetrics, namedAmenities } from '../../utils/amenityDistance';

const ICONS = { School, Baby, Hospital, Pill, ShoppingCart, ShoppingBag, UtensilsCrossed, Landmark, Banknote, Building2, Shield, Train, Route, Fuel, Trees, Dumbbell, Hotel, MapPin };
const iconFor = (category) => ICONS[amenityCategory(category).icon] || MapPin;

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

  // Listing landmarks first, then the area's landmarks from the CRM. No built-in generic list:
  // a New Sohag villa must not claim to be 500 m from the Corniche.
  // Landmarks without a name (added in the CRM and never filled in) are left out
  const listingAmenities = namedAmenities(property?.nearbyAmenities);
  const areaAmenities = namedAmenities(areaData?.amenities);
  const fromListing = listingAmenities.length > 0;
  const fromArea = !fromListing && areaAmenities.length > 0;
  const rawAmenities = fromListing ? listingAmenities : fromArea ? areaAmenities : [];

  if (rawAmenities.length === 0) {
    return (
      <div className="nearby-amenities-card">
        <div className="amenities-header">
          <div className="amenities-title-wrap">
            <div className="amenities-icon-glow">
              <MapPin size={22} className="text-white" />
            </div>
            <div>
              <h3>{isAr ? 'المعالم والخدمات القريبة' : 'Nearby amenities'}</h3>
              <p>{isAr ? 'لم تُضف المعالم القريبة لهذا العقار بعد. افتح الموقع على خرائط Google أو اسأل المستشار.' : 'Nearby landmarks have not been added yet. Open the location in Google Maps or ask an advisor.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const amenities = rawAmenities.map((item, idx) => ({
    ...item,
    id: item.id || idx + 1,
    // Unknown kinds group under "other"
    category: amenityCategory(item.category).id,
    icon: typeof item.icon === 'function' ? item.icon : iconFor(item.category)
  }));
  // A tab per kind this listing actually has; no tab bar when there is only one kind
  const tabs = categoriesIn(amenities);

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
            <p>
              {fromArea
                ? (isAr ? 'معالم المنطقة — المسافات تقريبية من مركز المنطقة وليست من الوحدة نفسها' : 'Area landmarks — distances are approximate from the area centre, not from this unit')
                : (isAr ? 'أهم المرافق والمستشفيات والمدارس المحيطة بهذا العقار' : 'Schools, hospitals and transit points near this unit')}
            </p>
          </div>
        </div>

        {/* Categories Tab Filter */}
        {tabs.length > 1 && (
          <div className="amenities-category-tabs">
            <button
              type="button"
              className={`amenity-tab-btn ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              {isAr ? 'الكل' : 'All'}
            </button>
            {tabs.map((c) => {
              const Icon = iconFor(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`amenity-tab-btn ${activeCategory === c.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(c.id)}
                >
                  <Icon size={14} />
                  <span>{isAr ? c.ar : c.en}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Amenities Grid */}
      <div className="amenities-items-grid">
        {filteredAmenities.map((item) => {
          const IconComponent = item.icon;
          const m = amenityMetrics(item, isAr);
          return (
            <div key={item.id} className="amenity-item-card">
              <div className="amenity-item-icon-box">
                <IconComponent size={20} />
              </div>
              <div className="amenity-item-content">
                <h4>{isAr ? item.name_ar : (item.name_en || item.name_ar)}</h4>
                {/* Walk / drive times worked out from the distance (utils/amenityDistance.js) */}
                <div className="amenity-metrics-row">
                  {m.distance && (
                    <span className="metric-dist">
                      <Navigation size={13} />
                      {m.distance}
                    </span>
                  )}
                  {(m.walk || m.drive) && (
                    <span className="metric-time">
                      <Clock size={13} />
                      {[
                        m.walk && (isAr ? `${m.walk} مشي` : `${m.walk} walk`),
                        m.drive && (isAr ? `${m.drive} بالعربية` : `${m.drive} drive`)
                      ].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
