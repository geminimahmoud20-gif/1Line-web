import { SOCIAL_NETWORKS } from '../../utils/siteSettings';
import './social-links.css';

// Brand glyphs drawn in currentColor (lucide no longer ships brand icons)
const GLYPHS = {
  facebook: <path d="M13.5 21v-7.5h2.6l.4-3.2h-3V8.3c0-.9.3-1.6 1.6-1.6h1.6V3.9c-.3 0-1.2-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.4H7.7v3.2h2.6V21h3.2z" />,
  instagram: (
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" stroke="none" />
    </g>
  ),
  tiktok: <path d="M16.6 3c.4 2.2 1.8 3.7 4 3.9v3.2c-1.5.1-2.8-.3-4-1.1v6.1a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3.3a2.4 2.4 0 1 0 1.5 2.2V3h3.2z" />,
  youtube: <path fillRule="evenodd" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15.1V8.9l5.3 3.1L10 15.1z" />
};

export function SocialIcon({ id, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      {GLYPHS[id]}
    </svg>
  );
}

const LABEL_AR = { facebook: 'فيسبوك', instagram: 'إنستجرام', tiktok: 'تيك توك', youtube: 'يوتيوب' };

/**
 * The company's social accounts (CRM → إعدادات الموقع → السوشيال); blank ones are skipped.
 * variant 'footer' sits on the dark footer, 'page' on light/dark page cards.
 */
export default function SocialLinks({ social = {}, isAr = true, variant = 'page', showLabels = true }) {
  const nets = SOCIAL_NETWORKS.filter((n) => social[n.id]);
  if (!nets.length) return null;
  return (
    <ul className={`social-links social-links--${variant}`} aria-label={isAr ? 'حساباتنا على السوشيال ميديا' : 'Our social accounts'}>
      {nets.map((n) => {
        const label = isAr ? LABEL_AR[n.id] || n.label : n.label;
        return (
          <li key={n.id}>
            <a
              href={social[n.id]}
              target="_blank"
              rel="noopener noreferrer me"
              className={`social-link social-link--${n.id}`}
              aria-label={showLabels ? undefined : label}
              title={showLabels ? undefined : label}
            >
              <SocialIcon id={n.id} />
              {showLabels && <span>{label}</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
