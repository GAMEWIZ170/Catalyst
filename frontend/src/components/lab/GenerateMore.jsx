import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import AiDrafts from "./AiDrafts";

const TITLES = { cards: "Generate more flashcards", questions: "Generate more quiz questions", notes: "Generate more notes" };

// "Generate more" on a tab: the AI drafts one kind of item from the set's material, notes or pasted text.
// The student edits the drafts and saves them; saving closes the dialog and refreshes the tab.
export default function GenerateMore({ isOpen, onOpenChange, setId, kind, onSaved }) {
  return <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={640}>
    <DialogHeader title={TITLES[kind]} onOpenChange={onOpenChange} />
    <div style={{ padding: "var(--spacing-4)" }}>
      <AiDrafts setId={setId} kind={kind} onSaved={() => { onOpenChange(false); onSaved(); }} />
    </div>
  </Dialog>;
}
