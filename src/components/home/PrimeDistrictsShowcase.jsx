import { useNavigate } from 'react-router-dom';
import { MapPin, TrendingUp, Sparkles, ArrowLeft, ArrowRight, Building2, ShieldCheck } from 'lucide-react';
import { getAreas } from '../../utils/areasData';

const PRIME_DISTRICT_IMAGES = {
  east: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=80',
  new_sohag: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
  corniche: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80',
  thakafa: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80'
};

export default function PrimeDistrictsShowcase({ lang = 'ar' }) {
  const navigate = useNavigate();
  const isAr = lang === 'ar';
  const allAreas = getAreas();

  // Filter to the 4 prime districts (excluding 'all')
  const primeDistricts = allAreas.filter(a => ['east', 'new_sohag', 'corniche', 'thakafa'].includes(a.id));

  return (
    <section className="homepage-section prime-districts-section">
      <div className="section-header-flex">
        <div>
          <div className="section-pill-tag">
            <Sparkles size={14} className="text-gold" />
            <span>{isAr ? 'مؤشر النمو العقاري والمناطق الفاخرة' : 'Prime Real Estate & Market Index'}</span>
          </div>
          <h2 className="section-heading-primary">
            {isAr ? 'أرقى أحياء ومناطق الاستثمار بسوهاج' : 'Sohag Prime Real Estate Districts'}
          </h2>
          <p className="section-heading-desc">
            {isAr 
              ? 'مؤشرات سعرية موثقة ومعتمدة لكل حي مع رصد معدلات العائد السنوي ومخططات التوسع العمراني.' 
              : 'Certified market benchmarks, annual capital appreciation rates, and investment territories.'}
          </p>
        </div>

        <button
          type="button"
          className="btn-view-all-districts"
          onClick={() => navigate('/properties')}
        >
          <span>{isAr ? 'استعراض كل أحياء سوهاج' : 'View All Districts'}</span>
          {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
        </button>
      </div>

      <div className="prime-districts-grid">
        {primeDistricts.map((district) => {
          const bgImg = PRIME_DISTRICT_IMAGES[district.id] || PRIME_DISTRICT_IMAGES.east;
          const avgPrice = district.avgPricePerMeter ? district.avgPricePerMeter.toLocaleString() : '18,500';
          const growth = district.annualGrowthRate || 75;

          return (
            <div
              key={district.id}
              className="prime-district-card"
              onClick={() => navigate(`/properties?area=${district.id}`)}
              style={{ backgroundImage: `url(${bgImg})` }}
            >
              <div className="district-card-overlay" />
              
              <div className="district-card-top-badges">
                <span className="district-growth-badge">
                  <TrendingUp size={12} />
                  <span>+{growth}% {isAr ? 'نمو سنوي' : 'YoY'}</span>
                </span>
                <span className="district-verified-badge">
                  <ShieldCheck size={12} />
                  <span>{isAr ? 'معتمد 1Line' : 'Verified'}</span>
                </span>
              </div>

              <div className="district-card-bottom-content">
                <div className="district-meta-title-row">
                  <MapPin size={16} className="text-gold" />
                  <h3 className="district-card-title">
                    {isAr ? (district.name_ar || district.label_ar) : (district.name_en || district.label_en)}
                  </h3>
                </div>

                <p className="district-card-desc">
                  {isAr ? district.description_ar : (district.description_en || district.label_en)}
                </p>

                <div className="district-card-footer">
                  <div className="district-price-benchmark">
                    <span className="price-lbl">{isAr ? 'متوسط سعر المتر:' : 'Avg. Price/m²:'}</span>
                    <strong className="price-val">{avgPrice} {isAr ? 'ج.م' : 'EGP'}</strong>
                  </div>

                  <span className="district-explore-btn">
                    <span>{isAr ? 'تصفح الوحدات' : 'Explore'}</span>
                    {isAr ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
