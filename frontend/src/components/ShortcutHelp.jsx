import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button, Dialog } from "./ui";

// The keys each screen understands. Shown when the student presses "?" (and not while typing).
const LISTS = {
  test: [["1 to 4", "Choose an answer (True is 1, False is 2)"], ["Enter", "Check the answer, then continue"]],
  flashcards: [["Space", "Flip the card"], ["1, 2, 3", "Rate the card: Don't know, Unsure, Confident"]],
  other: [["?", "Show this list on a test or flashcard screen"]]
};

export default function ShortcutHelp() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const kind = /^\/tests\//.test(pathname) ? "test" : /\/flashcards$/.test(pathname) ? "flashcards" : "other";

  useEffect(() => {
    function onKey(event) {
      if (event.key !== "?" || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target.closest?.("input, textarea, select, [contenteditable='true']")) return;
      setOpen((value) => !value);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return <Dialog open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts" actions={<Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>}>
    <dl className="shortcut-list">
      {LISTS[kind].map(([keys, what]) => <div key={keys}><dt><kbd>{keys}</kbd></dt><dd>{what}</dd></div>)}
    </dl>
  </Dialog>;
}
