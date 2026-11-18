import { useId, useRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

// A fixed set of 2 to 5 choices as one pill (rule 3: choose, don't type). One radio group: Tab enters it, arrow keys
// move and select, Home and End jump. The selected chip slides.
// options: [{ value, label, icon? }]. Controlled: value + onChange(value). `label` names the group.
export default function Segmented({ options, value, onChange, label, className }) {
  const group = useId();
  const refs = useRef({});

  function onKeyDown(event, index) {
    const last = options.length - 1;
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowDown: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, ArrowUp: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onChange(options[next].value);
    refs.current[options[next].value]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex max-w-full rounded-pill border border-input bg-muted p-1", className)}>
      {options.map((option, index) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => { refs.current[option.value] = node; }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "relative inline-flex min-h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-pill border-0 bg-transparent px-4 font-sans text-sm font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              on ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {on ? <motion.span layoutId={`${group}-chip`} className="absolute inset-0 rounded-pill bg-primary" transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} /> : null}
            <span className="relative inline-flex items-center gap-1.5">
              {option.icon ? <option.icon size={16} aria-hidden="true" /> : null}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
