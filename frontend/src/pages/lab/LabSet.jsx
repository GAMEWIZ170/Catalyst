import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Share2, Sparkles, Trash2 } from "lucide-react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { api } from "../../api/client";
import AstryxTheme from "../../components/astryx/AstryxTheme";
import ClickToEdit from "../../components/astryx/ClickToEdit";
import { ErrorState, Loading } from "../learn/Courses";
import SetCards from "../../components/lab/SetCards";
import SetQuizzes from "../../components/lab/SetQuizzes";
import SetMaterials from "../../components/lab/SetMaterials";
import GenerateMore from "../../components/lab/GenerateMore";
import CompanionDrawer from "../../components/lab/CompanionDrawer";
import SetSharing from "../../components/lab/SetSharing";

// The rich note editor is a big file, so it is only downloaded when a student opens the Notes tab.
const SetNotes = lazy(() => import("../../components/lab/SetNotes"));

const TAB_IDS = ["notes", "cards", "quizzes"];
const icon = (Icon) => <Icon size={18} aria-hidden="true" />;

// One study set. Built with Astryx (UI library trial, branch feature/astryx-trial).
// Tabs are Notes, Flashcards and Quizzes. Each tab shows its content first, with "Generate more" and "Add" that work in place.
// The study companion is a floating chat button that opens a side panel. Click the title to rename; Delete is in the ⋯ menu.
export default function LabSet() {
  const { id } = useParams();
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

  if (error && !set) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!set) return <Loading />;

  const details = [set.course && `${set.course.code}: ${set.course.title}`, set.topic].filter(Boolean).join(" · ");
  const close = (open) => { if (!open) setDialog(null); };

  return <AstryxTheme>
    <div className="content student-page lab-set">
      <VStack gap={4}>
        <div><Button label="Study Lab" variant="ghost" size="sm" icon={icon(ArrowLeft)} href="/lab" /></div>
        <HStack gap={3} justify="between" align="center" wrap="wrap">
          <VStack gap={1}>
            <ClickToEdit heading label="Title" value={set.title} placeholder="Untitled set" onSave={rename} />
            {details && <Text color="secondary">{details}</Text>}
          </VStack>
          <MoreMenu label="Set actions" alignment="end" items={[
            { label: "Share", icon: icon(Share2), onClick: () => setDialog("share") },
            { type: "divider" },
            { label: "Delete set", icon: icon(Trash2), variant: "destructive", onClick: () => setDialog("delete") }
          ]} />
        </HStack>
        {error && <Banner status="error" title={error} container="section" />}
        <TabList role="tablist" value={tab} onChange={(next) => setParams({ tab: next }, { replace: true })} hasDivider>
          <Tab value="notes" label="Notes" panelId="set-panel" />
          <Tab value="cards" label="Flashcards" panelId="set-panel" />
          <Tab value="quizzes" label="Quizzes" panelId="set-panel" />
        </TabList>
        <div id="set-panel" role="tabpanel">
          {tab === "notes" && <VStack gap={5}>
            <HStack justify="end"><Button label="Generate more" variant="secondary" icon={icon(Sparkles)} onClick={() => setGenerating(true)} /></HStack>
            <Suspense fallback={<Loading />}><SetNotes key={notesKey} setId={id} /></Suspense>
            <SetMaterials setId={id} />
          </VStack>}
          {tab === "cards" && <SetCards setId={id} />}
          {tab === "quizzes" && <SetQuizzes setId={id} />}
        </div>
      </VStack>

      <GenerateMore isOpen={generating} onOpenChange={setGenerating} setId={id} kind="notes" onSaved={() => setNotesKey((key) => key + 1)} />
      <CompanionDrawer kind="set" id={id} />

      <Dialog isOpen={dialog === "share"} onOpenChange={close} width={480}>
        <DialogHeader title="Share set" onOpenChange={close} />
        <div style={{ padding: "var(--spacing-4)" }}>
          <SetSharing key={`${set.visibility}-${set.communityStatus}`} set={set} onChange={(patch) => setSet((current) => ({ ...current, ...patch }))} />
        </div>
      </Dialog>

      <Dialog isOpen={dialog === "delete"} onOpenChange={close} width={420}>
        <DialogHeader title="Delete this set?" onOpenChange={close} />
        <VStack gap={4} padding={4}>
          <Text>Its notes, cards and quizzes are deleted too, and its cards leave your review. This cannot be undone.</Text>
          <HStack gap={2} justify="end">
            <Button label="Cancel" variant="ghost" onClick={() => setDialog(null)} />
            <Button label="Delete" variant="destructive" onClick={remove} />
          </HStack>
        </VStack>
      </Dialog>
    </div>
  </AstryxTheme>;
}
