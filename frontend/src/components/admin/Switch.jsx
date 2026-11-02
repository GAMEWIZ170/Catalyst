export default function Switch({ checked, onChange, label, disabled = false }) {
  return <button
    className={`switch ${checked ? "switch--on" : ""}`}
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    disabled={disabled}
  >
    <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
    <span>{label}</span>
  </button>;
}
