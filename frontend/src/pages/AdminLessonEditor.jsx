import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import AdminLayout from "../components/admin/AdminLayout";
import { Button, Dialog, EmptyState, SelectField, Tabs, TextArea, TextField } from "../components/ui";
import { ErrorState, Loading } from "./Courses";
import Breadcrumbs from "../components/admin/Breadcrumbs";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import StatusBadge from "../components/admin/StatusBadge";
import StatusMessage from "../components/admin/StatusMessage";
import Switch from "../components/admin/Switch";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import RichText from "../components/RichText";
import FormulaHelp from "../components/admin/FormulaHelp";
import ImageField from "../components/admin/ImageField";
import MoveButton from "../components/admin/MoveButton";

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

  if (loading) return <AdminLayout nav={false}><Loading /></AdminLayout>;
  if (error && !lesson) return <AdminLayout nav={false}><ErrorState message={error} onRetry={load} /></AdminLayout>;

  const tabs = [
    { key: "details", label: "Details" },
    { key: "tests", label: "Tests" },
    { key: "flashcards", label: "Flashcards" },
    { key: "materials", label: "Materials" }
  ];
  const list = lesson[tab] || [];
  const content = tab === "details" ? <form className="admin-editor-section lesson-details-form" onSubmit={save}>
      <TextField label="Title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
      <TextArea label="Explanation" required rows="12" value={form.explanation} onChange={(event) => setForm({ ...form, explanation: event.target.value })} />
      <div className="field-heading"><p className="preview-label">Preview</p><FormulaHelp /></div><div className="explanation-preview"><RichText>{form.explanation}</RichText></div>
      <ImageField label="Explanation image" value={form.explanationImage} onChange={(explanationImage) => setForm({ ...form, explanationImage })} />
      {form.explanation === "Explanation coming soon." && <p className="muted">This is still the placeholder explanation. Add real content before publishing.</p>}
      <SelectField label="Video host" value={form.videoHost} onChange={(event) => setForm({ ...form, videoHost: event.target.value, videoId: event.target.value ? form.videoId : "" })}><option value="">None</option><option value="youtube">YouTube</option></SelectField>
      {form.videoHost === "youtube" && <><TextField label="Video link or ID" value={form.videoId} onChange={(event) => setVideo(event.target.value)} /><p className="muted">Video id: {form.videoId || "none"}</p></>}
      <div className="editor-actions"><span className="muted">{dirty ? "Unsaved changes" : ""}</span><Button variant="secondary" type="button" disabled={!dirty} onClick={() => setForm({ title: lesson.title, explanation: lesson.explanation, explanationImage: lesson.explanationImage || null, videoHost: lesson.videoHost || "", videoId: lesson.videoId || "" })}>Discard changes</Button><Button variant="primary" type="submit" disabled={!dirty || (form.explanationImage && !form.explanationImage.alt)}>Save changes</Button></div>
    </form> : <section className="admin-editor-section">
      <div className="section-heading"><h2>{tabs.find((item) => item.key === tab).label}</h2><Button variant="primary" type="button" onClick={() => openContent(tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material")}>Add {tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material"}</Button></div>
      {list.length === 0 && <EmptyState title={`No ${tab} yet`} description={`Use the button above to add one.`} />}
      {list.map((item, index) => <div className="lesson-content-row" key={idOf(item)}>
        <button className="text-button content-title" type="button" onClick={() => tab !== "tests" && openContent(tab === "flashcards" ? "flashcard" : "material", item)}>{tab === "flashcards" ? <RichText>{item.front?.text || ""}</RichText> : item.title || "Untitled"}</button>
        {tab === "flashcards" && <span className="content-preview"><RichText>{item.back?.text || ""}</RichText></span>}
        {tab === "materials" && <span className="muted">{item.kind === "file" ? "PDF" : "Link"}{item.file?.bytes ? ` · ${item.file.bytes} bytes` : ""}</span>}
        {item.isPublished !== undefined && <Switch checked={item.isPublished} onChange={(value) => toggleContent(item, tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material", value)} label={item.isPublished ? "Published" : "Publish"} />}
        {tab === "tests" && <Link to={`/admin/tests/${idOf(item)}`} state={{ trail: [{ label: "Courses", to: "/admin" }, { label: context.courseCode || "Course" }, { label: context.unitTitle || "Unit" }, { label: lesson.title, to: `/admin/lessons/${id}` }, { label: item.title }] }}>Open test</Link>}
        <MoveButton direction="up" disabled={index === 0} onClick={() => moveContent(item, tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material", -1)} />
        <MoveButton direction="down" disabled={index === list.length - 1} onClick={() => moveContent(item, tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material", 1)} />
        <Button variant="tertiary" type="button" onClick={() => removeContent(item, tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material")}>Delete</Button>
      </div>)}
    </section>;
  return <div className="admin-layout"><div className="admin-layout-inner">
    <Breadcrumbs items={[{ label: "Courses", to: "/admin" }, { label: context.courseCode || "Course" }, { label: context.unitTitle || "Unit" }, { label: lesson.title }]} />
    <div className="admin-heading"><h1>{lesson.title}</h1><Switch checked={lesson.isPublished} onChange={publish} disabled={form.explanation === "Explanation coming soon."} label={lesson.isPublished ? "Published" : "Publish"} /></div>
    <StatusMessage message={error || message} error={Boolean(error)} />
    <Tabs label="Lesson sections" value={tab} onChange={setTab} tabs={tabs.map((item) => ({ id: item.key, label: item.label, panel: content }))} />
    {dialog && <Dialog open onClose={() => setDialog(null)} title={<>{dialog.item ? "Edit" : "Add"} {dialog.kind}</>} actions={<><Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit" form="content-form">Save</Button></>}><form id="content-form" className="form-stack" onSubmit={saveContent}>
      {dialog.kind === "test" && <TextField label="Title" required value={dialogForm.title} onChange={(event) => setDialogForm({ ...dialogForm, title: event.target.value })} />}
      {dialog.kind === "flashcard" && <><TextArea label="Front" maxLength="500" required={!dialogForm.front.image?.url} value={dialogForm.front.text} onChange={(event) => setDialogForm({ ...dialogForm, front: { ...dialogForm.front, text: event.target.value } })} /><FormulaHelp /><RichText>{dialogForm.front.text}</RichText><ImageField compact label="Front image" value={dialogForm.front.image} onChange={(image) => setDialogForm({ ...dialogForm, front: { ...dialogForm.front, image } })} /><TextArea label="Back" maxLength="500" required={!dialogForm.back.image?.url} value={dialogForm.back.text} onChange={(event) => setDialogForm({ ...dialogForm, back: { ...dialogForm.back, text: event.target.value } })} /><RichText>{dialogForm.back.text}</RichText><ImageField compact label="Back image" value={dialogForm.back.image} onChange={(image) => setDialogForm({ ...dialogForm, back: { ...dialogForm.back, image } })} /></>}
      {dialog.kind === "material" && <><SelectField label="Kind" value={dialogForm.kind} disabled={Boolean(dialog.item)} onChange={(event) => setDialogForm({ ...dialogForm, kind: event.target.value })}><option value="link">Link</option><option value="file">PDF</option></SelectField><TextField label="Title" required value={dialogForm.title} onChange={(event) => setDialogForm({ ...dialogForm, title: event.target.value })} /><TextArea label="Description" maxLength="300" value={dialogForm.description} onChange={(event) => setDialogForm({ ...dialogForm, description: event.target.value })} />{dialogForm.kind === "link" ? <TextField label="HTTPS address" required type="url" pattern="https://.*" value={dialogForm.linkUrl} onChange={(event) => setDialogForm({ ...dialogForm, linkUrl: event.target.value })} hint="Links must start with https://" /> : <TextField label="PDF file" required={!dialog.item} type="file" accept="application/pdf,.pdf" onChange={(event) => setDialogForm({ ...dialogForm, fileUpload: event.target.files[0] })} hint="Choose a PDF of 10 MB or less." />}<p className="muted">{dialog.item ? "The kind and file cannot be changed." : ""}</p></>}
    </form></Dialog>}
    <ConfirmDialog open={blocker.state === "blocked"} title="Leave without saving?" description="Your unsaved changes will be lost." cancelLabel="Stay" confirmLabel="Leave" onConfirm={() => blocker.proceed()} onCancel={() => blocker.reset()} />
  </div></div>;
}
