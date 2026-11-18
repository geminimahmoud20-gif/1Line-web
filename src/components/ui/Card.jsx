import { cx } from './cx';

// padding: default | compact | flush. `interactive` adds hover lift and keyboard focus for clickable cards.
export function Card({ as: Tag = 'div', padding = 'default', interactive = false, className, children, ...rest }) {
  return (
    <Tag
      className={cx('ui-card', padding !== 'default' && `ui-card--${padding}`, interactive && 'ui-card--interactive', className)}
      tabIndex={interactive && Tag === 'div' ? 0 : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, actions, as: Heading = 'h2' }) {
  return (
    <div className="ui-card__head">
      <div>
        <Heading className="ui-card__title">{title}</Heading>
        {description && <p className="ui-card__desc">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
