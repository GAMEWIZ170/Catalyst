import { useState } from "react";
import { Button, SelectField } from "../ui";
import QuizOption from "./QuizOption";
import RichText from "../shared/RichText";
import ResponsiveImage from "../shared/ResponsiveImage";

// Chemical formula text from the admin, shown with mhchem. A "$" is dropped so it cannot break out of the formula.
const INPUT = "min-h-11 w-full rounded-md border border-input bg-card px-3 font-sans text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60";
const LEGEND = "mb-3 p-0 text-sm font-semibold text-muted-foreground";
const FIELD = "grid gap-1.5 font-semibold";
const ce = (formula) => `$\\ce{${String(formula).replace(/\$/g, "")}}$`;

// The answer area for every type except mcq and true_false (Test.jsx draws those).
// onAnswer gets the string to send to the server, or null while the answer is not complete.
// The parent gives it a new `key` for each question, so its state starts fresh.
export function QuestionInput({ question, onAnswer, disabled, onEnter }) {
  const enter = (event) => { if (event.key === "Enter" && onEnter) { event.preventDefault(); onEnter(); } };
  switch (question.type) {
    case "numeric": return <NumericInput question={question} onAnswer={onAnswer} disabled={disabled} enter={enter} />;
    case "multi_select": return <MultiSelectInput question={question} onAnswer={onAnswer} disabled={disabled} />;
    case "fill_blank": return <FillBlankInput onAnswer={onAnswer} disabled={disabled} enter={enter} />;
    case "short_answer": return <ShortAnswerInput onAnswer={onAnswer} disabled={disabled} />;
    case "matching": return <MatchingInput question={question} onAnswer={onAnswer} disabled={disabled} />;
    case "ordering": return <OrderingInput question={question} onAnswer={onAnswer} disabled={disabled} />;
    case "balancing": return <BalancingInput question={question} onAnswer={onAnswer} disabled={disabled} enter={enter} />;
    default: return null;
  }
}

function NumericInput({ question, onAnswer, disabled, enter }) {
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const send = (nextValue, nextUnit) => onAnswer(nextValue.trim() === "" ? null : JSON.stringify({ value: nextValue, unit: nextUnit }));
  return <div className="flex flex-wrap gap-3">
    <label className={`${FIELD} min-w-40 flex-1`}>Your answer
      <input className={INPUT} inputMode="decimal" autoComplete="off" value={value} disabled={disabled} onKeyDown={enter} onChange={(event) => { setValue(event.target.value); send(event.target.value, unit); }} />
    </label>
    {question.askUnit && <label className={`${FIELD} min-w-28 flex-1`}>Unit
      <input className={INPUT} autoComplete="off" value={unit} disabled={disabled} onKeyDown={enter} onChange={(event) => { setUnit(event.target.value); send(value, event.target.value); }} />
    </label>}
  </div>;
}

function MultiSelectInput({ question, onAnswer, disabled }) {
  const [picked, setPicked] = useState([]);
  function toggle(id) {
    const next = picked.includes(id) ? picked.filter((item) => item !== id) : [...picked, id];
    setPicked(next);
    onAnswer(next.length ? JSON.stringify(next) : null);
  }
  return <fieldset className="m-0 grid gap-2.5 border-0 p-0"><legend className={LEGEND}>Choose every correct answer.</legend>
    {question.options.map((option) => <QuizOption key={option._id} state={picked.includes(option._id) ? "selected" : ""} pressed={picked.includes(option._id)} disabled={disabled} onClick={() => toggle(option._id)}>
      <RichText>{option.text}</RichText>{option.image?.url && <ResponsiveImage image={option.image} sizes="(max-width: 600px) 80vw, 300px" />}
    </QuizOption>)}
  </fieldset>;
}

// A written answer of 1 to 3 sentences. Sent as JSON { text }; the server's AI marks it against the key points.
function ShortAnswerInput({ onAnswer, disabled }) {
  const [value, setValue] = useState("");
  return <label className={FIELD}>Your answer
    <textarea className={`${INPUT} min-h-28 resize-y py-2`} rows={4} maxLength={900} value={value} disabled={disabled}
      onChange={(event) => { setValue(event.target.value); onAnswer(event.target.value.trim() ? JSON.stringify({ text: event.target.value.trim() }) : null); }} />
    <span className="text-xs font-normal text-muted-foreground">Answer in 1 to 3 sentences. It is marked on the key ideas, not the exact words.</span>
  </label>;
}

