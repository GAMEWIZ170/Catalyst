import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layers, Play } from "lucide-react";
import { api } from "../../api/client";
import ConfirmDialog from "../admin/ConfirmDialog";
import { Button, Dialog, EmptyState, TextArea, TextField } from "../ui";
import { Loading } from "../../pages/Courses";
import { parsePastedCards } from "../../utils/pasteCards";

// The Flashcards tab of a study set: list, add, edit, delete, and the paste-and-split helper.
export default function SetCards({ setId }) {
  const [cards, setCards] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null); // { id, front, back }
  const [removing, setRemoving] = useState(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [rows, setRows] = useState(null); // the editable preview, after Split
  const [skipped, setSkipped] = useState(0);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setCards((await api.getSetCards(setId)).data);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, [setId]);

  async function add(event) {
    event.preventDefault();
    setAdding(true);
    setStatus("");
    try {
      await api.addSetCard(setId, { front, back });
      setFront("");
      setBack("");
      setStatus("Card added");
      await load();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function saveEdit(event) {
    event.preventDefault();
    try {
      await api.updateSetCard(editing.id, { front: editing.front, back: editing.back });
      setEditing(null);
      await load();
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function remove() {
    const target = removing;
    setRemoving(null);
    try {
      await api.deleteSetCard(target.id);
      setStatus("Card deleted");
      await load();
    } catch (err) {
      setStatus(err.message);
    }
  }

  function split() {
    const result = parsePastedCards(pasted);
    setRows(result.cards);
    setSkipped(result.skipped);
  }

  function closePaste() {
    setPasteOpen(false);
    setPasted("");
    setRows(null);
  }

  async function saveRows() {
    setSaving(true);
    setStatus("");
    try {
      const good = rows.filter((row) => row.front.trim() && row.back.trim());
      await api.addSetCards(setId, good.map((row) => ({ front: row.front.trim(), back: row.back.trim() })));
      setStatus(`${good.length} cards added`);
      closePaste();
      await load();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !cards) return <p className="form-error" role="alert">{error}</p>;
  if (!cards) return <Loading />;
  const ready = rows ? rows.filter((row) => row.front.trim() && row.back.trim()).length : 0;
  return <div className="set-cards">
    <div className="button-row">
      {cards.length > 0 && <Button as={Link} to={`/lab/${setId}/study`} icon={Play}>Study these cards</Button>}
      <Button variant="secondary" onClick={() => setPasteOpen(true)}>Paste a list</Button>
    </div>
    <p className="muted settings-help">Cards you rate go into your daily Review, spaced so they come back just before you would forget them.</p>
    <form className="set-card-form" onSubmit={add}>
      <TextField label="Front" required maxLength="500" value={front} onChange={(event) => setFront(event.target.value)} />
      <TextField label="Back" required maxLength="500" value={back} onChange={(event) => setBack(event.target.value)} />
      <Button type="submit" variant="secondary" loading={adding}>Add card</Button>
    </form>
    <p className="settings-status" role="status">{status}</p>
    {cards.length === 0
      ? <EmptyState icon={Layers} title="No cards yet" description="Add a card above, or paste a list of terms and definitions." />
      : <ul className="set-card-list">{cards.map((card) => <li key={card.id}>
        <span className="set-card-text"><strong>{card.front}</strong><span className="muted">{card.back}</span></span>
        <span className="catalog-actions">
          <Button variant="secondary" type="button" onClick={() => setEditing({ id: card.id, front: card.front, back: card.back })} aria-label={`Edit card ${card.front}`}>Edit</Button>
          <Button variant="secondary" type="button" onClick={() => setRemoving(card)} aria-label={`Delete card ${card.front}`}>Delete</Button>
        </span>
      </li>)}</ul>}

    <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit card" actions={<>
      <Button variant="secondary" type="button" onClick={() => setEditing(null)}>Cancel</Button>
      <Button type="submit" form="edit-card-form">Save</Button>
    </>}>
      {editing && <form id="edit-card-form" className="form-stack" onSubmit={saveEdit}>
        <TextField label="Front" required maxLength="500" value={editing.front} onChange={(event) => setEditing({ ...editing, front: event.target.value })} />
        <TextField label="Back" required maxLength="500" value={editing.back} onChange={(event) => setEditing({ ...editing, back: event.target.value })} />
      </form>}
    </Dialog>
    <ConfirmDialog open={Boolean(removing)} title="Delete this card?" description="It leaves your review too." confirmLabel="Delete" onConfirm={remove} onCancel={() => setRemoving(null)} />

    <Dialog open={pasteOpen} onClose={closePaste} title="Paste a list" actions={rows ? <>
      <Button variant="secondary" type="button" onClick={() => setRows(null)}>Back</Button>
      <Button type="button" loading={saving} disabled={ready === 0} onClick={saveRows}>Add {ready} {ready === 1 ? "card" : "cards"}</Button>
    </> : <>
      <Button variant="secondary" type="button" onClick={closePaste}>Cancel</Button>
      <Button type="button" disabled={!pasted.trim()} onClick={split}>Split into cards</Button>
    </>}>
      {!rows && <>
        <TextArea label="One card per line" hint={"Write each line as term - definition. A dash, a colon or a tab between them all work."} rows="8" value={pasted} onChange={(event) => setPasted(event.target.value)} />
      </>}
      {rows && <div className="paste-preview">
        <p className="muted">Check the cards, fix any, remove the ones you do not want.{skipped > 0 ? ` ${skipped} ${skipped === 1 ? "line was" : "lines were"} skipped because no separator was found.` : ""}</p>
        {rows.length === 0 && <p>No cards found. Go back and check the separators.</p>}
        <ul className="paste-rows">{rows.map((row, index) => <li key={index}>
          <TextField label={`Front ${index + 1}`} maxLength="500" value={row.front} onChange={(event) => setRows(rows.map((r, i) => (i === index ? { ...r, front: event.target.value } : r)))} />
          <TextField label={`Back ${index + 1}`} maxLength="500" value={row.back} onChange={(event) => setRows(rows.map((r, i) => (i === index ? { ...r, back: event.target.value } : r)))} />
          <Button variant="secondary" type="button" onClick={() => setRows(rows.filter((_, i) => i !== index))} aria-label={`Remove card ${index + 1}`}>Remove</Button>
        </li>)}</ul>
      </div>}
    </Dialog>
  </div>;
}
