import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Banner } from "@astryxdesign/core/Banner";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { List, ListItem } from "@astryxdesign/core/List";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import AdminLayout from "../components/admin/AdminLayout";
import AstryxTheme from "../components/astryx/AstryxTheme";
import ConfirmAstryx from "../components/astryx/ConfirmAstryx";
import { formatDate } from "../utils/dates";
import { Loading } from "./Courses";
import "../styles/admin-polish.css";

const ROLES = [["", "All"], ["student", "Students"], ["admin", "Admins"]];
const STATUSES = [["", "Any status"], ["active", "Active"], ["inactive", "Deactivated"], ["subscribed", "Subscribed"], ["expired", "No access"]];

function subscriptionText(user) {
  if (!user.subscriptionEndsAt) return "No subscription";
  const ends = new Date(user.subscriptionEndsAt);
  return ends > new Date() ? `Subscribed until ${formatDate(ends)}` : `Subscription ended ${formatDate(ends)}`;
}

// Filters are chips (rule 3). Confirmations and the end-date picker are Astryx dialogs. Wide, so no width cap here.
export default function AdminUsers() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ q: "", role: "", status: "" });
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [required, setRequired] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [dateTarget, setDateTarget] = useState(null);
  const [endDate, setEndDate] = useState(undefined);

  // Typing in the search box filters after a short pause, from the first page.
  useEffect(() => {
    const timer = setTimeout(() => { setFilters((current) => ({ ...current, q: search.trim() })); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => { api.getAdminStats().then(({ data }) => setRequired(data.subscriptions.required)).catch(() => {}); }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await api.getUsers({ ...filters, page });
      setUsers(response.data || []);
      setPagination(response.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [filters, page]);

  async function update(target, body, success) {
    setError("");
    setMessage("");
    try {
      const { data: next } = await api.updateUser(target._id, body);
      setUsers((list) => list.map((item) => (item._id === next._id ? next : item)));
      setMessage(success);
    } catch (err) {
      setError(err.message);
    }
  }

  const changeFilter = (name, value) => { setFilters((current) => ({ ...current, [name]: value })); setPage(1); };
  const ask = (target, title, description, confirmLabel, body, success, tone = "primary") => setConfirm({ target, title, description, confirmLabel, body, success, tone });
  const openDate = (target) => { setDateTarget(target); setEndDate(target.subscriptionEndsAt ? new Date(target.subscriptionEndsAt).toISOString().slice(0, 10) : undefined); };

  async function saveDate() {
    const target = dateTarget;
    setDateTarget(null);
    await update(target, { subscriptionEndsAt: new Date(`${endDate}T23:59:59.000Z`).toISOString() }, `Access for ${target.name} now ends on ${formatDate(`${endDate}T12:00:00.000Z`)}`);
  }

  function itemsFor(user) {
    const items = [];
    if (user.role === "student") {
      items.push({ label: "Add 3 months", onClick: () => update(user, { extendMonths: 3 }, `Added 3 months for ${user.name}`) });
      items.push({ label: "Set end date", onClick: () => openDate(user) });
      if (user.subscriptionEndsAt) items.push({ label: "Clear subscription", onClick: () => ask(user, "Clear subscription?", `${user.name} will have no subscription.`, "Clear subscription", { subscriptionEndsAt: null }, `Cleared the subscription for ${user.name}`, "danger") });
      items.push({ label: "Make admin", onClick: () => ask(user, "Make admin?", `${user.name} will be able to manage all content and users.`, "Make admin", { role: "admin" }, `${user.name} is now an admin`) });
    } else {
      items.push({ label: "Make student", onClick: () => ask(user, "Make student?", `${user.name} will lose admin access.`, "Make student", { role: "student" }, `${user.name} is now a student`) });
    }
    items.push({ type: "divider" });
    if (user.isActive) items.push({ label: "Deactivate", variant: "destructive", onClick: () => ask(user, "Deactivate account?", `${user.name} will be signed out and cannot log in until you reactivate the account.`, "Deactivate", { isActive: false }, `Deactivated ${user.name}`, "danger") });
    else items.push({ label: "Reactivate", onClick: () => update(user, { isActive: true }, `Reactivated ${user.name}`) });
    return items;
  }

  const chips = (label, options, value, name) => <div className="chip-row" role="group" aria-label={label} style={{ margin: 0 }}>
    {options.map(([key, text]) => <button type="button" className="chip" key={key || "all"} aria-pressed={value === key} onClick={() => changeFilter(name, key)}>{text}</button>)}
  </div>;
  const filtered = Boolean(filters.q || filters.role || filters.status);

  return <AdminLayout>
    <AstryxTheme>
      <VStack gap={4}>
        <Heading level={1}>Users</Heading>
        {required === false && <Banner status="info" title="Subscriptions are not enforced yet" description="Every student has access whether or not they have a subscription. Turn on REQUIRE_SUBSCRIPTION in the backend when you are ready." container="section" />}
        <VStack gap={2}>
          <TextInput type="search" label="Search users" isLabelHidden placeholder="Search by name or email" value={search} onChange={setSearch} hasClear width={320} />
          <HStack gap={4} wrap="wrap">{chips("Filter by role", ROLES, filters.role, "role")}{chips("Filter by status", STATUSES, filters.status, "status")}</HStack>
        </VStack>
        {message && !error && <Banner status="success" title={message} container="section" isDismissable onDismiss={() => setMessage("")} />}
        {error && <Banner status="error" title={error} container="section" />}
        {loading && <Loading />}
        {!loading && error && !users.length && <div><Button label="Retry" variant="secondary" onClick={load} /></div>}
        {!loading && !users.length && !error && <EmptyState icon={<Users size={32} aria-hidden="true" />} title={filtered ? "No user matches these filters" : "No users yet"}
          actions={filtered ? <Button label="Clear filters" variant="secondary" onClick={() => { setSearch(""); setFilters({ q: "", role: "", status: "" }); }} /> : undefined} />}
        {!loading && users.length > 0 && <List hasDividers>
          {users.map((user) => {
            const isMe = me && String(me.id) === String(user._id);
            return <ListItem key={user._id} label={<HStack gap={2} align="center" wrap="wrap"><Text weight="semibold">{user.name}{isMe ? " (you)" : ""}</Text>
              <Badge variant={user.role === "admin" ? "info" : "neutral"} label={user.role === "admin" ? "Admin" : "Student"} />{!user.isActive && <Badge variant="warning" label="Deactivated" />}</HStack>}
              description={[user.email, user.role === "student" ? subscriptionText(user) : ""].filter(Boolean).join(" · ")}
              endContent={<HStack gap={2} align="center">
                {user.role === "student" && <Button label="Add 1 month" size="sm" variant="secondary" onClick={() => update(user, { extendMonths: 1 }, `Added 1 month for ${user.name}`)} />}
                {!isMe && <MoreMenu label={`Options for ${user.name}`} alignment="end" items={itemsFor(user)} />}
              </HStack>} />;
          })}
        </List>}
        {pagination && pagination.totalPages > 1 && <HStack gap={3} align="center" justify="center">
          <Button label="Previous" variant="secondary" isDisabled={page <= 1} onClick={() => setPage(page - 1)} />
          <Text color="secondary">Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalUsers} users)</Text>
          <Button label="Next" variant="secondary" isDisabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} />
        </HStack>}
      </VStack>

      <ConfirmAstryx open={Boolean(confirm)} title={confirm?.title} description={confirm?.description} confirmLabel={confirm?.confirmLabel} tone={confirm?.tone}
        onCancel={() => setConfirm(null)} onConfirm={() => { const { target, body, success } = confirm; setConfirm(null); update(target, body, success); }} />

      <Dialog isOpen={Boolean(dateTarget)} onOpenChange={(open) => { if (!open) setDateTarget(null); }} purpose="form" width={420}>
        <DialogHeader title="Set end date" subtitle={dateTarget ? `The last day ${dateTarget.name} has access.` : ""} onOpenChange={(open) => { if (!open) setDateTarget(null); }} />
        <VStack gap={4} padding={4}>
          <DateInput label="Access ends on" value={endDate} onChange={setEndDate} />
          <HStack gap={2} justify="end"><Button label="Cancel" variant="ghost" onClick={() => setDateTarget(null)} /><Button label="Save date" variant="primary" isDisabled={!endDate} onClick={saveDate} /></HStack>
        </VStack>
      </Dialog>
    </AstryxTheme>
  </AdminLayout>;
}
