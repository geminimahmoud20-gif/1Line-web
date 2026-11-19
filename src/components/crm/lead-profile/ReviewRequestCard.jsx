import { Star, Send } from 'lucide-react';
import { reviewRequestMessage, reviewRequestedAt } from '../../../utils/reviewRequest';

const dayText = (iso, isAr) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short' });
};

/** A closed deal: ask the client for a Google review on WhatsApp (once; the team sees if it was already asked) */
export default function ReviewRequestCard({ lead, egWhatsapp, googleUrl, isAr, onUpdateLead }) {
  const L = (ar, en) => (isAr ? ar : en);
  const asked = reviewRequestedAt(lead);
  const send = () => {
    // The first ask is logged on the client (who asked, when) so nobody asks the same person twice
    if (!asked && onUpdateLead) onUpdateLead(lead.id, { reviewRequestedAt: new Date().toISOString(), _logAction: 'طلب مراجعة Google من العميل' });
  };
  return (
    <section className="crm-ld__block" aria-labelledby="crm-ld-review">
      <h3 id="crm-ld-review" className="crm-ld__h"><Star size={16} aria-hidden="true" />{L('اطلب مراجعة من العميل', 'Ask for a review')}</h3>
      {googleUrl ? (
        <>
          <p className="crm-ld__hint">
            {asked
              ? L(`اتطلب من العميل ده يوم ${dayText(asked, true)}. ما تطلبش تاني إلا لو هو سأل.`, `Already asked on ${dayText(asked, false)}.`)
              : L('الصفقة اتقفلت. رسالة واتساب قصيرة بلينك المراجعة، أنسب وقت ليها دلوقتي.', 'The deal is closed. A short WhatsApp message with the review link.')}
          </p>
          {egWhatsapp && (
            <a
              href={`https://wa.me/${egWhatsapp}?text=${encodeURIComponent(reviewRequestMessage(lead, googleUrl))}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={send}
              className="ui-btn ui-btn--secondary ui-btn--sm"
            >
              <Send size={16} aria-hidden="true" />{asked ? L('ابعتها تاني', 'Send again') : L('ابعت طلب المراجعة', 'Send review request')}
            </a>
          )}
        </>
      ) : (
        <p className="crm-ld__hint">{L('لسه مفيش رابط مراجعات جوجل. المدير يضيفه من إعدادات الموقع ← بيانات التواصل، وبعدها يظهر هنا زر الطلب.', 'No Google review link yet. The manager adds it under Site settings → Contact.')}</p>
      )}
    </section>
  );
}
