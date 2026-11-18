import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// A number you nudge instead of type (rule 3). Minus and plus buttons, the value between them.
// Up and Down arrow keys on the value also step it. `unit` is read aloud with the number ("25 minutes").
export default function Stepper({ value, onChange, min = 0, max = 100, step = 1, label, unit = "", className }) {
  const set = (next) => onChange(Math.min(max, Math.max(min, next)));
  const spoken = unit ? `${value} ${unit}` : String(value);
  const side = "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-pill border border-input bg-card text-foreground transition-[background-color,transform] duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 disabled:pointer-events-none disabled:opacity-40 motion-reduce:active:scale-100";

  return (
    <div role="group" aria-label={label} className={cn("inline-flex items-center gap-2", className)}>
      <button type="button" className={side} aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => set(value - step)}>
        <Minus size={16} aria-hidden="true" />
      </button>
      <div
        tabIndex={0}
        role="spinbutton"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={spoken}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowRight") { event.preventDefault(); set(value + step); }
          if (event.key === "ArrowDown" || event.key === "ArrowLeft") { event.preventDefault(); set(value - step); }
        }}
        className="min-w-14 rounded-md text-center text-base font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {value}{unit ? <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span> : null}
      </div>
      <button type="button" className={side} aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => set(value + step)}>
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
