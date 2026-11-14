import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { api } from "../../api/client";
import ConfirmDialog from "../admin/ConfirmDialog";
import { Button, Checkbox, Dialog, TextArea, TextField } from "../ui";

const megabytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

// Source material for a set: a PDF or pasted text. It is private to the student and will feed AI drafts later.
export default function SetMaterials({ setId }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [text, setText] = useState({ title: "", text: "" });
  const [removing, setRemoving] = useState(null);
  const fileRef = useRef(null);

  async function load() {
    try {
      setData((await api.getSetMaterials(setId)).data);
    } catch (err) {
      setStatus(err.message);
    }
  }
  useEffect(() => { load(); }, [setId]);

  async function uploadPdf(event) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setStatus("Choose a PDF first."); return; }
    if (file.size > 10 * 1024 * 1024) { setStatus("A PDF must be 10 MB or smaller."); return; }
    setBusy(true);
    setStatus("");
    try {
      await api.uploadSetPdf(setId, file);
      fileRef.current.value = "";
      setRights(false);
      setStatus("PDF added. Its text was read and saved.");
      await load();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addText(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      await api.addSetText(setId, { title: text.title.trim(), text: text.text.trim() });
      setTextOpen(false);
      setText({ title: "", text: "" });
      setStatus("Text added");
      await load();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const target = removing;
    setRemoving(null);
    try {
      await api.deleteSetMaterial(target.id);
      setStatus("Material deleted");
      await load();
    } catch (err) {
      setStatus(err.message);
    }
  }

  return <section className="settings-section set-materials" aria-labelledby="materials-heading">
    <h2 id="materials-heading">Source material</h2>
    <p className="muted settings-help">Attach a PDF or paste text from your own study material. Only you can see it. Later it can be turned into draft notes, cards and questions.</p>
    <form className="set-material-upload" onSubmit={uploadPdf}>
      <div className="ui-field">
        <label className="ui-label" htmlFor="material-file">PDF file (up to 10 MB)</label>
        <input className="ui-control" id="material-file" type="file" accept="application/pdf" ref={fileRef} />
      </div>
      <Checkbox label="I have the right to use this material" hint="Only upload things you wrote or are allowed to copy for your own study." checked={rights} onChange={(event) => setRights(event.target.checked)} />
      <div className="button-row">
        <Button type="submit" variant="secondary" loading={busy} disabled={!rights}>Upload PDF</Button>
        <Button type="button" variant="secondary" onClick={() => setTextOpen(true)}>Paste text instead</Button>
      </div>
    </form>
    <p className="settings-status" role="status">{status}</p>
    {data && data.items.length > 0 && <>
      <ul className="set-card-list">{data.items.map((item) => <li key={item.id}>
        <span className="set-card-text"><strong><FileText size={16} aria-hidden="true" /> {item.title}</strong>
          <span className="muted">{item.kind === "pdf" ? `PDF, ${item.pages} ${item.pages === 1 ? "page" : "pages"}, ${megabytes(item.bytes)}` : "Pasted text"} · {item.characters.toLocaleString()} characters</span></span>
        <Button variant="secondary" type="button" onClick={() => setRemoving(item)} aria-label={`Delete ${item.title}`}>Delete</Button>
      </li>)}</ul>
      <p className="muted settings-help">Upload space used: {megabytes(data.usedBytes)} of {megabytes(data.limitBytes)}.</p>
    </>}
    <Dialog open={textOpen} onClose={() => setTextOpen(false)} title="Paste text" actions={<>
      <Button variant="secondary" type="button" onClick={() => setTextOpen(false)}>Cancel</Button>
      <Button type="submit" form="material-text-form" loading={busy}>Save text</Button>
    </>}>
      <form id="material-text-form" className="form-stack" onSubmit={addText}>
        <TextField label="Title" required maxLength="120" value={text.title} onChange={(event) => setText({ ...text, title: event.target.value })} />
        <TextArea label="Text" required minLength="20" rows="8" maxLength="100000" value={text.text} onChange={(event) => setText({ ...text, text: event.target.value })} hint="Only paste material you have the right to use." />
      </form>
    </Dialog>
    <ConfirmDialog open={Boolean(removing)} title="Delete this material?" description="Its saved text and file are removed." confirmLabel="Delete" onConfirm={remove} onCancel={() => setRemoving(null)} />
  </section>;
}
