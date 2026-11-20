import RichText from "../shared/RichText";

// Numbered steps, one panel each. Used after a student answers and in the admin preview.
export default function WorkedSolution({ steps }) {
  const shown = (steps || []).filter((step) => step && step.trim());
  if (!shown.length) return null;
  return <section className="grid gap-2" aria-label="Worked solution">
    <h3 className="mt-4 mb-2 text-base">Worked solution</h3>
    <ol className="m-0 grid list-none gap-2 p-0 [counter-reset:step]">
      {shown.map((step, index) => <li key={index} className="relative rounded-md border bg-muted py-3 pr-4 pl-8 [counter-increment:step] before:absolute before:left-3 before:font-semibold before:text-muted-foreground before:content-[counter(step)'.']"><RichText>{step}</RichText></li>)}
    </ol>
  </section>;
}
