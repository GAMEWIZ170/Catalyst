// The four flashcard states with their label and colour. Also used by the Progress screen's set bars.
export const PARTS = [
  ["confident", "Confident", "bg-rate-good"],
  ["unsure", "Unsure", "bg-rate-hard"],
  ["unknown", "Don't know", "bg-rate-again"],
  ["unrated", "Not rated yet", "bg-border"]
];

// Flashcard progress as a coloured segmented bar. The legend carries the numbers, so the bar is decoration only.
export default function DeckSummary({ summary }) {
  return <div className="grid w-full max-w-xl gap-2">
    <p className="m-0 text-center font-semibold">{summary.total} cards</p>
    <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-pill bg-muted" aria-hidden="true">
      {PARTS.map(([key, , color]) => summary[key] > 0 && <span key={key} className={`h-full ${color}`} style={{ flexGrow: summary[key] }} />)}
    </div>
    <ul className="m-0 flex list-none flex-wrap justify-center gap-x-4 gap-y-1 p-0 text-sm">
      {PARTS.map(([key, label, color]) => <li key={key} className="flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${color}`} aria-hidden="true" />{label} {summary[key]}</li>)}
    </ul>
  </div>;
}
