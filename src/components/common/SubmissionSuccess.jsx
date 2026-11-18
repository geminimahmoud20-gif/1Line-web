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
  intro_ar,
  intro_en,
  steps = [],
  stepsTitle_ar,
  stepsTitle_en,
  whatsappText,
  whatsappLabel_ar,
  whatsappLabel_en,
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
      {(isAr ? intro_ar : intro_en) && <p className="lx-success-intro">{isAr ? intro_ar : intro_en}</p>}
      {steps.length > 0 && (isAr ? stepsTitle_ar : stepsTitle_en) && <p className="lx-success-steps-title">{isAr ? stepsTitle_ar : stepsTitle_en}</p>}
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
            {isAr ? (whatsappLabel_ar || 'تابع طلبك مع مستشارك عبر واتساب') : (whatsappLabel_en || 'Follow up on WhatsApp')}
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
