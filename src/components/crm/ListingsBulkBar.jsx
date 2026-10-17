import { useState } from 'react';
import { Check, MapPin, ShieldCheck, Trash2, X, Home, Tag } from 'lucide-react';
import { Button, Select, useConfirm } from '../ui';
import { ISSUES } from '../../utils/listingReview';
import { REVIEW_OPTIONS, AVAILABILITY_OPTIONS } from '../../utils/listingBadges';
import { addDays } from '../../utils/featuredSlots';

/**
 * Actions on the listings ticked in CRM → العقارات: change the display status (publish the complete
 * ones, or all of them), move to an area, set the review / availability badge, pin to or keep off
 * the homepage, move to trash. Each listing is one update, as from its row.
 */
const STATUS_ACTIONS = [
  { value: 'publish_ready', ar: 'اعرضها على الموقع (الكاملة بس)', en: 'Show on site (complete only)' },
  { value: 'publish_all', ar: 'اعرضها كلها حتى الناقصة', en: 'Show all, even incomplete' },
  { value: 'hidden', ar: 'إخفاء من الموقع (مراجعة)', en: 'Hide (review)' },
  { value: 'under_negotiation', ar: 'تحت التفاوض', en: 'Under negotiation' },
  { value: 'sold', ar: 'اتباعت', en: 'Sold' }
];

const HOME_ACTIONS = [
  { value: 'feature', ar: 'ثبّتها في الرئيسية (30 يوم)', en: 'Pin on homepage (30 days)' },
  { value: 'unfeature', ar: 'شيل التثبيت', en: 'Unpin' },
  { value: 'exclude', ar: 'متظهرش في الرئيسية', en: 'Keep off homepage' },
  { value: 'include', ar: 'تظهر في الرئيسية عادي', en: 'Allow on homepage' }
];

