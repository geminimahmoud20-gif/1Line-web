import { forwardRef } from 'react';
import { cx } from './cx';

// variant: primary | secondary | ghost | danger · size: sm | md | lg
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon = null, iconEnd = null, block = false, type = 'button', className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('ui-btn', `ui-btn--${variant}`, size !== 'md' && `ui-btn--${size}`, block && 'ui-btn--block', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="ui-btn__spinner" aria-hidden="true" /> : icon}
      {children}
      {!loading && iconEnd}
    </button>
  );
});

export default Button;
