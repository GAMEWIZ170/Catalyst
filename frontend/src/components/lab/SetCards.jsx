import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Reorder, useDragControls } from "motion/react";
import { ArrowDown, ArrowUp, GripVertical, Layers, MoreHorizontal, Pencil, Play, Plus, Sparkles, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { Loading } from "../../pages/learn/Courses";
import { parsePastedCards } from "../../utils/pasteCards";
import { Button, Dialog, DropdownMenu, EmptyState } from "../ui";
import GenerateMore from "./GenerateMore";

const NEW = "new";
const field = "w-full resize-y rounded-lg border border-input bg-card p-3 font-sans text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

// One saved card in the list. The grip drags it (pointer); "Move up" and "Move down" in its menu do the same by keyboard.
function CardRow({ card, index, count, onEdit, onRemove, onMove, onDrop }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={card} dragListener={false} dragControls={controls} onDragEnd={onDrop}
      className="flex list-none items-center gap-2 border-b border-border bg-background py-2 last:border-b-0" whileDrag={{ scale: 1.01 }}>
      <button type="button" aria-label={`Drag card ${index + 1} to reorder`} onPointerDown={(event) => controls.start(event)}
        className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-pill border-0 bg-transparent text-muted-foreground hover:bg-muted active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-ring">
        <GripVertical size={18} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => onEdit(card)} className="grid min-w-0 flex-1 cursor-pointer gap-0.5 rounded-md border-0 bg-transparent p-2 text-left font-sans text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
        <span className="line-clamp-2 font-semibold">{card.front}</span>
        <span className="line-clamp-2 text-sm text-muted-foreground">{card.back}</span>
      </button>
      <DropdownMenu
        trigger={<Button variant="tertiary" size="sm" aria-label={`Options for card ${card.front}`}><MoreHorizontal size={18} aria-hidden="true" /></Button>}
        items={[
          { label: "Edit", icon: Pencil, onSelect: () => onEdit(card) },
          { label: "Move up", icon: ArrowUp, disabled: index === 0, onSelect: () => onMove(card.id, -1) },
          { label: "Move down", icon: ArrowDown, disabled: index === count - 1, onSelect: () => onMove(card.id, 1) },
          { separator: true },
          { label: "Delete card", icon: Trash2, danger: true, onSelect: () => onRemove(card) }
        ]} />
    </Reorder.Item>
  );
}

