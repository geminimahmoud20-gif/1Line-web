import { useState } from 'react';
import { Edit3, Eye, EyeOff, FileDown, Flame, MessageSquare, RotateCcw, Star, Trash2 } from 'lucide-react';
import { offerState, formatTimeLeft, getActiveOffer } from '../../utils/propertyOffers';
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { FeaturedPeriodLabel } from './HomepageSlotsBoard';

// One row of the CRM properties table (PropertyManagerPanel): status selector, homepage star,
// WhatsApp match notifier and the edit / trash / restore actions.
// Short time left for the offer button: "6 أيام" / "5 ساعات" (full text is in its tooltip)
const shortLeft = (ms, isAr) => {
  const d = Math.floor(ms / 86400000);
  if (d >= 1) return isAr ? (d === 1 ? 'يوم' : d === 2 ? 'يومين' : `${d} ${d <= 10 ? 'أيام' : 'يوم'}`) : `${d}d`;
  const h = Math.max(1, Math.floor(ms / 3600000));
  return isAr ? (h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : `${h} ${h <= 10 ? 'ساعات' : 'ساعة'}`) : `${h}h`;
};

/** Downloads the unit's brochure (Arabic, locked, watermarked) so the team can send it on WhatsApp */
function BrochureButton({ prop, isAr }) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const { generatePropertyPdf } = await import('../../utils/brochure/propertyBrochure');
      await generatePropertyPdf(prop);
    } catch (err) {
      console.error('Brochure error:', err);
      window.alert(isAr ? 'تعذّر تجهيز البروشور، جرّب تاني.' : 'Could not build the brochure.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      className="icon-action-table-btn"
      onClick={download}
      disabled={busy}
      title={isAr ? 'تنزيل بروشور الوحدة لإرساله للعميل على واتساب' : 'Download the brochure to send on WhatsApp'}
      aria-label={isAr ? 'تنزيل بروشور الوحدة' : 'Download brochure'}
    >
      <FileDown size={16} style={{ opacity: busy ? 0.4 : 1 }} />
    </button>
  );
}

