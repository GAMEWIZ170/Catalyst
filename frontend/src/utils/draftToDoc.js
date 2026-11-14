// Turns the notes draft the student edited (plain text) into Tiptap nodes that can be added to the set's notes.
//   "## Heading"  becomes a level 2 heading
//   "- point"     lines become one bullet list
//   anything else becomes a paragraph
// Only node types the notes screen already knows are used, so the server accepts the result.
const textNode = (text) => ({ type: "text", text });
const paragraph = (text) => ({ type: "paragraph", content: [textNode(text)] });

export function draftToNodes(draft) {
  const nodes = [];
  let list = null;
  for (const raw of String(draft).split("\n")) {
    const line = raw.trim();
    if (!line) { list = null; continue; }
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet && bullet[1].trim()) {
      if (!list) { list = { type: "bulletList", content: [] }; nodes.push(list); }
      list.content.push({ type: "listItem", content: [paragraph(bullet[1].trim())] });
      continue;
    }
    list = null;
    const heading = /^#{1,3}\s+(.*)$/.exec(line);
    if (heading && heading[1].trim()) nodes.push({ type: "heading", attrs: { level: 2 }, content: [textNode(heading[1].trim())] });
    else nodes.push(paragraph(line));
  }
  return nodes;
}

// The draft sections from the server as editable text.
export const notesToDraft = (sections) => sections.map((section) => `## ${section.heading}\n${section.points.map((point) => `- ${point}`).join("\n")}`).join("\n\n");

// Adds the nodes to the end of an existing notes document (or starts one).
export const appendToDoc = (doc, nodes) => {
  const base = doc && doc.type === "doc" && Array.isArray(doc.content) ? doc.content : [];
  return { type: "doc", content: [...base, ...nodes] };
};
