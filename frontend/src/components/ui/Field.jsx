import { useId } from "react";
import { AlertCircle } from "lucide-react";

// Labels sit above the control, hint and error text below. Errors are text plus an icon, never colour alone.
function FieldShell({ id, label, hint, error, children, className = "" }) {
  return (
    <div className={`ui-field ${error ? "ui-field--error" : ""} ${className}`}>
      <label className="ui-label" htmlFor={id}>{label}</label>
      {children}
      {hint && !error ? <p className="ui-hint" id={`${id}-hint`}>{hint}</p> : null}
      {error ? <p className="ui-error" id={`${id}-error`}><AlertCircle size={16} aria-hidden="true" />{error}</p> : null}
    </div>
  );
}

function describedBy(id, hint, error) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function TextField({ label, hint, error, id, className, ...input }) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={className}>
      <input className="ui-control" id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={describedBy(fieldId, hint, error)} {...input} />
    </FieldShell>
  );
}

export function TextArea({ label, hint, error, id, className, ...input }) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={className}>
      <textarea className="ui-control ui-textarea" id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={describedBy(fieldId, hint, error)} {...input} />
    </FieldShell>
  );
}

export function SelectField({ label, hint, error, id, className, children, ...input }) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={className}>
      <select className="ui-control ui-select" id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={describedBy(fieldId, hint, error)} {...input}>{children}</select>
    </FieldShell>
  );
}

function Choice({ kind, label, hint, className = "", ...input }) {
  const id = useId();
  return (
    <div className={`ui-choice ${className}`}>
      <input className={`ui-check ui-check--${kind}`} type={kind} id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
      <label htmlFor={id}>{label}{hint ? <span className="ui-hint" id={`${id}-hint`}>{hint}</span> : null}</label>
    </div>
  );
}

export const Checkbox = (props) => <Choice kind="checkbox" {...props} />;
export const Radio = (props) => <Choice kind="radio" {...props} />;

// Group of radios with a visible legend. Arrow keys move between options natively.
export function RadioGroup({ legend, error, children }) {
  const id = useId();
  return (
    <fieldset className="ui-group" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="ui-label">{legend}</legend>
      {children}
      {error ? <p className="ui-error" id={`${id}-error`}><AlertCircle size={16} aria-hidden="true" />{error}</p> : null}
    </fieldset>
  );
}
