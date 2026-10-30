export default function ProgressBar({ value = 0, label = "Progress" }) {
  return (
    <div className="progress-wrap">
      <div className="progress-label"><span>{label}</span><strong>{value}%</strong></div>
      <div className="progress-track"><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
    </div>
  );
}
