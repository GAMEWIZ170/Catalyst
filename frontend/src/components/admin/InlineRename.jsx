import { useEffect, useRef, useState } from "react";
import { Button } from "../ui";

export default function InlineRename({ name, onSave, disabled = false, as: Title = "strong", autoEdit = false }) {
  const [editing, setEditing] = useState(autoEdit);
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

  if (!editing) return <span className="inline-flex flex-wrap items-center gap-2 [&_h1]:m-0 [&_h1]:text-[1.4375rem] [&_h1]:leading-[1.2]">
    <Title>{name}</Title>
    <Button variant="tertiary" type="button" onClick={() => setEditing(true)} disabled={disabled}>Rename</Button>
  </span>;

  return <span className="inline-flex flex-wrap items-center gap-2">
    <input className="min-h-11 rounded-[6px] border border-input bg-card p-2 text-foreground" ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(); if (event.key === "Escape") cancel(); }} aria-label={`Rename ${name}`} />
    <Button variant="tertiary" type="button" onClick={save}>Save</Button>
    <Button variant="tertiary" type="button" onClick={cancel}>Cancel</Button>
  </span>;
}
