import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Advisor from '../match/Advisor';
import '../../styles/match-teaser.css';

/** Homepage invitation to «رشّحلي شقتي»: the 1Line advisor greets next to one line and a button */
export default function HomeMatchTeaser({ lang = 'ar' }) {
  if (lang !== 'ar') return null;
  return (
    <section className="mtz" aria-labelledby="mtz-title">
      <div className="mtz-inner">
        <Advisor mood="talk" size={104} className="mtz-beto" />
        <div className="mtz-text">
          <h2 id="mtz-title">مش عارف تبدأ منين؟</h2>
          <p>جاوب على 5 أسئلة بسيطة مع مستشارك في 1Line، ونرشّحلك الشقق المعروضة ونسبة مطابقة كل واحدة لطلبك.</p>
        </div>
        <Link to="/match" className="mtz-btn">
          رشّحلي شقتي<ArrowLeft size={17} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
