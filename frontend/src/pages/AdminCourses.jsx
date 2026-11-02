import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import AdminLayout from "../components/admin/AdminLayout";
import ActionMenu from "../components/admin/ActionMenu";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import StatusBadge from "../components/admin/StatusBadge";
import StatusMessage from "../components/admin/StatusMessage";
import Switch from "../components/admin/Switch";

const emptyCourse = { code: "", title: "", description: "", isPublished: false };

function getCourses(payload) {
  return Array.isArray(payload) ? payload : payload.data || [];
}

export default function AdminCourses() {
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyCourse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
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
    dialogRef.current?.showModal();
  }

  function closeCreate() {
    dialogRef.current?.close();
  }

  async function createCourse(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = await api.createCourse(form);
      const course = payload.data || payload;
      closeCreate();
      navigate(`/admin/courses/${course._id || course.id}`);
    } catch (err) {
      setError(err.message);
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
      <button className="button button-primary" type="button" onClick={openCreate}>New course</button>
    </div>
    <StatusMessage message={message} error={Boolean(error)} />
    {error && <div className="error-state"><p>{error}</p><button className="button button-secondary" type="button" onClick={load}>Retry</button></div>}
    {loading && <p>Loading courses...</p>}
    {!loading && !error && courses.length === 0 && <div className="empty-state"><h2>No courses yet</h2><button className="button button-primary" type="button" onClick={openCreate}>New course</button></div>}
    {!loading && !error && courses.length > 0 && <div className="admin-course-list">
      {courses.map((course) => {
        const id = course._id || course.id;
        return <article className="admin-course-row" key={id}>
          <Link className="admin-course-main" to={`/admin/courses/${id}`}>
            <strong>{course.code}</strong>
            <span>{course.title}</span>
            <small>{course.description}</small>
          </Link>
          <StatusBadge isPublished={course.isPublished} />
          <Switch checked={course.isPublished} onChange={(value) => publish(course, value)} label={course.isPublished ? "Published" : "Publish"} />
          <ActionMenu actions={[{ label: "Delete course", onSelect: () => setDeleteTarget(course) }]} />
        </article>;
      })}
    </div>}
    <dialog ref={dialogRef} className="confirm-dialog create-course-dialog" onCancel={closeCreate}>
      <form onSubmit={createCourse}>
        <h2>New course</h2>
        <label className="admin-field">Code<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
        <label className="admin-field">Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label className="admin-field">Short description<textarea required maxLength="200" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><span className="muted">{form.description.length}/200</span></label>
        <div className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={closeCreate}>Cancel</button>
          <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Creating..." : "Create course"}</button>
        </div>
      </form>
    </dialog>
    <ConfirmDialog
      open={Boolean(deleteTarget)}
      title="Delete course?"
      description="The course will disappear for students. Its content is kept, but it cannot be restored from this page yet."
      confirmLabel="Delete course"
      onConfirm={deleteCourse}
      onCancel={() => setDeleteTarget(null)}
    />
  </AdminLayout>;
}
