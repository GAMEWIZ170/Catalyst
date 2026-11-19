import RichText from "../shared/RichText";

// A tutor reply: short paragraphs, "- " bullet lists and **bold**. Formulas in $...$ go through RichText. No raw HTML is ever injected.
const inline = (text) => text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => (part.length > 4 && part.startsWith("**") && part.endsWith("**")
  ? <strong key={index}><RichText>{part.slice(2, -2)}</RichText></strong>
  : <RichText key={index}>{part}</RichText>));

export default function ChatText({ text }) {
  const blocks = [];
  for (const line of text.split("\n")) {
    const bullet = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last?.type === "list") last.items.push(bullet[1]);
      else blocks.push({ type: "list", items: [bullet[1]] });
    } else if (line.trim()) {
      blocks.push({ type: "p", text: line.trim() });
    }
  }
  return <div className="grid gap-2">
    {blocks.map((block, index) => block.type === "list"
      ? <ul key={index} className="m-0 grid list-disc gap-1 pl-5">{block.items.map((item, at) => <li key={at}>{inline(item)}</li>)}</ul>
      : <p key={index} className="m-0">{inline(block.text)}</p>)}
  </div>;
}
