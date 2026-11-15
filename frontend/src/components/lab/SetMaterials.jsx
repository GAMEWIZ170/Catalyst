import { useEffect, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FileInput } from "@astryxdesign/core/FileInput";
import { Heading } from "@astryxdesign/core/Heading";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { api } from "../../api/client";

const megabytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const MAX_PDF = 10 * 1024 * 1024;

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
  return <VStack gap={3}>
    <HStack justify="between" align="center" wrap="wrap" gap={2}>
      <Heading level={2}>Sources</Heading>
      <Button label="Add source" variant="secondary" icon={<Plus size={18} aria-hidden="true" />} onClick={() => setOpen(true)} />
    </HStack>
    {error && <Text color="secondary" role="alert">{error}</Text>}
    {data && data.items.length === 0 && <Text color="secondary">Add a PDF or some text. The AI drafts notes, cards and questions from your sources.</Text>}
    {data && data.items.map((item) => <HStack key={item.id} gap={2} align="center" justify="between">
      <HStack gap={2} align="center">
        <FileText size={18} aria-hidden="true" />
        <VStack gap={0}>
          <Text weight="semibold">{item.title}</Text>
          <Text type="supporting" color="secondary">{item.kind === "pdf" ? `PDF, ${item.pages} ${item.pages === 1 ? "page" : "pages"}, ${megabytes(item.bytes)}` : "Pasted text"} · {item.characters.toLocaleString()} characters</Text>
        </VStack>
      </HStack>
      <IconButton label={`Delete ${item.title}`} tooltip="Delete source" variant="ghost" icon={<Trash2 size={18} aria-hidden="true" />} onClick={() => setRemoving(item)} />
    </HStack>)}

    <Dialog isOpen={open} onOpenChange={(next) => { if (!next) close(); }} purpose="form" width={520}>
      <DialogHeader title="Add source" onOpenChange={(next) => { if (!next) close(); }} />
      <VStack gap={4} padding={4}>
        {problem && <Text color="secondary" role="alert">{problem}</Text>}
        {!pasting && <FileInput label="Upload a PDF" isLabelHidden mode="dropzone" accept="application/pdf" maxSize={MAX_PDF} value={file}
          onChange={(next) => setFile(Array.isArray(next) ? next[0] || null : next)} placeholder="Drop a PDF here, or click to choose one (up to 10 MB)" />}
        {pasting && <>
          <TextInput label="Name" isLabelHidden placeholder="Name (optional)" value={text.title} maxLength={120} onChange={(title) => setText({ ...text, title })} />
          <TextArea label="Text" isLabelHidden placeholder="Paste your text here" rows={8} value={text.text} onChange={(value) => setText({ ...text, text: value })} hasAutoFocus />
        </>}
        <Text type="supporting" color="secondary">Only add things you may copy for your own study. Only you can see your sources.</Text>
        <HStack gap={2} justify="between" align="center" wrap="wrap">
          <Button label={pasting ? "Upload a PDF instead" : "Paste text instead"} variant="ghost" onClick={() => { setPasting(!pasting); setProblem(""); }} />
          <HStack gap={2}>
            <Button label="Cancel" variant="ghost" onClick={close} />
            <Button label="Add" variant="primary" isDisabled={!ready} isLoading={busy} onClick={add} />
          </HStack>
        </HStack>
      </VStack>
    </Dialog>

    <Dialog isOpen={Boolean(removing)} onOpenChange={(next) => { if (!next) setRemoving(null); }} width={400}>
      <DialogHeader title="Delete this source?" onOpenChange={(next) => { if (!next) setRemoving(null); }} />
      <VStack gap={4} padding={4}>
        <Text>Its saved text and file are removed.</Text>
        <HStack gap={2} justify="end"><Button label="Cancel" variant="ghost" onClick={() => setRemoving(null)} /><Button label="Delete" variant="destructive" onClick={remove} /></HStack>
      </VStack>
    </Dialog>
  </VStack>;
}
