import { leadScore, LEAD_SCORE_HIGH } from '../../utils/crmLeadViews';

/** The lead's computed score; hovering shows what it is made of. */
export default function LeadScorePill({ lead, isAr = true, suffix = '', className = '', style }) {
  const { score, reasons } = leadScore(lead);
  const title = reasons.length
    ? `${isAr ? 'محسوبة من:' : 'Based on:'} ${reasons.join(' • ')}`
    : (isAr ? 'مفيش بيانات كفاية لسه' : 'Not enough data yet');
  return (
    <span className={`lead-score-pill ${score >= LEAD_SCORE_HIGH ? 'score-high' : 'score-medium'} ${className}`} title={title} style={style}>
      {score}%{suffix}
    </span>
  );
}
