export default function Switch({ checked, onChange, label, disabled = false }) {
  return <button
    className="inline-flex min-h-11 cursor-pointer items-center gap-2 border-0 bg-transparent py-1 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    disabled={disabled}
  >
    <span className={`inline-flex w-10 rounded-full p-[3px] motion-safe:transition-colors ${checked ? "bg-primary" : "bg-input"}`} aria-hidden="true"><span className={`size-[18px] rounded-full bg-card motion-safe:transition-transform ${checked ? "translate-x-4" : ""}`} /></span>
    <span>{label}</span>
  </button>;
}
