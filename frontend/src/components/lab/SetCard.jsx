import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Badge, Button } from "../ui";

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// "Studied 3 days ago", or "Not studied yet".
function studied(value) {
  if (!value) return "Not studied yet";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return "Studied today";
  if (days === 1) return "Studied yesterday";
  return `Studied ${days} days ago`;
}

// Set covers carry the one bold colour on this screen. The colour comes from the title, so a set keeps its colour.
const COVERS = ["bg-rate-again", "bg-rate-hard", "bg-rate-good", "bg-info"];
function coverOf(title) {
  let sum = 0;
  for (const ch of String(title)) sum += ch.codePointAt(0);
  return COVERS[sum % COVERS.length];
}

const tile = "grid overflow-hidden rounded-lg border border-border bg-card";
const open = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export default function SetCard({ set, onRetry, onEmpty }) {
  if (set.build.status === "processing") {
    return <div className={`${tile} content-start gap-2 p-4`}>
      <p className="m-0 flex items-center gap-2 font-semibold"><Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Making your set…</p>
      <p className="m-0 text-sm text-muted-foreground">The AI is reading your material. You can leave this page.</p>
    </div>;
  }
  if (set.build.status === "issue") {
    return <div className={`${tile} content-start gap-2 p-4`}>
      <p className="m-0 flex items-center gap-2"><Badge tone="warning">Issue</Badge><strong className="min-w-0 truncate">{set.title}</strong></p>
      <p className="m-0 text-sm text-muted-foreground">{set.build.message || "The AI could not help this time."}</p>
      <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => onRetry(set)}>Try again</Button><Button size="sm" variant="tertiary" onClick={() => onEmpty(set)}>Start empty</Button></div>
    </div>;
  }
  const meta = [set.course?.code, set.topic].filter(Boolean).join(" · ");
  const ready = set.build.status === "ready";
  return <Link to={ready ? `/lab/${set.id}/review` : `/lab/${set.id}`} aria-label={ready ? `${set.title}, drafts ready to review` : set.title} className={`${tile} grid-rows-[auto_1fr] text-foreground no-underline transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${open}`}>
    <span aria-hidden="true" className={`flex h-16 items-end px-4 pb-1 text-3xl font-semibold text-on-rate ${coverOf(set.title)}`}>{String(set.title).trim().charAt(0).toUpperCase()}</span>
    <span className="grid content-start gap-1 p-4">
      <strong className="line-clamp-2 text-base leading-snug">{set.title}</strong>
      {meta && <span className="truncate text-sm text-muted-foreground">{meta}</span>}
      {ready
        ? <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-ink"><CheckCircle2 size={14} aria-hidden="true" />Drafts ready to review</span>
        : <>
          <span className="text-sm text-muted-foreground">{plural(set.cardCount, "card")} · {plural(set.quizCount, "quiz", "quizzes")}</span>
          <span className="text-sm text-muted-foreground">{studied(set.lastStudiedAt)}</span>
        </>}
    </span>
  </Link>;
}

