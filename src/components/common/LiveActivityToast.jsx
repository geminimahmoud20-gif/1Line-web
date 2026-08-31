import { useState, useEffect } from 'react';
import { Sparkles, MapPin, X, CheckCircle2 } from 'lucide-react';

const ACTIVITIES = [
  { id: 1, user_ar: 'مستثمر من سوهاج الجديدة', user_en: 'Investor from New Sohag', action_ar: 'طلب دراسة جدوى استثمارية لمقر تجاري', action_en: 'Requested commercial feasibility study', time_ar: 'منذ دقيقتين', time_en: '2m ago' },
  { id: 2, user_ar: 'عميل من شرق سوهاج', user_en: 'Client from East Sohag', action_ar: 'حجز موعد معاينة لشقة شارع الجمهورية', action_en: 'Booked a viewing for Republic St. apartment', time_ar: 'منذ 5 دقائق', time_en: '5m ago' },
  { id: 3, user_ar: 'مغترب مصري بالسعودية', user_en: 'Expat from Riyadh', action_ar: 'حمّل بروشور PDF وتفاصيل التقسيط لفيلّا مستقلة', action_en: 'Downloaded PDF brochure for standalone villa', time_ar: 'منذ 8 دقائق', time_en: '8m ago' },
  { id: 4, user_ar: 'مشتري من طهطا', user_en: 'Buyer from Tahta', action_ar: 'أكد تثبيت وحجز عقار كود PROP-1 بإنستاباي', action_en: 'Reserved property PROP-1 via InstaPay', time_ar: 'منذ 12 دقيقة', time_en: '12m ago' }
];

export default function LiveActivityToast({ lang = 'ar' }) {
  const [currentActivity, setCurrentActivity] = useState(null);
  const [visible, setVisible] = useState(false);
  const isAr = lang === 'ar';

  useEffect(() => {
    // Initial delay before showing first activity
    const initialTimer = setTimeout(() => {
      showRandomActivity();
    }, 4000);

    // Recurring interval
    const interval = setInterval(() => {
      showRandomActivity();
    }, 28000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const showRandomActivity = () => {
    const randomItem = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
    setCurrentActivity(randomItem);
    setVisible(true);

    // Auto-hide after 6 seconds
    setTimeout(() => {
      setVisible(false);
    }, 6000);
  };

  if (!visible || !currentActivity) return null;

  return (
    <div className="live-activity-toast-pill">
      <button type="button" className="close-activity-btn" onClick={() => setVisible(false)}>
        <X size={13} />
      </button>

      <div className="activity-icon-glow">
        <Sparkles size={16} className="text-gold" />
      </div>

      <div className="activity-text-content">
        <div className="activity-user-row">
          <strong>{isAr ? currentActivity.user_ar : currentActivity.user_en}</strong>
          <span className="activity-time-tag">{isAr ? currentActivity.time_ar : currentActivity.time_en}</span>
        </div>
        <p className="activity-desc-text">{isAr ? currentActivity.action_ar : currentActivity.action_en}</p>
      </div>
    </div>
  );
}
