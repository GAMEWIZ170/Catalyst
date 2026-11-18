import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, FlaskConical, Loader2, Plus, Search, Users, X } from "lucide-react";
import { api } from "../../api/client";
import AstryxTheme from "../../components/astryx/AstryxTheme";
import NewSetDialog from "../../components/lab/NewSetDialog";
import { Badge, Button, EmptyState, Tabs } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";
import { t } from "../../i18n";

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

// Set covers carry the one bold colour on this screen. The colour comes from the title, so a set keeps its colour.
const COVERS = ["bg-rate-again", "bg-rate-hard", "bg-rate-good", "bg-info"];
function coverOf(title) {
  let sum = 0;
  for (const ch of String(title)) sum += ch.codePointAt(0);
  return COVERS[sum % COVERS.length];
}

const tile = "grid overflow-hidden rounded-lg border border-border bg-card";
const open = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function SetCard({ set, onRetry, onEmpty }) {
  if (set.build.status === "processing") {
    return <div className={`${tile} content-start gap-2 p-4`}>
      <p className="m-0 flex items-center gap-2 font-semibold"><Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Making your set…</p>
      <p className="m-0 text-sm text-muted-foreground">The AI is reading your material. You can leave this page.</p>
    </div>;
  }
  if (set.build.status === "issue") {
    return <div className={`${tile} content-start gap-2 p-4`}>
      <p className="m-0 flex items-center gap-2"><Badge tone="warning">Issue</Badge><strong className="min-w-0 truncate">{set.title}</strong></p>
      <p className="m-0 text-sm text-muted-foreground">{set.build.message || "The AI could not help this time."}</p>
      <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => onRetry(set)}>Try again</Button><Button size="sm" variant="tertiary" onClick={() => onEmpty(set)}>Start empty</Button></div>
    </div>;
  }
  const meta = [set.course?.code, set.topic].filter(Boolean).join(" · ");
  const ready = set.build.status === "ready";
  return <Link to={ready ? `/lab/${set.id}/review` : `/lab/${set.id}`} aria-label={ready ? `${set.title}, drafts ready to review` : set.title} className={`${tile} grid-rows-[auto_1fr] text-foreground no-underline transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${open}`}>
    <span aria-hidden="true" className={`flex h-16 items-end px-4 pb-1 text-3xl font-semibold text-on-rate ${coverOf(set.title)}`}>{String(set.title).trim().charAt(0).toUpperCase()}</span>
    <span className="grid content-start gap-1 p-4">
      <strong className="line-clamp-2 text-base leading-snug">{set.title}</strong>
      {meta && <span className="truncate text-sm text-muted-foreground">{meta}</span>}
      {ready
        ? <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-ink"><CheckCircle2 size={14} aria-hidden="true" />Drafts ready to review</span>
        : <>
          <span className="text-sm text-muted-foreground">{plural(set.cardCount, "card")} · {plural(set.quizCount, "quiz", "quizzes")}</span>
          <span className="text-sm text-muted-foreground">{studied(set.lastStudiedAt)}</span>
        </>}
    </span>
  </Link>;
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
  return <div className="content mx-auto grid max-w-5xl gap-6">
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
    <AstryxTheme><NewSetDialog isOpen={creating} onOpenChange={setCreating} onStarted={() => { setCreating(false); setTab("all"); load().catch(() => {}); }} /></AstryxTheme>
  </div>;
}
