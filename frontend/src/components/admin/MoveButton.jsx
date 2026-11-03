function Chevron({ direction }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={direction === "up" ? "m6 14 6-6 6 6" : "m6 10 6 6 6-6"} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>;
}

export default function MoveButton({ direction, disabled, onClick, buttonRef }) {
  const label = direction === "up" ? "Move up" : "Move down";
  return <button ref={buttonRef} className="icon-button move-button" type="button" aria-label={label} disabled={disabled} onClick={onClick}><Chevron direction={direction} /></button>;
}
