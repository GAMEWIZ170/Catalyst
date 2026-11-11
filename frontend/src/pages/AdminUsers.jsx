import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ActionMenu from "../components/admin/ActionMenu";
import AdminLayout from "../components/admin/AdminLayout";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import StatusMessage from "../components/admin/StatusMessage";
import { formatDate } from "../utils/dates";

const ROLE_OPTIONS = [["", "All roles"], ["student", "Students"], ["admin", "Admins"]];
const STATUS_OPTIONS = [["", "Any status"], ["active", "Active"], ["inactive", "Deactivated"], ["subscribed", "Subscribed"], ["expired", "No access"]];

function subscriptionText(user) {
  if (!user.subscriptionEndsAt) return "No subscription";
  const ends = new Date(user.subscriptionEndsAt);
  return ends > new Date() ? `Subscribed until ${formatDate(ends)}` : `Subscription ended ${formatDate(ends)}`;
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const dateDialog = useRef(null);
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

  function changeFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }

  function ask(target, title, description, confirmLabel, body, success, tone = "primary") {
    setConfirm({ target, title, description, confirmLabel, body, success, tone });
  }

  function openDate(target) {
    setDateTarget(target);
    setEndDate(target.subscriptionEndsAt ? new Date(target.subscriptionEndsAt).toISOString().slice(0, 10) : "");
    dateDialog.current?.showModal();
  }

  function closeDate() {
    dateDialog.current?.close();
    setDateTarget(null);
  }

  async function saveDate(event) {
    event.preventDefault();
    const target = dateTarget;
    closeDate();
    await update(target, { subscriptionEndsAt: new Date(`${endDate}T23:59:59.000Z`).toISOString() }, `Access for ${target.name} now ends on ${formatDate(`${endDate}T12:00:00.000Z`)}`);
  }

  function actionsFor(user) {
    const actions = [];
    if (user.role === "student") {
      actions.push({ label: "Add 3 months", onSelect: () => update(user, { extendMonths: 3 }, `Added 3 months for ${user.name}`) });
      actions.push({ label: "Set end date", onSelect: () => openDate(user) });
      if (user.subscriptionEndsAt) actions.push({ label: "Clear subscription", onSelect: () => ask(user, "Clear subscription?", `${user.name} will have no subscription.`, "Clear subscription", { subscriptionEndsAt: null }, `Cleared the subscription for ${user.name}`) });
      actions.push({ label: "Make admin", onSelect: () => ask(user, "Make admin?", `${user.name} will be able to manage all content and users.`, "Make admin", { role: "admin" }, `${user.name} is now an admin`) });
    } else {
      actions.push({ label: "Make student", onSelect: () => ask(user, "Make student?", `${user.name} will lose admin access.`, "Make student", { role: "student" }, `${user.name} is now a student`) });
    }
    if (user.isActive) actions.push({ label: "Deactivate", onSelect: () => ask(user, "Deactivate account?", `${user.name} will be signed out and cannot log in until you reactivate the account.`, "Deactivate", { isActive: false }, `Deactivated ${user.name}`, "danger") });
    else actions.push({ label: "Reactivate", onSelect: () => update(user, { isActive: true }, `Reactivated ${user.name}`) });
    return actions;
  }

  const filtered = Boolean(filters.q || filters.role || filters.status);
  return <AdminLayout>
    <div className="admin-heading">
      <div>
        <h1>Users</h1>
        <p className="muted">Find students and admins, manage access and subscriptions.</p>
      </div>
    </div>
    {required === false && <p className="notice">Subscriptions are not enforced yet, so every student has access whether or not they have a subscription. Turn on <code>REQUIRE_SUBSCRIPTION</code> in the backend when you are ready.</p>}
    <div className="filter-bar">
      <label className="admin-field">Search users<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" /></label>
      <label className="admin-field">Role<select value={filters.role} onChange={(event) => changeFilter("role", event.target.value)}>{ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="admin-field">Status<select value={filters.status} onChange={(event) => changeFilter("status", event.target.value)}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <StatusMessage message={error || message} error={Boolean(error)} />
    {loading && <p>Loading users...</p>}
    {!loading && !users.length && !error && <div className="empty-state"><h2>{filtered ? "No user matches these filters" : "No users yet"}</h2>{filtered && <button className="button button-secondary" type="button" onClick={() => { setSearch(""); setFilters({ q: "", role: "", status: "" }); setPage(1); }}>Clear filters</button>}</div>}
    {!loading && users.length > 0 && <div className="user-list">
      {users.map((user) => {
        const isMe = me && String(me.id) === String(user._id);
        return <article className="user-row" key={user._id}>
          <div className="user-main">
            <strong>{user.name}{isMe && <span className="muted"> (you)</span>}</strong>
            <span className="muted">{user.email}</span>
            {user.role === "student" && <span className="user-subscription">{subscriptionText(user)}</span>}
          </div>
          <div className="user-tags">
            <span className={`status-badge ${user.role === "admin" ? "status-badge--published" : "status-badge--draft"}`}>{user.role === "admin" ? "Admin" : "Student"}</span>
            {!user.isActive && <span className="status-badge status-badge--wrong">Deactivated</span>}
          </div>
          <div className="user-actions">
            {user.role === "student" && <button className="button button-secondary" type="button" onClick={() => update(user, { extendMonths: 1 }, `Added 1 month for ${user.name}`)}>Add 1 month</button>}
            {!isMe && <ActionMenu actions={actionsFor(user)} />}
          </div>
        </article>;
      })}
    </div>}
    {pagination && pagination.totalPages > 1 && <nav className="pager" aria-label="Pages">
      <button className="button button-secondary" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span className="muted">Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalUsers} users)</span>
      <button className="button button-secondary" type="button" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</button>
    </nav>}
    <ConfirmDialog
      open={Boolean(confirm)}
      title={confirm?.title}
      description={confirm?.description}
      confirmLabel={confirm?.confirmLabel}
      tone={confirm?.tone}
      onCancel={() => setConfirm(null)}
      onConfirm={() => { const { target, body, success } = confirm; setConfirm(null); update(target, body, success); }}
    />
    <dialog ref={dateDialog} className="confirm-dialog" onCancel={closeDate}>
      <form onSubmit={saveDate}>
        <h2>Set end date</h2>
        <p>{dateTarget ? `Choose the last day ${dateTarget.name} has access.` : ""}</p>
        <label className="admin-field">Access ends on<input type="date" required value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        <div className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={closeDate}>Cancel</button>
          <button className="button button-primary" type="submit">Save date</button>
        </div>
      </form>
    </dialog>
  </AdminLayout>;
}
