import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { api } from "../../api/client";
import AdminLayout from "../../components/admin/AdminLayout";
import { Badge, Button, EmptyState, Tabs } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";

const VIEWS = [["pending", "Waiting"], ["reported", "Reported"], ["live", "Live"]];

// One set in the queue. Admins read it through the normal community page, then approve, reject or take it down.
function Row({ item, view, onDone, onError }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(action) {
    setBusy(true);
    try {
      if (action === "approve") await api.approveSet(item.id);
      else if (action === "reject") await api.rejectSet(item.id, { note: note.trim() });
      else await api.takedownSet(item.id, { reason: note.trim() });
      onDone();
    } catch (error) {
      onError(error.message);
      setBusy(false);
    }
  }

  return <li className="grid gap-2 border-b border-border py-4 last:border-b-0">
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={item.communityStatus === "approved" ? "success" : "info"}>{item.communityStatus === "approved" ? "Live" : "Pending"}</Badge>
      {item.openReports > 0 && <Badge tone="warning">{item.openReports} open {item.openReports === 1 ? "report" : "reports"}</Badge>}
      <span className="text-sm text-muted-foreground">by {item.author} · {item.items} items · {item.studied} studied · {item.saved} saved</span>
    </div>
    <strong>{item.title}</strong>
    {item.topic && <span className="text-sm text-muted-foreground">{item.topic}</span>}
    {item.description && <p className="m-0">{item.description}</p>}
    {item.declaredAt && <span className="text-sm text-muted-foreground">Declared as the author's own work on {new Date(item.declaredAt).toLocaleDateString()}.</span>}
    <div><Button as={Link} to={`/community/${item.id}`} size="sm" variant="tertiary">Read the set</Button></div>
    <textarea aria-label="Note to the author" placeholder={view === "pending" ? "Note to the author if you reject it (optional)" : "Reason for the author (optional)"} maxLength={300} rows={2} value={note} onChange={(event) => setNote(event.target.value)}
      className="w-full resize-y rounded-lg border border-input bg-card p-3 font-sans text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
    <div className="flex flex-wrap gap-2">
      {item.communityStatus === "pending" && <Button disabled={busy} onClick={() => act("approve")}>Approve</Button>}
      {item.communityStatus === "pending" && <Button variant="secondary" disabled={busy} onClick={() => act("reject")}>Reject</Button>}
      {(view !== "pending" || item.communityStatus === "approved") && <Button variant="danger" disabled={busy} onClick={() => act("takedown")}>Take down</Button>}
      {view === "pending" && <Button variant="tertiary" disabled={busy} onClick={() => act("takedown")}>Remove for good</Button>}
    </div>
  </li>;
}

export default function AdminCommunity() {
  const [view, setView] = useState("pending");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  function load() {
    setError("");
    api.getAdminCommunity(`view=${view}&page=${page}`).then(({ data: next }) => setData(next)).catch((err) => setError(err.message));
  }
  useEffect(load, [view, page]);

  const count = (key) => (data && key === "pending" ? ` (${data.counts.pending})` : data && key === "reported" ? ` (${data.counts.reported})` : "");
  const body = <div className="grid gap-2">
    {error && data && <p className="m-0 flex items-center gap-2 text-destructive" role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
    {!data && !error && <Loading />}
    {error && !data && <ErrorState message={error} onRetry={load} />}
    {data && data.items.length === 0 && <EmptyState title="Nothing here" description={view === "pending" ? "No sets are waiting for approval." : view === "reported" ? "No sets have open reports." : "No sets are live on the shelf yet."} />}
    {data && data.items.length > 0 && <ul className="m-0 grid list-none p-0">{data.items.map((item) => <Row key={item.id} item={item} view={view} onDone={load} onError={setError} />)}</ul>}
    {data && data.pages > 1 && <div className="flex items-center justify-center gap-3 py-3">
      <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
      <span className="text-muted-foreground">Page {data.page} of {data.pages}</span>
      <Button variant="secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button>
    </div>}
  </div>;

  return <AdminLayout>
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="m-0 text-3xl leading-tight font-bold">Community sets</h1>
        <p className="m-0 text-muted-foreground">Approve sets before they reach the shelf and take down any that break the rules. Aim to act within 48 hours of a report.</p>
      </div>
      <Tabs label="Community queue" value={view} onChange={(key) => { setView(key); setPage(1); setData(null); }}
        tabs={VIEWS.map(([key, label]) => ({ id: key, label: `${label}${count(key)}`, panel: body }))} />
    </div>
  </AdminLayout>;
}
