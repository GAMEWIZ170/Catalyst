import RichText from "./RichText";

// Numbered steps, one panel each. Used after a student answers and in the admin preview.
export default function WorkedSolution({ steps }) {
  const shown = (steps || []).filter((step) => step && step.trim());
  if (!shown.length) return null;
  return <section className="worked-solution" aria-label="Worked solution">
    <h3>Worked solution</h3>
    <ol>
      {shown.map((step, index) => <li key={index}><RichText>{step}</RichText></li>)}
    </ol>
  </section>;
}
