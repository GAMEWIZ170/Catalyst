import { useCallback, useEffect, useRef, useState } from "react";

// One setting: the label and one line of help on the left, the control on the right (interaction rules 2, 3 and 8).
export default function SettingRow({ label, help, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border py-3 last:border-b-0">
      <div className="grid min-w-0 flex-[1_1_14rem] gap-0.5">
        <span className="font-semibold">{label}</span>
        {help ? <span className="text-sm text-muted-foreground">{help}</span> : null}
      </div>
      <div className="flex-none">{children}</div>
    </div>
  );
}

// Autosave state for a page: run(action) shows "Saving…", then "Saved" for a moment, or the error. There are no Save buttons.
export function useAutosave() {
  const [status, setStatus] = useState("");
  const timer = useRef(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const run = useCallback(async (action) => {
    window.clearTimeout(timer.current);
    setStatus("Saving…");
    try {
      await action();
      setStatus("Saved");
      timer.current = window.setTimeout(() => setStatus(""), 2500);
      return true;
    } catch (error) {
      setStatus(error.message || "Not saved");
      return false;
    }
  }, []);
  return { status, run };
}

// The small muted save state shown in a page header.
export function SaveState({ status }) {
  return <span className="text-sm text-muted-foreground" role="status" aria-live="polite">{status}</span>;
}
