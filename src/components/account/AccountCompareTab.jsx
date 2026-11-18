import { Link } from 'react-router-dom';
import { Scale, ShieldCheck, FileText, Trash2 } from 'lucide-react';
import PropertyCard from '../properties/PropertyCard';
import { generateComparePdf } from '../../utils/comparePdfGenerator';

export default function AccountCompareTab({
  compareList,
  currency,
  favorites,
  isAr,
  lang,
  onClearCompare,
  onOpenCompare,
  onToggleCompare,
  onToggleFavorite
}) {
  return (
    <div className="account-tab-content">
      {compareList.length > 0 ? (
        <div>
          {/* Compare Control Header */}
          <div className="account-actions-bar">
            <div className="actions-info">
              <strong>{compareList.length}</strong> {isAr ? 'من أصل 4 عقارات مضافة للمقارنة' : 'of 4 properties in comparison'}
            </div>
            <div className="actions-btns-group">
              {onOpenCompare && (
                <button 
                  type="button" 
                  onClick={onOpenCompare}
                  className="btn-account-action btn-open-compare"
                >
                  <Scale size={15} />
                  <span>{isAr ? 'فتح المقارنة الشاملة 4-Way' : 'Open 4-Way Compare'}</span>
                </button>
              )}
              <button 
                type="button" 
                onClick={() => generateComparePdf(compareList, lang)}
                className="btn-account-action btn-pdf-export"
              >
                <FileText size={15} />
                <span>{isAr ? 'تصدير تقرير المقارنة (PDF)' : 'Export PDF'}</span>
              </button>
              {onClearCompare && (
                <button 
                  type="button" 
                  onClick={onClearCompare} 
                  className="btn-account-action btn-clear"
                >
                  <Trash2 size={14} />
                  <span>{isAr ? 'تفريغ' : 'Clear'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Compared Cards Grid */}
          <div className="properties-grid-4">
            {compareList.map((prop) => (
              <PropertyCard
                key={prop.id}
                property={prop}
                lang={lang}
                currency={currency}
                isFavorite={favorites.includes(prop.id)}
                onToggleFavorite={onToggleFavorite}
                isCompared={true}
                onToggleCompare={onToggleCompare}
              />
            ))}
          </div>

          {/* Side-by-Side Quick Comparison Table */}
          <div className="account-compare-table-wrap">
            <h3 className="compare-table-title">
              <Scale size={17} className="text-gold" />
              <span>{isAr ? 'جدول المقارنة الفنية والمالية السريعة' : 'Technical & Financial Quick Table'}</span>
            </h3>
            <div className="compare-table-scroll">
              <table className="account-quick-table">
                <thead>
                  <tr>
                    <th>{isAr ? 'المعيار / العقار' : 'Metric'}</th>
                    {compareList.map(prop => (
                      <th key={prop.id}>
                        <Link to={`/properties/${prop.id}`} className="table-prop-link">
                          {isAr ? prop.title_ar : prop.title_en}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="row-label">{isAr ? 'السعر الإجمالي' : 'Total Price'}</td>
                    {compareList.map(prop => (
                      <td key={prop.id} className="row-val price-highlight">
                        <strong>{Number(prop.price).toLocaleString('en-US')}</strong> {isAr ? 'ج.م' : 'EGP'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="row-label">{isAr ? 'المساحة الصافية' : 'Area (Sqm)'}</td>
                    {compareList.map(prop => (
                      <td key={prop.id} className="row-val">
                        {prop.size} {isAr ? 'م²' : 'sqm'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="row-label">{isAr ? 'سعر المتر' : 'Price / Sqm'}</td>
                    {compareList.map(prop => (
                      <td key={prop.id} className="row-val">
                        {prop.pricePerMeter ? `${Number(prop.pricePerMeter).toLocaleString('en-US')} ج.م/م²` : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="row-label">{isAr ? 'المقدم' : 'Down Payment'}</td>
                    {compareList.map(prop => (
                      <td key={prop.id} className="row-val">
                        {prop.downPayment > 0 ? `${Number(prop.downPayment).toLocaleString('en-US')} ج.م` : (isAr ? 'كاش كامل' : 'Full Cash')}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="row-label">{isAr ? 'القسط الشهري' : 'Monthly Installment'}</td>
                    {compareList.map(prop => (
                      <td key={prop.id} className="row-val">
                        {prop.monthlyInstallment > 0 ? `${Number(prop.monthlyInstallment).toLocaleString('en-US')} ج.م` : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="row-label">{isAr ? 'الموقف القانوني' : 'Legal Status'}</td>
                    {compareList.map(prop => (
                      <td key={prop.id} className="row-val">
                        <span className="legal-check-pill">
                          <ShieldCheck size={13} className="text-emerald" />
                          <span>{isAr ? 'مرخص ومعتمد رسمياً' : 'Licensed'}</span>
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="account-empty-state">
          <div className="empty-state-icon">
            <Scale size={36} className="text-muted" />
          </div>
          <h3>{isAr ? 'لم تقم بإضافة عقارات للمقارنة بعد' : 'No properties in comparison'}</h3>
          <p>
            {isAr 
              ? 'اضغط على علامة الميزان في أي بطاقة عقار لإضافتها للمقارنة والاطلاع على الفروقات المالية والفنية.'
              : 'Tap the compare icon on any property to compare specifications.'}
          </p>
          <Link to="/properties" className="btn-browse-properties">
            <span>{isAr ? 'استعراض العقارات للمقارنة ⚖️' : 'Browse & Compare'}</span>
          </Link>
        </div>
      )}
    </div>

  );
}
