import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import Breadcrumbs from "../components/admin/Breadcrumbs";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import StatusBadge from "../components/admin/StatusBadge";
import StatusMessage from "../components/admin/StatusMessage";
import Switch from "../components/admin/Switch";
import useUnsavedChanges from "../hooks/useUnsavedChanges";

function dataOf(payload) {
  return payload.data || payload;
}

function videoIdFrom(value) {
  const input = value.trim();
  if (!input) return "";
  try {
    const url = new URL(input.includes("://") ? input : `https://${input}`);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
    if (url.pathname === "/watch") return url.searchParams.get("v") || "";
    const embed = url.pathname.match(/\/embed\/([^/]+)/);
    return embed ? embed[1] : input;
  } catch {
    return input;
  }
}

export default function AdminLessonEditor() {
  const { id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [form, setForm] = useState(null);
  const [context, setContext] = useState({ courseCode: "", unitTitle: "" });
  const [tab, setTab] = useState("details");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dirty = Boolean(lesson && form && JSON.stringify(form) !== JSON.stringify({ title: lesson.title, explanation: lesson.explanation, videoHost: lesson.videoHost || "", videoId: lesson.videoId || "" }));
  const blocker = useUnsavedChanges(dirty);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const next = dataOf(await api.getAdminLesson(id));
      setLesson(next);
      setForm({ title: next.title, explanation: next.explanation, videoHost: next.videoHost || "", videoId: next.videoId || "" });
      if (next.courseCode || next.unitTitle) setContext({ courseCode: next.courseCode || "", unitTitle: next.unitTitle || "" });
      else {
        const courses = dataOf(await api.getAdminCourses());
        for (const course of courses) {
          const tree = dataOf(await api.getAdminCourse(course._id || course.id));
          const unit = (tree.units || []).find((item) => (item.lessons || []).some((itemLesson) => (itemLesson._id || itemLesson.id) === id));
          if (unit) {
            setContext({ courseCode: tree.code, unitTitle: unit.title });
            break;
          }
        }
      }
    } catch (err) {
      setError(err.status === 404 ? "This lesson no longer exists" : err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function save(event) {
    event.preventDefault();
    try {
      await api.updateLesson(id, form);
      setMessage("Saved");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function publish(value) {
    if (value && form.explanation === "Explanation coming soon.") {
      setError("Add a real explanation before publishing this lesson.");
      return;
    }
    try {
      await api.updateLesson(id, { isPublished: value });
      setMessage(value ? "Published" : "Unpublished");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function setVideo(value) {
    setForm({ ...form, videoId: videoIdFrom(value) });
  }

  if (loading) return <div className="admin-layout"><div className="admin-layout-inner"><p>Loading lesson...</p></div></div>;
  if (error && !lesson) return <div className="admin-layout"><div className="admin-layout-inner"><div className="error-state"><p>{error}</p><button className="button button-secondary" type="button" onClick={load}>Retry</button></div></div></div>;

  const tabs = [
    { key: "details", label: "Details" },
    { key: "tests", label: "Tests" },
    { key: "flashcards", label: "Flashcards" },
    { key: "materials", label: "Materials" }
  ];
  const list = lesson[tab] || [];
  return <div className="admin-layout"><div className="admin-layout-inner">
    <Breadcrumbs items={[{ label: "Courses", to: "/admin" }, { label: context.courseCode || "Course" }, { label: context.unitTitle || "Unit" }, { label: lesson.title }]} />
    <div className="admin-heading"><h1>{lesson.title}</h1><Switch checked={lesson.isPublished} onChange={publish} disabled={form.explanation === "Explanation coming soon."} label={lesson.isPublished ? "Published" : "Publish"} /></div>
    <StatusMessage message={error || message} error={Boolean(error)} />
    <div className="admin-tabs" role="tablist" aria-label="Lesson sections" onKeyDown={(event) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const index = tabs.findIndex((item) => item.key === tab);
      const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      setTab(tabs[nextIndex].key);
      document.getElementById(`tab-${tabs[nextIndex].key}`)?.focus();
    }}>
      {tabs.map((item) => <button key={item.key} id={`tab-${item.key}`} className={tab === item.key ? "active" : ""} type="button" role="tab" aria-selected={tab === item.key} tabIndex={tab === item.key ? 0 : -1} onClick={() => setTab(item.key)}>{item.label}</button>)}
    </div>
    {tab === "details" ? <form className="admin-editor-section lesson-details-form" onSubmit={save}>
      <label className="admin-field">Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
      <label className="admin-field">Explanation<textarea required rows="12" value={form.explanation} onChange={(event) => setForm({ ...form, explanation: event.target.value })} /></label>
      <p className="preview-label">Preview</p><div className="explanation-preview">{form.explanation.split("\n").map((line, index) => <span key={index}>{line}{index < form.explanation.split("\n").length - 1 && <br />}</span>)}</div>
      {form.explanation === "Explanation coming soon." && <p className="muted">This is still the placeholder explanation. Add real content before publishing.</p>}
      <label className="admin-field">Video host<select value={form.videoHost} onChange={(event) => setForm({ ...form, videoHost: event.target.value, videoId: event.target.value ? form.videoId : "" })}><option value="">None</option><option value="youtube">YouTube</option></select></label>
      {form.videoHost === "youtube" && <><label className="admin-field">Video link or ID<input value={form.videoId} onChange={(event) => setVideo(event.target.value)} /></label><p className="muted">Video id: {form.videoId || "none"}</p></>}
      <div className="editor-actions"><span className="muted">{dirty ? "Unsaved changes" : ""}</span><button className="button button-secondary" type="button" disabled={!dirty} onClick={() => setForm({ title: lesson.title, explanation: lesson.explanation, videoHost: lesson.videoHost || "", videoId: lesson.videoId || "" })}>Discard changes</button><button className="button button-primary" type="submit" disabled={!dirty}>Save changes</button></div>
    </form> : <section className="admin-editor-section"><p className="muted">Editing arrives in the next update.</p>{list.length === 0 && <p>No {tab} yet.</p>}{list.map((item) => <div className="lesson-content-row" key={item._id || item.id}><span>{item.title || item.front || item.name || "Untitled"}</span>{item.isPublished !== undefined && <StatusBadge isPublished={item.isPublished} />}<span className="muted">{item.questionCount || item.questions?.length || ""}</span>{tab === "tests" && <Link to={`/admin/tests/${item._id || item.id}`}>Open test</Link>}</div>)}</section>}
    <ConfirmDialog open={blocker.state === "blocked"} title="Leave without saving?" description="Your unsaved changes will be lost." cancelLabel="Stay" confirmLabel="Leave" onConfirm={() => blocker.proceed()} onCancel={() => blocker.reset()} />
  </div></div>;
}
