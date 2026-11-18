import { Quote } from 'lucide-react';
import { useSiteSettings } from '../../utils/siteSettings';
import './home-testimonials.css';

// Client testimonials written in CRM → إعدادات الموقع. Hidden until at least one exists:
// the site never shows sample or invented reviews.
export default function HomeTestimonials({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const items = useSiteSettings().testimonials
    .map((t) => ({ ...t, text: isAr ? (t.text_ar || t.text_en) : (t.text_en || t.text_ar), role: isAr ? t.role_ar : t.role_en }))
    .filter((t) => t.text);
  if (items.length === 0) return null;

  return (
    <section className="hm-testimonials" aria-labelledby="hm-testimonials-title" dir={isAr ? 'rtl' : 'ltr'}>
      <h2 id="hm-testimonials-title">{isAr ? 'عملاؤنا بيقولوا إيه' : 'What our clients say'}</h2>
      <ul className="hm-testimonials__list">
        {items.map((t, i) => (
          <li key={`${t.name}-${i}`} className="hm-testimonials__card">
            <Quote size={20} aria-hidden="true" className="hm-testimonials__icon" />
            <blockquote className="hm-testimonials__text">{t.text}</blockquote>
            <p className="hm-testimonials__who">
              <strong>{t.name}</strong>
              {t.role && <span>{t.role}</span>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
