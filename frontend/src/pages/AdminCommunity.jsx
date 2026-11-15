import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import AdminLayout from "../components/admin/AdminLayout";
import StatusMessage from "../components/admin/StatusMessage";
import { Badge, Button, EmptyState, TextArea } from "../components/ui";
import { ErrorState, Loading } from "./Courses";

const VIEWS = [["pending", "Waiting for approval"], ["reported", "Reported"], ["live", "Live on the shelf"]];

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

  return <li className="report-row">
    <div className="report-head">
      <Badge>{item.communityStatus === "approved" ? "Live" : "Pending"}</Badge>
      {item.openReports > 0 && <Badge>{item.openReports} open {item.openReports === 1 ? "report" : "reports"}</Badge>}
      <span className="muted">by {item.author} · {item.items} items · {item.studied} studied · {item.saved} saved</span>
    </div>
    <p className="report-title"><strong>{item.title}</strong></p>
    {item.topic && <p className="muted">{item.topic}</p>}
    {item.description && <p>{item.description}</p>}
    {item.declaredAt && <p className="muted">Declared as the author's own work on {new Date(item.declaredAt).toLocaleDateString()}.</p>}
    <p><Link to={`/community/${item.id}`}>Read the set</Link></p>
    <div className="form-stack">
      <TextArea label={view === "pending" ? "Note to the author if you reject it (optional)" : "Reason for the author (optional)"} maxLength={300} rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
      <div className="button-row">
        {item.communityStatus === "pending" && <Button disabled={busy} onClick={() => act("approve")}>Approve</Button>}
        {item.communityStatus === "pending" && <Button variant="secondary" disabled={busy} onClick={() => act("reject")}>Reject</Button>}
        {(view !== "pending" || item.communityStatus === "approved") && <Button variant="secondary" disabled={busy} onClick={() => act("takedown")}>Take down</Button>}
        {view === "pending" && <Button variant="tertiary" disabled={busy} onClick={() => act("takedown")}>Remove for good</Button>}
      </div>
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

  return <AdminLayout>
    <div className="admin-heading"><div><h1>Community sets</h1>
      <p className="muted">Approve sets before they reach the shelf, and take down sets that break the rules. Aim to act within 48 hours of a report.</p></div></div>
    <div className="button-row" role="group" aria-label="Which sets">
      {VIEWS.map(([key, label]) => <Button key={key} variant={view === key ? "primary" : "secondary"} aria-pressed={view === key} onClick={() => { setView(key); setPage(1); setData(null); }}>
        {label}{data && key === "pending" ? ` (${data.counts.pending})` : data && key === "reported" ? ` (${data.counts.reported})` : ""}
      </Button>)}
    </div>
    <StatusMessage message={error} error />
    {!data && !error && <Loading />}
    {error && !data && <ErrorState message={error} onRetry={load} />}
    {data && data.items.length === 0 && <EmptyState title="Nothing here" description={view === "pending" ? "No sets are waiting for approval." : view === "reported" ? "No sets have open reports." : "No sets are live on the shelf yet."} />}
    {data && data.items.length > 0 && <ul className="report-list">{data.items.map((item) => <Row key={item.id} item={item} view={view} onDone={load} onError={setError} />)}</ul>}
    {data && data.pages > 1 && <nav className="pager" aria-label="Pages">
      <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
      <span className="muted">Page {data.page} of {data.pages}</span>
      <Button variant="secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button>
    </nav>}
  </AdminLayout>;
}
