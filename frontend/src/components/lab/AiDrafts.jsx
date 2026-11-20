import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "../../api/client";
import { Button, SelectField, TextArea, TextField, useToast } from "../ui";
import { appendToDoc, draftToNodes, notesToDraft } from "../../utils/draftToDoc";

const KINDS = [
  { value: "cards", label: "Flashcards" },
  { value: "questions", label: "Quiz questions" },
  { value: "notes", label: "Notes" }
];
const NEW_QUIZ = "new";

// "AI drafts" tab of a study set. The AI makes DRAFTS from the student's own material, notes or pasted text. Nothing is
// saved until the student has read and edited the drafts and chosen to save them. The free model can make mistakes.
export default function AiDrafts({ setId, kind: fixedKind = null, onSaved = null }) {
  const { toast } = useToast();
  const [kind, setKind] = useState(fixedKind || "cards");
  const [source, setSource] = useState("notes");   // "notes", "paste" or a material id
  const [pasted, setPasted] = useState("");
  const [part, setPart] = useState(0);
  const [materials, setMaterials] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [quizId, setQuizId] = useState(NEW_QUIZ);
  const [result, setResult] = useState(null);       // { kind, rows, parts, cached }
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    api.getSetMaterials(setId).then(({ data }) => setMaterials(data.items || [])).catch(() => {});
    api.getSetQuizzes(setId).then(({ data }) => setQuizzes(data || [])).catch(() => {});
  }, [setId]);

  const sourceBody = () => (source === "notes" ? { type: "notes" } : source === "paste" ? { type: "text", text: pasted } : { type: "material", id: source });

  async function generate(nextPart = part) {
    setBusy(true);
    setProblem("");
    try {
      const { data } = await api.generateDrafts(setId, { kind, source: sourceBody(), part: nextPart });
      setPart(nextPart);
      setResult({ kind: data.kind, parts: data.parts, cached: data.cached, rows: data.kind === "notes" ? notesToDraft(data.drafts) : data.drafts.map((item, index) => ({ ...item, key: `${Date.now()}-${index}` })) });
    } catch (error) {
      setResult(null);
      setProblem(error.message);
    } finally {
      setBusy(false);
    }
  }

  const changeRow = (index, patch) => setResult((current) => ({ ...current, rows: current.rows.map((row, at) => (at === index ? { ...row, ...patch } : row)) }));
  const removeRow = (index) => setResult((current) => ({ ...current, rows: current.rows.filter((_, at) => at !== index) }));

  async function save() {
    setBusy(true);
    setProblem("");
    try {
      if (result.kind === "cards") {
        const cards = result.rows.map((row) => ({ front: row.front.trim(), back: row.back.trim() })).filter((row) => row.front && row.back);
        if (!cards.length) throw new Error("There are no complete cards to save.");
        await api.addSetCards(setId, cards);
        toast({ tone: "success", message: `${cards.length} ${cards.length === 1 ? "card" : "cards"} saved to this set` });
      } else if (result.kind === "questions") {
        const ready = result.rows.filter((row) => row.text.trim() && row.options.every((option) => option.trim()));
        if (!ready.length) throw new Error("There are no complete questions to save.");
        let target = quizId;
        if (target === NEW_QUIZ) target = (await api.createSetQuiz(setId, `AI draft ${new Date().toLocaleDateString()}`)).data.id;
        // Questions go at the end of the quiz, so numbering starts after the ones it already has.
        const already = target === quizId && quizId !== NEW_QUIZ ? (quizzes.find((quiz) => quiz.id === quizId)?.questionCount || 0) : 0;
        for (const [at, row] of ready.entries()) {
          await api.createSetQuestion({ test: target, type: "mcq", order: already + at + 1, text: row.text.trim(), options: row.options.map((option) => ({ text: option.trim() })), correctIndex: row.correctIndex, explanation: row.explanation.trim() });
        }
        toast({ tone: "success", message: `${ready.length} ${ready.length === 1 ? "question" : "questions"} saved to the quiz` });
        api.getSetQuizzes(setId).then(({ data }) => setQuizzes(data || [])).catch(() => {});
      } else {
        const nodes = draftToNodes(result.rows);
        if (!nodes.length) throw new Error("There are no notes to save.");
        const { data } = await api.getSetNotes(setId);
        await api.saveSetNotes(setId, appendToDoc(data.content, nodes));
        toast({ tone: "success", message: "Added to the end of your notes" });
      }
      setResult(null);
      if (onSaved) onSaved();
    } catch (error) {
      setProblem(error.message);
    } finally {
      setBusy(false);
    }
  }

  const canGenerate = !busy && (source !== "paste" || pasted.trim().length >= 40);
  return <section className="mt-5 grid gap-4 [&_h2]:m-0 [&_h3]:m-0 [&_p]:m-0" aria-labelledby="ai-heading">
    {!fixedKind && <h2 id="ai-heading">Make drafts with AI</h2>}
    <p className="text-muted-foreground">The AI reads the text you choose and writes drafts for you to edit. It can make mistakes, so check each one before you save. Free beta, fair-use limits apply.</p>
    <div className="grid max-w-xl items-end gap-3">
      {!fixedKind && <SelectField label="Make" value={kind} onChange={(event) => { setKind(event.target.value); setResult(null); }}>
        {KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </SelectField>}
      <SelectField label="From" value={source} onChange={(event) => { setSource(event.target.value); setPart(0); setResult(null); }}>
        <option value="notes">My notes in this set</option>
        {materials.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        <option value="paste">Text I paste here</option>
      </SelectField>
      {source === "paste" && <TextArea label="Paste your text (at least 40 characters)" rows={6} value={pasted} onChange={(event) => { setPasted(event.target.value); setPart(0); }} />}
      <Button onClick={() => generate(source === "paste" || result ? part : 0)} disabled={!canGenerate} icon={Sparkles}>{busy && !result ? "Working…" : "Make drafts"}</Button>
    </div>
    <p className="mt-4 mb-0 min-h-6 font-semibold text-brand-ink" role="alert">{problem}</p>

    {result && <div className="grid gap-4">
      <h3>Drafts</h3>
      <p className="text-muted-foreground" aria-live="polite">{result.cached ? "These are saved drafts from earlier, so no AI was used. " : ""}Edit or remove anything, then save.{result.parts > 1 ? ` Your text has ${result.parts} parts. This is part ${part + 1}.` : ""}</p>
      {result.parts > 1 && <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={busy || part === 0} onClick={() => generate(part - 1)}>Previous part</Button>
        <Button variant="secondary" disabled={busy || part >= result.parts - 1} onClick={() => generate(part + 1)}>Next part</Button>
      </div>}

      {result.kind === "cards" && <ul className="m-0 grid list-none gap-4 p-0">
        {result.rows.map((row, index) => <li key={row.key} className="grid justify-items-start gap-3 rounded-xl border bg-card p-4 [&>*]:w-full [&>*]:max-w-full [&>button]:w-auto">
          <TextArea label={`Card ${index + 1} front`} rows={2} maxLength={500} value={row.front} onChange={(event) => changeRow(index, { front: event.target.value })} />
          <TextArea label={`Card ${index + 1} back`} rows={2} maxLength={500} value={row.back} onChange={(event) => changeRow(index, { back: event.target.value })} />
          <Button variant="secondary" onClick={() => removeRow(index)} aria-label={`Remove card ${index + 1}`}>Remove</Button>
        </li>)}
      </ul>}

      {result.kind === "questions" && <>
        <ul className="m-0 grid list-none gap-4 p-0">
          {result.rows.map((row, index) => <li key={row.key} className="grid justify-items-start gap-3 rounded-xl border bg-card p-4 [&>*]:w-full [&>*]:max-w-full [&>button]:w-auto">
            <TextArea label={`Question ${index + 1}`} rows={2} maxLength={1500} value={row.text} onChange={(event) => changeRow(index, { text: event.target.value })} />
            <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
              <legend>Options. Choose the right one.</legend>
              {row.options.map((option, at) => <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3 [&_input[type=radio]]:mb-3 [&_input[type=radio]]:size-5 [&_input[type=radio]]:accent-primary" key={at}>
                <input type="radio" name={`correct-${row.key}`} checked={row.correctIndex === at} onChange={() => changeRow(index, { correctIndex: at })} aria-label={`Option ${at + 1} is correct`} />
                <TextField label={`Option ${at + 1}`} maxLength={200} value={option} onChange={(event) => changeRow(index, { options: row.options.map((item, i) => (i === at ? event.target.value : item)) })} />
              </div>)}
            </fieldset>
            <TextArea label="Why (shown after answering)" rows={2} maxLength={1000} value={row.explanation} onChange={(event) => changeRow(index, { explanation: event.target.value })} />
            <Button variant="secondary" onClick={() => removeRow(index)} aria-label={`Remove question ${index + 1}`}>Remove</Button>
          </li>)}
        </ul>
        <SelectField label="Save into quiz" value={quizId} onChange={(event) => setQuizId(event.target.value)}>
          <option value={NEW_QUIZ}>A new quiz</option>
          {quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
        </SelectField>
      </>}

      {result.kind === "notes" && <TextArea label="Notes draft (## heading, - point)" rows={14} value={result.rows} onChange={(event) => setResult((current) => ({ ...current, rows: event.target.value }))} />}

      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : result.kind === "cards" ? "Save cards" : result.kind === "questions" ? "Save questions" : "Add to my notes"}</Button>
        <Button variant="secondary" onClick={() => setResult(null)} disabled={busy}>Discard drafts</Button>
      </div>
    </div>}
  </section>;
}
