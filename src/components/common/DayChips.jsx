import { useMemo } from 'react';
import { upcomingDays } from '../../utils/dayChoices';
import './day-chips.css';

/**
 * "Which day?" as a row of day chips (today, tomorrow, then weekday + date), plus "any day".
 * value: '' (any day) or YYYY-MM-DD, the same as the date field it replaces.
 */
export default function DayChips({ value = '', onChange, isAr = true, days = 14, label, id }) {
  const list = useMemo(() => upcomingDays(days, new Date(), isAr), [days, isAr]);
  return (
    <div className="dch" role="radiogroup" aria-label={label} id={id}>
      <button type="button" role="radio" aria-checked={!value} className={`dch-chip${!value ? ' is-on' : ''}`} onClick={() => onChange('')}>
        <b>{isAr ? 'أي يوم' : 'Any day'}</b>
        <small>{isAr ? 'نتفق عليه' : 'we agree'}</small>
      </button>
      {list.map((d) => (
        <button key={d.iso} type="button" role="radio" aria-checked={value === d.iso} className={`dch-chip${value === d.iso ? ' is-on' : ''}`} onClick={() => onChange(d.iso)}>
          <b>{d.top}</b>
          <small>{d.bottom}</small>
        </button>
      ))}
    </div>
  );
}
