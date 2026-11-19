import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import AdminLayout from "../../components/admin/AdminLayout";
import { Button, Dialog, EmptyState, SelectField, Tabs, TextArea, TextField } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";
import Breadcrumbs from "../../components/admin/Breadcrumbs";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import StatusBadge from "../../components/admin/StatusBadge";
import StatusMessage from "../../components/admin/StatusMessage";
import { adminHeading, adminSection, chip, chipRow, formStack, headingActions, sectionHeading, textButton, uiLabel } from "../../components/admin/adminStyles";
import Switch from "../../components/admin/Switch";
import RichText from "../../components/shared/RichText";
import FormulaHelp from "../../components/admin/FormulaHelp";
import ImageField from "../../components/admin/ImageField";
import MoveButton from "../../components/admin/MoveButton";
import LessonHistory from "../../components/admin/LessonHistory";

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

  async function load(silent = false) {
    if (!silent) setLoading(true);
    setError("");
    try {
      const next = dataOf(await api.getAdminLesson(id));
      setLesson(next);
      if (!silent) setForm({ title: next.title, explanation: next.explanation, explanationImage: next.explanationImage || null, videoHost: next.videoHost || "", videoId: next.videoId || "" });
      if (next.courseCode || next.unitTitle) setContext({ courseCode: next.courseCode || "", unitTitle: next.unitTitle || "" });
    } catch (err) {
      setError(err.status === 404 ? "This lesson no longer exists" : err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  // A detail changed: save it at once and refresh quietly. The typed text stays in the box.
  async function persist(patch) {
    setError("");
    try {
      await api.updateLesson(id, patch);
      setMessage("Saved");
      await load(true);
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

  // "Add test" makes "Untitled test" at once and opens it; flashcards and materials open a small dialog.
  async function createTestNow() {
    try {
      const saved = dataOf(await api.createTest({ scope: "lesson", lesson: id, title: "Untitled test", order: (lesson.tests?.length || 0) + 1 }));
      navigate(`/admin/tests/${idOf(saved)}`, { state: { trail: [{ label: "Courses", to: "/admin" }, { label: context.courseCode || "Course" }, { label: context.unitTitle || "Unit", to: `/admin/lessons/${id}` }, { label: lesson.title, to: `/admin/lessons/${id}` }, { label: "Untitled test" }] } });
    } catch (err) { setError(err.message); }
  }

  function openContent(kind, item = null) {
      if (kind === "test") { createTestNow(); return; }
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
    { key: "materials", label: "Materials" },
    { key: "history", label: "History" }
  ];
  const list = lesson[tab] || [];
  const content = tab === "history" ? <LessonHistory lessonId={id} onRestored={() => { setMessage("Version restored"); load(); }} /> : tab === "details" ? <div className={`${adminSection} grid gap-4`}>
      <TextField label="Title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} onBlur={() => { if (form.title.trim() && form.title.trim() !== lesson.title) persist({ title: form.title.trim() }); }} />
      <TextArea label="Explanation" required rows="12" value={form.explanation} onChange={(event) => setForm({ ...form, explanation: event.target.value })} onBlur={() => { if (form.explanation.trim() && form.explanation !== lesson.explanation) persist({ explanation: form.explanation }); }} hint="Saves when you click away." />
      <div className="flex items-center justify-between"><p className="m-0 font-semibold">Preview</p><FormulaHelp /></div><div className="min-h-20 rounded-[6px] bg-muted p-4"><RichText>{form.explanation}</RichText></div>
      <ImageField label="Explanation image" value={form.explanationImage} onChange={(explanationImage) => { setForm({ ...form, explanationImage }); if (!explanationImage || explanationImage.alt) persist({ explanationImage }); }} />
      {form.explanation === "Explanation coming soon." && <p className="muted">This is still the placeholder explanation. Add real content before publishing.</p>}
      <div className="field"><span className={uiLabel}>Video</span><div className={chipRow} role="radiogroup" aria-label="Video host" style={{ margin: 0 }}>{[["", "None"], ["youtube", "YouTube"]].map(([value, label]) => <button type="button" role="radio" aria-checked={form.videoHost === value} className={chip} aria-pressed={form.videoHost === value} key={label} onClick={() => { setForm({ ...form, videoHost: value, videoId: value ? form.videoId : "" }); persist({ videoHost: value, videoId: value ? form.videoId : "" }); }}>{label}</button>)}</div></div>
      {form.videoHost === "youtube" && <><TextField label="Video link or ID" value={form.videoId} onChange={(event) => setVideo(event.target.value)} onBlur={() => { if (form.videoId !== (lesson.videoId || "")) persist({ videoHost: form.videoHost, videoId: form.videoId }); }} /><p className="muted">Video id: {form.videoId || "none"}</p></>}
    </div> : <section className={adminSection}>
      <div className={sectionHeading}><h2>{tabs.find((item) => item.key === tab).label}</h2><Button variant="primary" type="button" onClick={() => openContent(tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material")}>Add {tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material"}</Button></div>
      {list.length === 0 && <EmptyState title={`No ${tab} yet`} description={`Use the button above to add one.`} />}
      {list.map((item, index) => <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3" key={idOf(item)}>
        <button className={`${textButton} flex-1 text-left`} type="button" onClick={() => tab !== "tests" && openContent(tab === "flashcards" ? "flashcard" : "material", item)}>{tab === "flashcards" ? <RichText>{item.front?.text || ""}</RichText> : item.title || "Untitled"}</button>
        {tab === "flashcards" && <span className="min-w-0 flex-1 overflow-hidden"><RichText>{item.back?.text || ""}</RichText></span>}
        {tab === "materials" && <span className="muted">{item.kind === "file" ? "PDF" : "Link"}{item.file?.bytes ? ` · ${item.file.bytes} bytes` : ""}</span>}
        {item.isPublished !== undefined && <Switch checked={item.isPublished} onChange={(value) => toggleContent(item, tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material", value)} label={item.isPublished ? "Published" : "Publish"} />}
        {tab === "tests" && <Link to={`/admin/tests/${idOf(item)}`} state={{ trail: [{ label: "Courses", to: "/admin" }, { label: context.courseCode || "Course" }, { label: context.unitTitle || "Unit" }, { label: lesson.title, to: `/admin/lessons/${id}` }, { label: item.title }] }}>Open test</Link>}
        <MoveButton direction="up" disabled={index === 0} onClick={() => moveContent(item, tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material", -1)} />
        <MoveButton direction="down" disabled={index === list.length - 1} onClick={() => moveContent(item, tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material", 1)} />
        <Button variant="tertiary" type="button" onClick={() => removeContent(item, tab === "tests" ? "test" : tab === "flashcards" ? "flashcard" : "material")}>Delete</Button>
      </div>)}
    </section>;
  return <div className="min-h-[calc(100dvh-72px)] px-4 pt-6 pb-12"><div className="mx-auto max-w-[960px]">
    <Breadcrumbs items={[{ label: "Courses", to: "/admin" }, { label: context.courseCode || "Course" }, { label: context.unitTitle || "Unit" }, { label: lesson.title }]} />
    <div className={adminHeading}><h1>{lesson.title}</h1><div className={headingActions}><Button as={Link} variant="secondary" to={`/admin/preview/lessons/${id}`} state={{ from: location.pathname }}>Preview as student</Button><Switch checked={lesson.isPublished} onChange={publish} disabled={form.explanation === "Explanation coming soon."} label={lesson.isPublished ? "Published" : "Publish"} /></div></div>
    <StatusMessage message={error || message} error={Boolean(error)} />
    <Tabs label="Lesson sections" value={tab} onChange={setTab} tabs={tabs.map((item) => ({ id: item.key, label: item.label, panel: content }))} />
    {dialog && <Dialog open onClose={() => setDialog(null)} title={<>{dialog.item ? "Edit" : "Add"} {dialog.kind}</>} actions={<><Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit" form="content-form">Save</Button></>}><form id="content-form" className={formStack} onSubmit={saveContent}>
      {dialog.kind === "test" && <TextField label="Title" required value={dialogForm.title} onChange={(event) => setDialogForm({ ...dialogForm, title: event.target.value })} />}
      {dialog.kind === "flashcard" && <><TextArea label="Front" maxLength="500" required={!dialogForm.front.image?.url} value={dialogForm.front.text} onChange={(event) => setDialogForm({ ...dialogForm, front: { ...dialogForm.front, text: event.target.value } })} /><FormulaHelp /><RichText>{dialogForm.front.text}</RichText><ImageField compact label="Front image" value={dialogForm.front.image} onChange={(image) => setDialogForm({ ...dialogForm, front: { ...dialogForm.front, image } })} /><TextArea label="Back" maxLength="500" required={!dialogForm.back.image?.url} value={dialogForm.back.text} onChange={(event) => setDialogForm({ ...dialogForm, back: { ...dialogForm.back, text: event.target.value } })} /><RichText>{dialogForm.back.text}</RichText><ImageField compact label="Back image" value={dialogForm.back.image} onChange={(image) => setDialogForm({ ...dialogForm, back: { ...dialogForm.back, image } })} /></>}
      {dialog.kind === "material" && <><div className={chipRow} role="radiogroup" aria-label="Kind" style={{ margin: 0 }}>{[["link", "Link"], ["file", "PDF"]].map(([value, label]) => <button type="button" role="radio" aria-checked={dialogForm.kind === value} className={chip} aria-pressed={dialogForm.kind === value} key={value} disabled={Boolean(dialog.item) && dialogForm.kind !== value} onClick={() => setDialogForm({ ...dialogForm, kind: value })}>{label}</button>)}</div><TextField label="Title" required value={dialogForm.title} onChange={(event) => setDialogForm({ ...dialogForm, title: event.target.value })} /><TextArea label="Description" maxLength="300" value={dialogForm.description} onChange={(event) => setDialogForm({ ...dialogForm, description: event.target.value })} />{dialogForm.kind === "link" ? <TextField label="HTTPS address" required type="url" pattern="https://.*" value={dialogForm.linkUrl} onChange={(event) => setDialogForm({ ...dialogForm, linkUrl: event.target.value })} hint="Links must start with https://" /> : <TextField label="PDF file" required={!dialog.item} type="file" accept="application/pdf,.pdf" onChange={(event) => setDialogForm({ ...dialogForm, fileUpload: event.target.files[0] })} hint="Choose a PDF of 10 MB or less." />}<p className="muted">{dialog.item ? "The kind and file cannot be changed." : ""}</p></>}
    </form></Dialog>}
  </div></div>;
}
