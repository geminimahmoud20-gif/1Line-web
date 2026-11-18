// A short, encouraging line for the progress ring (Egyptian Arabic / English)
export function ringMessage(percent, isAr = true) {
  const p = Number(percent) || 0;
  const pick = (ar, en) => (isAr ? ar : en);
  if (p >= 100) return pick('تمام كده، جاهز!', 'All set!');
  if (p >= 75) return pick('قربت تخلّص!', 'Almost there!');
  if (p >= 40) return pick('ماشي كويس!', 'Going well!');
  if (p > 0) return pick('بداية حلوة!', 'Nice start!');
  return pick('يلا نبدأ، دقيقتين بس', "Let's start, two minutes");
}