export default function ListingsBulkBar({ ids, properties, issuesOf, areas, isAr, onUpdateProperty, triggerToast, onDone }) {
  const confirm = useConfirm();
  const [status, setStatusChoice] = useState('');
  const [area, setArea] = useState('');
  const [review, setReview] = useState('');
  const [home, setHome] = useState('');
  const [availability, setAvailability] = useState('');
  const picked = properties.filter((p) => ids.includes(p.id));
  const L = (ar, en) => (isAr ? ar : en);
  const label = (o) => (isAr ? o.ar : o.en);

  const apply = (list, patchOf, doneMsg) => {
    let ok = 0;
    list.forEach((p, i) => { if (onUpdateProperty(p.id, patchOf(p, i)) !== false) ok += 1; });
    triggerToast(doneMsg(ok), ok ? 'success' : 'error');
    onDone();
  };

  // Back to what it was before it was hidden (e.g. under negotiation), else published
  const shownPatch = (p) => ({ status: p.statusBeforeHide && p.statusBeforeHide !== 'hidden' ? p.statusBeforeHide : 'published', statusBeforeHide: null });
  const missingText = (list) => [...new Set(list.flatMap((p) => issuesOf(p)))].map((k) => (isAr ? ISSUES[k].ar : ISSUES[k].en)).join('، ');

  const publishReady = async () => {
    const complete = picked.filter((p) => issuesOf(p).length === 0);
    const incomplete = picked.filter((p) => issuesOf(p).length > 0);
    if (!complete.length) {
      triggerToast(L('مفيش ولا واحدة بياناتها كاملة. كمّل الناقص، أو اختار "اعرضها كلها حتى الناقصة".', 'None is complete. Fill them in, or choose "Show all".'), 'error');
      return;
    }
    if (incomplete.length) {
      const go = await confirm({
        title: L(`هنعرض ${complete.length} بس`, `Showing ${complete.length} only`),
        tone: 'primary',
        message: L(`${incomplete.length} منهم ناقص بيانات (${missingText(incomplete)}) وهيفضلوا مخفيين.`, `${incomplete.length} are incomplete and stay hidden.`),
        confirmLabel: L(`اعرض ${complete.length}`, `Show ${complete.length}`),
        cancelLabel: L('لأ', 'Cancel')
      });
      if (!go) return;
    }
    apply(complete, shownPatch, (n) => L(`${n} وحدة بقت معروضة على الموقع`, `${n} now on the site`));
  };

  const publishAll = async () => {
    const incomplete = picked.filter((p) => issuesOf(p).length > 0);
    if (incomplete.length) {
      const go = await confirm({
        title: L(`عرض ${picked.length} وحدة منهم ${incomplete.length} ناقصة؟`, `Show ${picked.length}, ${incomplete.length} incomplete?`),
        message: L(`الناقص فيهم: ${missingText(incomplete)}. الزوار هيشوفوها كده لحد ما تكمّلها.`, `Missing: ${missingText(incomplete)}. Visitors will see them as they are.`),
        confirmLabel: L('اعرضهم كلهم', 'Show all'),
        cancelLabel: L('لأ', 'Cancel')
      });
      if (!go) return;
    }
    apply(picked, shownPatch, (n) => L(`${n} وحدة بقت معروضة على الموقع`, `${n} now on the site`));
  };

  const STATUS_DONE = {
    hidden: (n) => L(`${n} اتخفوا ورجعوا للمراجعة`, `${n} hidden`),
    under_negotiation: (n) => L(`${n} تحت التفاوض`, `${n} in negotiation`),
    sold: (n) => L(`${n} اتسجلوا مباعين`, `${n} sold`)
  };
  const applyStatus = () => {
    if (status === 'publish_ready') publishReady();
    else if (status === 'publish_all') publishAll();
    else if (STATUS_DONE[status]) apply(picked, () => ({ status }), STATUS_DONE[status]);
    setStatusChoice('');
  };

  const moveArea = () => {
    if (!area) return;
    const name = areas.find((a) => a.id === area)?.name_ar || area;
    apply(picked, () => ({ areaKey: area }), (n) => L(`${n} عقار اتنقلوا لـ ${name}`, `${n} moved to ${name}`));
    setArea('');
  };

  const setReviewBadge = () => {
    if (!review) return;
    const name = REVIEW_OPTIONS.find((o) => o.value === review)?.ar || review;
    apply(picked, () => ({ reviewBadge: review }), (n) => L(`${n} عقار: ${name}`, `${n} updated`));
    setReview('');
  };

  const setAvailabilityBadge = () => {
    if (!availability) return;
    apply(picked, () => ({ availabilityBadge: availability }), (n) => L(`${n} عقار: شارة الحالة اتحدّثت`, `${n} updated`));
    setAvailability('');
  };

  const applyHome = () => {
    if (home === 'feature') {
      // New pins go after the ones already pinned, in the order they are listed
      const lastOrder = properties.reduce((m, p) => (p.featured ? Math.max(m, Number(p.featuredOrder) || 0) : m), 0);
      const from = addDays(0);
      apply(picked, (p, i) => ({ featured: true, homeExcluded: false, featuredFrom: from, featuredUntil: addDays(29), featuredOrder: lastOrder + i + 1 }),
        (n) => L(`${n} اتثبتوا في الرئيسية لمدة 30 يوم (اللي مش معروض مش هيظهر لحد ما تعرضه)`, `${n} pinned for 30 days`));
    } else if (home === 'unfeature') {
      apply(picked, () => ({ featured: false, featuredOrder: null }), (n) => L(`${n} اتشال تثبيتهم`, `${n} unpinned`));
    } else if (home === 'exclude') {
      apply(picked, () => ({ homeExcluded: true }), (n) => L(`${n} مش هيظهروا في الرئيسية تلقائياً`, `${n} kept off the homepage`));
    } else if (home === 'include') {
      apply(picked, () => ({ homeExcluded: false }), (n) => L(`${n} ممكن يظهروا في الرئيسية تاني`, `${n} allowed on the homepage`));
    }
    setHome('');
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

  const group = (key, lbl, placeholder, value, onChange, options, onApply, icon) => (
    <span className="crm-props__bulk-area" key={key}>
      <Select hideLabel label={lbl} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} options={options} />
      <Button size="sm" variant={key === 'status' ? 'primary' : 'secondary'} icon={icon} disabled={!value} onClick={onApply}>{L('طبّق', 'Apply')}</Button>
    </span>
  );

  return (
    <div className="crm-props__bulk" role="region" aria-label={L('إجراءات على المحدد', 'Bulk actions')}>
      <strong>{L(`${picked.length} محدد`, `${picked.length} selected`)}</strong>
      {group('status', L('حالة العرض', 'Display status'), L('غيّر حالة العرض…', 'Change status…'), status, setStatusChoice,
        STATUS_ACTIONS.map((o) => ({ value: o.value, label: label(o) })), applyStatus, <Check size={14} aria-hidden="true" />)}
      {group('home', L('الصفحة الرئيسية', 'Homepage'), L('الصفحة الرئيسية…', 'Homepage…'), home, setHome,
        HOME_ACTIONS.map((o) => ({ value: o.value, label: label(o) })), applyHome, <Home size={14} aria-hidden="true" />)}
      {group('area', L('انقلهم لمنطقة', 'Move to area'), L('انقل لمنطقة…', 'Move to area…'), area, setArea,
        areas.filter((a) => a.id !== 'all').map((a) => ({ value: a.id, label: isAr ? a.name_ar : (a.name_en || a.name_ar) })), moveArea, <MapPin size={14} aria-hidden="true" />)}
      {group('review', L('شارة المراجعة', 'Review badge'), L('شارة المراجعة…', 'Review badge…'), review, setReview,
        REVIEW_OPTIONS.map((o) => ({ value: o.value, label: label(o) })), setReviewBadge, <ShieldCheck size={14} aria-hidden="true" />)}
      {group('availability', L('شارة الحالة', 'Availability badge'), L('شارة متاح / اتباع…', 'Availability badge…'), availability, setAvailability,
        AVAILABILITY_OPTIONS.map((o) => ({ value: o.value, label: o.value === 'auto' ? L('تظهر', 'Show') : L('مخفية', 'Hidden') })), setAvailabilityBadge, <Tag size={14} aria-hidden="true" />)}
      <Button size="sm" variant="danger" icon={<Trash2 size={14} aria-hidden="true" />} onClick={trash}>{L('للمهملات', 'Trash')}</Button>
      <Button size="sm" variant="ghost" icon={<X size={14} aria-hidden="true" />} onClick={onDone}>{L('إلغاء التحديد', 'Clear')}</Button>
    </div>
  );
}