// The Flashcards tab: content first. "Add card" opens a blank card in edit mode, a card saves when you leave it with both
// sides filled in, and cards are reordered by dragging their grip. Delete is in each card's menu, with a confirmation.
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

  // The order is saved once the drag ends (or a menu move is chosen), not on every pixel.
  function saveOrder(next) {
    api.reorderSetCards(setId, next.map((card) => card.id)).catch((err) => { setError(err.message); load(); });
  }
  function move(id, step) {
    const current = cardsRef.current;
    const from = current.findIndex((card) => card.id === id);
    const to = from + step;
    if (from < 0 || to < 0 || to >= current.length) return;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setCards(next);
    saveOrder(next);
  }

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

  if (error && !cards) return <p className="m-0 text-muted-foreground" role="alert">{error}</p>;
  if (!cards) return <Loading />;
  const ready = rows ? rows.filter((row) => row.front.trim() && row.back.trim()).length : 0;
  const editCard = (card) => setEditing({ id: card.id, front: card.front, back: card.back });

  const editor = (autoFocus) => <div onBlur={leave} className="grid gap-2 border-b border-border py-3">
    <textarea aria-label="Front" autoFocus={autoFocus} placeholder="Front (term or question)" rows={2} maxLength={500} className={field}
      value={editing.front} onChange={(event) => setEditing({ ...editing, front: event.target.value })} />
    <textarea aria-label="Back" placeholder="Back (answer)" rows={2} maxLength={500} className={field}
      value={editing.back} onChange={(event) => setEditing({ ...editing, back: event.target.value })} />
  </div>;

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 text-sm text-muted-foreground">{cards.length} {cards.length === 1 ? "card" : "cards"}. Cards you rate go into your daily Review.</p>
      <div className="flex flex-wrap items-center gap-2">
        {cards.length > 0 && <Button as={Link} to={`/lab/${setId}/study`} icon={Play}>Study</Button>}
        <Button variant="secondary" icon={Sparkles} onClick={() => setGenerating(true)}>Generate more</Button>
        <DropdownMenu trigger={<Button variant="tertiary" aria-label="More card options"><MoreHorizontal size={18} aria-hidden="true" /></Button>}
          items={[{ label: "Paste a list", onSelect: () => setPasteOpen(true) }]} />
        <Button variant="secondary" icon={Plus} disabled={editing?.id === NEW} onClick={() => setEditing({ id: NEW, front: "", back: "" })}>Add card</Button>
      </div>
    </div>
    {error && <p className="m-0 text-muted-foreground" role="alert">{error}</p>}
    {cards.length === 0 && editing?.id !== NEW && <EmptyState icon={Layers} title="No cards yet" description="Add one yourself, or let the AI draft some from your notes." />}
    {editing?.id === NEW && editor(true)}
    {cards.length > 0 && <Reorder.Group as="ul" axis="y" values={cards} onReorder={setCards} className="m-0 grid p-0">
      {cards.map((card, index) => editing?.id === card.id
        ? <li key={card.id} className="list-none">{editor(!card.front)}</li>
        : <CardRow key={card.id} card={card} index={index} count={cards.length} onEdit={editCard} onRemove={setRemoving} onMove={move} onDrop={() => saveOrder(cardsRef.current)} />)}
    </Reorder.Group>}

    <Dialog open={Boolean(removing)} onClose={() => setRemoving(null)} title="Delete this card?"
      actions={<><Button variant="tertiary" onClick={() => setRemoving(null)}>Cancel</Button><Button variant="danger" onClick={remove}>Delete</Button></>}>
      <p className="m-0">It leaves your review too.</p>
    </Dialog>

    <Dialog open={pasteOpen} onClose={closePaste} title="Paste a list" className="max-w-xl"
      actions={!rows
        ? <><Button variant="tertiary" onClick={closePaste}>Cancel</Button><Button disabled={!pasted.trim()} onClick={() => { const r = parsePastedCards(pasted); setRows(r.cards); setSkipped(r.skipped); }}>Split into cards</Button></>
        : <><Button variant="tertiary" onClick={() => setRows(null)}>Back</Button><Button disabled={!ready} loading={saving} onClick={saveRows}>Add {ready} {ready === 1 ? "card" : "cards"}</Button></>}>
      {!rows && <textarea aria-label="One card per line" placeholder="One card per line: term - definition" rows={8} className={field} value={pasted} onChange={(event) => setPasted(event.target.value)} />}
      {rows && <div className="grid gap-3">
        <p className="m-0 text-muted-foreground">Fix or remove cards, then add them.{skipped > 0 ? ` ${skipped} ${skipped === 1 ? "line was" : "lines were"} skipped (no separator).` : ""}</p>
        {rows.length === 0 && <p className="m-0">No cards found. Go back and check the separators.</p>}
        {rows.map((row, index) => <div key={index} className="flex items-start gap-2">
          <div className="grid min-w-0 flex-1 gap-2">
            <textarea aria-label={`Front ${index + 1}`} rows={1} className={field} value={row.front} onChange={(event) => setRows(rows.map((r, i) => (i === index ? { ...r, front: event.target.value } : r)))} />
            <textarea aria-label={`Back ${index + 1}`} rows={1} className={field} value={row.back} onChange={(event) => setRows(rows.map((r, i) => (i === index ? { ...r, back: event.target.value } : r)))} />
          </div>
          <Button variant="tertiary" size="sm" onClick={() => setRows(rows.filter((_, i) => i !== index))}>Remove</Button>
        </div>)}
      </div>}
    </Dialog>

    <GenerateMore isOpen={generating} onOpenChange={setGenerating} setId={setId} kind="cards" onSaved={load} />
  </div>;
}
