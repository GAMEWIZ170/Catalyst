import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, MoreHorizontal, Share2, Sparkles, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { Button, Dialog, DropdownMenu, EditableTitle, Tabs } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";
import SetCards from "../../components/lab/SetCards";
import SetQuizzes from "../../components/lab/SetQuizzes";
import SetMaterials from "../../components/lab/SetMaterials";
import GenerateMore from "../../components/lab/GenerateMore";
import { useTutorTarget } from "../../context/TutorContext";
import SetSharing from "../../components/lab/SetSharing";

// The rich note editor is a big file, so it is only downloaded when a student opens the Notes tab.
const SetNotes = lazy(() => import("../../components/lab/SetNotes"));

const TAB_IDS = ["notes", "cards", "quizzes"];

// One study set: title, tabs (notes, flashcards, quizzes), menu and dialogs. Tailwind and components/ui only.
// Tabs are Notes, Flashcards and Quizzes. Each tab shows its content first, with "Generate more" and "Add" that work in place.
// The tutor lives in the shell (useTutorTarget). Click the title to rename; Delete is in the ⋯ menu.
export default function LabSet() {
  const { id } = useParams();
  useTutorTarget("set", id);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [set, setSet] = useState(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);   // "share" or "delete"
  const [generating, setGenerating] = useState(false);
  const [notesKey, setNotesKey] = useState(0);
  const asked = params.get("tab");
  const tab = TAB_IDS.includes(asked) ? asked : "notes";

  function load() {
    setError("");
    api.getSet(id).then(({ data }) => setSet(data)).catch((err) => setError(err.status === 404 ? "This set was not found" : err.message));
  }
  useEffect(load, [id]);

  async function rename(title) {
    try {
      const { data } = await api.updateSet(id, { title });
      setSet(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove() {
    setDialog(null);
    try {
      await api.deleteSet(id);
      navigate("/lab", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !set) return <div className="mx-auto max-w-4xl"><ErrorState message={error} onRetry={load} /></div>;
  if (!set) return <Loading />;

  const details = [set.course && `${set.course.code}: ${set.course.title}`, set.topic].filter(Boolean).join(" · ");
  const close = () => setDialog(null);

  const panels = {
    notes: <div className="grid gap-5">
      <div className="flex justify-end"><Button variant="secondary" icon={Sparkles} onClick={() => setGenerating(true)}>Generate more</Button></div>
      <Suspense fallback={<Loading />}><SetNotes key={notesKey} setId={id} /></Suspense>
      <SetMaterials setId={id} />
    </div>,
    cards: <SetCards setId={id} />,
    quizzes: <SetQuizzes setId={id} />
  };

  return <div className="mx-auto grid max-w-4xl gap-4">
    <div><Button as={Link} to="/lab" variant="tertiary" size="sm" icon={ArrowLeft}>Study Lab</Button></div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="grid min-w-0 gap-1">
        <EditableTitle heading label="Title" value={set.title} placeholder="Untitled set" onSave={rename} />
        {details && <p className="m-0 text-muted-foreground">{details}</p>}
      </div>
      <DropdownMenu
        trigger={<Button variant="tertiary" aria-label="Set actions"><MoreHorizontal size={18} aria-hidden="true" /></Button>}
        items={[
          { label: "Share", icon: Share2, onSelect: () => setDialog("share") },
          { separator: true },
          { label: "Delete set", icon: Trash2, danger: true, onSelect: () => setDialog("delete") }
        ]} />
    </div>
    {error && <p className="m-0 flex items-center gap-2 text-destructive" role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
    <Tabs label="Set sections" value={tab} onChange={(next) => setParams({ tab: next }, { replace: true })} tabs={[
      { id: "notes", label: "Notes", panel: panels.notes },
      { id: "cards", label: "Flashcards", panel: panels.cards },
      { id: "quizzes", label: "Quizzes", panel: panels.quizzes }
    ]} />

    <GenerateMore isOpen={generating} onOpenChange={setGenerating} setId={id} kind="notes" onSaved={() => setNotesKey((key) => key + 1)} />

    <Dialog open={dialog === "share"} onClose={close} title="Share set">
      <SetSharing key={`${set.visibility}-${set.communityStatus}`} set={set} onChange={(patch) => setSet((current) => ({ ...current, ...patch }))} />
    </Dialog>

    <Dialog open={dialog === "delete"} onClose={close} title="Delete this set?"
      actions={<><Button variant="tertiary" onClick={close}>Cancel</Button><Button variant="danger" onClick={remove}>Delete</Button></>}>
      <p className="m-0">Its notes, cards and quizzes are deleted too, and its cards leave your review. This cannot be undone.</p>
    </Dialog>
  </div>;
}
