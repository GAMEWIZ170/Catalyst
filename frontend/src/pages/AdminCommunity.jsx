import { useEffect, useState } from "react";
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
import { ErrorState, Loading } from "./Courses";
import "../styles/admin-polish.css";

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

  return <VStack gap={2} paddingBlock={4}>
    <HStack gap={2} align="center" wrap="wrap">
      <Badge variant={item.communityStatus === "approved" ? "success" : "info"} label={item.communityStatus === "approved" ? "Live" : "Pending"} />
      {item.openReports > 0 && <Badge variant="warning" label={`${item.openReports} open ${item.openReports === 1 ? "report" : "reports"}`} />}
      <Text type="supporting" color="secondary">by {item.author} · {item.items} items · {item.studied} studied · {item.saved} saved</Text>
    </HStack>
    <Text weight="semibold">{item.title}</Text>
    {item.topic && <Text type="supporting" color="secondary">{item.topic}</Text>}
    {item.description && <Text>{item.description}</Text>}
    {item.declaredAt && <Text type="supporting" color="secondary">Declared as the author's own work on {new Date(item.declaredAt).toLocaleDateString()}.</Text>}
    <div><Button label="Read the set" size="sm" variant="ghost" href={`/community/${item.id}`} /></div>
    <TextArea label="Note to the author" isLabelHidden placeholder={view === "pending" ? "Note to the author if you reject it (optional)" : "Reason for the author (optional)"} maxLength={300} rows={2} value={note} onChange={setNote} />
    <HStack gap={2} wrap="wrap">
      {item.communityStatus === "pending" && <Button label="Approve" variant="primary" isDisabled={busy} onClick={() => act("approve")} />}
      {item.communityStatus === "pending" && <Button label="Reject" variant="secondary" isDisabled={busy} onClick={() => act("reject")} />}
      {(view !== "pending" || item.communityStatus === "approved") && <Button label="Take down" variant="destructive" isDisabled={busy} onClick={() => act("takedown")} />}
      {view === "pending" && <Button label="Remove for good" variant="ghost" isDisabled={busy} onClick={() => act("takedown")} />}
    </HStack>
  </VStack>;
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
  return <AdminLayout>
    <AstryxTheme>
      <div className="admin-astryx">
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={1}>Community sets</Heading>
            <Text color="secondary">Approve sets before they reach the shelf and take down any that break the rules. Aim to act within 48 hours of a report.</Text>
          </VStack>
          <TabList role="tablist" value={view} onChange={(key) => { setView(key); setPage(1); setData(null); }} hasDivider>
            {VIEWS.map(([key, label]) => <Tab key={key} value={key} label={`${label}${count(key)}`} panelId="community-panel" />)}
          </TabList>
          <div id="community-panel" role="tabpanel">
            {error && data && <Banner status="error" title={error} container="section" />}
            {!data && !error && <Loading />}
            {error && !data && <ErrorState message={error} onRetry={load} />}
            {data && data.items.length === 0 && <EmptyState isCompact title="Nothing here" description={view === "pending" ? "No sets are waiting for approval." : view === "reported" ? "No sets have open reports." : "No sets are live on the shelf yet."} />}
            {data && data.items.map((item, index) => <div key={item.id}>{index > 0 && <Divider />}<Row item={item} view={view} onDone={load} onError={setError} /></div>)}
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
