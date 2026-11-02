import { useEffect, useRef, useState } from "react";

export default function InlineRename({ name, onSave, disabled = false }) {
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
    <strong>{name}</strong>
    <button className="text-button" type="button" onClick={() => setEditing(true)} disabled={disabled}>Rename</button>
  </span>;

  return <span className="inline-rename inline-rename--editing">
    <input ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(); if (event.key === "Escape") cancel(); }} aria-label={`Rename ${name}`} />
    <button className="text-button" type="button" onClick={save}>Save</button>
    <button className="text-button" type="button" onClick={cancel}>Cancel</button>
  </span>;
}
