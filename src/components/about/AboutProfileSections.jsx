import { useState, useEffect } from 'react';
import { Building2, Users, Image as ImageIcon, MessageCircle, X } from 'lucide-react';
import { visibleCompanyFacts, visibleTeam, visibleGallery, sectionOn, initials, photoPositionCss } from '../../utils/aboutProfile';
import '../../styles/about-profile.css';

/** Company facts card: only rows the team filled in and left switched on */
export function AboutCompanyFacts({ about, isAr }) {
  const facts = visibleCompanyFacts(about, isAr);
  if (!sectionOn(about, 'company') || facts.length === 0) return null;
  return (
    <section className="abp-section section-container" aria-labelledby="abp-company-title">
      <div className="abp-card">
        <h2 id="abp-company-title" className="abp-title"><Building2 size={20} aria-hidden="true" /> {isAr ? 'بيانات الشركة' : 'Company facts'}</h2>
        <dl className="abp-facts">
          {facts.map((f) => (
            <div key={f.key} className="abp-fact">
              <dt>{f.label}</dt>
              <dd><bdi>{f.value}</bdi></dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** Team and partners, by group; each card shows only what was switched on */
export function AboutTeam({ about, isAr }) {
  const groups = visibleTeam(about, isAr);
  if (!sectionOn(about, 'team') || groups.length === 0) return null;
  return (
    <section className="abp-section section-container" aria-labelledby="abp-team-title">
      <div className="section-header-centered">
        <span className="section-pill"><Users size={14} className="text-gold" /><span>{isAr ? 'فريق 1Line' : 'The 1Line team'}</span></span>
        <h2 id="abp-team-title" className="about-section-h2">{isAr ? 'الناس اللي هتشتغل معاك' : 'The people you will work with'}</h2>
      </div>
      {groups.map((g) => (
        <div key={g.id} className="abp-group">
          {groups.length > 1 && <h3 className="abp-group-title">{g.label}</h3>}
          <div className="abp-team">
            {g.members.map((m) => (
              <article key={m.id} className="abp-member">
                <div className="abp-avatar">
                  {m.photo ? <img src={m.photo} alt={m.name} loading="lazy" style={{ objectPosition: photoPositionCss(m.photoPos) }} /> : <span aria-hidden="true">{initials(m.name)}</span>}
                </div>
                <h4 className="abp-name">{m.name}</h4>
                {m.role && <p className="abp-role">{m.role}</p>}
                {m.bio && <p className="abp-bio">{m.bio}</p>}
                {m.whatsapp && (
                  <a className="abp-wa" href={`https://wa.me/${m.whatsapp}?text=${encodeURIComponent(isAr ? `مرحباً ${m.name}، وصلت لحضرتك من موقع 1Line.` : `Hello ${m.name}, I found you on the 1Line website.`)}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle size={15} aria-hidden="true" /> {isAr ? 'واتساب' : 'WhatsApp'}
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

/** A few photos of the company; tap one to see it large */
export function AboutGallery({ about, isAr }) {
  const photos = visibleGallery(about, isAr);
  const [open, setOpen] = useState(-1);
  useEffect(() => {
    if (open < 0) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(-1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const step = (e.key === 'ArrowLeft') === isAr ? 1 : -1;
        setOpen((i) => (i + step + photos.length) % photos.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, photos.length, isAr]);
  if (!sectionOn(about, 'gallery') || photos.length === 0) return null;
  const current = photos[open];
  return (
    <section className="abp-section section-container" aria-labelledby="abp-gallery-title">
      <h2 id="abp-gallery-title" className="abp-title abp-title--center"><ImageIcon size={20} aria-hidden="true" /> {isAr ? 'من داخل 1Line' : 'Inside 1Line'}</h2>
      <div className={`abp-gallery abp-gallery--${Math.min(photos.length, 4)}`}>
        {photos.map((p, i) => (
          <button key={p.id} type="button" className="abp-photo" onClick={() => setOpen(i)} aria-label={p.caption || (isAr ? `صورة ${i + 1}` : `Photo ${i + 1}`)}>
            <img src={p.url} alt={p.caption || ''} loading="lazy" />
            {p.caption && <span>{p.caption}</span>}
          </button>
        ))}
      </div>
      {current && (
        <div className="abp-lightbox" role="dialog" aria-modal="true" aria-label={current.caption || (isAr ? 'صورة' : 'Photo')} onClick={() => setOpen(-1)}>
          <button type="button" className="abp-lightbox-close" onClick={() => setOpen(-1)} aria-label={isAr ? 'قفل' : 'Close'}><X size={22} /></button>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={current.url} alt={current.caption || ''} />
            {current.caption && <figcaption>{current.caption}</figcaption>}
          </figure>
        </div>
      )}
    </section>
  );
}
