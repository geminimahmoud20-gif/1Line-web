import { useState } from 'react';
import { TrendingUp, Activity, MapPin, Sparkles, ShieldCheck } from 'lucide-react';

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

  return (
    <div 
      style={{
        background: 'linear-gradient(90deg, #075985 0%, #0284c7 50%, #0369a1 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
        borderTop: 'none',
        padding: '8px 0',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 50,
        boxShadow: '0 4px 15px rgba(2, 132, 199, 0.2)'
      }}
    >
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '14px' }}>
        
        {/* Fixed Title Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          padding: '4px 12px',
          borderRadius: '999px',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 6px #38bdf8' }} />
          <Activity size={13} style={{ color: '#ffffff' }} />
          <span style={{ fontSize: '0.74rem', fontWeight: '900', color: '#ffffff', letterSpacing: '0.3px' }}>
            {isAr ? 'مؤشر بورصة سوهاج العقارية' : 'Sohag PropTech Index'}
          </span>
        </div>

        {/* Scrolling Ticker Items */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          flex: 1
        }}>
          {MARKET_TICKER_ITEMS.map((item, idx) => (
            <div 
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.76rem',
                color: '#e0f2fe',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.1)'
              }}
            >
              <MapPin size={12} style={{ color: '#38bdf8' }} />
              <strong style={{ color: '#ffffff' }}>{isAr ? item.area_ar : item.area_en}:</strong>
              <span style={{ color: '#bae6fd' }}>{isAr ? 'المتر' : 'sqm'}</span>
              <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{item.avg_meter} {isAr ? 'ج.م' : 'EGP'}</span>
              <span style={{
                color: '#ffffff',
                fontWeight: 'bold',
                background: 'rgba(16, 185, 129, 0.35)',
                padding: '1px 5px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                <TrendingUp size={10} />
                <span>{item.change}</span>
              </span>
              <span style={{ fontSize: '0.68rem', color: '#e0f2fe' }}>({isAr ? item.note_ar : item.note_en})</span>
              {idx < MARKET_TICKER_ITEMS.length - 1 && <span style={{ color: 'rgba(255, 255, 255, 0.25)', margin: '0 4px' }}>•</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
