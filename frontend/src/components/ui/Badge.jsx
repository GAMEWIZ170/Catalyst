// Inline label that hugs its text. Sentence case. Tone never stands alone: always keep the words.
export default function Badge({ tone = "neutral", icon: Icon, className = "", children }) {
  return (
    <span className={`badge badge--${tone} ${className}`}>
      {Icon ? <Icon size={14} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
