import { Button, Checkbox, SelectField, TextArea, TextField } from "../ui";
import RichText from "../RichText";

export const TYPE_LABELS = {
  mcq: "Multiple choice",
  true_false: "True or false",
  multi_select: "Multi-select",
  numeric: "Numeric with units",
  fill_blank: "Fill in the blank",
  matching: "Matching",
  ordering: "Ordering",
  balancing: "Equation balancing"
};

const blankOption = () => ({ text: "", image: null });

// Fields to set when the admin picks a type for a new question.
export function typeDefaults(type) {
  switch (type) {
    case "mcq": return { options: [blankOption(), blankOption()], correctIndex: 0 };
    case "multi_select": return { options: [blankOption(), blankOption(), blankOption()], correctIndexes: [] };
    case "numeric": return { options: [], numeric: { value: "", tolerance: "0", toleranceKind: "absolute", unit: "" } };
    case "fill_blank": return { options: [], acceptedAnswers: [""] };
    case "matching": return { options: [], pairs: [{ left: "", right: "" }, { left: "", right: "" }] };
    case "ordering": return { options: [], items: ["", ""] };
    case "balancing": return { options: [], equation: { species: [{ formula: "", side: "reactant", coefficient: "1" }, { formula: "", side: "product", coefficient: "1" }] } };
    default: return { options: [] };
  }
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const filled = (list) => (list || []).map((item) => String(item).trim()).filter(Boolean);

// A message when the type-specific part of the form is not ready to save, otherwise "".
export function typeProblem(question) {
  switch (question.type) {
    case "multi_select":
      if (question.options.length < 2) return "A multi-select question needs at least 2 options.";
      if (question.options.some((option) => !option.text?.trim() && !option.image?.url)) return "Each option needs text or an image.";
      if (!(question.correctIndexes || []).length) return "Tick at least one correct option.";
      return "";
    case "numeric":
      return Number.isFinite(Number(question.numeric?.value)) && String(question.numeric?.value).trim() !== "" ? "" : "Enter the correct value as a number.";
    case "fill_blank":
      return filled(question.acceptedAnswers).length ? "" : "Add at least one accepted answer.";
    case "matching":
      return question.pairs.length >= 2 && question.pairs.every((pair) => pair.left.trim() && pair.right.trim()) ? "" : "Add at least 2 pairs and fill in both sides of each.";
    case "ordering":
      return filled(question.items).length === question.items.length && question.items.length >= 2 ? "" : "Add at least 2 items and fill in each one.";
    case "balancing": {
      const species = question.equation.species;
      const numbers = species.map((item) => Number(item.coefficient));
      if (species.length < 2 || species.some((item) => !item.formula.trim())) return "Add at least 2 species and fill in each formula.";
      if (!species.some((item) => item.side === "reactant") || !species.some((item) => item.side === "product")) return "An equation needs a reactant and a product.";
      if (!numbers.every((value) => Number.isInteger(value) && value >= 1 && value <= 99)) return "Each coefficient must be a whole number from 1 to 99.";
      if (numbers.reduce(gcd) !== 1) return "Use the lowest whole-number coefficients (they must not share a common factor).";
      return "";
    }
    default:
      return "";
  }
}

// The type-specific part of the request body.
export function typeBody(question) {
  switch (question.type) {
    case "multi_select":
      return { options: question.options.map(({ text, image }) => ({ text, image })), correctIndexes: question.correctIndexes };
    case "numeric":
      return { numeric: { value: Number(question.numeric.value), tolerance: Number(question.numeric.tolerance) || 0, toleranceKind: question.numeric.toleranceKind, unit: question.numeric.unit.trim() } };
    case "fill_blank":
      return { acceptedAnswers: filled(question.acceptedAnswers) };
    case "matching":
      return { pairs: question.pairs.map((pair) => ({ left: pair.left.trim(), right: pair.right.trim() })) };
    case "ordering":
      return { items: filled(question.items) };
    case "balancing":
      return { equation: { species: question.equation.species.map((item) => ({ formula: item.formula.trim(), side: item.side, coefficient: Number(item.coefficient) })) } };
    default:
      return {};
  }
}

const move = (list, from, patch) => list.map((item, index) => (index === from ? patch(item) : item));

// Editor for every type except mcq and true_false (the editor page keeps those).
export default function QuestionTypeFields({ question, setQuestion }) {
  const set = (patch) => setQuestion({ ...question, ...patch });

  if (question.type === "multi_select") {
    const picked = question.correctIndexes || [];
    return <div className="option-editor"><h3>Options</h3>
      <p className="muted">Tick every correct option. A student must pick exactly those to get it right.</p>
      {question.options.map((option, index) => <div className="option-row" key={index}>
        <TextField label={`Option ${index + 1}`} maxLength="300" value={option.text || ""} onChange={(event) => set({ options: move(question.options, index, (item) => ({ ...item, text: event.target.value })) })} />
        <Checkbox label="Correct" checked={picked.includes(index)} onChange={() => set({ correctIndexes: picked.includes(index) ? picked.filter((item) => item !== index) : [...picked, index] })} />
        <Button variant="tertiary" type="button" disabled={question.options.length <= 2} onClick={() => set({ options: question.options.filter((_, i) => i !== index), correctIndexes: picked.filter((item) => item !== index).map((item) => (item > index ? item - 1 : item)) })}>Remove</Button>
      </div>)}
      <Button variant="secondary" type="button" disabled={question.options.length >= 6} onClick={() => set({ options: [...question.options, blankOption()] })}>Add option</Button>
    </div>;
  }

  if (question.type === "numeric") {
    const numeric = question.numeric;
    const change = (patch) => set({ numeric: { ...numeric, ...patch } });
    return <div className="option-editor"><h3>Numeric answer</h3>
      <TextField label="Correct value" inputMode="decimal" value={numeric.value} onChange={(event) => change({ value: event.target.value })} hint="A number such as 2.5 or 1.2e-3." />
      <TextField label="Tolerance" inputMode="decimal" value={numeric.tolerance} onChange={(event) => change({ tolerance: event.target.value })} hint="How far from the correct value still counts. 0 means exact." />
      <SelectField label="Tolerance is" value={numeric.toleranceKind} onChange={(event) => change({ toleranceKind: event.target.value })}>
        <option value="absolute">An amount (same units as the value)</option>
        <option value="percent">A percent of the value</option>
      </SelectField>
      <TextField label="Unit (optional)" maxLength="30" value={numeric.unit} onChange={(event) => change({ unit: event.target.value })} hint="If set, students must type this unit too. Case and extra spaces are ignored. A right number with a wrong unit gets its own message." />
    </div>;
  }

  if (question.type === "fill_blank") {
    return <div className="option-editor"><h3>Accepted answers</h3>
      <TextArea label="Accepted answers" rows="4" value={(question.acceptedAnswers || []).join("\n")} onChange={(event) => set({ acceptedAnswers: event.target.value.split("\n") })} hint="One per line. Case and extra spaces are ignored." />
    </div>;
  }

  if (question.type === "matching") {
    return <div className="option-editor"><h3>Pairs</h3>
      <p className="muted">Students see the left items and a shuffled list of the right items.</p>
      {question.pairs.map((pair, index) => <div className="option-row" key={index}>
        <TextField label={`Left ${index + 1}`} maxLength="200" value={pair.left} onChange={(event) => set({ pairs: move(question.pairs, index, (item) => ({ ...item, left: event.target.value })) })} />
        <TextField label={`Right ${index + 1}`} maxLength="200" value={pair.right} onChange={(event) => set({ pairs: move(question.pairs, index, (item) => ({ ...item, right: event.target.value })) })} />
        <Button variant="tertiary" type="button" disabled={question.pairs.length <= 2} onClick={() => set({ pairs: question.pairs.filter((_, i) => i !== index) })}>Remove</Button>
      </div>)}
      <Button variant="secondary" type="button" disabled={question.pairs.length >= 8} onClick={() => set({ pairs: [...question.pairs, { left: "", right: "" }] })}>Add pair</Button>
    </div>;
  }

  if (question.type === "ordering") {
    return <div className="option-editor"><h3>Items in the correct order</h3>
      <p className="muted">Enter them first to last. Students see them shuffled.</p>
      {question.items.map((item, index) => <div className="option-row" key={index}>
        <TextField label={`Item ${index + 1}`} maxLength="200" value={item} onChange={(event) => set({ items: question.items.map((value, i) => (i === index ? event.target.value : value)) })} />
        <Button variant="tertiary" type="button" disabled={question.items.length <= 2} onClick={() => set({ items: question.items.filter((_, i) => i !== index) })}>Remove</Button>
      </div>)}
      <Button variant="secondary" type="button" disabled={question.items.length >= 8} onClick={() => set({ items: [...question.items, ""] })}>Add item</Button>
    </div>;
  }

  if (question.type === "balancing") {
    const species = question.equation.species;
    const change = (index, patch) => set({ equation: { species: move(species, index, (item) => ({ ...item, ...patch })) } });
    const side = (name) => species.filter((item) => item.side === name).map((item) => `${Number(item.coefficient) === 1 ? "" : item.coefficient}${item.formula.replace(/\$/g, "")}`).join(" + ");
    return <div className="option-editor"><h3>Equation</h3>
      <p className="muted">Write each formula the way you would inside \ce{"{}"}, for example H2O or Fe2O3. Give the lowest whole-number coefficients. Students fill in the numbers.</p>
      {species.map((item, index) => <div className="option-row" key={index}>
        <TextField label={`Formula ${index + 1}`} maxLength="40" value={item.formula} onChange={(event) => change(index, { formula: event.target.value })} />
        <SelectField label="Side" value={item.side} onChange={(event) => change(index, { side: event.target.value })}>
          <option value="reactant">Reactant</option>
          <option value="product">Product</option>
        </SelectField>
        <TextField label="Coefficient" inputMode="numeric" maxLength="2" value={item.coefficient} onChange={(event) => change(index, { coefficient: event.target.value })} />
        <Button variant="tertiary" type="button" disabled={species.length <= 2} onClick={() => set({ equation: { species: species.filter((_, i) => i !== index) } })}>Remove</Button>
      </div>)}
      <Button variant="secondary" type="button" disabled={species.length >= 8} onClick={() => set({ equation: { species: [...species, { formula: "", side: "reactant", coefficient: "1" }] } })}>Add species</Button>
      <div className="preview-box"><RichText>{`$\\ce{${side("reactant")} -> ${side("product")}}$`}</RichText></div>
    </div>;
  }

  return null;
}
