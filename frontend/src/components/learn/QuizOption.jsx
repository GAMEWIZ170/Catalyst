import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// One answer choice in the quiz. State is never colour alone: a tick or a cross plus a screen reader note.
// A wrong answer uses the warning colour, not red (red is for system and form failures).
const STATE = {
  "": "border-input bg-card hover:bg-muted",
  selected: "border-2 border-foreground bg-muted",
  correct: "border-2 border-success bg-success/15",
  wrong: "border-2 border-warning bg-warning/15"
};

export default function QuizOption({ keyLabel, state = "", disabled, pressed, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left font-sans text-base text-foreground transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default disabled:text-foreground",
        STATE[state]
      )}
    >
      {keyLabel ? <span aria-hidden="true" className="inline-flex min-w-7 shrink-0 items-center justify-center rounded-md border border-input bg-card px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">{keyLabel}</span> : null}
      <span className="min-w-0 flex-1 [&_img]:mt-2 [&_img]:max-h-48 [&_img]:rounded-md">
        {children}
        {state === "correct" ? <span className="sr-only"> (correct answer)</span> : null}
        {state === "wrong" ? <span className="sr-only"> (your answer, not correct)</span> : null}
      </span>
      {state === "correct" ? <Check size={18} className="shrink-0 text-success" aria-hidden="true" /> : null}
      {state === "wrong" ? <X size={18} className="shrink-0 text-warning" aria-hidden="true" /> : null}
    </button>
  );
}
