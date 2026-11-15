import { useEffect, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FileInput } from "@astryxdesign/core/FileInput";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { api } from "../../api/client";

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

  return <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={520}>
    <DialogHeader title="New study set" onOpenChange={onOpenChange} />
    <VStack gap={4} padding={4}>
      {error && <Banner status="error" title={error} container="section" />}
      {!pasting && <FileInput label="Upload a PDF" isLabelHidden mode="dropzone" accept="application/pdf" maxSize={MAX_PDF}
        value={file} onChange={(next) => setFile(Array.isArray(next) ? next[0] || null : next)}
        placeholder="Drop a PDF here, or click to choose one (up to 10 MB)" />}
      {pasting && <TextArea label="Paste your notes" isLabelHidden placeholder="Paste your notes or lesson text here" value={text} onChange={setText} rows={8} hasAutoFocus />}
      <Text type="supporting" color="secondary">The AI names your set and drafts notes, flashcards and a quiz for you to check. Only add things you may copy for your own study.</Text>
      <HStack gap={2} justify="between" align="center" wrap="wrap">
        <Button label={pasting ? "Upload a PDF instead" : "Paste text instead"} variant="ghost" onClick={() => { setPasting(!pasting); setError(""); }} />
        <HStack gap={2}>
          <Button label="Cancel" variant="ghost" onClick={() => onOpenChange(false)} />
          <Button label="Make my set" variant="primary" isDisabled={!ready} isLoading={busy} onClick={start} />
        </HStack>
      </HStack>
    </VStack>
  </Dialog>;
}
