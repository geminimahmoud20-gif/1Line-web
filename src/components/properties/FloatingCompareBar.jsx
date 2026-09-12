import { Scale, X, Trash2, ArrowUpRight } from 'lucide-react';

export default function FloatingCompareBar({
  compareList = [],
  onOpenCompare,
  onRemoveFromCompare,
  onClearCompare,
  lang = 'ar',
  maxCompare = 4
}) {
  if (!compareList || compareList.length === 0) return null;

  const isAr = lang === 'ar';
  const remainingSlots = Math.max(0, maxCompare - compareList.length);

  return (
    <div className="floating-compare-dock-wrapper" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="floating-compare-dock-container">
        {/* Left / Info & Action */}
        <div className="floating-compare-info-zone">
          <div className="compare-badge-icon">
            <Scale size={18} className="text-gold" />
          </div>
          <div className="compare-titles-box">
            <span className="compare-dock-title">
              {isAr ? 'مقارنة العقارات المختارة' : 'Compare Selected Units'}
            </span>
            <span className="compare-dock-count">
              {compareList.length} / {maxCompare} {isAr ? 'وحدات' : 'Units'}
            </span>
          </div>
        </div>

        {/* Center / Property Thumbnails Strip */}
        <div className="floating-compare-thumbs-strip">
          {compareList.map((prop) => {
            const title = isAr ? prop.title_ar : prop.title_en;
            const thumb = prop.images && prop.images[0] ? prop.images[0] : '';
            return (
              <div key={prop.id} className="floating-compare-thumb-item" title={title}>
                <img src={thumb} alt={title} className="thumb-img" />
                <button
                  type="button"
                  className="thumb-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromCompare(prop.id);
                  }}
                  title={isAr ? 'إزالة' : 'Remove'}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}

          {/* Empty Placeholder Slots */}
          {remainingSlots > 0 && (
            <div 
              className="floating-compare-slot-empty"
              title={isAr ? `يمكنك إضافة ${remainingSlots} عقار آخر للمقارنة` : `Add ${remainingSlots} more to compare`}
            >
              <span className="slot-plus">+</span>
            </div>
          )}
        </div>

        {/* Right / Actions Buttons */}
        <div className="floating-compare-actions-zone">
          <button
            type="button"
            className="btn-dock-clear"
            onClick={onClearCompare}
            title={isAr ? 'مسح الكل' : 'Clear All'}
          >
            <Trash2 size={14} />
            <span className="hide-mobile">{isAr ? 'مسح' : 'Clear'}</span>
          </button>

          <button
            type="button"
            className="btn-dock-compare-launch"
            onClick={onOpenCompare}
          >
            <Scale size={15} />
            <span>{isAr ? `قارن الآن (${compareList.length})` : `Compare (${compareList.length})`}</span>
            <ArrowUpRight size={14} className="dock-arrow-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}
