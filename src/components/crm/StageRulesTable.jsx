import { STAGE_RULES, OUTCOMES, MAX_ATTEMPTS } from '../../utils/stageGate';
import './stage-rules.css';

const nameOf = (id) => OUTCOMES.find((o) => o.id === id);

/** What each stage is for, which outcomes are logged in it, and which outcome lets a client in (utils/stageGate) */
export default function StageRulesTable({ isAr = true }) {
  const L = (ar, en) => (isAr ? ar : en);
  const chip = (id) => {
    const o = nameOf(id);
    return o ? <span key={id} className={`sr-chip sr-chip--${o.kind}`}>{o.ar}</span> : null;
  };
  return (
    <section className="sr" aria-labelledby="sr-title">
      <h4 id="sr-title" className="sr__title">{L('قواعد المراحل ونتايج النشاط', 'Stage rules and activity outcomes')}</h4>
      <p className="sr__intro">
        {L(
          `أي نقل مرحلة بيمر بقفل واحد: لازم يتسجل أول نتيجة نشاط تفتح المرحلة. النتيجة السلبية لازم معاها سبب، و«لم يرد» بيتعدّ محاولات (بعد ${MAX_ATTEMPTS} ينفع غير متفاعل). الرجوع لمرحلة أسبق للمدير بس.`,
          'Every stage change goes through one lock: an activity outcome that opens the stage must be logged first. A negative outcome needs a reason, and "no answer" counts attempts. Going back is for managers.'
        )}
      </p>
      <div className="sr__list">
        {STAGE_RULES.map((s) => (
          <div key={s.id} className="sr__row">
            <div className="sr__stage"><strong>{s.ar}</strong><span>{s.activity}</span></div>
            <div className="sr__cell">
              <small>{L('النتايج اللي بتتسجل فيها', 'Outcomes logged here')}</small>
              <div className="sr__chips">{s.outcomes.map(chip)}</div>
            </div>
            <div className="sr__cell">
              <small>{L('بتدخلها لما يتسجل', 'Opened by')}</small>
              <div className="sr__chips">
                {s.entry === 'any' ? <span className="sr-chip">{L('أي نتيجة + السبب', 'Any outcome + reason')}</span> : s.entry.length ? s.entry.map(chip) : <span className="sr-chip">{L('تلقائي', 'Automatic')}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
