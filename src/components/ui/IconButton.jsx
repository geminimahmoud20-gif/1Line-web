import { forwardRef } from 'react';
import { cx } from './cx';

// Icon-only buttons need a spoken name: `label` becomes aria-label and the tooltip text.
const IconButton = forwardRef(function IconButton(
  { label, icon, variant = 'ghost', size = 'md', type = 'button', className, ...rest },
  ref
) {
  if (!label && import.meta.env?.DEV) console.warn('IconButton needs a label');
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx('ui-icon-btn', variant === 'secondary' && 'ui-icon-btn--secondary', size === 'sm' && 'ui-icon-btn--sm', className)}
      {...rest}
    >
      {icon}
    </button>
  );
});

export default IconButton;
