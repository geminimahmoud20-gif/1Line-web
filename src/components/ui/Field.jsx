import { cloneElement, isValidElement, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from './cx';

// Every control has a visible label. hint and error are tied to the control with aria-describedby.
export function Field({ label, hint, error, required, id, className, children }) {
  const auto = useId();
  const fieldId = id || auto;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errId = error ? `${fieldId}-err` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: fieldId,
        required,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': [hintId, errId].filter(Boolean).join(' ') || undefined
      })
    : children;
  return (
    <div className={cx('ui-field', error && 'ui-field--error', className)}>
      <label className="ui-field__label" htmlFor={fieldId}>
        {label}
        {required && <span className="ui-field__req" aria-hidden="true">*</span>}
      </label>
      {control}
      {hint && !error && <span id={hintId} className="ui-field__hint">{hint}</span>}
      {error && <span id={errId} className="ui-field__error" role="alert">{error}</span>}
    </div>
  );
}

export function Input({ label, hint, error, required, id, className, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} className={className}>
      <input className="ui-input" {...rest} />
    </Field>
  );
}

export function Textarea({ label, hint, error, required, id, className, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} className={className}>
      <textarea className="ui-textarea" {...rest} />
    </Field>
  );
}

// options: [{ value, label }]
export function Select({ label, hint, error, required, id, className, options = [], placeholder, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} className={className}>
      <SelectControl options={options} placeholder={placeholder} {...rest} />
    </Field>
  );
}

function SelectControl({ options, placeholder, ...rest }) {
  return (
    <div className="ui-select-wrap">
      <select className="ui-select" {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={16} className="ui-select-wrap__chev" aria-hidden="true" />
    </div>
  );
}
