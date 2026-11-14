import { useState } from "react";
import { Flag } from "lucide-react";
import { api } from "../api/client";
import { Button, Dialog, SelectField, TextArea } from "./ui";

const CATEGORIES = [
  { value: "wrong_answer", label: "The answer looks wrong" },
  { value: "typo", label: "Typing mistake" },
  { value: "unclear", label: "Hard to understand" },
  { value: "other", label: "Something else" }
];

// "Report a problem" on a question or a lesson. The answer from the admin comes back as a notification.
export default function ReportButton({ kind, target }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("wrong_answer");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentFor, setSentFor] = useState(null); // the target a report was sent for, so the next question starts fresh

  function close() {
    if (busy) return;
    setOpen(false);
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createReport({ kind, target, category, note: note.trim() });
      setSentFor(target);
      setNote("");
      setCategory("wrong_answer");
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="report-box">
    <Button variant="tertiary" icon={Flag} onClick={() => { setError(""); setOpen(true); }}>Report a problem</Button>
    <span className="muted report-status" role="status">{sentFor === target ? "Report sent. Thank you." : ""}</span>
    <Dialog open={open} onClose={close} title={kind === "lesson" ? "Report a problem with this lesson" : "Report a problem with this question"}>
      <form className="form-stack" onSubmit={submit}>
        <SelectField label="What is wrong?" value={category} onChange={(event) => setCategory(event.target.value)}>
          {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </SelectField>
        <TextArea label="Tell us more (optional)" maxLength={500} rows={4} value={note} onChange={(event) => setNote(event.target.value)} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <Button variant="secondary" type="button" onClick={close}>Cancel</Button>
          <Button type="submit" loading={busy}>Send report</Button>
        </div>
      </form>
    </Dialog>
  </div>;
}
