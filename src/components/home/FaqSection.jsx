import { useEffect, useMemo } from 'react';
import { injectJsonLdSchema } from '../../utils/seoHelper';
import { CONTACT, SERVICE_AREAS } from '../../config/siteConfig';
import { getDynamicPhone } from '../../utils/founderCmsData';

/**
 * Direct, factual Q&A that answer engines (Google AI Overviews, ChatGPT, Perplexity) can quote,
 * mirrored in FAQPage structured data.
 */
function buildFaq(isAr) {
  const phone = getDynamicPhone();
  const sohag = (isAr ? SERVICE_AREAS.sohag_ar : SERVICE_AREAS.sohag_en).join(isAr ? '، ' : ', ');
  const cairo = (isAr ? SERVICE_AREAS.cairo_ar : SERVICE_AREAS.cairo_en).join(isAr ? '، ' : ', ');

  if (isAr) {
    return [
      ['ما الخدمات التي تقدمها 1Line Solutions؟',
        'ون لاين (1Line Solutions) شركة وساطة واستشارات عقارية للأصول عالية القيمة: بيع وشراء الأراضي والشقق والفيلات والمحلات والمكاتب، التقييم السعري، مراجعة مستندات الملكية والتراخيص قبل التعاقد، المكتب الخاص للصفقات غير المعلنة، وخدمة كاملة للمصريين بالخارج.'],
      ['ما المناطق التي تغطيها 1Line؟',
        `محافظة سوهاج (${sohag}) والقاهرة الكبرى (${cairo}).`],
      ['كيف أعرف سعر السوق لعقاري؟',
        'استخدم أداة التقييم في صفحة «قيّم عقارك» لتحصل على نطاق سعري استرشادي خلال دقيقتين. بعدها يعاين مستشار التقييم العقار ويقارنه بعروض وصفقات فعلية في نفس المنطقة ليعطيك سعراً مقترحاً واستراتيجية عرض.'],
      ['هل تراجعون المستندات القانونية قبل البيع أو الشراء؟',
        'نعم. نراجع تسلسل الملكية وتراخيص البناء والتوكيلات قبل عرض أي عقار، ونسلمك ملخص المراجعة قبل التعاقد. المراجعة لا تغني عن محاميك الخاص أو إجراءات الشهر العقاري، ونشجعك على الاستعانة بهما.'],
      ['هل يمكنني البيع أو الشراء وأنا خارج مصر؟',
        'نعم. نوفر معاينات فيديو مباشرة، ونتابع التوكيلات والتحويلات البنكية الرسمية، ونرسل تحديثات مكتوبة في كل مرحلة حتى الاستلام.'],
      ['كيف تُحدَّد الأتعاب وهل أدفع شيئاً عبر الموقع؟',
        'تُوضَّح الأتعاب كتابياً قبل بدء أي خدمة. الموقع لا يقبل أي مدفوعات، وأي جدية حجز تُسدَّد فقط بعد استلامك خطاب حجز رسمياً من الشركة.'],
      ['كيف أتواصل مع 1Line؟',
        `هاتف وواتساب: ${phone}. البريد: ${CONTACT.email}. المقر: ${CONTACT.address_ar}. مواعيد العمل: ${CONTACT.hours_ar}.`],
    ];
  }
  return [
    ['What does 1Line Solutions do?',
      '1Line Solutions is a brokerage and advisory firm for high-value real estate: buying and selling land, apartments, villas, shops and offices; valuation; title and permit review before contract; off-market deals through the Private Office; and full service for Egyptians abroad.'],
    ['Which areas does 1Line cover?', `Sohag Governorate (${sohag}) and Greater Cairo (${cairo}).`],
    ['How do I find the market price of my property?',
      'Use the valuation tool on the “Value your property” page for an indicative range in two minutes. A valuation advisor then visits and compares with real listings and deals in the same area to recommend a price and marketing plan.'],
    ['Do you review legal documents?',
      'Yes. We review the title chain, building permits and powers of attorney before listing and share a summary before contract. This does not replace your own lawyer or registry procedures.'],
    ['Can I buy or sell from outside Egypt?',
      'Yes: live video viewings, power-of-attorney and official bank transfer follow-up, and written updates until handover.'],
    ['How are fees set, and do I pay on the website?',
      'Fees are agreed in writing before any service starts. The website takes no payments; any reservation deposit is paid only after an official reservation letter.'],
    ['How do I contact 1Line?', `Phone/WhatsApp: ${phone}. Email: ${CONTACT.email}. Office: ${CONTACT.address_en}. Hours: ${CONTACT.hours_en}.`],
  ];
}

export default function FaqSection({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const faq = useMemo(() => buildFaq(isAr), [isAr]);

  useEffect(() => {
    injectJsonLdSchema('faq-schema', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: isAr ? 'ar-EG' : 'en',
      mainEntity: faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a }
      }))
    });
    return () => document.getElementById('faq-schema')?.remove();
  }, [faq, isAr]);

  return (
    <section className="lx-faq" aria-labelledby="faq-title" dir={isAr ? 'rtl' : 'ltr'}>
      <p className="lx-eyebrow">{isAr ? 'أسئلة شائعة' : 'FAQ'}</p>
      <h2 id="faq-title">{isAr ? 'إجابات مباشرة قبل أن تسأل' : 'Straight answers'}</h2>
      <p className="lx-faq-lead">
        {isAr ? 'ما يسأل عنه الملاك والمشترون والمستثمرون عادةً قبل أول مكالمة.' : 'What owners, buyers and investors usually ask before the first call.'}
      </p>
      {faq.map(([q, a], i) => (
        <details key={q} open={i === 0}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
    </section>
  );
}
