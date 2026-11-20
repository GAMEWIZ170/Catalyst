import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, Plus, Search, Users, X } from "lucide-react";
import { api } from "../../api/client";
import NewSetDialog from "../../components/lab/NewSetDialog";
import SetCard from "../../components/lab/SetCard";
import { Button, EmptyState, Tabs } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";
import { t } from "../../i18n";

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
  const shownFor = (id) => (sets || []).filter(TABS.find((item) => item.id === id).match);

  const panelFor = (id) => {
    const shown = shownFor(id);
    if (shown.length > 0) return <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">{shown.map((set) => <SetCard key={set.id} set={set} onRetry={retry} onEmpty={finishEmpty} />)}</div>;
    if (query) return <EmptyState icon={FlaskConical} title="No sets match" description="Try a different word." />;
    return <EmptyState icon={FlaskConical} title={(EMPTY_TAB[id] || ["Nothing here"])[0]} description={(EMPTY_TAB[id] || [])[1]} />;
  };

  const none = sets && sets.length === 0;
  return <div className="mx-auto grid max-w-5xl gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="grid gap-1">
        <h1 className="m-0 text-3xl leading-tight font-bold">{t("lab.title")}</h1>
        <p className="m-0 text-muted-foreground">Your own notes, flashcards and quizzes. Only you can see them.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button as={Link} to="/community" variant="tertiary" icon={Users}>Community sets</Button>
        <Button icon={Plus} onClick={() => setCreating(true)}>New set</Button>
      </div>
    </div>
    {error && !sets && <ErrorState message={error} onRetry={() => setQuery((q) => q + " ")} />}
    {error && sets && <p className="m-0 text-muted-foreground" role="alert">{error}</p>}
    {!sets && !error && <Loading />}
    {none && !query && <EmptyState icon={FlaskConical} title="Drop in your notes or a PDF and let AI build a set"
      description="You check the notes, flashcards and quiz before anything is saved."
      action={<Button onClick={() => setCreating(true)}>New set</Button>} />}
    {sets && (sets.length > 0 || query) && <div className="grid gap-4">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input type="search" aria-label="Search my sets" placeholder="Search my sets" value={query} onChange={(event) => setQuery(event.target.value)}
          className="min-h-11 w-full rounded-pill border border-input bg-card pr-11 pl-10 font-sans text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:max-w-sm [&::-webkit-search-cancel-button]:hidden" />
        {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-pill border-0 bg-transparent text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X size={16} aria-hidden="true" /></button>}
      </div>
      <Tabs label="My sets" value={tab} onChange={setTab}
        tabs={TABS.map((item) => ({ id: item.id, label: item.id !== "all" && counts[item.id] ? `${item.label} (${counts[item.id]})` : item.label, panel: panelFor(item.id) }))} />
    </div>}
    <NewSetDialog isOpen={creating} onOpenChange={setCreating} onStarted={() => { setCreating(false); setTab("all"); load().catch(() => {}); }} />
  </div>;
}
