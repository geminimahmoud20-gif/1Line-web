import { useState } from 'react';
import { Edit3, Eye, EyeOff, FileDown, Flame, MessageSquare, RotateCcw, Star, Trash2, Camera, Send } from 'lucide-react';
import { offerState, getActiveOffer } from '../../utils/propertyOffers';
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { FeaturedPeriodLabel } from './HomepageSlotsBoard';
import { ISSUES, pricePerM2, photoCount } from '../../utils/listingReview';
import { getNormalizedPropertyStatus } from '../../utils/crmLeadViews';
import { Badge, IconButton, Button, Select } from '../ui';
import RowMenu from './RowMenu';
import { propertyTypeLabel } from '../../utils/placeLabels';

const STATUS_OPTIONS = [
  { value: 'published', ar: 'معروض', en: 'Live' },
  { value: 'hidden', ar: 'مخفي / مراجعة', en: 'Hidden / review' },
  { value: 'under_negotiation', ar: 'تحت التفاوض', en: 'Negotiating' },
  { value: 'sold', ar: 'اتباع', en: 'Sold' }
];

const money = (n) => Number(n).toLocaleString('en-US');

// Short time left on an offer: "6 أيام" / "5 ساعات"
const shortLeft = (ms, isAr) => {
  const d = Math.floor(ms / 86400000);
  if (d >= 1) return isAr ? (d === 1 ? 'يوم' : d === 2 ? 'يومين' : `${d} ${d <= 10 ? 'أيام' : 'يوم'}`) : `${d}d`;
  const h = Math.max(1, Math.floor(ms / 3600000));
  return isAr ? (h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : `${h} ${h <= 10 ? 'ساعات' : 'ساعة'}`) : `${h}h`;
};

const specsLine = (prop, isAr) => {
  const size = Number(prop.size) > 0 ? `${prop.size} ${isAr ? 'م²' : 'm²'}` : '';
  const extra = prop.type === 'land' ? ''
    : prop.type === 'commercial' ? (prop.frontage || '')
      : prop.type === 'office' ? (prop.divisionCount ? `${prop.divisionCount} ${isAr ? 'مكاتب' : 'rooms'}` : '')
        : (Number(prop.bedrooms) > 0 ? `${prop.bedrooms} ${isAr ? 'غرف' : 'bd'}` : '');
  return [size, extra].filter(Boolean).join(' · ') || '—';
};

async function downloadBrochure(prop, isAr) {
  try {
    const { generatePropertyPdf } = await import('../../utils/brochure/propertyBrochure');
    await generatePropertyPdf(prop);
  } catch (err) {
    console.error('Brochure error:', err);
    window.alert(isAr ? 'تعذّر تجهيز البروشور، جرّب تاني.' : 'Could not build the brochure.');
  }
}

