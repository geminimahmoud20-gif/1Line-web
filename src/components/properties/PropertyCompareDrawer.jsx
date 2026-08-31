import { X, Check, ArrowRight, ArrowLeft, Trash2, Maximize2, ShieldCheck, DollarSign, BedDouble, Bath, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PropertyCompareDrawer({
  isOpen,
  onClose,
  compareList = [],
  onRemoveFromCompare,
  onClearCompare,
  lang = 'ar'
}) {
  if (!isOpen) return null;
  const isAr = lang === 'ar';

  return (
    <div className="compare-drawer-backdrop" onClick={onClose}>
      <div className="compare-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="compare-drawer-header">
          <div className="compare-header-title">
            <h3>{isAr ? 'مقارنة العقارات المختارة' : 'Compare Selected Properties'}</h3>
            <span className="compare-count-tag">{compareList.length} / 3</span>
          </div>

          <div className="compare-header-actions">
            {compareList.length > 0 && (
              <button type="button" className="btn-clear-compare" onClick={onClearCompare}>
                <Trash2 size={15} />
                <span>{isAr ? 'مسح الكل' : 'Clear All'}</span>
              </button>
            )}
            <button type="button" className="drawer-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="compare-drawer-body">
          {compareList.length === 0 ? (
            <div className="compare-empty-state">
              <p>{isAr ? 'لم تختر أي عقارات للمقارنة بعد. انقر على أيقونة المقارنة على أي عقار لإضافته هنا.' : 'No properties selected for comparison yet.'}</p>
            </div>
          ) : (
            <div className="compare-grid-matrix">
              {/* Feature Labels Column */}
              <div className="compare-labels-col hide-mobile">
                <div className="compare-cell cell-header">{isAr ? 'العقار' : 'Property'}</div>
                <div className="compare-cell">{isAr ? 'السعر الإجمالي' : 'Total Price'}</div>
                <div className="compare-cell">{isAr ? 'المقدم المطلوب' : 'Min Downpayment'}</div>
                <div className="compare-cell">{isAr ? 'القسط الشهري' : 'Monthly Installment'}</div>
                <div className="compare-cell">{isAr ? 'المساحة' : 'Total Area'}</div>
                <div className="compare-cell">{isAr ? 'سعر المتر' : 'Price / Sqm'}</div>
                <div className="compare-cell">{isAr ? 'الغرف / الحمامات' : 'Bed / Bath'}</div>
                <div className="compare-cell">{isAr ? 'الموقف القانوني' : 'Legal Status'}</div>
                <div className="compare-cell">{isAr ? 'المنطقة' : 'Location'}</div>
                <div className="compare-cell cell-footer">{isAr ? 'إجراء' : 'Action'}</div>
              </div>

              {/* Property Comparison Columns */}
              {compareList.map((prop) => {
                const title = isAr ? prop.title_ar : prop.title_en;
                const location = isAr ? prop.locationName_ar : prop.locationName_en;
                return (
                  <div key={prop.id} className="compare-property-col">
                    {/* Header Card Item */}
                    <div className="compare-cell cell-header">
                      <button
                        type="button"
                        className="remove-compare-item-btn"
                        onClick={() => onRemoveFromCompare(prop.id)}
                        title={isAr ? 'إزالة من المقارنة' : 'Remove'}
                      >
                        <X size={14} />
                      </button>
                      <img src={prop.images[0]} alt={title} className="compare-thumb" />
                      <h4 className="compare-prop-title">{title}</h4>
                    </div>

                    {/* Price */}
                    <div className="compare-cell highlight-gold">
                      <strong>{prop.price.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</strong>
                    </div>

                    {/* Downpayment */}
                    <div className="compare-cell">
                      <span>{prop.downPayment?.toLocaleString() || '-'} {isAr ? 'ج.م' : 'EGP'}</span>
                    </div>

                    {/* Monthly */}
                    <div className="compare-cell highlight-blue">
                      <strong>{prop.monthlyInstallment?.toLocaleString() || '-'} {isAr ? 'ج.م' : 'EGP'}</strong>
                    </div>

                    {/* Area */}
                    <div className="compare-cell">
                      <span>{prop.size} {isAr ? 'م²' : 'sqm'}</span>
                    </div>

                    {/* Price Per SqM */}
                    <div className="compare-cell">
                      <span>{prop.pricePerMeter?.toLocaleString() || Math.round(prop.price / prop.size).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                    </div>

                    {/* Beds/Baths */}
                    <div className="compare-cell">
                      <span>{prop.bedrooms || 0} {isAr ? 'غرف' : 'Beds'} • {prop.bathrooms || 0} {isAr ? 'حمام' : 'Baths'}</span>
                    </div>

                    {/* Legal */}
                    <div className="compare-cell text-success">
                      <ShieldCheck size={14} className="inline-icon" />
                      <span>{isAr ? 'مسجل 100%' : '100% Verified'}</span>
                    </div>

                    {/* Location */}
                    <div className="compare-cell text-muted">
                      <span>{location}</span>
                    </div>

                    {/* Action */}
                    <div className="compare-cell cell-footer">
                      <Link
                        to={`/properties/${prop.id}`}
                        className="btn btn-primary btn-sm btn-full"
                        onClick={onClose}
                      >
                        <span>{isAr ? 'عرض العقار' : 'View'}</span>
                        <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
