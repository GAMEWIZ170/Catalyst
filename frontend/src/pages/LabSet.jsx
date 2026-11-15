import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Pencil, Share2, Sparkles, Trash2 } from "lucide-react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { api } from "../api/client";
import AstryxTheme from "../components/astryx/AstryxTheme";
import { ErrorState, Loading } from "./Courses";
import SetCards from "../components/lab/SetCards";
import SetQuizzes from "../components/lab/SetQuizzes";
import SetMaterials from "../components/lab/SetMaterials";
import AiDrafts from "../components/lab/AiDrafts";
import Companion from "../components/Companion";
import SetSharing from "../components/lab/SetSharing";

// The rich note editor is a big file, so it is only downloaded when a student opens the Notes tab.
const SetNotes = lazy(() => import("../components/lab/SetNotes"));

const TAB_IDS = ["notes", "cards", "quizzes"];
const icon = (Icon) => <Icon size={18} aria-hidden="true" />;

// One study set. Built with Astryx (UI library trial, branch feature/astryx-trial).
// The AI panel is opened by "Ask AI" (or by ?ai=1 right after a set is created). Tabs are Notes, Flashcards and Quizzes.
export default function LabSet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [set, setSet] = useState(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);   // "rename", "share" or "delete"
  const [draftTitle, setDraftTitle] = useState("");
  const asked = params.get("tab");
  const tab = TAB_IDS.includes(asked) ? asked : "notes";
  const aiOpen = params.get("ai") === "1";

  function load() {
    setError("");
    api.getSet(id).then(({ data }) => setSet(data)).catch((err) => setError(err.status === 404 ? "This set was not found" : err.message));
  }
  useEffect(load, [id]);

  const update = (patch) => setParams((current) => {
    const next = new URLSearchParams(current);
    for (const [key, value] of Object.entries(patch)) { if (value) next.set(key, value); else next.delete(key); }
    return next;
  }, { replace: true });

  async function rename(event) {
    event.preventDefault();
    const title = draftTitle.trim();
    if (!title) return;
    setDialog(null);
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

  const panels = {
    notes: <><Suspense fallback={<Loading />}><SetNotes setId={id} /></Suspense><SetMaterials setId={id} /></>,
    cards: <SetCards setId={id} />,
    quizzes: <SetQuizzes setId={id} />
  };
  const details = [set.course && `${set.course.code}: ${set.course.title}`, set.topic].filter(Boolean).join(" · ");
  const close = (open) => { if (!open) setDialog(null); };

  return <AstryxTheme>
    <div className="content student-page lab-set">
      <VStack gap={4}>
        <div><Button label="Study Lab" variant="ghost" size="sm" icon={icon(ArrowLeft)} href="/lab" /></div>
        <HStack gap={3} justify="between" align="center" wrap="wrap">
          <VStack gap={1}>
            <Heading level={1}>{set.title}</Heading>
            {details && <Text color="secondary">{details}</Text>}
            {set.description && <Text color="secondary">{set.description}</Text>}
          </VStack>
          <HStack gap={2} align="center">
            <Button label="Ask AI" variant={aiOpen ? "secondary" : "primary"} icon={icon(Sparkles)} onClick={() => update({ ai: aiOpen ? "" : "1" })} />
            <MoreMenu label="Set actions" alignment="end" items={[
              { label: "Rename", icon: icon(Pencil), onClick: () => { setDraftTitle(set.title); setDialog("rename"); } },
              { label: "Share", icon: icon(Share2), onClick: () => setDialog("share") },
              { type: "divider" },
              { label: "Delete set", icon: icon(Trash2), variant: "destructive", onClick: () => setDialog("delete") }
            ]} />
          </HStack>
        </HStack>
        {error && <Banner status="error" title={error} container="section" />}
        {aiOpen && <div><Companion kind="set" id={id} defaultOpen /><AiDrafts setId={id} /></div>}
        <TabList role="tablist" value={tab} onChange={(next) => update({ tab: next })} hasDivider aria-label="Study set sections">
          <Tab value="notes" label="Notes" panelId="set-panel" />
          <Tab value="cards" label="Flashcards" panelId="set-panel" />
          <Tab value="quizzes" label="Quizzes" panelId="set-panel" />
        </TabList>
        <div id="set-panel" role="tabpanel">{panels[tab]}</div>
      </VStack>

      <Dialog isOpen={dialog === "rename"} onOpenChange={close} purpose="form" width={420}>
        <DialogHeader title="Rename set" onOpenChange={close} />
        <form onSubmit={rename}>
          <VStack gap={4} padding={4}>
            <TextInput label="Title" value={draftTitle} onChange={setDraftTitle} hasAutoFocus isRequired />
            <HStack gap={2} justify="end">
              <Button label="Cancel" variant="ghost" onClick={() => setDialog(null)} />
              <Button label="Save" variant="primary" type="submit" />
            </HStack>
          </VStack>
        </form>
      </Dialog>

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
