import { TrendingUp, Activity, MapPin } from 'lucide-react';

const MARKET_TICKER_ITEMS = [
  { area_ar: 'شرق سوهاج', area_en: 'East Sohag', avg_meter: '18,500', change: '+4.5%', trend: 'up', note_ar: 'إقبال مرتفع', note_en: 'High Demand' },
  { area_ar: 'سوهاج الجديدة', area_en: 'New Sohag', avg_meter: '9,400', change: '+7.2%', trend: 'up', note_ar: 'أعلى وتيرة نمو', note_en: 'Fastest Growth' },
  { area_ar: 'الكورنيش الغربي', area_en: 'West Corniche', avg_meter: '26,500', change: '+3.1%', trend: 'up', note_ar: 'إطلالات نيلية نادرة', note_en: 'Prime Nile View' },
  { area_ar: 'مدينة ناصر', area_en: 'Nasr City', avg_meter: '15,800', change: '+3.8%', trend: 'up', note_ar: 'طلب سكني مستقر', note_en: 'Stable Residential' },
  { area_ar: 'الشارع التجاري (15)', area_en: '15th St. Commercial', avg_meter: '45,000', change: '+8.0%', trend: 'up', note_ar: 'عائد تجاري 15%', note_en: '15% ROI' },
  { area_ar: 'محيط جامعة سوهاج', area_en: 'University Hub', avg_meter: '12,200', change: '+5.5%', trend: 'up', note_ar: 'إيجار طلابي مضمون', note_en: 'Guaranteed Rental' },
];

export default function MarketTickerBar({ lang = 'ar' }) {
  const isAr = lang === 'ar';

  // Duplicate items twice to allow infinite, seamless looping marquee
  const loopItems = [...MARKET_TICKER_ITEMS, ...MARKET_TICKER_ITEMS];

  return (
    <div className="market-ticker-container" aria-label="Real-time Real Estate Market Ticker">
      <div className="market-ticker-wrapper">
        
        {/* Fixed Title Badge (Sun Gold & Architectural Navy) */}
        <div className="market-ticker-badge">
          <span className="ticker-pulse-dot" />
          <Activity size={13} style={{ color: '#ffca28', flexShrink: 0 }} />
          <span style={{ fontSize: '0.78rem', fontWeight: '900', color: '#ffca28', letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>
            {isAr ? 'مؤشر بورصة سوهاج' : 'Sohag PropTech Index'}
          </span>
          <span style={{ 
            fontSize: '0.67rem', 
            color: 'rgba(255, 255, 255, 0.8)', 
            fontWeight: '700', 
            paddingLeft: isAr ? '0' : '6px', 
            paddingRight: isAr ? '6px' : '0', 
            borderLeft: isAr ? 'none' : '1px solid rgba(255, 202, 40, 0.35)', 
            borderRight: isAr ? '1px solid rgba(255, 202, 40, 0.35)' : 'none',
            whiteSpace: 'nowrap'
          }}>
            {isAr ? 'محدث سبتمبر 2026' : 'Sep 2026'}
          </span>
        </div>

        {/* Continuous Smooth Marquee Viewport with Edge Fade Masks */}
        <div className="ticker-marquee-viewport">
          <div className="ticker-marquee-track">
            {loopItems.map((item, idx) => (
              <div 
                key={idx}
                className="ticker-item-card"
                dir={isAr ? 'rtl' : 'ltr'}
              >
                <MapPin size={12} style={{ color: '#ffca28', flexShrink: 0 }} />
                <strong style={{ color: '#ffffff' }}>{isAr ? item.area_ar : item.area_en}:</strong>
                <span style={{ color: '#94a3b8' }}>{isAr ? 'المتر' : 'sqm'}</span>
                <span style={{ fontWeight: '800', color: '#ffd54f' }}>
                  {item.avg_meter} {isAr ? 'ج.م' : 'EGP'}
                </span>
                
                {/* Clean Financial Gain Pill with Strict LTR */}
                <span className="ticker-change-pill" dir="ltr">
                  <TrendingUp size={10} />
                  <span>{item.change}</span>
                </span>
                
                <span style={{ fontSize: '0.72rem', color: '#cbd5e1', opacity: 0.9 }}>
                  ({isAr ? item.note_ar : item.note_en})
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
