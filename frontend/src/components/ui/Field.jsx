import { Children, useId } from "react";
import { AlertCircle } from "lucide-react";
import { Selector } from "@astryxdesign/core/Selector";

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

// A fixed set of choices. It takes <option> children and an onChange(event) like a native select, so callers did not
// change, but it draws the Astryx Selector (this needs the Astryx theme, which AppShell provides).
// An empty value cannot be a Selector value, so it travels as NONE.
const NONE = "__none__";
export function SelectField({ label, hint, error, className, children, value, onChange, disabled, isLabelHidden, ...rest }) {
  const options = Children.toArray(children).filter((child) => child?.props).map((child) => ({
    value: String(child.props.value ?? "") === "" ? NONE : String(child.props.value),
    label: Children.toArray(child.props.children).join("")
  }));
  const current = String(value ?? "") === "" ? NONE : String(value);
  return (
    <div className={`ui-field ${className || ""}`}>
      <Selector
        label={label}
        isLabelHidden={isLabelHidden || rest["aria-label"] != null}
        description={error ? undefined : hint}
        status={error ? { type: "error", message: error } : undefined}
        options={options}
        value={current}
        isDisabled={disabled}
        onChange={(next) => onChange?.({ target: { value: next === NONE ? "" : next } })}
      />
    </div>
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
