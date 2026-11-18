import { Children, useId } from "react";
import { AlertCircle } from "lucide-react";
import Picker from "./Picker";

// Labels sit above the control, hint and error text below. Errors are text plus an icon, never colour alone.
const CONTROL = "min-h-11 w-full rounded-md border border-input bg-card px-3 font-sans text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

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
      <input className={CONTROL} id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={describedBy(fieldId, hint, error)} {...input} />
    </FieldShell>
  );
}

export function TextArea({ label, hint, error, id, className, ...input }) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={className}>
      <textarea className={`${CONTROL} min-h-24 resize-y py-3`} id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={describedBy(fieldId, hint, error)} {...input} />
    </FieldShell>
  );
}

// A fixed set of choices. It takes <option> children and an onChange(event) like a native select, so callers did not
// change, but it draws our Picker (a pill that opens a menu), never a native select (rule 3).
// An empty value shows the placeholder (the text of the option whose value is "").
export function SelectField({ label, hint, error, className, children, value, onChange, disabled, isLabelHidden, ...rest }) {
  const id = useId();
  const all = Children.toArray(children).filter((child) => child?.props).map((child) => ({
    value: String(child.props.value ?? ""),
    label: Children.toArray(child.props.children).join("")
  }));
  const blank = all.find((option) => option.value === "");
  const options = all.filter((option) => option.value !== "");
  const hidden = isLabelHidden || rest["aria-label"] != null;
  return (
    <div className={`ui-field ${error ? "ui-field--error" : ""} ${className || ""}`}>
      <span id={`${id}-label`} className={hidden ? "sr-only" : "ui-label"}>{label}</span>
      <Picker
        label={label}
        value={String(value ?? "")}
        placeholder={blank ? blank.label : "Choose"}
        clearLabel={blank ? blank.label : undefined}
        options={options}
        disabled={disabled}
        className="w-full justify-between"
        onChange={(next) => onChange?.({ target: { value: next } })}
      />
      {hint && !error ? <p className="ui-hint" id={`${id}-hint`}>{hint}</p> : null}
      {error ? <p className="ui-error" id={`${id}-error`}><AlertCircle size={16} aria-hidden="true" />{error}</p> : null}
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
