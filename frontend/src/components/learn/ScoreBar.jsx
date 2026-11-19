// Quiz result as a coloured bar: green for right answers, red for the rest. The sentence next to it carries the numbers.
export default function ScoreBar({ correct, total }) {
  if (!total) return null;
  const wrong = Math.max(0, total - correct);
  return <div className="flex h-3 w-full max-w-md gap-0.5 overflow-hidden rounded-pill bg-muted" aria-hidden="true">
    {correct > 0 && <span className="h-full bg-rate-good" style={{ flexGrow: correct }} />}
    {wrong > 0 && <span className="h-full bg-rate-again" style={{ flexGrow: wrong }} />}
  </div>;
}
