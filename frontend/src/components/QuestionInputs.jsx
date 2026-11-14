import { useState } from "react";
import RichText from "./RichText";
import ResponsiveImage from "./ResponsiveImage";

// Chemical formula text from the admin, shown with mhchem. A "$" is dropped so it cannot break out of the formula.
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
  return <div className="qi-row">
    <label className="qi-field">Your answer
      <input className="ui-input" inputMode="decimal" autoComplete="off" value={value} disabled={disabled} onKeyDown={enter} onChange={(event) => { setValue(event.target.value); send(event.target.value, unit); }} />
    </label>
    {question.askUnit && <label className="qi-field">Unit
      <input className="ui-input" autoComplete="off" value={unit} disabled={disabled} onKeyDown={enter} onChange={(event) => { setUnit(event.target.value); send(value, event.target.value); }} />
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
  return <fieldset className="exam-options"><legend>Choose every correct answer.</legend>
    {question.options.map((option) => <button className={`exam-option ${picked.includes(option._id) ? "exam-option--selected" : ""}`} type="button" aria-pressed={picked.includes(option._id)} disabled={disabled} key={option._id} onClick={() => toggle(option._id)}>
      <span className="exam-option-text"><RichText>{option.text}</RichText>{option.image?.url && <ResponsiveImage image={option.image} sizes="(max-width: 600px) 80vw, 300px" />}</span>
    </button>)}
  </fieldset>;
}

function FillBlankInput({ onAnswer, disabled, enter }) {
  const [value, setValue] = useState("");
  return <label className="qi-field">Your answer
    <input className="ui-input" autoComplete="off" value={value} disabled={disabled} onKeyDown={enter} onChange={(event) => { setValue(event.target.value); onAnswer(event.target.value.trim() ? event.target.value : null); }} />
  </label>;
}

function MatchingInput({ question, onAnswer, disabled }) {
  const [picks, setPicks] = useState(() => question.left.map(() => ""));
  function pick(index, value) {
    const next = picks.map((item, i) => i === index ? value : item);
    setPicks(next);
    onAnswer(next.every((item) => item !== "") ? JSON.stringify(next.map(Number)) : null);
  }
  return <fieldset className="qi-matching"><legend>Match each item on the left with one on the right.</legend>
    {question.left.map((left, index) => <div className="qi-match-row" key={index}>
      <span className="qi-match-left"><RichText>{left}</RichText></span>
      <select className="ui-input" aria-label={`Match for ${left}`} value={picks[index]} disabled={disabled} onChange={(event) => pick(index, event.target.value)}>
        <option value="">Choose…</option>
        {question.right.map((right, rightIndex) => <option value={rightIndex} key={rightIndex}>{right}</option>)}
      </select>
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
  return <fieldset className="exam-options"><legend>Tap the items in the right order. Tap a chosen item to undo from there.</legend>
    {question.items.map((item, index) => {
      const at = sequence.indexOf(index);
      return <button className={`exam-option ${at !== -1 ? "exam-option--selected" : ""}`} type="button" aria-pressed={at !== -1} disabled={disabled} key={index} onClick={() => tap(index)}>
        <span className="exam-key" aria-hidden="true">{at !== -1 ? at + 1 : ""}</span>
        <span className="exam-option-text"><RichText>{item}</RichText>{at !== -1 && <span className="sr-only"> (position {at + 1})</span>}</span>
      </button>;
    })}
    <button className="button button-tertiary" type="button" disabled={disabled || !sequence.length} onClick={() => update([])}>Start over</button>
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
  const part = (item, index) => <span className="qi-species" key={index}>
    <input className="ui-input qi-coefficient" inputMode="numeric" maxLength="2" aria-label={`Coefficient for ${item.formula}`} value={values[index]} disabled={disabled} onKeyDown={enter} onChange={(event) => change(index, event.target.value)} />
    <RichText>{ce(item.formula)}</RichText>
  </span>;
  const reactants = question.species.map((item, index) => ({ item, index })).filter(({ item }) => item.side === "reactant");
  const products = question.species.map((item, index) => ({ item, index })).filter(({ item }) => item.side === "product");
  const join = (list) => list.map(({ item, index }, position) => <span key={index}>{position > 0 && <span className="qi-plus" aria-hidden="true">+</span>}{part(item, index)}</span>);
  return <fieldset className="qi-equation"><legend>Balance the equation. Use the smallest whole numbers.</legend>
    <div className="qi-equation-row">{join(reactants)}<span className="qi-arrow" aria-label="yields">→</span>{join(products)}</div>
  </fieldset>;
}

// The right answer, shown after a wrong answer. `correct` is correctAnswer from the answer response.
export function CorrectAnswer({ type, correct }) {
  switch (type) {
    case "mcq": return <RichText>{correct.text}</RichText>;
    case "true_false": return correct === "true" ? "True" : "False";
    case "multi_select": return <ul className="qi-list">{correct.map((option) => <li key={option._id}><RichText>{option.text}</RichText></li>)}</ul>;
    case "numeric": return <span>{correct.value}{correct.unit ? ` ${correct.unit}` : ""}{correct.tolerance ? ` (± ${correct.tolerance}${correct.toleranceKind === "percent" ? "%" : ""})` : ""}</span>;
    case "fill_blank": return <span>{correct.join(" or ")}</span>;
    case "matching": return <ul className="qi-list">{correct.map((pair, index) => <li key={index}><RichText>{`${pair.left} → ${pair.right}`}</RichText></li>)}</ul>;
    case "ordering": return <ol className="qi-list">{correct.map((item, index) => <li key={index}><RichText>{item}</RichText></li>)}</ol>;
    default: return null;
  }
}

// A balancing answer needs the species to read, so it takes the question as well.
export function CorrectEquation({ question, coefficients }) {
  const species = question.species;
  const text = (side) => species.map((item, index) => ({ item, index })).filter(({ item }) => item.side === side)
    .map(({ item, index }) => `${coefficients[index] === 1 ? "" : coefficients[index]}${String(item.formula).replace(/\$/g, "")}`).join(" + ");
  return <RichText>{`$\\ce{${text("reactant")} -> ${text("product")}}$`}</RichText>;
}