function FillBlankInput({ onAnswer, disabled, enter }) {
  const [value, setValue] = useState("");
  return <label className={FIELD}>Your answer
    <input className={INPUT} autoComplete="off" value={value} disabled={disabled} onKeyDown={enter} onChange={(event) => { setValue(event.target.value); onAnswer(event.target.value.trim() ? event.target.value : null); }} />
  </label>;
}

function MatchingInput({ question, onAnswer, disabled }) {
  const [picks, setPicks] = useState(() => question.left.map(() => ""));
  function pick(index, value) {
    const next = picks.map((item, i) => i === index ? value : item);
    setPicks(next);
    onAnswer(next.every((item) => item !== "") ? JSON.stringify(next.map(Number)) : null);
  }
  return <fieldset className="m-0 grid gap-3 border-0 p-0"><legend className={LEGEND}>Match each item on the left with one on the right.</legend>
    {question.left.map((left, index) => <div className="grid items-center gap-2 sm:grid-cols-2" key={index}>
      <span className="font-semibold"><RichText>{left}</RichText></span>
      <SelectField label={`Match for ${left}`} isLabelHidden value={picks[index]} disabled={disabled} onChange={(event) => pick(index, event.target.value)}>
        <option value="">Choose…</option>
        {question.right.map((right, rightIndex) => <option value={rightIndex} key={rightIndex}>{right}</option>)}
      </SelectField>
    </div>)}
  </fieldset>;
}

function OrderingInput({ question, onAnswer, disabled }) {
  const [sequence, setSequence] = useState([]);
  function update(next) {
    setSequence(next);
    onAnswer(next.length === question.items.length ? JSON.stringify(next) : null);
  }
  // Tapping an item adds it to the end. Tapping a chosen item takes it and the ones after it back out.
  function tap(index) {
    const at = sequence.indexOf(index);
    update(at === -1 ? [...sequence, index] : sequence.slice(0, at));
  }
  return <fieldset className="m-0 grid gap-2.5 border-0 p-0"><legend className={LEGEND}>Tap the items in the right order. Tap a chosen item to undo from there.</legend>
    {question.items.map((item, index) => {
      const at = sequence.indexOf(index);
      return <QuizOption key={index} keyLabel={at !== -1 ? at + 1 : ""} state={at !== -1 ? "selected" : ""} pressed={at !== -1} disabled={disabled} onClick={() => tap(index)}>
        <RichText>{item}</RichText>{at !== -1 && <span className="sr-only"> (position {at + 1})</span>}
      </QuizOption>;
    })}
    <div><Button variant="tertiary" disabled={disabled || !sequence.length} onClick={() => update([])}>Start over</Button></div>
  </fieldset>;
}

function BalancingInput({ question, onAnswer, disabled, enter }) {
  const [values, setValues] = useState(() => question.species.map(() => ""));
  function change(index, value) {
    const next = values.map((item, i) => i === index ? value : item);
    setValues(next);
    const numbers = next.map((item) => (/^\d{1,2}$/.test(item.trim()) ? Number(item) : NaN));
    onAnswer(numbers.every((item) => Number.isInteger(item) && item >= 1) ? JSON.stringify(numbers) : null);
  }
  const part = (item, index) => <span className="inline-flex items-center gap-1.5" key={index}>
    <input className={`${INPUT} w-14 text-center`} inputMode="numeric" maxLength="2" aria-label={`Coefficient for ${item.formula}`} value={values[index]} disabled={disabled} onKeyDown={enter} onChange={(event) => change(index, event.target.value)} />
    <RichText>{ce(item.formula)}</RichText>
  </span>;
  const reactants = question.species.map((item, index) => ({ item, index })).filter(({ item }) => item.side === "reactant");
  const products = question.species.map((item, index) => ({ item, index })).filter(({ item }) => item.side === "product");
  const join = (list) => list.map(({ item, index }, position) => <span key={index}>{position > 0 && <span className="mx-1.5 text-muted-foreground" aria-hidden="true">+</span>}{part(item, index)}</span>);
  return <fieldset className="m-0 grid gap-3 border-0 p-0"><legend className={LEGEND}>Balance the equation. Use the smallest whole numbers.</legend>
    <div className="flex flex-wrap items-center gap-y-3 text-lg">{join(reactants)}<span className="mx-3 text-muted-foreground" aria-label="yields">→</span>{join(products)}</div>
  </fieldset>;
}

