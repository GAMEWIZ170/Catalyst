import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { api } from "../api/client";
import AdminLayout from "../components/admin/AdminLayout";
import ActionMenu from "../components/admin/ActionMenu";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import StatusMessage from "../components/admin/StatusMessage";
import Switch from "../components/admin/Switch";
import { Button, Dialog, EmptyState, TextArea, TextField } from "../components/ui";
import { ErrorState, Loading } from "./Courses";

const emptyCourse = { code: "", title: "", description: "", isPublished: false };

function getCourses(payload) {
  return Array.isArray(payload) ? payload : payload.data || [];
}

export default function AdminCourses() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyCourse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState("");
  const [createError, setCreateError] = useState("");

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? courses.filter((course) => `${course.code} ${course.title}`.toLowerCase().includes(term)) : courses;
  }, [courses, query]);

  async function load() {
    setLoading(true);
    setError("");
    // The overview is a nice extra: the course list must still work if it fails.
    api.getAdminStats().then(({ data }) => setStats(data)).catch(() => setStats(null));
    try {
      setCourses(getCourses(await api.getAdminCourses()));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(emptyCourse);
    setCreateError("");
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
  }

  async function createCourse(event) {
    event.preventDefault();
    setSaving(true);
    setCreateError("");
    try {
      const payload = await api.createCourse(form);
      const course = payload.data || payload;
      closeCreate();
      navigate(`/admin/courses/${course._id || course.id}`);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function publish(course, isPublished) {
    setMessage("");
    setError("");
    try {
      await api.updateCourse(course._id || course.id, { isPublished });
      setMessage(isPublished ? "Published" : "Unpublished");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteCourse() {
    setError("");
    try {
      await api.deleteCourse(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      setMessage("Course deleted");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return <AdminLayout>
    <div className="admin-heading">
      <div>
        <h1>Courses</h1>
        <p className="muted">Manage courses and their learning content.</p>
      </div>
      <Button onClick={openCreate}>New course</Button>
    </div>
    {stats && <dl className="admin-stats" aria-label="Overview">
      <div><dt>Students</dt><dd>{stats.students.total}</dd><dd className="muted">{stats.students.joinedLast7Days} joined this week</dd></div>
      <div><dt>Active this week</dt><dd>{stats.students.activeLast7Days}</dd><dd className="muted">{stats.testAttemptsLast7Days} test {stats.testAttemptsLast7Days === 1 ? "attempt" : "attempts"}</dd></div>
      {stats.subscriptions.required && <div><dt>Subscribed</dt><dd>{stats.subscriptions.active}</dd><dd className="muted">of {stats.students.total} students</dd></div>}
      <div><dt>Courses</dt><dd>{stats.courses.published}</dd><dd className="muted">published, {stats.courses.draft} {stats.courses.draft === 1 ? "draft" : "drafts"}</dd></div>
    </dl>}
    <StatusMessage message={message} error={Boolean(error)} />
    {!loading && !error && courses.length > 4 && <TextField className="course-search" label="Search courses" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code or title" />}
    {error && <ErrorState message={error} onRetry={load} />}
    {loading && <Loading />}
    {!loading && !error && courses.length === 0 && <EmptyState icon={BookOpen} title="No courses yet" description="Create the first course to start adding units and lessons." action={<Button onClick={openCreate}>New course</Button>} />}
    {!loading && !error && courses.length > 0 && visible.length === 0 && <p className="muted">No course matches "{query}".</p>}
    {!loading && !error && visible.length > 0 && <div className="admin-course-list">
      {visible.map((course) => {
        const id = course._id || course.id;
        return <article className="admin-course-row" key={id}>
          <Link className="admin-course-main" to={`/admin/courses/${id}`}>
            <strong>{course.code}</strong>
            <span>{course.title}</span>
            <small>{course.description}</small>
          </Link>
          <Switch checked={course.isPublished} onChange={(value) => publish(course, value)} label={course.isPublished ? "Published" : "Publish"} />
          <ActionMenu actions={[{ label: "Delete course", onSelect: () => setDeleteTarget(course) }]} />
        </article>;
      })}
    </div>}
    <Dialog open={createOpen} onClose={closeCreate} title="New course" actions={<>
      <Button variant="secondary" onClick={closeCreate}>Cancel</Button>
      <Button type="submit" form="create-course-form" loading={saving}>{saving ? "Creating..." : "Create course"}</Button>
    </>}>
      <form id="create-course-form" className="form-stack" onSubmit={createCourse}>
        {createError && <p className="form-error" role="alert">{createError}</p>}
        <TextField label="Code" required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
        <TextField label="Title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <TextArea label="Short description" required maxLength="200" hint={`${form.description.length}/200`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </form>
    </Dialog>
    <ConfirmDialog
      open={Boolean(deleteTarget)}
      title="Delete course?"
      description="The course will disappear for students. Its content is kept, and you can restore the course later from the Trash."
      confirmLabel="Delete course"
      onConfirm={deleteCourse}
      onCancel={() => setDeleteTarget(null)}
    />
  </AdminLayout>;
}
