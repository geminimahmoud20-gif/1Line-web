import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Search, Building2, MessageSquare } from 'lucide-react';
import { updatePageSeo } from '../utils/seoHelper';

/**
 * Real "not found" view. Vercel serves it with HTTP 404 for unknown paths (dist/404.html);
 * it is also rendered for unknown property IDs, with noindex.
 */
export default function NotFoundPage({ lang = 'ar', variant = 'page' }) {
  const isAr = lang === 'ar';
  const isProperty = variant === 'property';
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  useEffect(() => {
    updatePageSeo({
      title: isAr ? (isProperty ? 'العقار غير متاح' : 'الصفحة غير موجودة') : (isProperty ? 'Listing unavailable' : 'Page not found'),
      description: isAr ? 'الصفحة المطلوبة غير متاحة.' : 'The requested page is not available.',
      noindex: true
    });
  }, [isAr, isProperty]);

  return (
    <section className="lx-notfound" dir={isAr ? 'rtl' : 'ltr'}>
      <p className="lx-eyebrow">{isProperty ? (isAr ? 'العقار غير متاح' : 'Listing unavailable') : '404'}</p>
      <h1 className="lx-notfound-title">
        {isProperty
          ? (isAr ? 'هذا العقار لم يعد معروضاً أو الرابط غير صحيح.' : 'This listing is no longer available or the link is wrong.')
          : (isAr ? 'لم نجد الصفحة التي تبحث عنها.' : "We couldn't find that page.")}
      </h1>
      <p className="lx-notfound-lead">
        {isAr
          ? 'قد يكون العقار قد بيع أو سُحب بطلب مالكه. يمكنك تصفح المعروض الحالي أو ترك طلبك وسنطابقه لك.'
          : 'It may have been sold or withdrawn by its owner. Browse current listings or tell us what you need.'}
      </p>
      <div className="lx-notfound-actions">
        <Link to="/properties" className="lx-btn lx-btn-primary">
          <Building2 size={18} /> {isAr ? 'تصفح العقارات المتاحة' : 'Browse listings'} <Arrow size={16} />
        </Link>
        <Link to="/buy" className="lx-btn lx-btn-ghost">
          <Search size={18} /> {isAr ? 'اطلب عقاراً بمواصفاتك' : 'Request a property'}
        </Link>
        <Link to="/" className="lx-btn lx-btn-link">
          <MessageSquare size={18} /> {isAr ? 'الصفحة الرئيسية' : 'Home'}
        </Link>
      </div>
    </section>
  );
}