// Multiple choice and true or false without any feedback, for timed exams. `initial` is only used to show a restored answer.
export function ChoiceInput({ question, onAnswer, initial = null }) {
  const [chosen, setChosen] = useState(initial);
  const options = question.type === "mcq"
    ? question.options.map((option) => ({ value: option._id, content: <><RichText>{option.text}</RichText>{option.image?.url && <ResponsiveImage image={option.image} sizes="(max-width: 600px) 80vw, 300px" />}</> }))
    : [{ value: "true", content: "True" }, { value: "false", content: "False" }];
  function pick(value) { setChosen(value); onAnswer(value); }
  return <fieldset className="m-0 grid gap-2.5 border-0 p-0"><legend className={LEGEND}>Choose an answer.</legend>
    {options.map((option, position) => <QuizOption key={option.value} keyLabel={position + 1} state={chosen === option.value ? "selected" : ""} pressed={chosen === option.value} onClick={() => pick(option.value)}>{option.content}</QuizOption>)}
  </fieldset>;
}

// The right answer for any question type.
export function Correct({ question, correct }) {
  return question.type === "balancing"
    ? <CorrectEquation question={question} coefficients={correct} />
    : <CorrectAnswer type={question.type} correct={correct} />;
}

// The right answer, shown after a wrong answer. `correct` is correctAnswer from the answer response.
export function CorrectAnswer({ type, correct }) {
  switch (type) {
    case "mcq": return <RichText>{correct.text}</RichText>;
    case "true_false": return correct === "true" ? "True" : "False";
    case "multi_select": return <ul className="m-0 grid list-none gap-1 p-0">{correct.map((option) => <li key={option._id}><RichText>{option.text}</RichText></li>)}</ul>;
    case "numeric": return <span>{correct.value}{correct.unit ? ` ${correct.unit}` : ""}{correct.tolerance ? ` (± ${correct.tolerance}${correct.toleranceKind === "percent" ? "%" : ""})` : ""}</span>;
    case "fill_blank": return <span>{correct.join(" or ")}</span>;
    case "short_answer": return <span className="grid gap-1"><RichText>{correct.modelAnswer}</RichText>
      <span className="text-sm text-muted-foreground">Key points: {correct.keyPoints.join(" · ")}</span></span>;
    case "matching": return <ul className="m-0 grid list-none gap-1 p-0">{correct.map((pair, index) => <li key={index}><RichText>{`${pair.left} → ${pair.right}`}</RichText></li>)}</ul>;
    case "ordering": return <ol className="m-0 grid gap-1 pl-5">{correct.map((item, index) => <li key={index}><RichText>{item}</RichText></li>)}</ol>;
    default: return null;
  }
}

// What the student answered, as plain text (for the review list and for telling the AI tutor). Empty when there is no
// simple way to say it (matching, ordering and balancing are shown as right or wrong only).
export function answerText(question, answer) {
  if (answer == null) return "";
  const json = () => { try { return JSON.parse(answer); } catch { return null; } };
  switch (question.type) {
    case "mcq": return question.options.find((option) => option._id === answer)?.text || "";
    case "true_false": return answer === "true" ? "True" : "False";
    case "fill_blank": return String(answer);
    case "short_answer": return json()?.text || String(answer);
    case "numeric": { const value = json(); return value ? `${value.value}${value.unit ? ` ${value.unit}` : ""}` : ""; }
    case "multi_select": { const ids = json() || []; return question.options.filter((option) => ids.includes(option._id)).map((option) => option.text).join("; "); }
    default: return "";
  }
}

// A balancing answer needs the species to read, so it takes the question as well.
export function CorrectEquation({ question, coefficients }) {
  const species = question.species;
  const text = (side) => species.map((item, index) => ({ item, index })).filter(({ item }) => item.side === side)
    .map(({ item, index }) => `${coefficients[index] === 1 ? "" : coefficients[index]}${String(item.formula).replace(/\$/g, "")}`).join(" + ");
  return <RichText>{`$\\ce{${text("reactant")} -> ${text("product")}}$`}</RichText>;
}
