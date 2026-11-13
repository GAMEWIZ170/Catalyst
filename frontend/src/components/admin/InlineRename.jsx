import { useEffect, useRef, useState } from "react";
import { Button } from "../ui";

export default function InlineRename({ name, onSave, disabled = false, as: Title = "strong" }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) {
      setValue(name);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing, name]);

  function cancel() {
    setValue(name);
    setEditing(false);
  }

  function save() {
    const next = value.trim();
    if (!next || next === name) return cancel();
    onSave(next);
    setEditing(false);
  }

  if (!editing) return <span className="inline-rename">
    <Title>{name}</Title>
    <Button variant="tertiary" type="button" onClick={() => setEditing(true)} disabled={disabled}>Rename</Button>
  </span>;

  return <span className="inline-rename inline-rename--editing">
    <input ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(); if (event.key === "Escape") cancel(); }} aria-label={`Rename ${name}`} />
    <Button variant="tertiary" type="button" onClick={save}>Save</Button>
    <Button variant="tertiary" type="button" onClick={cancel}>Cancel</Button>
  </span>;
}
