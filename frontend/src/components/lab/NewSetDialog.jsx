import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { api } from "../../api/client";
import { Button, Dialog, FileDrop } from "../ui";

const MAX_PDF = 10 * 1024 * 1024;

// "Drop in your notes": one step. A PDF or pasted text starts a set; the AI names it and drafts notes, cards and a quiz
// in the background. Nothing else is asked. The title, topic and course are changed later by clicking them.
export default function NewSetDialog({ isOpen, onOpenChange, onStarted }) {
  const [file, setFile] = useState(null);
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) { setFile(null); setPasting(false); setText(""); setError(""); setBusy(false); }
  }, [isOpen]);

  const ready = pasting ? text.trim().length >= 40 : Boolean(file);

  async function start() {
    setBusy(true);
    setError("");
    try {
      const { data } = pasting ? await api.buildSetFromText(text.trim()) : await api.buildSetFromPdf(file);
      onStarted(data);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return <Dialog open={Boolean(isOpen)} onClose={() => onOpenChange(false)} title="New study set"
    actions={<>
      <Button variant="tertiary" className="mr-auto" onClick={() => { setPasting(!pasting); setError(""); }}>{pasting ? "Upload a PDF instead" : "Paste text instead"}</Button>
      <Button variant="tertiary" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button disabled={!ready} loading={busy} onClick={start}>Make my set</Button>
    </>}>
    <div className="grid gap-4">
      {error && <p className="m-0 flex items-center gap-2 text-destructive" role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
      {!pasting && <FileDrop label="Upload a PDF" hint="Drop a PDF here, or click to choose one (up to 10 MB)" accept="application/pdf" maxSize={MAX_PDF} value={file} onChange={setFile} onError={setError} />}
      {pasting && <textarea aria-label="Paste your notes" autoFocus rows={8} placeholder="Paste your notes or lesson text here" value={text} onChange={(event) => setText(event.target.value)}
        className="w-full resize-y rounded-lg border border-input bg-card p-3 font-sans text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />}
      <p className="m-0 text-sm text-muted-foreground">The AI names your set and drafts notes, flashcards and a quiz for you to check. Only add things you may copy for your own study.</p>
      <p className="m-0 text-sm text-muted-foreground">Free beta: what you add is sent to Google's AI, and Google may use it to improve its products. Do not add anything private.</p>
    </div>
  </Dialog>;
}
