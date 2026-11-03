import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import Breadcrumbs from "../components/admin/Breadcrumbs";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import StatusBadge from "../components/admin/StatusBadge";
import StatusMessage from "../components/admin/StatusMessage";
import Switch from "../components/admin/Switch";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import RichText from "../components/RichText";
import FormulaHelp from "../components/admin/FormulaHelp";
import ImageField from "../components/admin/ImageField";

function dataOf(payload) {
  return payload.data || payload;
}

function idOf(item) {
  return item._id || item.id;
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
  const location = useLocation();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [form, setForm] = useState(null);
  const [context, setContext] = useState(() => location.state?.context || { courseCode: "", unitTitle: "" });
  const [tab, setTab] = useState("details");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dialog, setDialog] = useState(null);
  const [dialogForm, setDialogForm] = useState(null);
  const dirty = Boolean(lesson && form && JSON.stringify(form) !== JSON.stringify({ title: lesson.title, explanation: lesson.explanation, explanationImage: lesson.explanationImage || null, videoHost: lesson.videoHost || "", videoId: lesson.videoId || "" }));
  const blocker = useUnsavedChanges(dirty);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const next = dataOf(await api.getAdminLesson(id));
      setLesson(next);
      setForm({ title: next.title, explanation: next.explanation, explanationImage: next.explanationImage || null, videoHost: next.videoHost || "", videoId: next.videoId || "" });
      if (next.courseCode || next.unitTitle) setContext({ courseCode: next.courseCode || "", unitTitle: next.unitTitle || "" });
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

  function openContent(kind, item = null) {
      if (kind === "test") setDialogForm({ title: item?.title || "Lesson test", order: item?.order || (lesson.tests?.length || 0) + 1 });
      if (kind === "flashcard") setDialogForm(item ? JSON.parse(JSON.stringify(item)) : { front: { text: "", image: null }, back: { text: "", image: null }, order: (lesson.flashcards?.length || 0) + 1 });
      if (kind === "material") setDialogForm(item ? JSON.parse(JSON.stringify(item)) : { title: "", description: "", kind: "link", linkUrl: "", order: (lesson.materials?.length || 0) + 1 });
      setDialog({ kind, item });
      setError("");
    }

  async function saveContent(event) {
      event.preventDefault();
      try {
        if (dialog.kind === "test") {
          const saved = dataOf(await api.createTest({ lesson: id, title: dialogForm.title, order: dialogForm.order }));
          navigate(`/admin/tests/${idOf(saved)}`, { state: { trail: [{ label: "Courses", to: "/admin" }, { label: context.courseCode || "Course" }, { label: context.unitTitle || "Unit", to: `/admin/lessons/${id}` }, { label: lesson.title, to: `/admin/lessons/${id}` }, { label: dialogForm.title }] } });
          return;
        }
        if (dialog.kind === "flashcard") {
          const body = { lesson: id, front: dialogForm.front, back: dialogForm.back, order: dialogForm.order };
          if (dialog.item) await api.updateFlashcard(idOf(dialog.item), body);
          else await api.createFlashcard(body);
        }
        if (dialog.kind === "material") {
          const body = { lesson: id, title: dialogForm.title, description: dialogForm.description, kind: dialogForm.kind, order: dialogForm.order };
          if (dialogForm.kind === "link") body.linkUrl = dialogForm.linkUrl;
          if (dialogForm.kind === "file" && dialogForm.fileUpload) {
            if (dialogForm.fileUpload.type !== "application/pdf" || dialogForm.fileUpload.size > 10 * 1024 * 1024) throw new Error("Choose a PDF of 10 MB or less.");
            const upload = new FormData();
            upload.append("file", dialogForm.fileUpload);
            const uploaded = dataOf(await api.uploadMaterial(upload));
            body.file = uploaded;
          }
          if (dialog.item) await api.updateMaterial(idOf(dialog.item), body);
          else await api.createMaterial(body);
        }
        setDialog(null);
        await load();
        setMessage("Saved");
      } catch (err) { setError(err.message); }
    }

  async function removeContent(item, kind) {
      try {
        if (kind === "test") await api.deleteTest(idOf(item));
        if (kind === "flashcard") await api.deleteFlashcard(idOf(item));
        if (kind === "material") await api.deleteMaterial(idOf(item));
        await load();
        setMessage("Deleted");
      } catch (err) { setError(err.message); }
    }

  async function toggleContent(item, kind, value) {
      try {
        if (kind === "test") await api.updateTest(idOf(item), { isPublished: value });
        if (kind === "flashcard") await api.updateFlashcard(idOf(item), { isPublished: value });
        if (kind === "material") await api.updateMaterial(idOf(item), { isPublished: value });
        await load();
      } catch (err) { setError(err.message); }
    }

  async function moveContent(item, kind, direction) {
      const items = lesson[`${kind}s`] || [];
      const index = items.findIndex((entry) => idOf(entry) === idOf(item));
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= items.length) return;
      const ids = items.map(idOf);
      [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
      try {
        if (kind === "test") await api.reorderTests({ scope: "lesson", parent: id, ids });
        if (kind === "flashcard") await api.reorderFlashcards({ lesson: id, ids });
        if (kind === "material") await api.reorderMaterials({ lesson: id, ids });
        await load();
        setMessage("Moved");
      } catch (err) { setError(err.message); }
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
      <div className="field-heading"><p className="preview-label">Preview</p><FormulaHelp /></div><div className="explanation-preview"><RichText>{form.explanation}</RichText></div>
      <ImageField label="Explanation image" value={form.explanationImage} onChange={(explanationImage) => setForm({ ...form, explanationImage })} />
      {form.explanation === "Explanation coming soon." && <p className="muted">This is still the placeholder explanation. Add real content before publishing.</p>}
      <label className="admin-field">Video host<select value={form.videoHost} onChange={(event) => setForm({ ...form, videoHost: event.target.value, videoId: event.target.value ? form.videoId : "" })}><option value="">None</option><option value="youtube">YouTube</option></select></label>
      {form.videoHost === "youtube" && <><label className="admin-field">Video link or ID<input value={form.videoId} onChange={(event) => setVideo(event.target.value)} /></label><p className="muted">Video id: {form.videoId || "none"}</p></>}
      <div className="editor-actions"><span className="muted">{dirty ? "Unsaved changes" : ""}</span><button className="button button-secondary" type="button" disabled={!dirty} onClick={() => setForm({ title: lesson.title, explanation: lesson.explanation, explanationImage: lesson.explanationImage || null, videoHost: lesson.videoHost || "", videoId: lesson.videoId || "" })}>Discard changes</button><button className="button button-primary" type="submit" disabled={!dirty || (form.explanationImage && !form.explanationImage.alt)}>Save changes</button></div>
    </form> : <section className="admin-editor-section">
      <div className="section-heading"><h2>{tabs.find((item) => item.key === tab).label}</h2><button className="button button-primary" type="button" onClick={() => openContent(tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material")}>Add {tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material"}</button></div>
      {list.length === 0 && <p>No {tab} yet.</p>}
      {list.map((item, index) => <div className="lesson-content-row" key={idOf(item)}>
        <button className="text-button content-title" type="button" onClick={() => tab !== "tests" && openContent(tab === "flashcards" ? "flashcard" : "material", item)}>{tab === "flashcards" ? <RichText>{item.front?.text || ""}</RichText> : item.title || "Untitled"}</button>
        {tab === "flashcards" && <span className="content-preview"><RichText>{item.back?.text || ""}</RichText></span>}
        {tab === "materials" && <span className="muted">{item.kind === "file" ? "PDF" : "Link"}{item.file?.bytes ? ` · ${item.file.bytes} bytes` : ""}</span>}
        {item.isPublished !== undefined && <Switch checked={item.isPublished} onChange={(value) => toggleContent(item, tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material", value)} label={item.isPublished ? "Published" : "Publish"} />}
        {tab === "tests" && <Link to={`/admin/tests/${idOf(item)}`} state={{ trail: [{ label: "Courses", to: "/admin" }, { label: context.courseCode || "Course" }, { label: context.unitTitle || "Unit" }, { label: lesson.title, to: `/admin/lessons/${id}` }, { label: item.title }] }}>Open test</Link>}
        <button className="icon-button" type="button" aria-label="Move up" disabled={index === 0} onClick={() => moveContent(item, tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material", -1)}>↑</button>
        <button className="icon-button" type="button" aria-label="Move down" disabled={index === list.length - 1} onClick={() => moveContent(item, tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material", 1)}>↓</button>
        <button className="text-button" type="button" onClick={() => removeContent(item, tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material")}>Delete</button>
      </div>)}
    </section>}
    {dialog && <div className="modal-backdrop" role="presentation"><form className="content-dialog" role="dialog" aria-modal="true" onSubmit={saveContent}>
      <h2>{dialog.item ? "Edit" : "Add"} {dialog.kind}</h2>
      {dialog.kind === "test" && <label className="admin-field">Title<input required value={dialogForm.title} onChange={(event) => setDialogForm({ ...dialogForm, title: event.target.value })} /></label>}
      {dialog.kind === "flashcard" && <><label className="admin-field">Front<textarea maxLength="500" required={!dialogForm.front.image?.url} value={dialogForm.front.text} onChange={(event) => setDialogForm({ ...dialogForm, front: { ...dialogForm.front, text: event.target.value } })} /></label><FormulaHelp /><RichText>{dialogForm.front.text}</RichText><ImageField compact label="Front image" value={dialogForm.front.image} onChange={(image) => setDialogForm({ ...dialogForm, front: { ...dialogForm.front, image } })} /><label className="admin-field">Back<textarea maxLength="500" required={!dialogForm.back.image?.url} value={dialogForm.back.text} onChange={(event) => setDialogForm({ ...dialogForm, back: { ...dialogForm.back, text: event.target.value } })} /></label><RichText>{dialogForm.back.text}</RichText><ImageField compact label="Back image" value={dialogForm.back.image} onChange={(image) => setDialogForm({ ...dialogForm, back: { ...dialogForm.back, image } })} /></>}
      {dialog.kind === "material" && <><label className="admin-field">Kind<select value={dialogForm.kind} disabled={Boolean(dialog.item)} onChange={(event) => setDialogForm({ ...dialogForm, kind: event.target.value })}><option value="link">Link</option><option value="file">PDF</option></select></label><label className="admin-field">Title<input required value={dialogForm.title} onChange={(event) => setDialogForm({ ...dialogForm, title: event.target.value })} /></label><label className="admin-field">Description<textarea maxLength="300" value={dialogForm.description} onChange={(event) => setDialogForm({ ...dialogForm, description: event.target.value })} /></label>{dialogForm.kind === "link" ? <label className="admin-field">HTTPS address<input required type="url" pattern="https://.*" value={dialogForm.linkUrl} onChange={(event) => setDialogForm({ ...dialogForm, linkUrl: event.target.value })} /><span className="muted">Links must start with https://</span></label> : <label className="admin-field">PDF file<input required={!dialog.item} type="file" accept="application/pdf,.pdf" onChange={(event) => setDialogForm({ ...dialogForm, fileUpload: event.target.files[0] })} /><span className="muted">Choose a PDF of 10 MB or less.</span></label>}<p className="muted">{dialog.item ? "The kind and file cannot be changed." : ""}</p></>}
      <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="button button-primary" type="submit">Save</button></div>
    </form></div>}
    <ConfirmDialog open={blocker.state === "blocked"} title="Leave without saving?" description="Your unsaved changes will be lost." cancelLabel="Stay" confirmLabel="Leave" onConfirm={() => blocker.proceed()} onCancel={() => blocker.reset()} />
  </div></div>;
}
