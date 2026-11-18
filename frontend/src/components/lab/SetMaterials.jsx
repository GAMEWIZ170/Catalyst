import { useEffect, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { Button, Dialog, FileDrop, Tooltip } from "../ui";

const megabytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const MAX_PDF = 10 * 1024 * 1024;
const field = "w-full rounded-lg border border-input bg-card p-3 font-sans text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

// Sources for a set: a PDF or pasted text. Private to the student, and the AI drafts are made from them.
// "Add source" opens one dialog with a drop zone; there is no always-open form.
export default function SetMaterials({ setId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [file, setFile] = useState(null);
  const [text, setText] = useState({ title: "", text: "" });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [removing, setRemoving] = useState(null);

  async function load() {
    try { setData((await api.getSetMaterials(setId)).data); } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, [setId]);

  function close() { setOpen(false); setPasting(false); setFile(null); setText({ title: "", text: "" }); setProblem(""); }

  async function add() {
    setBusy(true);
    setProblem("");
    try {
      if (pasting) await api.addSetText(setId, { title: text.title.trim() || text.text.trim().slice(0, 60), text: text.text.trim() });
      else await api.uploadSetPdf(setId, file);
      close();
      await load();
    } catch (err) { setProblem(err.message); } finally { setBusy(false); }
  }

  async function remove() {
    const target = removing;
    setRemoving(null);
    try { await api.deleteSetMaterial(target.id); await load(); } catch (err) { setError(err.message); }
  }

  const ready = pasting ? text.text.trim().length >= 20 : Boolean(file);
  return <section className="grid gap-3" aria-labelledby="sources-title">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="sources-title" className="m-0 text-xl font-semibold">Sources</h2>
      <Button variant="secondary" icon={Plus} onClick={() => setOpen(true)}>Add source</Button>
    </div>
    {error && <p className="m-0 text-muted-foreground" role="alert">{error}</p>}
    {data && data.items.length === 0 && <p className="m-0 text-muted-foreground">Add a PDF or some text. The AI drafts notes, cards and questions from your sources.</p>}
    {data && data.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <FileText size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="grid min-w-0 gap-0.5">
          <strong className="truncate">{item.title}</strong>
          <span className="text-sm text-muted-foreground">{item.kind === "pdf" ? `PDF, ${item.pages} ${item.pages === 1 ? "page" : "pages"}, ${megabytes(item.bytes)}` : "Pasted text"} · {item.characters.toLocaleString()} characters</span>
        </div>
      </div>
      <Tooltip label="Delete source"><Button variant="tertiary" size="sm" aria-label={`Delete ${item.title}`} onClick={() => setRemoving(item)}><Trash2 size={18} aria-hidden="true" /></Button></Tooltip>
    </div>)}

    <Dialog open={open} onClose={close} title="Add source"
      actions={<>
        <Button variant="tertiary" className="mr-auto" onClick={() => { setPasting(!pasting); setProblem(""); }}>{pasting ? "Upload a PDF instead" : "Paste text instead"}</Button>
        <Button variant="tertiary" onClick={close}>Cancel</Button>
        <Button disabled={!ready} loading={busy} onClick={add}>Add</Button>
      </>}>
      <div className="grid gap-4">
        {problem && <p className="m-0 text-destructive" role="alert">{problem}</p>}
        {!pasting && <FileDrop label="Upload a PDF" hint="Drop a PDF here, or click to choose one (up to 10 MB)" accept="application/pdf" maxSize={MAX_PDF} value={file} onChange={setFile} onError={setProblem} />}
        {pasting && <>
          <input aria-label="Name" placeholder="Name (optional)" maxLength={120} value={text.title} onChange={(event) => setText({ ...text, title: event.target.value })} className={`${field} min-h-11`} />
          <textarea aria-label="Text" placeholder="Paste your text here" rows={8} autoFocus value={text.text} onChange={(event) => setText({ ...text, text: event.target.value })} className={`${field} resize-y`} />
        </>}
        <p className="m-0 text-sm text-muted-foreground">Only add things you may copy for your own study. Only you can see your sources.</p>
        <p className="m-0 text-sm text-muted-foreground">Free beta: what you add is sent to Google's AI, and Google may use it to improve its products. Do not add anything private.</p>
      </div>
    </Dialog>

    <Dialog open={Boolean(removing)} onClose={() => setRemoving(null)} title="Delete this source?"
      actions={<><Button variant="tertiary" onClick={() => setRemoving(null)}>Cancel</Button><Button variant="danger" onClick={remove}>Delete</Button></>}>
      <p className="m-0">Its saved text and file are removed.</p>
    </Dialog>
  </section>;
}
