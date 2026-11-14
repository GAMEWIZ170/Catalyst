// Checks a Tiptap document before it is saved. Only a short list of node and mark types is allowed, with small values,
// so a note can never hold script, HTML or anything the notes screen does not know how to draw.
const NODES = new Set(["doc", "paragraph", "text", "heading", "bulletList", "orderedList", "listItem", "blockquote", "codeBlock", "hardBreak", "horizontalRule", "inlineMath", "blockMath"]);
const MARKS = new Set(["bold", "italic", "strike", "code"]);
const MAX_CHARS = 60000;
const MAX_DEPTH = 12;

const problemWith = (node, depth) => {
  if (!node || typeof node !== "object" || Array.isArray(node)) return "Each part of the note must be an object";
  if (depth > MAX_DEPTH) return "The note is nested too deeply";
  if (!NODES.has(node.type)) return `Notes cannot contain "${node.type}"`;
  if (node.type === "text" && typeof node.text !== "string") return "Text needs a text value";
  if (node.type === "heading" && ![1, 2, 3].includes(node.attrs?.level)) return "Headings are level 1 to 3";
  if ((node.type === "inlineMath" || node.type === "blockMath") && (typeof node.attrs?.latex !== "string" || node.attrs.latex.length > 500)) return "A formula must be text of up to 500 characters";
  if (node.marks !== undefined) {
    if (!Array.isArray(node.marks) || node.marks.some((mark) => !mark || !MARKS.has(mark.type))) return "That text style is not allowed";
  }
  if (node.content !== undefined) {
    if (!Array.isArray(node.content)) return "Content must be a list";
    for (const child of node.content) {
      const problem = problemWith(child, depth + 1);
      if (problem) return problem;
    }
  }
  return null;
};

// Returns a message, or null when the document is fine.
const noteDocProblem = (doc) => {
  if (!doc || doc.type !== "doc") return "A note must be a document";
  if (JSON.stringify(doc).length > MAX_CHARS) return "This note is too long";
  return problemWith(doc, 0);
};

module.exports = { noteDocProblem };
