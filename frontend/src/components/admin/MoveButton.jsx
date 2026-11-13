import { ChevronDown, ChevronUp } from "lucide-react";

export default function MoveButton({ direction, disabled, onClick, buttonRef }) {
  const label = direction === "up" ? "Move up" : "Move down";
  const Icon = direction === "up" ? ChevronUp : ChevronDown;
  return <button ref={buttonRef} className="icon-button move-button" type="button" aria-label={label} disabled={disabled} onClick={onClick}><Icon size={20} aria-hidden="true" /></button>;
}
