import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { Badge, Button, EmptyState } from "../ui";
import { formatDate } from "../../utils/dates";
import { Loading } from "../../pages/Courses";
import ConfirmDialog from "./ConfirmDialog";
import StatusMessage from "./StatusMessage";

const timeOf = (value) => new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// The History tab of the lesson editor: the text as it was before each save, newest first, with Restore.
export default function LessonHistory({ lessonId, onRestored }) {
  const [versions, setVersions] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);       // id of the version shown in full
  const [restoring, setRestoring] = useState(null); // the version waiting for confirmation
  const [busy, setBusy] = useState(false);

  async function load() {
    setError("");
    try {
      setVersions((await api.getLessonVersions(lessonId)).data);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, [lessonId]);

  async function restore() {
    setBusy(true);
    try {
      await api.restoreLessonVersion(lessonId, restoring._id);
      setRestoring(null);
      onRestored();
    } catch (err) {
      setError(err.message);
      setRestoring(null);
    } finally {
      setBusy(false);
    }
  }

  if (!versions && !error) return <Loading />;
  return <section className="admin-editor-section">
    <div className="section-heading"><h2>History</h2></div>
    <p className="muted">Each save that changes the title, explanation, image or video keeps the text it replaced. The newest 50 are kept. Restoring saves the current text first, so you can undo a restore too.</p>
    <StatusMessage message={error} error />
    {versions && versions.length === 0 && <EmptyState title="No earlier versions yet" description="They appear here after you save a change to this lesson." />}
    {versions && versions.length > 0 && <ul className="history-list">
      {versions.map((version) => <li className="history-row" key={version._id}>
        <div className="history-main">
          <strong>{version.title}</strong>
          <span className="muted">Replaced {formatDate(version.createdAt)} at {timeOf(version.createdAt)} by {version.savedBy}{version.reason === "restore" ? " (a restore)" : ""}</span>
          {open === version._id
            ? <pre className="history-text">{version.explanation}</pre>
            : <span className="history-excerpt">{version.excerpt}{version.explanation.length > version.excerpt.length ? "..." : ""}</span>}
          {(version.hasImage || version.videoId) && <span className="muted">{[version.hasImage && "Has an image", version.videoId && "Has a video"].filter(Boolean).join(" · ")}</span>}
        </div>
        <div className="history-actions">
          <Button variant="tertiary" type="button" aria-expanded={open === version._id} onClick={() => setOpen(open === version._id ? null : version._id)}>{open === version._id ? "Hide text" : "Show full text"}</Button>
          <Button variant="secondary" type="button" onClick={() => setRestoring(version)}>Restore</Button>
        </div>
      </li>)}
    </ul>}
    <ConfirmDialog open={Boolean(restoring)} title="Restore this version?" description="The lesson text goes back to this version. The text you have now is saved to the history first." confirmLabel={busy ? "Restoring..." : "Restore"} cancelLabel="Cancel" onConfirm={restore} onCancel={() => !busy && setRestoring(null)} />
  </section>;
}
