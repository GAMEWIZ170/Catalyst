import { plural } from "../../utils/plural";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import AdminLayout from "../../components/admin/AdminLayout";
import { Button, Card, Checkbox, SelectField, TextArea, TextField } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";
import Breadcrumbs from "../../components/admin/Breadcrumbs";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import ActionMenu from "../../components/admin/ActionMenu";
import InlineRename from "../../components/admin/InlineRename";
import StatusBadge from "../../components/admin/StatusBadge";
import StatusMessage from "../../components/admin/StatusMessage";
import Switch from "../../components/admin/Switch";
import CourseDetails from "../../components/admin/CourseDetails";
import MoveButton from "../../components/admin/MoveButton";

function dataOf(payload) {
  return payload.data || payload;
}

function idOf(item) {
  return item._id || item.id;
}

export default function AdminCourseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [justAdded, setJustAdded] = useState(null);   // id of a unit just created, opened for naming
  const [categoryNames, setCategoryNames] = useState([]);   // categories already used by other courses, offered as suggestions
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [summaryBusy, setSummaryBusy] = useState(null); // id of the unit whose PDF is being made
  const [focusTarget, setFocusTarget] = useState(null);
  const unitButtonRefs = useRef({});
  const lessonButtonRefs = useRef({});

  async function load(silent = false) {
    if (!silent) setLoading(true);
    setError("");
    try {
      const next = dataOf(await api.getAdminCourse(id));
      setCourse(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    api.getCategories().then(({ data }) => setCategoryNames((data || []).filter((item) => item.slug !== "general").map((item) => item.name))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!focusTarget) return;
    const ref = focusTarget.kind === "unit" ? unitButtonRefs.current[`${focusTarget.id}-${focusTarget.direction}`] : lessonButtonRefs.current[`${focusTarget.id}-${focusTarget.direction}`];
    ref?.focus();
    if (!ref) document.querySelector(`[data-focus-key="${focusTarget.id}-${focusTarget.direction}"]`)?.focus();
    setFocusTarget(null);
  }, [course, focusTarget]);

  // A detail changed: save it at once and refresh quietly. Throws so the details rows can show the problem.
  async function saveCourse(patch) {
    await api.updateCourse(id, patch);
    await load(true);
  }

  async function setFree(value) {
    setError("");
    try {
      await api.updateCourse(id, { isFree: value });
      setMessage(value ? "Marked free" : "No longer free");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function publish(value) {
    setError("");
    try {
      await api.updateCourse(id, { isPublished: value });
      setMessage(value ? "Published" : "Unpublished");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function reorder(kind, parent, items, index, direction) {
    const ids = items.map(idOf);
    const target = index + direction;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      if (kind === "unit") await api.reorderUnits({ course: parent, ids });
      else await api.reorderLessons({ unit: parent, ids });
      setMessage("Moved");
      const movedToEnd = target === items.length - 1;
      const movedToStart = target === 0;
      setFocusTarget({
        kind,
        id: idOf(items[index]),
        direction: movedToEnd ? "up" : movedToStart ? "down" : direction < 0 ? "up" : "down"
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Makes a PDF of the unit's published lessons and saves it as an unpublished material on the unit's first lesson.
  async function createSummary(unit) {
    const unitId = idOf(unit);
    setSummaryBusy(unitId);
    setError("");
    setMessage("");
    try {
      const response = await api.createUnitSummaryPdf(unitId);
      setMessage(`Summary PDF of ${response.data.lessonCount} ${response.data.lessonCount === 1 ? "lesson" : "lessons"} saved as a material on the first lesson of "${unit.title}". Open that lesson's Materials tab to check it and publish it.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSummaryBusy(null);
    }
  }

  // "Add unit" makes "Untitled unit" at once and opens its name for typing.
  async function createUnit() {
    try {
      const created = dataOf(await api.createUnit({ course: id, title: "Untitled unit", order: (course.units || []).length + 1 }));
      setJustAdded(idOf(created));
      await load(true);
    } catch (err) {
      setError(err.message);
    }
  }

  // "Add lesson" makes "Untitled lesson" at once and opens it, where its title is the first thing to change.
  async function createLesson(unit) {
    try {
      const created = dataOf(await api.createLesson({ unit: idOf(unit), title: "Untitled lesson", order: (unit.lessons || []).length + 1, explanation: "Explanation coming soon.", isPublished: false }));
      navigate(`/admin/lessons/${idOf(created)}`, { state: { context: { courseCode: course.code || "", unitTitle: unit.title } } });
    } catch (err) {
      setError(err.message);
    }
  }

  async function createTest(scope, parent) {
    try {
      const currentTests = scope === "course" ? (course.tests || course.courseTests || []) : (course.units || []).find((unit) => idOf(unit) === parent)?.tests || [];
      const created = dataOf(await api.createTest({ scope, [scope]: parent, title: "Untitled test", order: currentTests.length + 1, isPublished: false }));
      navigate(`/admin/tests/${idOf(created)}`, { state: { trail: [{ label: "Courses", to: "/admin" }, { label: course.code || course.title, to: `/admin/courses/${id}` }, ...(scope === "unit" ? [{ label: (course.units || []).find((unit) => idOf(unit) === parent)?.title || "Unit" }] : []), { label: created.title || "Untitled test" }] } });
    } catch (err) {
      setError(err.message);
    }
  }

  async function renameUnit(unit, title) {
    try {
      await api.updateUnit(idOf(unit), { title });
      setMessage("Saved");
      await load(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeTarget() {
    try {
      if (confirmTarget.type === "unit") await api.deleteUnit(idOf(confirmTarget.item));
      if (confirmTarget.type === "lesson") await api.deleteLesson(idOf(confirmTarget.item));
      setConfirmTarget(null);
      setMessage("Deleted");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <AdminLayout nav={false}><Loading /></AdminLayout>;
  if (error && !course) return <AdminLayout nav={false}><ErrorState message={error} onRetry={load} /></AdminLayout>;

  const units = course.units || [];
  const courseTests = course.tests || course.courseTests || [];
  return <div className="admin-layout"><div className="admin-layout-inner admin-capped">
    <Breadcrumbs items={[{ label: "Courses", to: "/admin" }, { label: course.code }]} />
    <div className="admin-heading"><h1>{course.title || course.code}</h1><Switch checked={course.isPublished} onChange={publish} label={course.isPublished ? "Published" : "Publish"} /><Switch checked={Boolean(course.isFree)} onChange={setFree} label={course.isFree ? "Free for everyone" : "Make free"} /></div>
    <StatusMessage message={error || message} error={Boolean(error)} />
    <section className="admin-editor-section">
      <CourseDetails course={course} categoryNames={categoryNames} onSave={saveCourse} />
    </section>
    <section className="admin-editor-section">
      <h2>Units and lessons</h2>
      <div className="admin-tree">
        {units.map((unit, index) => {
          const unitId = idOf(unit);
          const lessons = unit.lessons || [];
          return <article className="unit-card" key={unitId}>
            <header className="tree-item-header"><InlineRename name={unit.title} autoEdit={justAdded === unitId} onSave={(title) => renameUnit(unit, title)} /><div className="tree-controls"><MoveButton buttonRef={(element) => { unitButtonRefs.current[`${unitId}-up`] = element; }} direction="up" disabled={index === 0} onClick={() => reorder("unit", id, units, index, -1)} /><MoveButton buttonRef={(element) => { unitButtonRefs.current[`${unitId}-down`] = element; }} direction="down" disabled={index === units.length - 1} onClick={() => reorder("unit", id, units, index, 1)} /><ActionMenu actions={[{ label: "Delete unit", onSelect: () => setConfirmTarget({ type: "unit", item: unit }) }]} /></div></header>
            {lessons.map((lesson, lessonIndex) => {
              const lessonId = idOf(lesson);
              return <div className="lesson-row" key={lessonId}>
                <Link to={`/admin/lessons/${lessonId}`} state={{ context: { courseCode: course.code || "", unitTitle: unit.title } }}><strong>{lesson.title}</strong></Link>
                <div className="lesson-meta"><StatusBadge isPublished={lesson.isPublished} /><span className="count-chip">{plural(lesson.testCount || 0, "test")}</span><span className="count-chip">{plural(lesson.flashcardCount || 0, "flashcard")}</span><span className="count-chip">{plural(lesson.materialCount || 0, "material")}</span>{lesson.hasVideo && <span className="count-chip">Video</span>}</div>
                <div className="tree-controls"><MoveButton buttonRef={(element) => { lessonButtonRefs.current[`${lessonId}-up`] = element; }} direction="up" disabled={lessonIndex === 0} onClick={() => reorder("lesson", unitId, lessons, lessonIndex, -1)} /><MoveButton buttonRef={(element) => { lessonButtonRefs.current[`${lessonId}-down`] = element; }} direction="down" disabled={lessonIndex === lessons.length - 1} onClick={() => reorder("lesson", unitId, lessons, lessonIndex, 1)} /><Switch checked={lesson.isPublished} onChange={(value) => api.updateLesson(lessonId, { isPublished: value }).then(load).catch((err) => setError(err.message))} label={lesson.isPublished ? "Published" : "Publish"} /><ActionMenu actions={[{ label: "Delete lesson", onSelect: () => setConfirmTarget({ type: "lesson", item: lesson }) }]} /></div>
              </div>;
            })}
            {unit.tests?.map((test) => <Link className="test-row" key={idOf(test)} to={`/admin/tests/${idOf(test)}`} state={{ trail: [{ label: "Courses", to: "/admin" }, { label: course.code || course.title, to: `/admin/courses/${id}` }, { label: unit.title, to: `/admin/courses/${id}` }, { label: test.title }] }}><span>{test.title}</span><StatusBadge isPublished={test.isPublished} /><span>{test.questionCount || test.questions?.length || 0} questions</span></Link>)}
            <div className="tree-add-actions"><Button variant="secondary" type="button" onClick={() => createLesson(unit)}>Add lesson</Button><Button variant="secondary" type="button" onClick={() => createTest("unit", unitId)}>Add unit test</Button><Button variant="secondary" type="button" loading={summaryBusy === unitId} disabled={Boolean(summaryBusy) || lessons.length === 0} onClick={() => createSummary(unit)}>Create summary PDF</Button></div>
          </article>;
        })}
      </div>
      <Button variant="secondary" type="button" onClick={createUnit}>Add unit</Button>
    </section>
    <section className="admin-editor-section"><h2>Course tests</h2>{courseTests.map((test) => <Link className="test-row" key={idOf(test)} to={`/admin/tests/${idOf(test)}`} state={{ trail: [{ label: "Courses", to: "/admin" }, { label: course.code || course.title, to: `/admin/courses/${id}` }, { label: test.title }] }}><span>{test.title}</span><StatusBadge isPublished={test.isPublished} /><span>{test.questionCount || test.questions?.length || 0} questions</span></Link>)}<Button variant="secondary" type="button" onClick={() => createTest("course", id)}>Add course test</Button></section>
    <ConfirmDialog open={Boolean(confirmTarget)} title={`Delete ${confirmTarget?.type || "item"}?`} description="This content will be removed from the course. You can restore it later from the Trash." confirmLabel="Delete" onConfirm={removeTarget} onCancel={() => setConfirmTarget(null)} />
  </div></div>;
}
