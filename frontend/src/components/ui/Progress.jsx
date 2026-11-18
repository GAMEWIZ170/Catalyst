// Thin rounded progress bar. The fill is gold (progress is "where you are"). showLabel adds a label and the percentage above it.
export default function Progress({ value = 0, label = "Progress", showLabel = false }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="grid gap-1.5" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={clamped}>
      {showLabel ? <div className="flex items-baseline justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><strong className="tabular-nums">{clamped}%</strong></div> : null}
      <div className="h-2 overflow-hidden rounded-pill bg-muted">
        <span className="block h-full rounded-pill bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
