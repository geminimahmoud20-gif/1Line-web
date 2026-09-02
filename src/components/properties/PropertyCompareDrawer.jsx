import { useState, useMemo } from 'react';
import { X, Check, ArrowRight, ArrowLeft, Trash2, Maximize2, ShieldCheck, DollarSign, BedDouble, Bath, ExternalLink, Share2, Sparkles, Star, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackEvent } from '../../utils/visitorTracker';
import { generateComparePdf } from '../../utils/comparePdfGenerator';

export default function PropertyCompareDrawer({
  isOpen,
  onClose,
  compareList = [],
  onRemoveFromCompare,
  onClearCompare,
  lang = 'ar'
}) {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;
  const isAr = lang === 'ar';

  // Best Price Per Meter
  const bestPpmId = useMemo(() => {
    if (compareList.length < 2) return null;
    let minPpm = Infinity;
    let bestId = null;
    compareList.forEach(p => {
      const ppm = p.pricePerMeter || (p.size ? Math.round(p.price / p.size) : Infinity);
      if (ppm < minPpm) {
        minPpm = ppm;
        bestId = p.id;
      }
    });
    return bestId;
  }, [compareList]);

  const handleDownloadPdf = () => {
    if (compareList.length === 0) return;
    generateComparePdf(compareList, lang);
    trackEvent('compare_downloaded_pdf', { count: compareList.length });
  };

  const handleShareWhatsApp = () => {
    if (compareList.length === 0) return;
    let msg = isAr 
      ? `⚖️ *جدول مقارنة العقارات المختارة — 1Line Real Estate*\n\n`
      : `⚖️ *Selected Properties Comparison — 1Line Real Estate*\n\n`;

    compareList.forEach((p, idx) => {
      const title = isAr ? p.title_ar : p.title_en;
      const loc = isAr ? p.locationName_ar : p.locationName_en;
      const ppm = p.pricePerMeter || Math.round(p.price / p.size);
      msg += `📌 *عقار ${idx + 1}: ${title}*\n`;
      msg += `• السعر: ${p.price.toLocaleString()} ج.م\n`;
      msg += `• المقدم: ${p.downPayment?.toLocaleString() || 'كاش'} ج.م\n`;
      msg += `• القسط: ${p.monthlyInstallment?.toLocaleString() || '-'} ج.م/شهر\n`;
      msg += `• المساحة: ${p.size} م² (سعر المتر: ${ppm.toLocaleString()} ج.م)\n`;
      msg += `• الموقع: ${loc}\n`;
      msg += `• رابط العقار: ${window.location.origin}/properties/${p.id}\n\n`;
    });

    msg += isAr ? `📞 للتواصل والمعاينة: +20 101 234 5678` : `📞 Contact: +20 101 234 5678`;

    trackEvent('compare_shared_whatsapp', { count: compareList.length });
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="compare-drawer-backdrop" onClick={onClose}>
      <div className="compare-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="compare-drawer-header">
          <div className="compare-header-title">
            <h3>{isAr ? 'مقارنة العقارات المختارة' : 'Compare Selected Properties'}</h3>
            <span className="compare-count-tag">{compareList.length} / 3</span>
          </div>

          <div className="compare-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {compareList.length > 0 && (
              <button 
                type="button" 
                className="btn btn-sm" 
                onClick={handleDownloadPdf}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.78rem', 
                  background: 'linear-gradient(135deg, #0d48a1 0%, #1565c0 100%)', 
                  color: '#fff',
                  border: '1px solid rgba(255, 179, 0, 0.35)',
                  boxShadow: '0 2px 8px rgba(13, 72, 161, 0.25)'
                }}
                title={isAr ? 'تحميل جدول المقارنة بصيغة PDF' : 'Download Comparison PDF'}
              >
                <Download size={13} className="text-gold" />
                <span>{isAr ? 'تحميل PDF' : 'PDF Report'}</span>
              </button>
            )}

            {compareList.length > 0 && (
              <button 
                type="button" 
                className="btn btn-sm btn-outline" 
                onClick={handleShareWhatsApp}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--emerald)', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                title={isAr ? 'مشاركة جدول المقارنة عبر الواتساب' : 'Share on WhatsApp'}
              >
                <Share2 size={13} />
                <span>{isAr ? 'مشاركة' : 'Share'}</span>
              </button>
            )}

            {compareList.length > 0 && (
              <button type="button" className="btn-clear-compare" onClick={onClearCompare}>
                <Trash2 size={14} />
                <span>{isAr ? 'مسح' : 'Clear'}</span>
              </button>
            )}
            <button type="button" className="drawer-close-btn" onClick={onClose}>
              <X size={18} />
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
                const isBestPpm = prop.id === bestPpmId;

                return (
                  <div key={prop.id} className="compare-property-col">
                    {/* Header Card Item */}
                    <div className="compare-cell cell-header" style={{ position: 'relative' }}>
                      {isBestPpm && (
                        <div style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          background: 'var(--gradient-gold)',
                          color: '#000',
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          zIndex: 2
                        }}>
                          <Star size={10} />
                          <span>{isAr ? 'أفضل سعر للمتر' : 'Best Value/m²'}</span>
                        </div>
                      )}

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
                      <span style={{ fontWeight: isBestPpm ? 'bold' : 'normal', color: isBestPpm ? 'var(--accent-gold)' : undefined }}>
                        {prop.pricePerMeter?.toLocaleString() || Math.round(prop.price / prop.size).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                      </span>
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
