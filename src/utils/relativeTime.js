// "منذ ساعتين" / "2 hours ago" for a record's date. Accepts ISO strings, epoch ms and
// Firestore Timestamps; older records that stored a label (e.g. "الآن") show that label.
const toMillis = (v) => {
  if (!v) return NaN;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v === 'object' && Number.isFinite(v.seconds)) return v.seconds * 1000;
  return typeof v === 'number' ? v : Date.parse(v);
};

export function recordTimeLabel(record = {}, isAr = true, now = Date.now()) {
  const raw = record.approvedAt || record.createdAt || record.timestamp;
  const ms = toMillis(raw);
  if (!Number.isFinite(ms)) {
    return typeof record.timestamp === 'string' && record.timestamp ? record.timestamp : (isAr ? 'حديثاً' : 'Recent');
  }
  const minutes = Math.max(0, Math.floor((now - ms) / 60000));
  if (minutes < 1) return isAr ? 'الآن' : 'Just now';
  if (minutes < 60) return isAr ? `منذ ${minutes} دقيقة` : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return isAr ? `منذ ${hours} ساعة` : `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return isAr ? `منذ ${days} يوم` : `${days} d ago`;
  return new Date(ms).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-US');
}