export default function PropertyTableRow({
  readOnly = false,
  prop,
  isAr,
  areas,
  handleStatusChange,
  handleToggleVisibility,
  handleOpenEdit,
  handleSoftDelete,
  handleRestore,
  handlePermanentDelete,
  onUpdateProperty,
  triggerToast,
  setSlotEditing,
  setOfferEditing,
  setNotifierProperty,
  setNotifierEventType
}) {
  const propStatus = prop.status || (prop.isArchived ? 'hidden' : 'published');
  const isTrash = prop.isDeleted || prop.status === 'trash';
  // Same rule as the public site: only hidden / draft / trash listings are off the site
  // ("under negotiation" and "sold" ones are still shown there)
  const isOnSite = !isTrash && !['hidden', 'draft'].includes(propStatus);

  return (
    <tr style={{ opacity: isTrash ? 0.6 : 1 }}>
      <td>
        <div className="table-prop-info">
          <img src={prop.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80'} alt="" className="table-thumb" />
          <div>
            <strong>{isAr ? prop.title_ar : prop.title_en}</strong>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
              <span className="prop-id-tag">{prop.id.toUpperCase()}</span>
              {prop.badge_ar && (
                <span style={{ fontSize: 'var(--crm-text-xs)', background: 'var(--crm-accent-soft)', color: 'var(--crm-accent-text)', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                  {isAr ? prop.badge_ar : prop.badge_en}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      <td>
        <div className="table-cell-multi">
          <span className="badge-type">
            {(() => { const t = PROPERTY_TYPES.find(x => x.id === prop.type); return t ? (isAr ? t.name_ar : t.name_en) : prop.type; })()}
          </span>
          <span className="text-muted">
            {(() => { const a = areas.find(x => x.id === prop.areaKey); return a ? (isAr ? a.name_ar : a.name_en) : prop.areaKey; })()}
          </span>
        </div>
      </td>

      <td>
        <div className="table-cell-multi">
          <strong className="text-primary">{prop.price?.toLocaleString('en-US')} ج.م</strong>
          <span className="text-muted">مقدم: {prop.downPayment?.toLocaleString('en-US')} ج.م</span>
        </div>
      </td>

      <td>
        {prop.type === 'commercial' ? (
          <span>{prop.size} م² • 🏬 {prop.frontage || (isAr ? 'محل تجاري' : 'Retail')}</span>
        ) : prop.type === 'land' ? (
          <span>{prop.size} م² • 📐 {isAr ? 'أرض فضاء' : 'Land'}</span>
        ) : prop.type === 'office' ? (
          <span>{prop.size} م² • 💼 {prop.divisionCount ? `${prop.divisionCount} ${isAr ? 'مكاتب' : 'Offices'}` : (isAr ? 'مقر إداري' : 'Office')}</span>
        ) : (
          <span>{prop.size} م² • {prop.bedrooms || 0} {isAr ? 'غرف' : 'Bedrooms'}</span>
        )}
      </td>

      {/* Quick Status Selector */}
      <td>
        {!isTrash ? (
          <select
            value={propStatus}
            aria-label={isAr ? `حالة العرض: ${prop.title_ar || prop.id}` : `Display status: ${prop.title_en || prop.id}`}
            onChange={(e) => handleStatusChange(prop.id, e.target.value)}
            style={{
              padding: '4px 8px',
              borderRadius: 'var(--radius-pill)',
              fontSize: 'var(--crm-text-xs)',
              fontWeight: 'bold',
              border: '1px solid var(--border-light)',
              background: 
                propStatus === 'published' ? 'var(--crm-positive-soft)' :
                propStatus === 'hidden' ? 'var(--crm-subtle-2)' :
                propStatus === 'under_negotiation' ? 'var(--crm-warn-soft)' : 'var(--crm-danger-soft)',
              color:
                propStatus === 'published' ? 'var(--crm-positive)' :
                propStatus === 'hidden' ? 'var(--crm-muted)' :
                propStatus === 'under_negotiation' ? 'var(--crm-warn)' : 'var(--crm-danger)'
            }}
          >
            <option value="published">🟢 {isAr ? 'منشور' : 'Published'}</option>
            <option value="hidden">⚪ {isAr ? 'مخفي' : 'Hidden'}</option>
            <option value="under_negotiation">🟡 {isAr ? 'تحت التفاوض' : 'Negotiating'}</option>
            <option value="sold">🔴 {isAr ? 'تم البيع' : 'Sold'}</option>
          </select>
        ) : (
          <span className="badge" style={{ background: 'var(--rose-bg)', color: 'var(--rose)' }}>
            {isAr ? 'في المهملات' : 'In Trash'}
          </span>
        )}
      </td>

      {/* Featured Star Toggle */}
      <td>
        <div className="hs-star-cell">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => {
              if (prop.featured) {
                if (onUpdateProperty(prop.id, { featured: false }) !== false) {
                  triggerToast(isAr ? 'تم إلغاء التمييز — خرج من الصفحة الرئيسية' : 'Removed from homepage', 'success');
                }
              } else {
                setSlotEditing(prop);
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: prop.featured ? 'var(--crm-warn)' : 'var(--crm-muted)'
            }}
            title={prop.featured ? (isAr ? 'مميز — اضغط لإلغاء التمييز' : 'Featured — click to remove') : (isAr ? 'تمييز في الصفحة الرئيسية لمدة محددة' : 'Feature on homepage')}
            aria-label={prop.featured ? (isAr ? 'إلغاء التمييز' : 'Unfeature') : (isAr ? 'تمييز في الصفحة الرئيسية' : 'Feature on homepage')}
            aria-pressed={!!prop.featured}
          >
            <Star size={18} fill={prop.featured ? '#f59e0b' : 'none'} />
          </button>
          {prop.featured && (
            <button type="button" className="hs-link-btn" disabled={readOnly} onClick={() => setSlotEditing(prop)} title={isAr ? 'تعديل مدة التمييز' : 'Edit period'}>
              <FeaturedPeriodLabel property={prop} isAr={isAr} />
            </button>
          )}
        </div>
      </td>

      {/* Actions */}
      <td>
        <div className="table-actions-cell">
          {!isTrash ? (
            <>
              {/* Fast Eye Toggle */}
              <button
                type="button"
                className="icon-action-table-btn"
                disabled={readOnly}
                onClick={() => handleToggleVisibility(prop)}
                title={isOnSite ? (isAr ? 'إخفاء العقار من الموقع' : 'Hide from site') : (isAr ? 'إظهار العقار على الموقع' : 'Show on site')}
                aria-pressed={isOnSite}
                style={{ color: isOnSite ? 'var(--crm-positive)' : 'var(--crm-muted)' }}
              >
                {isOnSite ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>

              {/* Limited-time cash offer: in the actions column so it is always on screen */}
              {setOfferEditing && (() => {
                const state = offerState(prop);
                const live = getActiveOffer(prop);
                const label = {
                  none: isAr ? 'عرض' : 'Offer',
                  invalid: isAr ? 'راجع العرض' : 'Fix offer',
                  scheduled: isAr ? 'عرض مجدول' : 'Scheduled',
                  active: live ? `−${live.pct}% · ${shortLeft(live.msLeft, isAr)}` : (isAr ? 'عرض' : 'Offer'),
                  expired: isAr ? 'العرض انتهى' : 'Ended'
                }[state];
                const tone = state === 'active' ? 'var(--crm-warn)' : state === 'invalid' ? 'var(--crm-danger)' : 'var(--crm-ink)';
                return (
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={readOnly}
                    onClick={() => setOfferEditing(prop)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: 'var(--crm-text-xs)',
                      fontWeight: state === 'active' ? 800 : 700,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      color: tone,
                      background: state === 'active' ? 'var(--crm-warn-soft)' : 'transparent',
                      border: `1px solid ${state === 'active' ? 'var(--crm-warn)' : 'var(--crm-line)'}`
                    }}
                    title={isAr
                      ? (state === 'none' ? 'إضافة عرض كاش لفترة محدودة — يظهر كهدية في الصفحة الرئيسية' : `تعديل العرض أو إنهاؤه${live ? ` — ينتهي خلال ${formatTimeLeft(live.msLeft)}` : ''}`)
                      : (state === 'none' ? 'Add a limited-time cash offer' : `Edit or end the offer${live ? ` — ends in ${formatTimeLeft(live.msLeft, false)}` : ''}`)}
                  >
                    <Flame size={14} fill={state === 'active' ? 'currentColor' : 'none'} />
                    <span>{label}</span>
                  </button>
                );
              })()}

              {/* The brochure the team sends to a client who asked for it on WhatsApp */}
              <BrochureButton prop={prop} isAr={isAr} />

              {/* WhatsApp Retargeting / Match Broadcast Button */}
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setNotifierProperty(prop);
                  setNotifierEventType(propStatus === 'sold' ? 'sold_unit' : 'new_unit');
                }}
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: 'var(--crm-positive)',
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title={isAr ? 'إرسال إشعارات واتساب للعملاء المهتمين بهذه الوحدة' : 'Notify Matched Leads via WhatsApp'}
                aria-label={isAr ? 'إشعار واتساب للعملاء المهتمين' : 'Notify matched leads via WhatsApp'}
              >
                <MessageSquare size={15} />
              </button>

              {/* Edit */}
              <button
                type="button"
                className="icon-action-table-btn btn-edit"
                disabled={readOnly}
                onClick={() => handleOpenEdit(prop)}
                title={isAr ? 'تعديل التفاصيل' : 'Edit'}
              >
                <Edit3 size={15} />
              </button>

              {/* Soft Delete */}
              <button
                type="button"
                className="icon-action-table-btn btn-del"
                disabled={readOnly}
                onClick={() => handleSoftDelete(prop.id)}
                title={isAr ? 'نقل للمهملات' : 'Trash'}
              >
                <Trash2 size={15} />
              </button>
            </>
          ) : (
            <>
              {/* Restore */}
              <button
                type="button"
                className="icon-action-table-btn"
                disabled={readOnly}
                onClick={() => handleRestore(prop.id)}
                title={isAr ? 'استرجاع ونشر العقار' : 'Restore'}
                style={{ color: 'var(--crm-positive)' }}
              >
                <RotateCcw size={15} />
              </button>

              {/* Permanent Delete */}
              <button
                type="button"
                className="icon-action-table-btn btn-del"
                disabled={readOnly}
                onClick={() => handlePermanentDelete(prop.id)}
                title={isAr ? 'حذف نهائي للأبد' : 'Delete Permanently'}
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
