import { cn } from "@/lib/utils";

// On or off, saved at once (rule 3). A real button with role="switch", so it works by keyboard (Space or Enter) and
// screen readers say "on" or "off". Always give it a label; the row text next to it is not enough on its own.
export default function Switch({ value, onChange, label, disabled, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(value)}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-pill border border-input p-0.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
        value ? "border-transparent bg-primary" : "bg-muted",
        className
      )}
    >
      <span aria-hidden="true" className={cn("block size-6 rounded-full bg-foreground transition-transform duration-150 motion-reduce:transition-none", value ? "translate-x-6 bg-primary-foreground" : "translate-x-0")} />
    </button>
  );
}