/** One row of CRM → العقارات: what the listing is, what it still lacks, its status and actions. */
export default function PropertyTableRow({
  readOnly = false,
  prop,
  issues = [],
  selected = false,
  onSelect,
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
  const [busy, setBusy] = useState(false);
  const status = getNormalizedPropertyStatus(prop);
  const isTrash = status === 'trash';
  const isOnSite = !isTrash && status !== 'hidden';
  const ready = issues.length === 0;
  const title = (isAr ? prop.title_ar : prop.title_en) || prop.title_ar || (isAr ? 'من غير عنوان' : 'Untitled');
  const typeName = (() => { const t = PROPERTY_TYPES.find((x) => x.id === prop.type); return t ? (isAr ? t.name_ar : t.name_en) : propertyTypeLabel(prop.type, isAr); })();
  const areaName = (() => { const a = areas.find((x) => x.id === prop.areaKey); return a ? (isAr ? a.name_ar : a.name_en) : ''; })();
  const m2 = pricePerM2(prop);
  const photos = photoCount(prop);
  const offer = offerState(prop);
  const liveOffer = getActiveOffer(prop);

  const toggleFeatured = () => {
    if (prop.featured) {
      if (onUpdateProperty(prop.id, { featured: false }) !== false) {
        triggerToast(isAr ? 'اتشال من الصفحة الرئيسية' : 'Removed from homepage', 'success');
      }
    } else {
      setSlotEditing(prop);
    }
  };

  return (
    <tr className={`crm-prow ${selected ? 'is-selected' : ''} ${isTrash ? 'is-trash' : ''}`}>
      <td className="crm-prow__check">
        <input
          type="checkbox"
          checked={selected}
          disabled={readOnly}
          onChange={(e) => onSelect?.(prop.id, e.target.checked)}
          aria-label={isAr ? `اختيار ${title}` : `Select ${title}`}
        />
      </td>

      <td className="crm-prow__cell-main">
        <div className="crm-prow__main">
        <div className="crm-prow__thumb">
          {photos > 0
            ? <img src={prop.images[0]} alt="" loading="lazy" />
            : <span className="crm-prow__nophoto"><Camera size={18} aria-hidden="true" /></span>}
          {photos > 1 && <span className="crm-prow__count">{photos}</span>}
        </div>
        <div className="crm-prow__info">
          <button type="button" className="crm-prow__title" onClick={() => handleOpenEdit(prop)} disabled={readOnly || isTrash} title={title}>
            {title}
          </button>
          <span className="crm-prow__meta">
            <bdi className="crm-prow__code">{String(prop.id).toUpperCase()}</bdi>
            <span>{typeName}{areaName ? ` · ${areaName}` : ''}</span>
          </span>
          <span className="crm-prow__tags">
            {!isTrash && (ready
              ? (status === 'hidden' && <Badge tone="success" dot>{isAr ? 'جاهز للنشر' : 'Ready to publish'}</Badge>)
              : <Badge tone="warning" title={isAr ? 'ناقص قبل النشر' : 'Missing before publishing'}>{isAr ? 'ناقص: ' : 'Missing: '}{issues.map((k) => (isAr ? ISSUES[k].ar : ISSUES[k].en)).join('، ')}</Badge>)}
            {prop.featured && <Badge tone="accent" icon={<Star size={11} fill="currentColor" aria-hidden="true" />}>{isAr ? 'مميز' : 'Featured'} <FeaturedPeriodLabel property={prop} isAr={isAr} /></Badge>}
            {liveOffer && <Badge tone="warning" icon={<Flame size={11} aria-hidden="true" />}>−{liveOffer.pct}% · {shortLeft(liveOffer.msLeft, isAr)}</Badge>}
            {offer === 'invalid' && <Badge tone="danger">{isAr ? 'راجع العرض' : 'Fix offer'}</Badge>}
            {prop.badge_ar && <Badge>{isAr ? prop.badge_ar : prop.badge_en}</Badge>}
          </span>
        </div>
        </div>
      </td>

      <td className="crm-prow__price">
        {Number(prop.price) > 0 ? (
          <>
            <strong><bdi>{money(prop.price)}</bdi> <small>{isAr ? 'ج.م' : 'EGP'}</small></strong>
            {m2 > 0 && <span>{money(m2)} {isAr ? 'ج.م / م²' : 'EGP/m²'}</span>}
            {Number(prop.downPayment) > 0 && <span>{isAr ? 'مقدم' : 'Down'} {money(prop.downPayment)}</span>}
          </>
        ) : <span className="crm-prow__missing">{isAr ? 'من غير سعر' : 'No price'}</span>}
      </td>

      <td className="crm-prow__specs">{specsLine(prop, isAr)}</td>

      <td className="crm-prow__status">
        {isTrash ? (
          <Badge tone="danger">{isAr ? 'في المهملات' : 'In trash'}</Badge>
        ) : (
          <Select
            hideLabel
            label={isAr ? `حالة ${title}` : `Status of ${title}`}
            className={`crm-prow__select is-${status}`}
            value={status}
            disabled={readOnly}
            onChange={(e) => handleStatusChange(prop.id, e.target.value)}
            options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: isAr ? o.ar : o.en }))}
          />
        )}
      </td>

      <td className="crm-prow__cell-actions">
        <div className="crm-prow__actions">
        {isTrash ? (
          <>
            <Button size="sm" variant="secondary" icon={<RotateCcw size={14} aria-hidden="true" />} disabled={readOnly} onClick={() => handleRestore(prop.id)}>
              {isAr ? 'استرجاع' : 'Restore'}
            </Button>
            <IconButton size="sm" label={isAr ? 'حذف نهائي' : 'Delete permanently'} icon={<Trash2 size={15} />} disabled={readOnly} onClick={() => handlePermanentDelete(prop.id)} className="crm-prow__danger" />
          </>
        ) : (
          <>
            {status === 'hidden' && ready ? (
              <Button size="sm" icon={<Send size={14} aria-hidden="true" />} disabled={readOnly} onClick={() => handleToggleVisibility(prop)}>
                {isAr ? 'انشر' : 'Publish'}
              </Button>
            ) : (
              <IconButton
                size="sm"
                label={isOnSite ? (isAr ? 'إخفاء من الموقع' : 'Hide from site') : (isAr ? 'إظهار على الموقع' : 'Show on site')}
                icon={isOnSite ? <Eye size={16} /> : <EyeOff size={16} />}
                aria-pressed={isOnSite}
                disabled={readOnly}
                onClick={() => handleToggleVisibility(prop)}
                className={isOnSite ? 'crm-prow__live' : undefined}
              />
            )}
            <IconButton size="sm" label={isAr ? 'تعديل' : 'Edit'} icon={<Edit3 size={15} />} disabled={readOnly} onClick={() => handleOpenEdit(prop)} />
            <RowMenu
              isAr={isAr}
              label={isAr ? `إجراءات ${title}` : `Actions for ${title}`}
              items={[
                !readOnly && { id: 'feature', icon: <Star size={13} />, label: prop.featured ? (isAr ? 'شيله من الصفحة الرئيسية' : 'Remove from homepage') : (isAr ? 'ميّزه في الصفحة الرئيسية' : 'Feature on homepage'), onSelect: toggleFeatured },
                !readOnly && setOfferEditing && { id: 'offer', icon: <Flame size={13} />, label: offer === 'none' ? (isAr ? 'عرض كاش لفترة محدودة' : 'Limited-time offer') : (isAr ? 'تعديل العرض' : 'Edit offer'), onSelect: () => setOfferEditing(prop) },
                { id: 'brochure', icon: <FileDown size={13} />, label: busy ? (isAr ? 'بنجهّز البروشور…' : 'Preparing…') : (isAr ? 'بروشور للعميل' : 'Brochure'), disabled: busy, onSelect: async () => { setBusy(true); await downloadBrochure(prop, isAr); setBusy(false); } },
                { id: 'notify', icon: <MessageSquare size={13} />, label: isAr ? 'ابعته للعملاء المهتمين' : 'Send to matching clients', onSelect: () => { setNotifierProperty(prop); setNotifierEventType(status === 'sold' ? 'sold_unit' : 'new_unit'); } },
                !readOnly && { id: 'trash', separator: true, danger: true, icon: <Trash2 size={13} />, label: isAr ? 'نقل للمهملات' : 'Move to trash', onSelect: () => handleSoftDelete(prop.id) }
              ]}
            />
          </>
        )}
        </div>
      </td>
    </tr>
  );
}
