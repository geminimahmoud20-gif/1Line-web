import { cx } from './cx';

const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('') || '؟';

export function Avatar({ name, src, size = 'md', className }) {
  return (
    <span className={cx('ui-avatar', size !== 'md' && `ui-avatar--${size}`, className)} aria-hidden={name ? undefined : true} title={name}>
      {src ? <img src={src} alt={name || ''} /> : initials(name)}
    </span>
  );
}

// Text label shown above its child on hover and keyboard focus. Prefer IconButton's own label for icon buttons.
export function Tooltip({ content, children }) {
  return (
    <span className="ui-tip">
      {children}
      <span className="ui-tip__bubble" role="tooltip">{content}</span>
    </span>
  );
}
