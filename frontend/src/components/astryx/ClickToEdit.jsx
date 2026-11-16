import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack } from "@astryxdesign/core/Stack";
import { TextInput } from "@astryxdesign/core/TextInput";

// Click-to-edit text. Enter or leaving the field saves, Esc cancels. No Save button (rule 2).
// `heading` shows it as the page title with a pencil button. `startEditing` opens it already in edit mode (a new item).
export default function ClickToEdit({ value, onSave, label, placeholder, heading = false, startEditing = false, allowEmpty = false }) {
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (startEditing) { setDraft(value); setEditing(true); } }, [startEditing]);

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next !== value && (next || allowEmpty)) onSave(next);
  }
  const start = () => { setDraft(value); setEditing(true); };

  if (editing) {
    return <div onBlur={commit}>
      <TextInput label={label} isLabelHidden value={draft} onChange={setDraft} hasAutoFocus placeholder={placeholder}
        onEnter={commit} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setDraft(value); setEditing(false); } }} />
    </div>;
  }
  if (heading) {
    return <HStack gap={1} align="center">
      <Heading level={1}>{value || placeholder}</Heading>
      <IconButton label={`Change ${label.toLowerCase()}`} tooltip={`Change ${label.toLowerCase()}`} variant="ghost" size="sm" icon={<Pencil size={16} aria-hidden="true" />} onClick={start} />
    </HStack>;
  }
  // The pencil says this can be changed.
  return <Button label={value || placeholder} tooltip={`Change ${label.toLowerCase()}`} variant="ghost" size="sm" icon={<Pencil size={14} aria-hidden="true" />} onClick={start} />;
}
