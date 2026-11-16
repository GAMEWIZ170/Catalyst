import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Mathematics } from "@tiptap/extension-mathematics";
import "katex/dist/katex.min.css";
import "katex/contrib/mhchem"; // adds \ce{...} for chemical formulas to the KaTeX the editor uses
import { Bold, Code, Heading2, Italic, List, ListOrdered, Quote, Sigma, Strikethrough } from "lucide-react";
import { api } from "../../api/client";
import { Button, Dialog, TextField } from "../ui";
import { Loading } from "../../pages/learn/Courses";

const SAVE_DELAY = 1200;

function ToolButton({ label, active, onClick, children }) {
  return <button type="button" className={`note-tool${active ? " is-active" : ""}`} aria-label={label} title={label} aria-pressed={active} onClick={onClick}>{children}</button>;
}

// The notes of one set, written in a Tiptap editor with formulas (KaTeX with mhchem). Saves by itself a moment after typing stops.
export default function SetNotes({ setId }) {
  const [loaded, setLoaded] = useState(null); // { content } once fetched
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api.getSetNotes(setId).then(({ data }) => { if (live) setLoaded({ content: data.content }); }).catch((err) => { if (live) setError(err.message); });
    return () => { live = false; };
  }, [setId]);
  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!loaded) return <Loading />;
  return <Editor setId={setId} initial={loaded.content} />;
}

function Editor({ setId, initial }) {
  const [status, setStatus] = useState("Saved");
  const [formula, setFormula] = useState(null); // { latex, pos } while the formula dialog is open (pos = null for a new one)
  const timer = useRef(null);
  const dirty = useRef(false);
  const editorRef = useRef(null);

  const save = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || !dirty.current) return;
    dirty.current = false;
    setStatus("Saving…");
    try {
      await api.saveSetNotes(setId, editor.getJSON());
      setStatus(dirty.current ? "Unsaved changes" : "Saved");
    } catch (error) {
      dirty.current = true;
      setStatus(`Not saved: ${error.message}`);
    }
  }, [setId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, underline: false, link: false }),
      Mathematics.configure({
        katexOptions: { throwOnError: false },
        inlineOptions: { onClick: (node, pos) => setFormula({ latex: node.attrs.latex, pos }) },
        blockOptions: { onClick: (node, pos) => setFormula({ latex: node.attrs.latex, pos, block: true }) }
      })
    ],
    content: initial || "",
    editorProps: { attributes: { class: "note-editor", "aria-label": "Notes", role: "textbox", "aria-multiline": "true" } },
    onUpdate: () => {
      dirty.current = true;
      setStatus("Unsaved changes");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(save, SAVE_DELAY);
    }
  });
  editorRef.current = editor;

  // Leaving the page saves what is waiting, so a quick tab change never loses the last words.
  useEffect(() => () => { window.clearTimeout(timer.current); save(); }, [save]);
  useEffect(() => {
    const warn = (event) => { if (dirty.current) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  function applyFormula(event) {
    event.preventDefault();
    const latex = formula.latex.trim();
    if (latex) {
      if (formula.pos == null) editor.chain().focus().insertInlineMath({ latex }).run();
      else if (formula.block) editor.chain().focus().command(({ tr }) => { tr.setNodeMarkup(formula.pos, undefined, { latex }); return true; }).run();
      else editor.chain().focus().updateInlineMath({ latex, pos: formula.pos }).run();
    } else if (formula.pos != null && !formula.block) {
      editor.chain().focus().deleteInlineMath({ pos: formula.pos }).run();
    }
    setFormula(null);
  }

  if (!editor) return <Loading />;
  const is = (name, attrs) => editor.isActive(name, attrs);
  return <div className="note-wrap">
    <div className="note-toolbar" role="toolbar" aria-label="Formatting">
      <ToolButton label="Bold" active={is("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={18} aria-hidden="true" /></ToolButton>
      <ToolButton label="Italic" active={is("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={18} aria-hidden="true" /></ToolButton>
      <ToolButton label="Strikethrough" active={is("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={18} aria-hidden="true" /></ToolButton>
      <ToolButton label="Code" active={is("code")} onClick={() => editor.chain().focus().toggleCode().run()}><Code size={18} aria-hidden="true" /></ToolButton>
      <ToolButton label="Heading" active={is("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={18} aria-hidden="true" /></ToolButton>
      <ToolButton label="Bulleted list" active={is("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={18} aria-hidden="true" /></ToolButton>
      <ToolButton label="Numbered list" active={is("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={18} aria-hidden="true" /></ToolButton>
      <ToolButton label="Quote" active={is("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={18} aria-hidden="true" /></ToolButton>
      <ToolButton label={"Insert formula. Click a formula to change it. Examples: x^2 + 1 or \\ce{H2O}"} onClick={() => setFormula({ latex: "", pos: null })}><Sigma size={18} aria-hidden="true" /></ToolButton>
    </div>
    <EditorContent editor={editor} />
    <p className="note-status" role="status">{status}</p>
    <Dialog open={Boolean(formula)} onClose={() => setFormula(null)} title={formula?.pos == null ? "Insert a formula" : "Change the formula"} actions={<>
      <Button variant="secondary" type="button" onClick={() => setFormula(null)}>Cancel</Button>
      <Button type="submit" form="formula-form">{formula?.pos == null ? "Insert" : "Save"}</Button>
    </>}>
      {formula && <form id="formula-form" className="form-stack" onSubmit={applyFormula}>
        <TextField label="Formula" hint={"For example: x^2 + 1, or \\ce{CO2 + H2O <=> H2CO3}. Leave it empty to remove it."} maxLength="500" autoFocus value={formula.latex} onChange={(event) => setFormula({ ...formula, latex: event.target.value })} />
      </form>}
    </Dialog>
  </div>;
}
