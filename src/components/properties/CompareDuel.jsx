import { Calendar, Scale } from 'lucide-react';

export default function CompareDuel({
  dualDiff,
  handleBookDualTour,
  isAr
}) {
  return (
    <div className="compare-dual-duel-wrapper">
      <div className="dual-duel-header">
        <div className="dual-duel-badge">
          <Scale size={15} className="text-gold" />
          <h4>{isAr ? 'المفاضلة الثنائية المباشرة (وجهاً لوجه)' : 'Head-to-Head Visual Duel'}</h4>
        </div>
        <button 
          type="button" 
          className="btn-book-dual-tour"
          onClick={handleBookDualTour}
          title={isAr ? 'تنسيق معاينة مشتركة لكلا العقارين في موعد واحد' : 'Schedule joint tour'}
        >
          <Calendar size={14} />
          <span>{isAr ? 'حجز معاينة مشتركة للعقارين معاً' : 'Book Joint Tour for Both'}</span>
        </button>
      </div>

      <div className="dual-duel-cards-grid">
        {/* Property 1 Card */}
        <div className={`dual-property-card ${dualDiff.betterPpmId === dualDiff.p1.id ? 'highlight-winner' : ''}`}>
          <div className="dual-card-media">
            <img 
              src={dualDiff.p1.images?.[0] || ''} 
              alt={isAr ? dualDiff.p1.title_ar : dualDiff.p1.title_en} 
              className="dual-img"
            />
            <div className="dual-card-floating-pills">
              {dualDiff.cheaperId === dualDiff.p1.id && dualDiff.priceDiff > 0 && (
                <span className="dual-advantage-pill pill-green">
                  {isAr ? `أوفر بـ ${(dualDiff.priceDiff).toLocaleString('en-US')} ج.م` : `Save ${(dualDiff.priceDiff).toLocaleString('en-US')} EGP`}
                </span>
              )}
              {dualDiff.largerId === dualDiff.p1.id && dualDiff.sizeDiff > 0 && (
                <span className="dual-advantage-pill pill-blue">
                  {isAr ? `أكبر بـ ${dualDiff.sizeDiff} م²` : `+${dualDiff.sizeDiff} m² Space`}
                </span>
              )}
              {dualDiff.betterPpmId === dualDiff.p1.id && (
                <span className="dual-advantage-pill pill-gold">
                  {isAr ? 'أفضل سعر للمتر' : 'Best m² Rate'}
                </span>
              )}
            </div>
          </div>
          <div className="dual-card-info">
            <h5 className="dual-card-title">{isAr ? dualDiff.p1.title_ar : dualDiff.p1.title_en}</h5>
            <div className="dual-card-meta">
              <span className="dual-price"><bdi>{(Number(dualDiff.p1.price) || 0).toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}</bdi></span>
              <span className="dual-ppm"><bdi>{dualDiff.ppm1 > 0 ? `${dualDiff.ppm1.toLocaleString('en-US')} ${isAr ? 'ج.م/م²' : 'EGP/m²'}` : (isAr ? 'المساحة غير مسجلة' : 'Area not listed')}</bdi></span>
            </div>
          </div>
        </div>

        {/* Center "VS" Difference Capsule */}
        <div className="dual-duel-center-capsule">
          <div className="dual-vs-circle">VS</div>
          <div className="dual-diff-stats">
            {dualDiff.priceDiff > 0 && (
              <div className="dual-diff-stat-item">
                <span className="diff-lbl">{isAr ? 'فارق السعر الإجمالي:' : 'Price Difference:'}</span>
                <strong className="diff-val"><bdi>{dualDiff.priceDiff.toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}</bdi></strong>
              </div>
            )}
            {dualDiff.sizeDiff > 0 && (
              <div className="dual-diff-stat-item">
                <span className="diff-lbl">{isAr ? 'فارق المساحة الصافية:' : 'Space Difference:'}</span>
                <strong className="diff-val"><bdi>{dualDiff.sizeDiff} {isAr ? 'م²' : 'm²'}</bdi></strong>
              </div>
            )}
            {dualDiff.ppmDiff > 0 && (
              <div className="dual-diff-stat-item">
                <span className="diff-lbl">{isAr ? 'فارق سعر المتر:' : 'm² Rate Difference:'}</span>
                <strong className="diff-val"><bdi>{dualDiff.ppmDiff.toLocaleString('en-US')} {isAr ? 'ج.م/م²' : 'EGP/m²'}</bdi></strong>
              </div>
            )}
          </div>
        </div>

        {/* Property 2 Card */}
        <div className={`dual-property-card ${dualDiff.betterPpmId === dualDiff.p2.id ? 'highlight-winner' : ''}`}>
          <div className="dual-card-media">
            <img 
              src={dualDiff.p2.images?.[0] || ''} 
              alt={isAr ? dualDiff.p2.title_ar : dualDiff.p2.title_en} 
              className="dual-img"
            />
            <div className="dual-card-floating-pills">
              {dualDiff.cheaperId === dualDiff.p2.id && dualDiff.priceDiff > 0 && (
                <span className="dual-advantage-pill pill-green">
                  {isAr ? `أوفر بـ ${(dualDiff.priceDiff).toLocaleString('en-US')} ج.م` : `Save ${(dualDiff.priceDiff).toLocaleString('en-US')} EGP`}
                </span>
              )}
              {dualDiff.largerId === dualDiff.p2.id && dualDiff.sizeDiff > 0 && (
                <span className="dual-advantage-pill pill-blue">
                  {isAr ? `أكبر بـ ${dualDiff.sizeDiff} م²` : `+${dualDiff.sizeDiff} m² Space`}
                </span>
              )}
              {dualDiff.betterPpmId === dualDiff.p2.id && (
                <span className="dual-advantage-pill pill-gold">
                  {isAr ? 'أفضل سعر للمتر' : 'Best m² Rate'}
                </span>
              )}
            </div>
          </div>
          <div className="dual-card-info">
            <h5 className="dual-card-title">{isAr ? dualDiff.p2.title_ar : dualDiff.p2.title_en}</h5>
            <div className="dual-card-meta">
              <span className="dual-price"><bdi>{(Number(dualDiff.p2.price) || 0).toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}</bdi></span>
              <span className="dual-ppm"><bdi>{dualDiff.ppm2 > 0 ? `${dualDiff.ppm2.toLocaleString('en-US')} ${isAr ? 'ج.م/م²' : 'EGP/m²'}` : (isAr ? 'المساحة غير مسجلة' : 'Area not listed')}</bdi></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
