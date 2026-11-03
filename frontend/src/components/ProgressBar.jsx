export default function ProgressBar({ value = 0, label = "Progress" }) {
  return (
    <div className="progress-wrap" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={value}>
      <div className="progress-label"><span>{label}</span><strong>{value}%</strong></div>
      <div className="progress-track"><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
    </div>
  );
}
