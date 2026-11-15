import { useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { api } from "../api/client";
import AdminLayout from "../components/admin/AdminLayout";
import AstryxTheme from "../components/astryx/AstryxTheme";
import { formatDate } from "../utils/dates";
import { Loading } from "./Courses";
import "../styles/admin-polish.css";

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

  return <VStack gap={2} paddingBlock={4}>
    <HStack gap={2} align="center" wrap="wrap">
      <Badge variant="neutral" label={KIND[report.kind] || "Question"} />
      <Badge variant="warning" label={CATEGORY_LABELS[report.category] || report.category} />
      <Text type="supporting" color="secondary">{report.student} · {formatDate(report.createdAt)}</Text>
    </HStack>
    <Text weight="semibold">{report.title}</Text>
    {report.note && <Text>{report.note}</Text>}
    {report.kind === "ai" && <VStack gap={1}>
      <Text type="supporting"><strong>Student asked:</strong> {report.aiQuestion}</Text>
      <Text type="supporting"><strong>AI answered:</strong> {report.aiAnswer}</Text>
    </VStack>}
    <HStack gap={2}>
      {report.editorLink && <Button label="Open in the editor" size="sm" variant="ghost" href={report.editorLink} />}
      {report.kind === "set" && <Button label="Review in Community sets" size="sm" variant="ghost" href="/admin/community?view=reported" />}
    </HStack>
    {report.status === "open"
      ? <VStack gap={2}>
        <TextArea label="Reply to the student" isLabelHidden placeholder="Reply to the student (optional). Empty sends a short thank-you." maxLength={1000} rows={2} value={reply} onChange={setReply} />
        <div><Button label="Mark as resolved" variant="primary" isLoading={busy} onClick={resolve} /></div>
      </VStack>
      : <Text type="supporting" color="secondary">Resolved {formatDate(report.resolvedAt)}. {report.reply ? `Reply: ${report.reply}` : "No reply was written."}</Text>}
  </VStack>;
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

  return <AdminLayout>
    <AstryxTheme>
      <div className="admin-astryx">
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={1}>Reports</Heading>
            <Text color="secondary">Problems students found. Resolving a report notifies the student.</Text>
          </VStack>
          <TabList role="tablist" value={status} onChange={(next) => { setStatus(next); setPage(1); setMessage(""); }} hasDivider>
            <Tab value="open" label={`Open${data ? ` (${data.counts.open})` : ""}`} panelId="reports-panel" />
            <Tab value="resolved" label={`Resolved${data ? ` (${data.counts.resolved})` : ""}`} panelId="reports-panel" />
          </TabList>
          <div id="reports-panel" role="tabpanel">
            {message && !error && <Banner status="success" title={message} container="section" isDismissable onDismiss={() => setMessage("")} />}
            {error && <Banner status="error" title={error} container="section" />}
            {!data && !error && <Loading />}
            {data && data.items.length === 0 && <EmptyState isCompact icon={<Inbox size={28} aria-hidden="true" />} title={status === "open" ? "No open reports" : "Nothing resolved yet"} description={status === "open" ? "When a student reports a problem it will appear here." : "Resolved reports are kept here."} />}
            {data && data.items.map((report, index) => <div key={report.id}>{index > 0 && <Divider />}<ReportRow report={report} onResolved={resolved} onError={setError} /></div>)}
            {data && data.pages > 1 && <HStack gap={3} align="center" justify="center" paddingBlock={3}>
              <Button label="Previous" variant="secondary" isDisabled={page <= 1} onClick={() => setPage(page - 1)} />
              <Text color="secondary">Page {data.page} of {data.pages}</Text>
              <Button label="Next" variant="secondary" isDisabled={page >= data.pages} onClick={() => setPage(page + 1)} />
            </HStack>}
          </div>
        </VStack>
      </div>
    </AstryxTheme>
  </AdminLayout>;
}
