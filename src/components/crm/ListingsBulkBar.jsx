import { useState } from 'react';
import { Send, EyeOff, Handshake, BadgeCheck, MapPin, ShieldCheck, Trash2, X } from 'lucide-react';
import { Button, Select, useConfirm } from '../ui';
import { ISSUES } from '../../utils/listingReview';
import { REVIEW_OPTIONS } from '../../utils/listingBadges';

/**
 * Actions on the listings ticked in CRM → العقارات: publish (complete ones only), hide, mark under
 * negotiation or sold, move to an area, move to trash. Each listing is one update, as from its row.
 */
export default function ListingsBulkBar({ ids, properties, issuesOf, areas, isAr, onUpdateProperty, triggerToast, onDone }) {
  const confirm = useConfirm();
  const [area, setArea] = useState('');
  const [review, setReview] = useState('');
  const picked = properties.filter((p) => ids.includes(p.id));
  const L = (ar, en) => (isAr ? ar : en);

  const apply = (list, patchOf, doneMsg) => {
    let ok = 0;
    list.forEach((p) => { if (onUpdateProperty(p.id, patchOf(p)) !== false) ok += 1; });
    triggerToast(doneMsg(ok), ok ? 'success' : 'error');
    onDone();
  };

  const publish = async () => {
    const complete = picked.filter((p) => issuesOf(p).length === 0);
    const incomplete = picked.length - complete.length;
    if (!complete.length) {
      triggerToast(L('مفيش ولا واحد بياناته كاملة. كمّل الناقص الأول (صور، سعر، منطقة…).', 'None of them is complete yet.'), 'error');
      return;
    }
    if (incomplete) {
      const missing = new Set(picked.flatMap((p) => issuesOf(p)));
      const go = await confirm({
        title: L(`هننشر ${complete.length} بس`, `Publishing ${complete.length} only`),
        tone: 'primary',
        message: L(
          `${incomplete} منهم ناقص بيانات (${[...missing].map((k) => ISSUES[k].ar).join('، ')}) وهيفضلوا للمراجعة.`,
          `${incomplete} are incomplete and stay in review.`
        ),
        confirmLabel: L(`انشر ${complete.length}`, `Publish ${complete.length}`),
        cancelLabel: L('لأ', 'Cancel')
      });
      if (!go) return;
    }
    apply(complete, (p) => ({ status: p.statusBeforeHide && p.statusBeforeHide !== 'hidden' ? p.statusBeforeHide : 'published', statusBeforeHide: null }),
      (n) => L(`اتنشر ${n} عقار على الموقع`, `${n} published`));
  };

  const setStatus = (status, msg) => apply(picked, () => ({ status }), msg);

  const moveArea = () => {
    if (!area) return;
    const name = areas.find((a) => a.id === area)?.name_ar || area;
    apply(picked, () => ({ areaKey: area }), (n) => L(`${n} عقار اتنقلوا لـ ${name}`, `${n} moved to ${name}`));
    setArea('');
  };

  const setReviewBadge = () => {
    if (!review) return;
    const label = REVIEW_OPTIONS.find((o) => o.value === review)?.ar || review;
    apply(picked, () => ({ reviewBadge: review }), (n) => L(`${n} عقار: ${label}`, `${n} updated`));
    setReview('');
  };

  const trash = async () => {
    const go = await confirm({
      title: L(`نقل ${picked.length} عقار للمهملات؟`, `Move ${picked.length} to trash?`),
      message: L('تقدر ترجّعهم بعدين من المهملات.', 'You can restore them later.'),
      confirmLabel: L('انقلهم', 'Move'),
      cancelLabel: L('لأ', 'Cancel')
    });
    if (go) apply(picked, () => ({ isDeleted: true, status: 'trash' }), (n) => L(`${n} عقار في المهملات`, `${n} moved to trash`));
  };

  return (
    <div className="crm-props__bulk" role="region" aria-label={L('إجراءات على المحدد', 'Bulk actions')}>
      <strong>{L(`${picked.length} محدد`, `${picked.length} selected`)}</strong>
      <Button size="sm" icon={<Send size={14} aria-hidden="true" />} onClick={publish}>{L('انشر الكاملين', 'Publish complete')}</Button>
      <Button size="sm" variant="secondary" icon={<EyeOff size={14} aria-hidden="true" />} onClick={() => setStatus('hidden', (n) => L(`${n} اتخفوا ورجعوا للمراجعة`, `${n} hidden`))}>{L('إخفاء', 'Hide')}</Button>
      <Button size="sm" variant="secondary" icon={<Handshake size={14} aria-hidden="true" />} onClick={() => setStatus('under_negotiation', (n) => L(`${n} تحت التفاوض`, `${n} in negotiation`))}>{L('تحت التفاوض', 'Negotiating')}</Button>
      <Button size="sm" variant="secondary" icon={<BadgeCheck size={14} aria-hidden="true" />} onClick={() => setStatus('sold', (n) => L(`${n} اتسجلوا مباعين`, `${n} sold`))}>{L('اتباع', 'Sold')}</Button>
      <span className="crm-props__bulk-area">
        <Select
          hideLabel
          label={L('انقلهم لمنطقة', 'Move to area')}
          placeholder={L('انقل لمنطقة…', 'Move to area…')}
          value={area}
          onChange={(e) => setArea(e.target.value)}
          options={areas.filter((a) => a.id !== 'all').map((a) => ({ value: a.id, label: isAr ? a.name_ar : (a.name_en || a.name_ar) }))}
        />
        <Button size="sm" variant="secondary" icon={<MapPin size={14} aria-hidden="true" />} disabled={!area} onClick={moveArea}>{L('انقل', 'Move')}</Button>
      </span>
      <span className="crm-props__bulk-area">
        <Select
          hideLabel
          label={L('شارة المراجعة', 'Review badge')}
          placeholder={L('شارة المراجعة…', 'Review badge…')}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          options={REVIEW_OPTIONS.map((o) => ({ value: o.value, label: isAr ? o.ar : o.en }))}
        />
        <Button size="sm" variant="secondary" icon={<ShieldCheck size={14} aria-hidden="true" />} disabled={!review} onClick={setReviewBadge}>{L('طبّق', 'Apply')}</Button>
      </span>
      <Button size="sm" variant="danger" icon={<Trash2 size={14} aria-hidden="true" />} onClick={trash}>{L('للمهملات', 'Trash')}</Button>
      <Button size="sm" variant="ghost" icon={<X size={14} aria-hidden="true" />} onClick={onDone}>{L('إلغاء التحديد', 'Clear')}</Button>
    </div>
  );
}
