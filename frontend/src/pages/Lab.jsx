import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FlaskConical, Plus, Users } from "lucide-react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { api } from "../api/client";
import AstryxTheme from "../components/astryx/AstryxTheme";
import NewSetDialog from "../components/lab/NewSetDialog";
import { ErrorState, Loading } from "./Courses";
import { t } from "../i18n";

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// "Studied 3 days ago", or "Not studied yet".
function studied(value) {
  if (!value) return "Not studied yet";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return "Studied today";
  if (days === 1) return "Studied yesterday";
  return `Studied ${days} days ago`;
}

const TABS = [
  { id: "all", label: "All", match: () => true },
  { id: "processing", label: "Processing", match: (set) => set.build.status === "processing" },
  { id: "ready", label: "Ready", match: (set) => set.build.status === "ready" || set.build.status === "none" },
  { id: "issue", label: "Issue", match: (set) => set.build.status === "issue" }
];
const EMPTY_TAB = {
  processing: ["Nothing is processing", "Sets the AI is building show up here. You can leave the page while it works."],
  ready: ["No sets ready yet", "Finished sets show up here."],
  issue: ["No problems", "If the AI cannot build a set, it shows up here with a way forward."]
};

// The Study Lab: a student's own study sets. A set is made by dropping in notes or a PDF; the AI builds drafts to review.
// Built with Astryx (UI library trial, branch feature/astryx-trial).
export default function Lab() {
  const [sets, setSets] = useState(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => api.getSets(query.trim()).then(({ data }) => { setSets(data); setError(""); }), [query]);

  // A slower answer for an older search must not replace a newer one.
  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      api.getSets(query.trim()).then(({ data }) => { if (live) { setSets(data); setError(""); } }).catch((err) => { if (live) setError(err.message); });
    }, query ? 250 : 0);
    return () => { live = false; window.clearTimeout(timer); };
  }, [query]);

  // While the AI is building something, look again every few seconds. Stops by itself when nothing is processing.
  const working = Boolean(sets?.some((set) => set.build.status === "processing"));
  useEffect(() => {
    if (!working) return undefined;
    const timer = window.setInterval(() => { load().catch(() => {}); }, 3000);
    return () => window.clearInterval(timer);
  }, [working, load]);

  async function finishEmpty(set) {
    try { await api.finishSetBuild(set.id); await load(); } catch (err) { setError(err.message); }
  }
  async function retry(set) {
    try { await api.retrySetBuild(set.id); await load(); } catch (err) { setError(err.message); }
  }

  const counts = Object.fromEntries(TABS.map((item) => [item.id, (sets || []).filter(item.match).length]));
  const shown = (sets || []).filter(TABS.find((item) => item.id === tab).match);

  function card(set) {
    const meta = [set.course?.code, set.topic].filter(Boolean).join(" · ");
    if (set.build.status === "processing") {
      return <Card key={set.id}>
        <VStack gap={2}>
          <HStack gap={2} align="center"><Spinner size="sm" label="" aria-label="Making your set" /><Text weight="semibold">Making your set…</Text></HStack>
          <Text type="supporting" color="secondary">The AI is reading your material. You can leave this page.</Text>
        </VStack>
      </Card>;
    }
    if (set.build.status === "issue") {
      return <Card key={set.id}>
        <VStack gap={2}>
          <HStack gap={2} align="center"><Badge variant="warning" label="Issue" /><Text weight="semibold" maxLines={1}>{set.title}</Text></HStack>
          <Text type="supporting" color="secondary">{set.build.message || "The AI could not help this time."}</Text>
          <HStack gap={2} wrap="wrap">
            <Button label="Try again" size="sm" onClick={() => retry(set)} />
            <Button label="Start empty" size="sm" variant="ghost" onClick={() => finishEmpty(set)} />
          </HStack>
        </VStack>
      </Card>;
    }
    const ready = set.build.status === "ready";
    return <ClickableCard key={set.id} label={ready ? `${set.title}, drafts ready to review` : set.title} href={ready ? `/lab/${set.id}/review` : `/lab/${set.id}`}>
      <VStack gap={1}>
        <Text weight="semibold" display="block" maxLines={2}>{set.title}</Text>
        {meta && <Text type="supporting" color="secondary" display="block" maxLines={1}>{meta}</Text>}
        {ready
          ? <HStack gap={1} align="center"><CheckCircle2 size={14} aria-hidden="true" /><Text type="supporting" color="accent">Drafts ready to review</Text></HStack>
          : <>
            <Text type="supporting" color="secondary" display="block">{plural(set.cardCount, "card")} · {plural(set.quizCount, "quiz", "quizzes")}</Text>
            <Text type="supporting" color="secondary" display="block">{studied(set.lastStudiedAt)}</Text>
          </>}
      </VStack>
    </ClickableCard>;
  }

  const none = sets && sets.length === 0;
  return <AstryxTheme>
    <div className="content student-page lab-page">
      <VStack gap={5}>
        <HStack gap={3} justify="between" align="center" wrap="wrap">
          <VStack gap={1}>
            <Heading level={1}>{t("lab.title")}</Heading>
            <Text color="secondary">Your own notes, flashcards and quizzes. Only you can see them.</Text>
          </VStack>
          <HStack gap={2} wrap="wrap">
            <Button label="Community sets" variant="ghost" icon={<Users size={18} aria-hidden="true" />} href="/community" />
            <Button label="New set" variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={() => setCreating(true)} />
          </HStack>
        </HStack>
        {error && !sets && <ErrorState message={error} onRetry={() => setQuery((q) => q + " ")} />}
        {error && sets && <Text color="secondary" role="alert">{error}</Text>}
        {!sets && !error && <Loading />}
        {none && !query && <EmptyState icon={<FlaskConical size={32} aria-hidden="true" />} title="Drop in your notes or a PDF and let AI build a set"
          description="You check the notes, flashcards and quiz before anything is saved."
          actions={<Button label="New set" variant="primary" onClick={() => setCreating(true)} />} />}
        {sets && (sets.length > 0 || query) && <>
          <HStack gap={3} justify="between" align="center" wrap="wrap">
            <TabList role="tablist" value={tab} onChange={setTab} hasDivider>
              {TABS.map((item) => <Tab key={item.id} value={item.id} label={item.id !== "all" && counts[item.id] ? `${item.label} (${counts[item.id]})` : item.label} panelId="lab-sets" />)}
            </TabList>
            <TextInput type="search" label="Search my sets" isLabelHidden placeholder="Search my sets" size="sm" width={240} value={query} onChange={setQuery} hasClear />
          </HStack>
          <div id="lab-sets" role="tabpanel">
            {shown.length === 0
              ? (query ? <EmptyState icon={<FlaskConical size={32} aria-hidden="true" />} title="No sets match" description="Try a different word." />
                : <EmptyState isCompact icon={<FlaskConical size={28} aria-hidden="true" />} title={(EMPTY_TAB[tab] || ["Nothing here"])[0]} description={(EMPTY_TAB[tab] || [])[1]} />)
              : <Grid columns={{ minWidth: 260 }} gap={4}>{shown.map(card)}</Grid>}
          </div>
        </>}
      </VStack>
      <NewSetDialog isOpen={creating} onOpenChange={setCreating} onStarted={() => { setCreating(false); setTab("all"); load().catch(() => {}); }} />
    </div>
  </AstryxTheme>;
}
