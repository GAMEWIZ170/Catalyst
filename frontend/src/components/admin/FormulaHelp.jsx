import { useState } from "react";
import RichText from "../RichText";

const examples = [
  "$\\ce{H2SO4}$",
  "$\\ce{2H2 + O2 -> 2H2O}$",
  "$\\ce{Fe^3+}$",
  "$\\ce{SO4^2-}$",
  "$\\ce{CO2 + H2O <=> H2CO3}$",
  "$x^2$",
  "$\\frac{a}{b}$"
];

export default function FormulaHelp() {
  const [open, setOpen] = useState(false);
  return <div className="formula-help">
    <button className="text-button" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>Formula help</button>
    {open && <div className="formula-help-panel">
      <p>Copy an example into your text.</p>
      <ul>{examples.map((example) => <li key={example}><code>{example}</code><RichText>{example}</RichText></li>)}</ul>
      <p><code>\$</code> writes a dollar sign.</p>
    </div>}
  </div>;
}
