import { cn } from "@/lib/utils";

// Inline label that hugs its text. Sentence case. Tone never stands alone: always keep the words.
const TONE = {
  neutral: "bg-muted text-foreground",
  accent: "bg-primary/25 text-foreground",
  success: "bg-success/15 text-foreground",
  warning: "bg-warning/15 text-foreground",
  error: "bg-destructive/15 text-foreground",
  info: "bg-info/15 text-foreground"
};

export default function Badge({ tone = "neutral", icon: Icon, className = "", children }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-semibold", TONE[tone] || TONE.neutral, className)}>
      {Icon ? <Icon size={14} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
