import { useEffect, useMemo, useRef, useState } from "react";
import { Layers, Pencil, Play, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { List, ListItem } from "@astryxdesign/core/List";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { createReorderable } from "@astryxdesign/core";
import { api } from "../../api/client";
import { Loading } from "../../pages/Courses";
import { parsePastedCards } from "../../utils/pasteCards";
import GenerateMore from "./GenerateMore";

const icon = (Icon) => <Icon size={18} aria-hidden="true" />;
const NEW = "new";

// The Flashcards tab: content first. "Add card" opens a blank card in edit mode, a card saves when you leave it with both
// sides filled in, and cards are reordered by dragging their handle. Delete is in each card's menu, with a confirmation.
export default function SetCards({ setId }) {
  const [cards, setCards] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);   // { id (NEW for a blank card), front, back }
  const [removing, setRemoving] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [rows, setRows] = useState(null);
  const [skipped, setSkipped] = useState(0);
  const [saving, setSaving] = useState(false);
  const cardsRef = useRef([]);
  cardsRef.current = cards || [];

  async function load() {
    try { setCards((await api.getSetCards(setId)).data); } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, [setId]);

  // Leaving a card saves it. A new card with nothing in it just disappears; a half-filled one stays open.
  async function leave(event) {
    if (event.currentTarget.contains(event.relatedTarget) || !editing) return;
    const { id, front, back } = editing;
    const f = front.trim();
    const b = back.trim();
    if (id === NEW) {
      if (!f && !b) { setEditing(null); return; }
      if (!f || !b) return;
      try { await api.addSetCard(setId, { front: f, back: b }); setEditing(null); await load(); } catch (err) { setError(err.message); }
      return;
    }
    const was = cardsRef.current.find((card) => card.id === id);
    setEditing(null);
    if (!f || !b || (was && was.front === f && was.back === b)) return;
    try {
      await api.updateSetCard(id, { front: f, back: b });
      setCards((current) => current.map((card) => (card.id === id ? { ...card, front: f, back: b } : card)));
    } catch (err) { setError(err.message); await load(); }
  }

  const reorderable = useMemo(() => createReorderable({
    onReorder: ({ key, to }) => {
      const current = cardsRef.current;
      const from = current.findIndex((card) => card.id === key);
      if (from < 0) return;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setCards(next);
      api.reorderSetCards(setId, next.map((card) => card.id)).catch((err) => { setError(err.message); load(); });
    }
  }), [setId]);

  async function remove() {
    const target = removing;
    setRemoving(null);
    try { await api.deleteSetCard(target.id); await load(); } catch (err) { setError(err.message); }
  }

  function closePaste() { setPasteOpen(false); setPasted(""); setRows(null); }
  async function saveRows() {
    setSaving(true);
    try {
      const good = rows.filter((row) => row.front.trim() && row.back.trim());
      await api.addSetCards(setId, good.map((row) => ({ front: row.front.trim(), back: row.back.trim() })));
      closePaste();
      await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  if (error && !cards) return <Text color="secondary" role="alert">{error}</Text>;
  if (!cards) return <Loading />;
  const ready = rows ? rows.filter((row) => row.front.trim() && row.back.trim()).length : 0;

  const editor = (card) => <div onBlur={leave}>
    <VStack gap={2}>
      <TextArea label="Front" isLabelHidden placeholder="Front (term or question)" rows={2} maxLength={500} hasAutoFocus={card.id === editing?.id && !card.front}
        value={editing.front} onChange={(front) => setEditing({ ...editing, front })} />
      <TextArea label="Back" isLabelHidden placeholder="Back (answer)" rows={2} maxLength={500} value={editing.back} onChange={(back) => setEditing({ ...editing, back })} />
    </VStack>
  </div>;

  return <VStack gap={4}>
    <HStack gap={2} justify="between" align="center" wrap="wrap">
      <Text type="supporting" color="secondary">{cards.length} {cards.length === 1 ? "card" : "cards"}. Cards you rate go into your daily Review.</Text>
      <HStack gap={2} wrap="wrap">
        {cards.length > 0 && <Button label="Study" variant="primary" icon={icon(Play)} href={`/lab/${setId}/study`} />}
        <Button label="Generate more" variant="secondary" icon={icon(Sparkles)} onClick={() => setGenerating(true)} />
        <MoreMenu label="More card options" alignment="end" items={[{ label: "Paste a list", onClick: () => setPasteOpen(true) }]} />
        <Button label="Add card" variant="secondary" icon={icon(Plus)} isDisabled={editing?.id === NEW} onClick={() => setEditing({ id: NEW, front: "", back: "" })} />
      </HStack>
    </HStack>
    {error && <Text color="secondary" role="alert">{error}</Text>}
    {cards.length === 0 && editing?.id !== NEW && <EmptyState isCompact icon={<Layers size={28} aria-hidden="true" />} title="No cards yet" description="Add one yourself, or let the AI draft some from your notes." />}
    {(cards.length > 0 || editing?.id === NEW) && <List hasDividers reorderable={reorderable}>
      {editing?.id === NEW && <ListItem key={NEW} label={editor({ id: NEW, front: "" })} />}
      {cards.map((card) => editing?.id === card.id
        ? <ListItem key={card.id} itemKey={card.id} label={editor(card)} />
        : <ListItem key={card.id} itemKey={card.id} label={card.front} description={card.back} onClick={() => setEditing({ id: card.id, front: card.front, back: card.back })}
          endContent={<MoreMenu label={`Options for card ${card.front}`} alignment="end" items={[
            { label: "Edit", icon: icon(Pencil), onClick: () => setEditing({ id: card.id, front: card.front, back: card.back }) },
            { type: "divider" },
            { label: "Delete card", icon: icon(Trash2), variant: "destructive", onClick: () => setRemoving(card) }
          ]} />} />)}
    </List>}

    <Dialog isOpen={Boolean(removing)} onOpenChange={(open) => { if (!open) setRemoving(null); }} width={400}>
      <DialogHeader title="Delete this card?" onOpenChange={(open) => { if (!open) setRemoving(null); }} />
      <VStack gap={4} padding={4}>
        <Text>It leaves your review too.</Text>
        <HStack gap={2} justify="end"><Button label="Cancel" variant="ghost" onClick={() => setRemoving(null)} /><Button label="Delete" variant="destructive" onClick={remove} /></HStack>
      </VStack>
    </Dialog>

    <Dialog isOpen={pasteOpen} onOpenChange={(open) => { if (!open) closePaste(); }} purpose="form" width={560}>
      <DialogHeader title="Paste a list" onOpenChange={(open) => { if (!open) closePaste(); }} />
      <VStack gap={3} padding={4}>
        {!rows && <>
          <TextArea label="One card per line" isLabelHidden placeholder={"One card per line: term - definition"} rows={8} value={pasted} onChange={setPasted} />
          <HStack gap={2} justify="end"><Button label="Cancel" variant="ghost" onClick={closePaste} /><Button label="Split into cards" variant="primary" isDisabled={!pasted.trim()} onClick={() => { const r = parsePastedCards(pasted); setRows(r.cards); setSkipped(r.skipped); }} /></HStack>
        </>}
        {rows && <>
          <Text color="secondary">Fix or remove cards, then add them.{skipped > 0 ? ` ${skipped} ${skipped === 1 ? "line was" : "lines were"} skipped (no separator).` : ""}</Text>
          {rows.length === 0 && <Text>No cards found. Go back and check the separators.</Text>}
          {rows.map((row, index) => <HStack key={index} gap={2} align="start">
            <VStack gap={2} style={{ flex: 1 }}>
              <TextArea label={`Front ${index + 1}`} isLabelHidden rows={1} value={row.front} onChange={(front) => setRows(rows.map((r, i) => (i === index ? { ...r, front } : r)))} />
              <TextArea label={`Back ${index + 1}`} isLabelHidden rows={1} value={row.back} onChange={(back) => setRows(rows.map((r, i) => (i === index ? { ...r, back } : r)))} />
            </VStack>
            <Button label="Remove" variant="ghost" size="sm" onClick={() => setRows(rows.filter((_, i) => i !== index))} />
          </HStack>)}
          <HStack gap={2} justify="end"><Button label="Back" variant="ghost" onClick={() => setRows(null)} /><Button label={`Add ${ready} ${ready === 1 ? "card" : "cards"}`} variant="primary" isDisabled={!ready} isLoading={saving} onClick={saveRows} /></HStack>
        </>}
      </VStack>
    </Dialog>

    <GenerateMore isOpen={generating} onOpenChange={setGenerating} setId={setId} kind="cards" onSaved={load} />
  </VStack>;
}
