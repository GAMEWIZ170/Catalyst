import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Inbox } from "lucide-react";
import { api } from "../../api/client";
import AdminLayout from "../../components/admin/AdminLayout";
import { Badge, Button, EmptyState, Tabs } from "../../components/ui";
import { formatDate } from "../../utils/dates";
import { Loading } from "../learn/Courses";

const CATEGORY_LABELS = { wrong_answer: "Answer looks wrong", typo: "Typing mistake", unclear: "Hard to understand", other: "Something else" };
const KIND = { lesson: "Lesson", ai: "AI answer", set: "Study set", question: "Question" };

// One report: what was found, who found it, and a reply box. Resolving sends the student a notification.
function ReportRow({ report, onResolved, onError }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function resolve() {
    setBusy(true);
    try {
      await api.resolveReport(report.id, { reply: reply.trim() });
      onResolved(report);
    } catch (err) {
      onError(err.message);
      setBusy(false);
    }
  }

  return <li className="grid gap-2 border-b border-border py-4 last:border-b-0">
    <div className="flex flex-wrap items-center gap-2">
      <Badge>{KIND[report.kind] || "Question"}</Badge>
      <Badge tone="warning">{CATEGORY_LABELS[report.category] || report.category}</Badge>
      <span className="text-sm text-muted-foreground">{report.student} · {formatDate(report.createdAt)}</span>
    </div>
    <strong>{report.title}</strong>
    {report.note && <p className="m-0">{report.note}</p>}
    {report.kind === "ai" && <div className="grid gap-1 text-sm">
      <span><strong>Student asked:</strong> {report.aiQuestion}</span>
      <span><strong>AI answered:</strong> {report.aiAnswer}</span>
    </div>}
    <div className="flex flex-wrap gap-2">
      {report.editorLink && <Button as="a" href={report.editorLink} size="sm" variant="tertiary">Open in the editor</Button>}
      {report.kind === "set" && <Button as={Link} to="/admin/community?view=reported" size="sm" variant="tertiary">Review in Community sets</Button>}
    </div>
    {report.status === "open"
      ? <div className="grid gap-2">
        <textarea aria-label="Reply to the student" placeholder="Reply to the student (optional). Empty sends a short thank-you." maxLength={1000} rows={2} value={reply} onChange={(event) => setReply(event.target.value)}
          className="w-full resize-y rounded-lg border border-input bg-card p-3 font-sans text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
        <div><Button loading={busy} onClick={resolve}>Mark as resolved</Button></div>
      </div>
      : <p className="m-0 text-sm text-muted-foreground">Resolved {formatDate(report.resolvedAt)}. {report.reply ? `Reply: ${report.reply}` : "No reply was written."}</p>}
  </li>;
}

export default function AdminReports() {
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // A slow answer for the tab or page you left must not replace the one you are on, so each run can be cancelled.
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api.getReports({ status, page })
      .then((response) => { if (live) setData(response.data); })
      .catch((err) => { if (live) setError(err.message); });
    return () => { live = false; };
  }, [status, page]);

  const resolved = (report) => {
    setMessage("Resolved. The student was told.");
    setData((current) => current && ({ ...current, counts: { open: Math.max(0, current.counts.open - 1), resolved: current.counts.resolved + 1 }, items: current.items.filter((item) => item.id !== report.id) }));
  };

  const body = <div className="grid gap-2">
    {message && !error && <p className="m-0 flex items-center gap-2 rounded-lg bg-success/15 p-3" role="status"><CheckCircle2 size={18} aria-hidden="true" />{message}</p>}
    {error && <p className="m-0 flex items-center gap-2 text-destructive" role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
    {!data && !error && <Loading />}
    {data && data.items.length === 0 && <EmptyState icon={Inbox} title={status === "open" ? "No open reports" : "Nothing resolved yet"} description={status === "open" ? "When a student reports a problem it will appear here." : "Resolved reports are kept here."} />}
    {data && data.items.length > 0 && <ul className="m-0 grid list-none p-0">{data.items.map((report) => <ReportRow key={report.id} report={report} onResolved={resolved} onError={setError} />)}</ul>}
    {data && data.pages > 1 && <div className="flex items-center justify-center gap-3 py-3">
      <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
      <span className="text-muted-foreground">Page {data.page} of {data.pages}</span>
      <Button variant="secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button>
    </div>}
  </div>;

  return <AdminLayout>
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="m-0 text-3xl leading-tight font-bold">Reports</h1>
        <p className="m-0 text-muted-foreground">Problems students found. Resolving a report notifies the student.</p>
      </div>
      <Tabs label="Report status" value={status} onChange={(next) => { setStatus(next); setPage(1); setMessage(""); }} tabs={[
        { id: "open", label: `Open${data ? ` (${data.counts.open})` : ""}`, panel: body },
        { id: "resolved", label: `Resolved${data ? ` (${data.counts.resolved})` : ""}`, panel: body }
      ]} />
    </div>
  </AdminLayout>;
}
