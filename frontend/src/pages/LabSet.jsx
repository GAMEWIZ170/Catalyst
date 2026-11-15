import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import InlineRename from "../components/admin/InlineRename";
import { Button, Tabs } from "../components/ui";
import { ErrorState, Loading } from "./Courses";
import SetCards from "../components/lab/SetCards";
import SetQuizzes from "../components/lab/SetQuizzes";
import SetMaterials from "../components/lab/SetMaterials";
import AiDrafts from "../components/lab/AiDrafts";
import Companion from "../components/Companion";
import SetSharing from "../components/lab/SetSharing";

// The rich note editor is a big file, so it is only downloaded when a student opens the Notes tab.
const SetNotes = lazy(() => import("../components/lab/SetNotes"));

const TAB_IDS = ["notes", "cards", "quizzes", "ai"];

export default function LabSet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [set, setSet] = useState(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
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
    setConfirming(false);
    try {
      await api.deleteSet(id);
      navigate("/lab", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !set) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!set) return <Loading />;

  const tabs = [
    { id: "notes", label: "Notes", panel: <><Suspense fallback={<Loading />}><SetNotes setId={id} /></Suspense><SetMaterials setId={id} /></> },
    { id: "cards", label: "Flashcards", panel: <SetCards setId={id} /> },
    { id: "quizzes", label: "Quizzes", panel: <SetQuizzes setId={id} /> },
    { id: "ai", label: "AI", panel: <><Companion kind="set" id={id} /><AiDrafts setId={id} /></> }
  ];
  return <div className="content student-page lab-set">
    <Link className="back-link" to="/lab"><ArrowLeft size={16} aria-hidden="true" />Study Lab</Link>
    <header className="lab-set-header">
      <InlineRename as="h1" name={set.title} onSave={rename} />
      <Button variant="secondary" type="button" onClick={() => setConfirming(true)}>Delete set</Button>
    </header>
    {(set.course || set.topic) && <p className="muted">{[set.course && `${set.course.code}: ${set.course.title}`, set.topic].filter(Boolean).join(" · ")}</p>}
    {set.description && <p className="muted">{set.description}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <SetSharing key={`${set.visibility}-${set.communityStatus}`} set={set} onChange={(patch) => setSet((current) => ({ ...current, ...patch }))} />
    <Tabs tabs={tabs} value={tab} onChange={(next) => setParams({ tab: next }, { replace: true })} label="Study set sections" />
    <ConfirmDialog open={confirming} title="Delete this set?" description="Its notes, cards and quizzes are deleted too, and its cards leave your review. This cannot be undone." confirmLabel="Delete" onConfirm={remove} onCancel={() => setConfirming(false)} />
  </div>;
}
