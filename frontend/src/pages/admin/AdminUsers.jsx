import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info, MoreHorizontal, Search, Users, X } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import AdminLayout from "../../components/admin/AdminLayout";
import ConfirmAstryx from "../../components/astryx/ConfirmAstryx";
import { Badge, Button, Dialog, DropdownMenu, EmptyState } from "../../components/ui";
import { formatDate } from "../../utils/dates";
import { Loading } from "../learn/Courses";

const ROLES = [["", "All"], ["student", "Students"], ["admin", "Admins"]];
const STATUSES = [["", "Any status"], ["active", "Active"], ["inactive", "Deactivated"], ["subscribed", "Subscribed"], ["expired", "No access"]];

function subscriptionText(user) {
  if (!user.subscriptionEndsAt) return "No subscription";
  const ends = new Date(user.subscriptionEndsAt);
  return ends > new Date() ? `Subscribed until ${formatDate(ends)}` : `Subscription ended ${formatDate(ends)}`;
}

// Filters are chips (rule 3). Confirmations and the end-date picker are dialogs. Wide, so no width cap here.
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
  const [endDate, setEndDate] = useState("");

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
  const openDate = (target) => { setDateTarget(target); setEndDate(target.subscriptionEndsAt ? new Date(target.subscriptionEndsAt).toISOString().slice(0, 10) : ""); };

  async function saveDate() {
    const target = dateTarget;
    setDateTarget(null);
    await update(target, { subscriptionEndsAt: new Date(`${endDate}T23:59:59.000Z`).toISOString() }, `Access for ${target.name} now ends on ${formatDate(`${endDate}T12:00:00.000Z`)}`);
  }

  function itemsFor(user) {
    const items = [];
    if (user.role === "student") {
      items.push({ label: "Add 3 months", onSelect: () => update(user, { extendMonths: 3 }, `Added 3 months for ${user.name}`) });
      items.push({ label: "Set end date", onSelect: () => openDate(user) });
      if (user.subscriptionEndsAt) items.push({ label: "Clear subscription", onSelect: () => ask(user, "Clear subscription?", `${user.name} will have no subscription.`, "Clear subscription", { subscriptionEndsAt: null }, `Cleared the subscription for ${user.name}`, "danger") });
      items.push({ label: "Make admin", onSelect: () => ask(user, "Make admin?", `${user.name} will be able to manage all content and users.`, "Make admin", { role: "admin" }, `${user.name} is now an admin`) });
    } else {
      items.push({ label: "Make student", onSelect: () => ask(user, "Make student?", `${user.name} will lose admin access.`, "Make student", { role: "student" }, `${user.name} is now a student`) });
    }
    items.push({ separator: true });
    if (user.isActive) items.push({ label: "Deactivate", danger: true, onSelect: () => ask(user, "Deactivate account?", `${user.name} will be signed out and cannot log in until you reactivate the account.`, "Deactivate", { isActive: false }, `Deactivated ${user.name}`, "danger") });
    else items.push({ label: "Reactivate", onSelect: () => update(user, { isActive: true }, `Reactivated ${user.name}`) });
    return items;
  }

  const chips = (label, options, value, name) => <div className="chip-row" role="group" aria-label={label} style={{ margin: 0 }}>
    {options.map(([key, text]) => <button type="button" className="chip" key={key || "all"} aria-pressed={value === key} onClick={() => changeFilter(name, key)}>{text}</button>)}
  </div>;
  const filtered = Boolean(filters.q || filters.role || filters.status);

  return <AdminLayout>
    <div className="grid gap-4">
      <h1 className="m-0 text-3xl leading-tight font-bold">Users</h1>
      {required === false && <p className="m-0 flex items-start gap-2 rounded-lg bg-info/15 p-4" role="status"><Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span><strong>Subscriptions are not enforced yet.</strong> Every student has access whether or not they have a subscription. Turn on REQUIRE_SUBSCRIPTION in the backend when you are ready.</span></p>}
      <div className="grid gap-2">
        <div className="relative max-w-sm">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input type="search" aria-label="Search users" placeholder="Search by name or email" value={search} onChange={(event) => setSearch(event.target.value)}
            className="min-h-11 w-full rounded-pill border border-input bg-card pr-11 pl-10 font-sans text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-search-cancel-button]:hidden" />
          {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-pill border-0 bg-transparent text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X size={16} aria-hidden="true" /></button>}
        </div>
        <div className="flex flex-wrap gap-4">{chips("Filter by role", ROLES, filters.role, "role")}{chips("Filter by status", STATUSES, filters.status, "status")}</div>
      </div>
      {message && !error && <p className="m-0 flex items-center gap-2 rounded-lg bg-success/15 p-3" role="status"><CheckCircle2 size={18} aria-hidden="true" /><span className="min-w-0 flex-1">{message}</span>
        <button type="button" aria-label="Dismiss message" onClick={() => setMessage("")} className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-pill border-0 bg-transparent hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><X size={16} aria-hidden="true" /></button></p>}
      {error && <p className="m-0 flex items-center gap-2 text-destructive" role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
      {loading && <Loading />}
      {!loading && error && !users.length && <div><Button variant="secondary" onClick={load}>Retry</Button></div>}
      {!loading && !users.length && !error && <EmptyState icon={Users} title={filtered ? "No user matches these filters" : "No users yet"}
        action={filtered ? <Button variant="secondary" onClick={() => { setSearch(""); setFilters({ q: "", role: "", status: "" }); }}>Clear filters</Button> : undefined} />}
      {!loading && users.length > 0 && <ul className="m-0 grid list-none p-0">
        {users.map((user) => {
          const isMe = me && String(me.id) === String(user._id);
          return <li key={user._id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border py-3 last:border-b-0">
            <div className="grid min-w-0 flex-[1_1_16rem] gap-0.5">
              <span className="flex flex-wrap items-center gap-2"><strong>{user.name}{isMe ? " (you)" : ""}</strong>
                <Badge tone={user.role === "admin" ? "info" : "neutral"}>{user.role === "admin" ? "Admin" : "Student"}</Badge>{!user.isActive && <Badge tone="warning">Deactivated</Badge>}</span>
              <span className="text-sm text-muted-foreground">{[user.email, user.role === "student" ? subscriptionText(user) : ""].filter(Boolean).join(" · ")}</span>
            </div>
            <div className="flex items-center gap-2">
              {user.role === "student" && <Button size="sm" variant="secondary" onClick={() => update(user, { extendMonths: 1 }, `Added 1 month for ${user.name}`)}>Add 1 month</Button>}
              {!isMe && <DropdownMenu trigger={<Button variant="tertiary" size="sm" aria-label={`Options for ${user.name}`}><MoreHorizontal size={18} aria-hidden="true" /></Button>} items={itemsFor(user)} />}
            </div>
          </li>;
        })}
      </ul>}
      {pagination && pagination.totalPages > 1 && <div className="flex items-center justify-center gap-3">
        <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
        <span className="text-muted-foreground">Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalUsers} users)</span>
        <Button variant="secondary" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
      </div>}
    </div>

    <ConfirmAstryx open={Boolean(confirm)} title={confirm?.title} description={confirm?.description} confirmLabel={confirm?.confirmLabel} tone={confirm?.tone}
      onCancel={() => setConfirm(null)} onConfirm={() => { const { target, body, success } = confirm; setConfirm(null); update(target, body, success); }} />

    <Dialog open={Boolean(dateTarget)} onClose={() => setDateTarget(null)} title="Set end date"
      actions={<><Button variant="tertiary" onClick={() => setDateTarget(null)}>Cancel</Button><Button disabled={!endDate} onClick={saveDate}>Save date</Button></>}>
      <div className="grid gap-3">
        {dateTarget && <p className="m-0 text-muted-foreground">The last day {dateTarget.name} has access.</p>}
        <label className="grid gap-1.5 font-semibold">Access ends on
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)}
            className="min-h-11 rounded-pill border border-input bg-card px-4 font-sans text-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
        </label>
      </div>
    </Dialog>
  </AdminLayout>;
}
