const PARTS = [
  ["confident", "Confident"],
  ["unsure", "Unsure"],
  ["unknown", "Don't know"],
  ["unrated", "Not rated yet"]
];

// Flashcard progress as a segmented bar. The legend carries the numbers, so the bar is decoration only.
export default function DeckSummary({ summary }) {
  return <div className="deck-summary">
    <p className="deck-total">{summary.total} cards</p>
    <div className="deck-bar" aria-hidden="true">
      {PARTS.map(([key]) => summary[key] > 0 && <span key={key} className={`deck-seg deck-seg--${key}`} style={{ flexGrow: summary[key] }} />)}
    </div>
    <ul className="deck-legend">
      {PARTS.map(([key, label]) => <li key={key}><span className={`deck-seg deck-dot deck-seg--${key}`} aria-hidden="true" />{label} {summary[key]}</li>)}
    </ul>
  </div>;
}
