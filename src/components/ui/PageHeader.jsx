import { m } from 'motion/react';
import { fadeUp } from './motionPresets';

// The one header every CRM screen uses: title, one-line description, the main actions, then filters.
// On phones the description hides and actions scroll sideways, so the list starts in the first screen.
export default function PageHeader({ title, description, actions = null, filters = null }) {
  return (
    <m.header className="ui-page-head" variants={fadeUp} initial="hidden" animate="show">
      <div className="ui-page-head__titles">
        <h1 className="ui-page-head__title">{title}</h1>
        {description && <p className="ui-page-head__desc">{description}</p>}
      </div>
      {actions && <div className="ui-page-head__actions">{actions}</div>}
      {filters && <div className="ui-page-head__filters">{filters}</div>}
    </m.header>
  );
}
