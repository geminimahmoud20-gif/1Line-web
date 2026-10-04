import { ShieldCheck, CheckCircle2, FileText, UserCheck, Clock, MessageCircle, Info } from 'lucide-react';
import { generatePropertyPdf } from '../../utils/pdfBrochure';
import { getWhatsAppUrl } from '../../utils/founderCmsData';
import '../../styles/expat-suite.css';

/**
 * Legal review summary for a listing.
 * Shows only what the team recorded after an actual review (CRM → الموقف القانوني).
 * Reviewer / reference / date use the new fields (reviewedBy, reportRef, reviewDate) only —
 * legacy seed fields (verifiedByLawyer, inspectionReportId, safetyScore) are ignored on purpose.
 */
const ITEMS = [
  { key: 'ownershipType', ar: 'سند الملكية والشهر العقاري', en: 'Title & registry' },
  { key: 'licenseStatus', ar: 'ترخيص البناء', en: 'Building licence' },
  { key: 'reconciliationStatus', ar: 'موقف التصالح (نموذج 10)', en: 'Reconciliation (Form 10)' },
  { key: 'landShare', ar: 'حصة الأرض', en: 'Land share' },
  { key: 'municipalityStatus', ar: 'جهاز المدينة والضرائب', en: 'Municipality & taxes' }
];

export default function LegalAuditCard({ property, lang = 'ar' }) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const legal = property.legalStatus || null;
  const code = String(property.id || '').toUpperCase();

  const rows = legal
    ? ITEMS.map((it) => ({ ...it, value: isAr ? legal[`${it.key}_ar`] : (legal[`${it.key}_en`] || legal[`${it.key}_ar`]) })).filter((r) => r.value)
    : [];

  const askUrl = getWhatsAppUrl(L(
    `مرحباً 1Line، أريد ملخص المراجعة القانونية للعقار كود #${code}.`,
    `Hello 1Line, I would like the legal review summary for property #${code}.`
  ));

  if (!legal || rows.length === 0) {
    return (
      <section className="xs-legal xs-legal--pending" aria-labelledby="xs-legal-title">
        <header className="xs-fin-head">
          <span className="xs-fin-icon"><Clock size={20} aria-hidden="true" /></span>
          <div>
            <h3 id="xs-legal-title">{L('المراجعة القانونية لم تُنشر بعد', 'Legal review not published yet')}</h3>
            <p>{L('نراجع المستندات معك قبل أي حجز أو تعاقد، ونسلمك ملخص المراجعة كتابياً.', 'We review the documents with you before any reservation or contract and give you a written summary.')}</p>
          </div>
        </header>
        <ul className="xs-legal-list is-todo">
          {ITEMS.map((it) => (
            <li key={it.key}><span className="xs-legal-dot" aria-hidden="true" />{isAr ? it.ar : it.en}</li>
          ))}
        </ul>
        <a className="xs-btn xs-btn--royal" href={askUrl} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={16} aria-hidden="true" /> {L('اطلب ملخص المراجعة', 'Request the review summary')}
        </a>
      </section>
    );
  }

  return (
    <section className="xs-legal" aria-labelledby="xs-legal-title">
      <header className="xs-fin-head">
        <span className="xs-fin-icon"><ShieldCheck size={20} aria-hidden="true" /></span>
        <div>
          <h3 id="xs-legal-title">{L('ملخص المراجعة القانونية', 'Legal review summary')}</h3>
          <p>
            {legal.reportRef ? L(`مرجع المراجعة: ${legal.reportRef}`, `Review reference: ${legal.reportRef}`) : L('البنود التي راجعها فريق 1Line لهذا العقار.', 'Items the 1Line team reviewed for this listing.')}
          </p>
        </div>
      </header>

      <ul className="xs-legal-list">
        {rows.map((r) => (
          <li key={r.key}>
            <CheckCircle2 size={16} aria-hidden="true" />
            <div>
              <strong>{isAr ? r.ar : r.en}</strong>
              <span>{r.value}</span>
            </div>
          </li>
        ))}
      </ul>

      {(legal.reviewedBy || legal.reviewDate) && (
        <p className="xs-legal-by">
          <UserCheck size={15} aria-hidden="true" />
          {legal.reviewedBy && <span>{L('تمت المراجعة بمعرفة: ', 'Reviewed by: ')}<strong>{legal.reviewedBy}</strong></span>}
          {legal.reviewDate && <span>{L(' — بتاريخ ', ' — on ')}<bdi>{legal.reviewDate}</bdi></span>}
        </p>
      )}

      <div className="xs-legal-actions">
        <a className="xs-btn xs-btn--ghost" href={askUrl} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={16} aria-hidden="true" /> {L('اطلب المستندات والملخص الكامل', 'Request documents & full summary')}
        </a>
        <button type="button" className="xs-btn xs-btn--ghost" onClick={() => generatePropertyPdf(property).catch((err) => console.error('PDF generation error:', err))}>
          <FileText size={16} aria-hidden="true" /> {L('بروشور العقار PDF', 'Property PDF')}
        </button>
      </div>

      <p className="xs-fin-foot">
        <Info size={13} aria-hidden="true" />
        {L('المراجعة لا تغني عن محاميك الخاص أو إجراءات الشهر العقاري، ونشجعك على الاستعانة بهما.', 'This review does not replace your own lawyer or registry procedures.')}
      </p>
    </section>
  );
}
