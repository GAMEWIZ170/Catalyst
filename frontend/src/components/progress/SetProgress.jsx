import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PARTS } from "../learn/DeckSummary";

// One row per study set: a coloured bar of how the cards are going (same colours as the end of a flashcard round),
// the counts in words, cards due, and the best quiz score. The whole row opens the set.
export default function SetProgress({ sets }) {
  return <ul className="m-0 grid list-none divide-y divide-border overflow-hidden rounded-xl border border-border bg-card p-0">
    {sets.map((set) => {
      const counts = PARTS.filter(([key]) => set[key] > 0).map(([key, label]) => `${set[key]} ${label.toLowerCase()}`);
      return <li key={set.id}>
        <Link to={`/lab/${set.id}`} className="grid gap-2 px-4 py-3.5 text-foreground no-underline transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-semibold">{set.title}</span>
            {set.due > 0 && <span className="shrink-0 rounded-pill bg-primary/15 px-2 py-0.5 text-xs font-semibold text-brand-ink">{set.due} due</span>}
            {set.bestQuiz !== null && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">Quiz best {set.bestQuiz}%</span>}
            <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          </span>
          {set.cards > 0 ? <>
            <span className="flex h-2 w-full gap-0.5 overflow-hidden rounded-pill bg-muted" aria-hidden="true">
              {PARTS.map(([key, , color]) => set[key] > 0 && <span key={key} className={`h-full ${color}`} style={{ flexGrow: set[key] }} />)}
            </span>
            <span className="text-xs text-muted-foreground">{set.cards} {set.cards === 1 ? "card" : "cards"}: {counts.join(" · ")}</span>
          </> : <span className="text-xs text-muted-foreground">No flashcards yet</span>}
        </Link>
      </li>;
    })}
  </ul>;
}
