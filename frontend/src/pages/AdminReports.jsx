import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";
import { api } from "../api/client";
import AdminLayout from "../components/admin/AdminLayout";
import StatusMessage from "../components/admin/StatusMessage";
import { Badge, Button, EmptyState, TextArea } from "../components/ui";
import { formatDate } from "../utils/dates";
import { Loading } from "./Courses";

const CATEGORY_LABELS = { wrong_answer: "Answer looks wrong", typo: "Typing mistake", unclear: "Hard to understand", other: "Something else" };

function ReportRow({ report, onResolved, onError }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function resolve(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.resolveReport(report.id, { reply: reply.trim() });
      onResolved(report);
    } catch (err) {
      onError(err.message);
      setBusy(false);
    }
  }

  return <li className="report-row">
    <div className="report-head">
      <Badge>{report.kind === "lesson" ? "Lesson" : "Question"}</Badge>
      <Badge>{CATEGORY_LABELS[report.category]}</Badge>
      <span className="muted">{report.student} · {formatDate(report.createdAt)}</span>
    </div>
    <p className="report-title"><strong>{report.title}</strong></p>
    {report.note && <p className="report-note">{report.note}</p>}
    {report.editorLink && <p><Link to={report.editorLink}>Open in the editor</Link></p>}
    {report.status === "open"
      ? <form className="form-stack" onSubmit={resolve}>
        <TextArea label="Reply to the student (optional)" hint="The student gets this as a notification. Leave it empty to send a short thank-you." maxLength={1000} rows={3} value={reply} onChange={(event) => setReply(event.target.value)} />
        <div><Button type="submit" loading={busy}>Mark as resolved</Button></div>
      </form>
      : <p className="muted">Resolved {formatDate(report.resolvedAt)}. {report.reply ? `Reply: ${report.reply}` : "No reply was written."}</p>}
  </li>;
}

export default function AdminReports() {
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setError("");
    try {
      setData((await api.getReports({ status, page })).data);
    } catch (err) {
      setError(err.message);
    }
  }
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

  function resolved(report) {
    setMessage(`Resolved. The student was told.`);
    setData((current) => current && ({
      ...current,
      counts: { open: Math.max(0, current.counts.open - 1), resolved: current.counts.resolved + 1 },
      items: current.items.filter((item) => item.id !== report.id)
    }));
  }

  function pick(next) {
    setStatus(next);
    setPage(1);
    setMessage("");
  }

  return <AdminLayout>
    <div className="admin-heading">
      <div>
        <h1>Reports</h1>
        <p className="muted">Problems students found in questions and lessons. Resolving a report sends the student a notification.</p>
      </div>
    </div>
    <div className="button-row" role="group" aria-label="Report status">
      <Button variant={status === "open" ? "primary" : "secondary"} aria-pressed={status === "open"} onClick={() => pick("open")}>Open{data ? ` (${data.counts.open})` : ""}</Button>
      <Button variant={status === "resolved" ? "primary" : "secondary"} aria-pressed={status === "resolved"} onClick={() => pick("resolved")}>Resolved{data ? ` (${data.counts.resolved})` : ""}</Button>
    </div>
    <StatusMessage message={error || message} error={Boolean(error)} />
    {!data && !error && <Loading />}
    {error && !data && <Button variant="secondary" onClick={load}>Retry</Button>}
    {data && data.items.length === 0 && <EmptyState icon={Inbox} title={status === "open" ? "No open reports" : "Nothing resolved yet"} description={status === "open" ? "When a student reports a problem it will appear here." : "Resolved reports are kept here."} />}
    {data && data.items.length > 0 && <ul className="report-list">
      {data.items.map((report) => <ReportRow key={report.id} report={report} onResolved={resolved} onError={setError} />)}
    </ul>}
    {data && data.pages > 1 && <div className="button-row">
      <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
      <span className="muted">Page {data.page} of {data.pages}</span>
      <Button variant="secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button>
    </div>}
  </AdminLayout>;
}
