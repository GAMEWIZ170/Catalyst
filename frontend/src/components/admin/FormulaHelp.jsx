import { useState } from "react";
import RichText from "../shared/RichText";

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
  return <div className="relative">
    <button className="min-h-11 cursor-pointer border-0 bg-transparent p-2 text-brand-ink" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>Formula help</button>
    {open && <div className="absolute top-full left-0 z-[4] w-max max-w-[min(360px,calc(100vw-2rem))] rounded-[6px] border border-border bg-card p-4 shadow-md">
      <p>Copy an example into your text.</p>
      <ul className="m-0 grid list-none gap-3 p-0">{examples.map((example) => <li className="flex flex-wrap items-center gap-2" key={example}><code>{example}</code><RichText>{example}</RichText></li>)}</ul>
      <p><code>\$</code> writes a dollar sign.</p>
    </div>}
  </div>;
}
