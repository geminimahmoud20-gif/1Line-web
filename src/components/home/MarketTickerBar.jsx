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
        background: 'linear-gradient(90deg, #051937 0%, #0a2e5c 50%, #051937 100%)',
        borderBottom: '1px solid rgba(255, 202, 40, 0.25)',
        borderTop: 'none',
        padding: '9px 0',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 50,
        boxShadow: '0 4px 18px rgba(5, 25, 55, 0.4)'
      }}
    >
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '14px' }}>
        
        {/* Fixed Title Badge (Sun Gold & Architectural Navy) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 202, 40, 0.15)',
          border: '1px solid rgba(255, 202, 40, 0.45)',
          padding: '4px 14px',
          borderRadius: '999px',
          flexShrink: 0,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ffca28', boxShadow: '0 0 8px #ffca28' }} />
          <Activity size={13} style={{ color: '#ffca28' }} />
          <span style={{ fontSize: '0.76rem', fontWeight: '900', color: '#ffca28', letterSpacing: '0.3px' }}>
            {isAr ? 'مؤشر بورصة سوهاج العقارية' : 'Sohag PropTech Index'}
          </span>
        </div>

        {/* Scrolling Ticker Items */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
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
                fontSize: '0.78rem',
                color: '#e2e8f0',
                padding: '3px 10px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}
            >
              <MapPin size={12} style={{ color: '#ffca28' }} />
              <strong style={{ color: '#ffffff' }}>{isAr ? item.area_ar : item.area_en}:</strong>
              <span style={{ color: '#94a3b8' }}>{isAr ? 'المتر' : 'sqm'}</span>
              <span style={{ fontWeight: '800', color: '#ffd54f' }}>{item.avg_meter} {isAr ? 'ج.م' : 'EGP'}</span>
              <span style={{
                color: '#34d399',
                fontWeight: '800',
                background: 'rgba(16, 185, 129, 0.22)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                <TrendingUp size={10} />
                <span>{item.change}</span>
              </span>
              <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>({isAr ? item.note_ar : item.note_en})</span>
              {idx < MARKET_TICKER_ITEMS.length - 1 && <span style={{ color: 'rgba(255, 202, 40, 0.35)', margin: '0 4px' }}>•</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
