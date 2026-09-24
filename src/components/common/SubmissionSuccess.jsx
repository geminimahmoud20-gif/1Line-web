import { Link } from 'react-router-dom';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { getWhatsAppUrl } from '../../utils/founderCmsData';

/**
 * Post-submit confirmation shown in place of a form: reference, what happens next, and one next action.
 * steps: [{ ar, en }]
 */
export default function SubmissionSuccess({
  lang = 'ar',
  title_ar,
  title_en,
  reference,
  steps = [],
  whatsappText,
  secondaryLink,
}) {
  const isAr = lang === 'ar';
  const ref = reference ? String(reference).replace(/^lead-/, '1L-').toUpperCase() : null;

  return (
    <div className="lx-success" role="status" aria-live="polite">
      <CheckCircle2 className="lx-success-icon" size={40} aria-hidden="true" />
      <h3 className="lx-success-title">{isAr ? title_ar : title_en}</h3>
      {ref && (
        <p className="lx-success-ref">
          {isAr ? 'رقم الطلب المرجعي' : 'Reference'}: <bdi>{ref}</bdi>
        </p>
      )}
      {steps.length > 0 && (
        <ol className="lx-success-steps">
          {steps.map((s, i) => (
            <li key={i}>{isAr ? s.ar : s.en}</li>
          ))}
        </ol>
      )}
      <div className="lx-success-actions">
        {whatsappText && (
          <a
            className="lx-btn lx-btn-primary"
            href={getWhatsAppUrl(ref ? `${whatsappText} (${ref})` : whatsappText)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={18} aria-hidden="true" />
            {isAr ? 'تابع طلبك مع مستشارك عبر واتساب' : 'Follow up on WhatsApp'}
          </a>
        )}
        {secondaryLink && (
          <Link className="lx-btn lx-btn-ghost" to={secondaryLink.to}>
            {isAr ? secondaryLink.ar : secondaryLink.en}
          </Link>
        )}
      </div>
    </div>
  );
}
