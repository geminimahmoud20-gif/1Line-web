import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Beto from '../match/Beto';
import '../../styles/match-teaser.css';

/** Homepage invitation to «رشّحلي شقتي»: «بيتو» waves next to one line and a button */
export default function HomeMatchTeaser({ lang = 'ar' }) {
  if (lang !== 'ar') return null;
  return (
    <section className="mtz" aria-labelledby="mtz-title">
      <div className="mtz-inner">
        <Beto mood="idle" size={104} className="mtz-beto" />
        <div className="mtz-text">
          <h2 id="mtz-title">مش عارف تبدأ منين؟</h2>
          <p>جاوب على 5 أسئلة بسيطة مع بيتو، ونرشّحلك الشقق المعروضة ونسبة مطابقة كل واحدة لطلبك.</p>
        </div>
        <Link to="/match" className="mtz-btn">
          رشّحلي شقتي<ArrowLeft size={17} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
