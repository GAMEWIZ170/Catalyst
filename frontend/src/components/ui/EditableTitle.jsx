import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

// Click-to-edit text (rule 2: no Save button). Enter or leaving the field saves, Esc cancels.
// `heading` draws it as the page title (an h1) with a pencil button. `startEditing` opens it in edit mode (a new item).
// Same props as the Astryx ClickToEdit, so screens can switch one at a time.
export default function EditableTitle({ value, onSave, label, placeholder, heading = false, startEditing = false, allowEmpty = false, className }) {
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState(value);
  const input = useRef(null);
  useEffect(() => { if (startEditing) { setDraft(value); setEditing(true); } }, [startEditing]);
  useEffect(() => { if (editing) input.current?.select(); }, [editing]);

  function commit() {
    if (!editing) return;
    setEditing(false);
    const next = draft.trim();
    if (next !== value && (next || allowEmpty)) onSave(next);
  }
  const start = () => { setDraft(value); setEditing(true); };

  if (editing) {
    return <input
      ref={input}
      autoFocus
      aria-label={label}
      value={draft}
      placeholder={placeholder}
      maxLength={120}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); commit(); }
        if (event.key === "Escape") { event.stopPropagation(); setDraft(value); setEditing(false); }
      }}
      className={cn("min-h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 font-sans text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", heading ? "text-3xl font-bold" : "text-base font-semibold", className)}
    />;
  }
  const Text = heading ? "h1" : "span";
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <Text className={cn("m-0 min-w-0 break-words", heading ? "text-3xl leading-tight font-bold" : "font-semibold")}>{value || placeholder}</Text>
      <button type="button" aria-label={`Change ${label.toLowerCase()}`} title={`Change ${label.toLowerCase()}`} onClick={start}
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        <Pencil size={16} aria-hidden="true" />
      </button>
    </span>
  );
}
