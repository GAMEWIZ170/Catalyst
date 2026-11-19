import { ChevronDown, ChevronUp } from "lucide-react";
import { iconButton } from "../layout/topbarStyles";
import { cn } from "@/lib/utils";

export default function MoveButton({ direction, disabled, onClick, buttonRef }) {
  const label = direction === "up" ? "Move up" : "Move down";
  const Icon = direction === "up" ? ChevronUp : ChevronDown;
  return <button ref={buttonRef} className={cn(iconButton, "size-9 min-h-9 min-w-9 overflow-hidden whitespace-nowrap text-muted-foreground hover:text-foreground disabled:hover:text-muted-foreground")} type="button" aria-label={label} disabled={disabled} onClick={onClick}><Icon size={20} aria-hidden="true" /></button>;
}
