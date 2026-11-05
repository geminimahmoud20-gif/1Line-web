import AdvisorFace from './AdvisorFace';
import './advisor.css';

/**
 * 1Line's guide on «رشّحلي عقاري»: the founder drawn as a cartoon (AdvisorFace) in a round frame
 * that moves like a live call: blinking, a nodding head, a mouth that talks, a glint on the glasses, a turning gold ring, a gentle float and tilt, sound waves while he asks, «…» while
 * he thinks, and a green tick with sparkles on the results. CSS only; still for reduced motion.
 * mood: 'idle' | 'talk' | 'think' | 'happy'
 */
export default function Advisor({ mood = 'idle', size = 160, className = '' }) {
  return (
    <div className={`adv is-${mood} ${className}`} style={{ '--adv-size': `${size}px` }} aria-hidden="true">
      <span className="adv-wave" />
      <span className="adv-wave is-late" />
      <span className="adv-ring" />
      <span className="adv-frame">
        <AdvisorFace />
        <span className="adv-gloss" />
      </span>
      <span className="adv-online" />
      <span className="adv-badge adv-talk"><i /><i /><i /><i /></span>
      <span className="adv-badge adv-think"><i /><i /><i /></span>
      <span className="adv-badge adv-happy">
        <svg viewBox="0 0 24 24" width="60%" height="60%"><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <span className="adv-spark s1" /><span className="adv-spark s2" /><span className="adv-spark s3" />
    </div>
  );
}
