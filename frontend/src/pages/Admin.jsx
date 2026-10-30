import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ErrorState, Loading } from "./Courses";

const blankCourse = { code: "", title: "", description: "", isPublished: false };
const blankUnit = { course: "", title: "", order: 1 };
const blankLesson = { unit: "", title: "", order: 1, explanation: "", videoHost: "", videoId: "", isPublished: false };
const blankQuestion = { lesson: "", type: "mcq", text: "", options: "", correctAnswer: "", explanation: "", order: 1 };

export default function Admin() {
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState(null);
  const [form, setForm] = useState(blankCourse);
  const [unitForm, setUnitForm] = useState(blankUnit);
  const [lessonForm, setLessonForm] = useState(blankLesson);
  const [questionForm, setQuestionForm] = useState(blankQuestion);
  const [record, setRecord] = useState({ type: "course", id: "", payload: "" });
  const [adminLesson, setAdminLesson] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const units = courses.flatMap((course) => course.units || []);
  const lessons = units.flatMap((unit) => unit.lessons || []);

  async function load() {
    setError("");
    try {
      const courseResponse = await api.getAdminCourses();
      setCourses(courseResponse.data);
    } catch (err) {
      setError(err.message);
    }
    try {
      const userResponse = await api.getUsers();
      setUsers(userResponse);
    } catch (err) {
      setError((current) => current || err.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function submit(action, body, reset) {
    setError(""); setMessage("");
    try { await action(body); reset(); setMessage("Saved successfully."); await load(); }
    catch (err) { setError(err.message); }
  }

  async function remove(action, label) {
    if (!window.confirm(`Delete this ${label}?`)) return;
    try { await action(); setMessage(`${label} deleted.`); await load(); } catch (err) { setError(err.message); }
  }

  async function updateRecord(event) {
    event.preventDefault();
    let payload;
    try { payload = JSON.parse(record.payload || "{}"); }
    catch { setError("Update JSON must be valid JSON."); return; }
    const actions = {
      course: api.updateCourse,
      unit: api.updateUnit,
      lesson: api.updateLesson,
      question: api.updateQuestion
    };
    await submit((body) => actions[record.type](record.id, body), payload, () => setRecord({ ...record, id: "", payload: "" }));
  }

  async function loadAdminLesson(event) {
    event.preventDefault();
    try { setError(""); setAdminLesson((await api.getAdminLesson(record.id)).data); }
    catch (err) { setError(err.message); }
  }

  return <div className="content admin-content">
    <div className="section-heading"><div><div className="eyebrow">ADMINISTRATION</div><h1>Content studio</h1><p className="muted">Create and manage the learning experience.</p></div></div>
    {message && <div className="success-message">{message}</div>}{error && <ErrorState message={error} />}
    <AdminSection title="Courses">
      <FormGrid onSubmit={(event) => { event.preventDefault(); submit(api.createCourse, form, () => setForm(blankCourse)); }}>
        <Field label="Code"><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
        <Field label="Title"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Description"><input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <label className="check-field"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Published</label>
        <button className="button button-primary">Create course</button>
      </FormGrid>
      <AdminList items={courses} empty="No courses yet." render={(course) => <div className="admin-row" key={course._id}><div><strong>{course.code} · {course.title}</strong><span className="muted">{course.description}</span></div><div><span className={course.isPublished ? "status-live" : "status-draft"}>{course.isPublished ? "Published" : "Draft"}</span><button className="text-danger" onClick={() => remove(() => api.deleteCourse(course._id), "course")}>Delete</button></div></div>} />
    </AdminSection>
    <AdminSection title="Units">
      <FormGrid onSubmit={(e) => { e.preventDefault(); submit(api.createUnit, unitForm, () => setUnitForm(blankUnit)); }}>
        <Field label="Course">
          <select required value={unitForm.course} onChange={(e) => setUnitForm({ ...unitForm, course: e.target.value })}>
            <option value="">Select a course</option>
            {courses.map((course) => <option value={course._id} key={course._id}>{course.code} · {course.title}</option>)}
          </select>
        </Field>
        <Field label="Title"><input required value={unitForm.title} onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })} /></Field>
        <Field label="Order"><input type="number" min="1" required value={unitForm.order} onChange={(e) => setUnitForm({ ...unitForm, order: Number(e.target.value) })} /></Field>
        <button type="submit" className="button button-primary" disabled={!courses.length}>Create unit</button>
      </FormGrid>
      {!courses.length && <p className="muted admin-help">Create a course first; units must belong to an existing course.</p>}
    </AdminSection>
    <AdminSection title="Lessons">
      <FormGrid onSubmit={(e) => { e.preventDefault(); submit(api.createLesson, lessonForm, () => setLessonForm(blankLesson)); }}>
        <Field label="Unit">
          <select required value={lessonForm.unit} onChange={(e) => setLessonForm({ ...lessonForm, unit: e.target.value })}>
            <option value="">Select a unit</option>
            {units.map((unit) => <option value={unit._id} key={unit._id}>{unit.title}</option>)}
          </select>
        </Field>
        {Object.entries({ title: "Title", explanation: "Explanation", videoHost: "Video host", videoId: "Video ID" }).map(([key, label]) => <Field label={label} key={key}><input required={["title", "explanation"].includes(key)} value={lessonForm[key]} onChange={(e) => setLessonForm({ ...lessonForm, [key]: e.target.value })} /></Field>)}
        <Field label="Order"><input type="number" min="1" value={lessonForm.order} onChange={(e) => setLessonForm({ ...lessonForm, order: Number(e.target.value) })} /></Field>
        <label className="check-field"><input type="checkbox" checked={lessonForm.isPublished} onChange={(e) => setLessonForm({ ...lessonForm, isPublished: e.target.checked })} /> Published</label>
        <button type="submit" className="button button-primary" disabled={!units.length}>Create lesson</button>
      </FormGrid>
      {!units.length && <p className="muted admin-help">Create a unit first; lessons must belong to an existing unit.</p>}
    </AdminSection>
    <AdminSection title="Questions">
      <FormGrid onSubmit={(e) => { e.preventDefault(); submit(api.createQuestion, { ...questionForm, options: questionForm.options ? questionForm.options.split(",").map((item) => item.trim()) : undefined }, () => setQuestionForm(blankQuestion)); }}>
        <Field label="Lesson">
          <select required value={questionForm.lesson} onChange={(e) => setQuestionForm({ ...questionForm, lesson: e.target.value })}>
            <option value="">Select a lesson</option>
            {lessons.map((lesson) => <option value={lesson._id} key={lesson._id}>{lesson.title}</option>)}
          </select>
        </Field>
        <Field label="Type"><select value={questionForm.type} onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}><option value="mcq">Multiple choice</option><option value="true_false">True or false</option><option value="flashcard">Flashcard</option></select></Field>
        <Field label="Question text"><input required value={questionForm.text} onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })} /></Field>
        <Field label="Options (comma separated)"><input value={questionForm.options} onChange={(e) => setQuestionForm({ ...questionForm, options: e.target.value })} /></Field>
        <Field label="Correct answer"><input required value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })} /></Field>
        <Field label="Explanation"><input value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} /></Field>
        <Field label="Order"><input type="number" min="1" value={questionForm.order} onChange={(e) => setQuestionForm({ ...questionForm, order: Number(e.target.value) })} /></Field>
        <button type="submit" className="button button-primary" disabled={!lessons.length}>Create question</button>
      </FormGrid>
      {!lessons.length && <p className="muted admin-help">Create a lesson first; questions must belong to an existing lesson.</p>}
    </AdminSection>
    <AdminSection title="Manage existing records">
      <p className="muted admin-help">Use an ID and a JSON object for partial updates. Empty updates are rejected by the API.</p>
      <form className="admin-form-grid" onSubmit={updateRecord}>
        <Field label="Record type"><select value={record.type} onChange={(e) => setRecord({ ...record, type: e.target.value })}><option value="course">Course</option><option value="unit">Unit</option><option value="lesson">Lesson</option><option value="question">Question</option></select></Field>
        <Field label="Record ID"><input required value={record.id} onChange={(e) => setRecord({ ...record, id: e.target.value })} /></Field>
        <Field label="Update JSON"><input required placeholder='{"title":"Updated title"}' value={record.payload} onChange={(e) => setRecord({ ...record, payload: e.target.value })} /></Field>
        <button className="button button-primary">Update record</button>
      </form>
      <form className="admin-form-grid" onSubmit={loadAdminLesson}>
        <Field label="Lesson ID for full admin view"><input required value={record.type === "lesson" ? record.id : ""} onChange={(e) => setRecord({ ...record, type: "lesson", id: e.target.value })} /></Field>
        <button className="button button-secondary">Load lesson and answers</button>
      </form>
      {adminLesson && <div className="admin-detail"><strong>{adminLesson.title}</strong><span>{adminLesson.questions?.length || 0} questions · {adminLesson.isPublished ? "Published" : "Draft"}</span></div>}
      <div className="admin-delete-grid">
        <DeleteById label="unit" action={api.deleteUnit} onDone={load} />
        <DeleteById label="lesson" action={api.deleteLesson} onDone={load} />
        <DeleteById label="question" action={api.deleteQuestion} onDone={load} />
      </div>
    </AdminSection>
    <AdminSection title="Users">
      {!users ? <Loading /> : <AdminList items={users.data} empty="No users found." render={(user) => <div className="admin-row" key={user._id}><div><strong>{user.name}</strong><span className="muted">{user.email}</span></div><span className="status-live">{user.role}</span></div>} />}
    </AdminSection>
  </div>;
}

function AdminSection({ title, children }) { return <section className="admin-section"><h2>{title}</h2>{children}</section>; }
function FormGrid({ children, onSubmit }) { return <form className="admin-form-grid" onSubmit={onSubmit}>{children}</form>; }
function Field({ label, children }) { return <label className="admin-field"><span>{label}</span>{children}</label>; }
function AdminList({ items, empty, render }) { return <div className="admin-list">{items?.length ? items.map(render) : <p className="muted">{empty}</p>}</div>; }
function DeleteById({ label, action, onDone }) {
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  return <form className="delete-form" onSubmit={async (event) => {
    event.preventDefault();
    setError("");
    if (!window.confirm(`Delete this ${label}?`)) return;
    try { await action(id); setId(""); await onDone(); } catch (err) { setError(err.message); }
  }}><input required placeholder={`${label} ID`} value={id} onChange={(e) => setId(e.target.value)} /><button className="text-danger">Delete {label}</button>{error && <small className="form-error">{error}</small>}</form>;
}
