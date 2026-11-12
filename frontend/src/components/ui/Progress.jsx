// Thin, rounded progress bar. showLabel adds a label and the percentage above it.
export default function Progress({ value = 0, label = "Progress", showLabel = false }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="progress-wrap" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={clamped}>
      {showLabel ? <div className="progress-label"><span>{label}</span><strong>{clamped}%</strong></div> : null}
      <div className="progress-track"><span style={{ width: `${clamped}%` }} /></div>
    </div>
  );
}
