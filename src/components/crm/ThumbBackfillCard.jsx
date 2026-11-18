import { useMemo, useState } from 'react';
import { ImageDown } from 'lucide-react';
import { needsThumb } from '../../utils/imageThumbs';
import { makeThumbForUrl } from '../../utils/imageUploadService';
import { Button, Card } from '../ui';

// Listing photos uploaded before small copies existed: makes each one's 640px copy, one at a time,
// and saves the listing with the marked addresses. Safe to run again; finished photos are skipped.
export default function ThumbBackfillCard({ properties = [], onUpdateProperty, isAr, triggerToast }) {
  const pending = useMemo(
    () => properties.filter((p) => !p.isDemo && !p.isDeleted && (p.images || []).some(needsThumb)),
    [properties]
  );
  const photoCount = pending.reduce((n, p) => n + p.images.filter(needsThumb).length, 0);
  const [progress, setProgress] = useState(null); // { done, total, failed }

  if (!photoCount && !progress) return null;

  const run = async () => {
    const total = photoCount;
    let done = 0;
    let failed = 0;
    setProgress({ done, total, failed });
    for (const prop of pending) {
      const images = [];
      let changed = false;
      for (const url of prop.images) {
        if (!needsThumb(url)) { images.push(url); continue; }
        const marked = await makeThumbForUrl(url);
        if (marked) { images.push(marked); changed = true; } else { images.push(url); failed += 1; }
        done += 1;
        setProgress({ done, total, failed });
      }
      if (changed) {
        const patch = { images };
        if (prop.image && prop.images.includes(prop.image)) patch.image = images[prop.images.indexOf(prop.image)];
        if (onUpdateProperty(prop.id, patch) === false) failed += 1;
      }
    }
    setProgress(null);
    triggerToast?.(
      failed
        ? (isAr ? `اتعملت نسخ صغيرة لـ${total - failed} صورة، و${failed} معرفتش. جرّب تاني بعدين.` : `${total - failed} done, ${failed} failed. Try again later.`)
        : (isAr ? 'كل الصور بقى ليها نسخ صغيرة' : 'All photos now have small copies'),
      failed ? 'warning' : 'success'
    );
  };

  return (
    <Card padding="compact" className="crm-props__thumbs">
      <ImageDown size={16} aria-hidden="true" />
      <span>
        {progress
          ? (isAr ? `بنعمل النسخ الصغيرة… ${progress.done} من ${progress.total}` : `Making small copies… ${progress.done}/${progress.total}`)
          : (isAr
            ? `${photoCount} صورة قديمة في ${pending.length} عقار من غير نسخة صغيرة، فبتتحمّل بحجمها الكامل في الكروت.`
            : `${photoCount} older photos in ${pending.length} listings have no small copy and load full size on cards.`)}
      </span>
      <Button size="sm" variant="secondary" onClick={run} disabled={Boolean(progress)}>
        {isAr ? 'اعمل نسخ صغيرة' : 'Make small copies'}
      </Button>
    </Card>
  );
}
