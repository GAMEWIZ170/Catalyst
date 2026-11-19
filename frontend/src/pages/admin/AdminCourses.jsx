import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, BookOpen, MoreHorizontal, Plus, Search, Trash2, X } from "lucide-react";
import { chip, chipRow } from "../../components/admin/adminStyles";
import { api } from "../../api/client";
import AdminLayout from "../../components/admin/AdminLayout";
import { Button, Dialog, DropdownMenu, EmptyState, Switch } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";

const getCourses = (payload) => (Array.isArray(payload) ? payload : payload.data || []);
const categoryOf = (course) => (typeof course.category === "string" ? course.category.trim() : "");

// The course list. "New course" makes a course at once ("Untitled course") and opens it, where its title is ready to change.
// Filter by category with the chips, or search by code or title. Publishing is a switch; Delete is in each row's "..." menu.
export default function AdminCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");   // "" = all, "__general" = courses with no category
  const [creating, setCreating] = useState(false);

  const categories = useMemo(() => [...new Set(courses.map(categoryOf).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [courses]);
  const hasGeneral = courses.some((course) => !categoryOf(course));
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return courses
      .filter((course) => !category || (category === "__general" ? !categoryOf(course) : categoryOf(course) === category))
      .filter((course) => !term || `${course.code} ${course.title}`.toLowerCase().includes(term));
  }, [courses, query, category]);

  async function load(silent = false) {
    if (!silent) setLoading(true);
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

  async function createCourse() {
    setCreating(true);
    setError("");
    try {
      // The code must be unique, so the new course gets a temporary one the admin changes in the editor.
      const code = `NEW-${Date.now().toString(36).toUpperCase()}`;
      const payload = await api.createCourse({ code, title: "Untitled course", description: "Add a short description." });
      const course = payload.data || payload;
      navigate(`/admin/courses/${course._id || course.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  async function publish(course, isPublished) {
    setCourses((rows) => rows.map((row) => ((row._id || row.id) === (course._id || course.id) ? { ...row, isPublished } : row)));
    try {
      await api.updateCourse(course._id || course.id, { isPublished });
      load(true);
    } catch (err) {
      setError(err.message);
      load(true);
    }
  }

  async function deleteCourse() {
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.deleteCourse(target._id || target.id);
      await load(true);
    } catch (err) {
      setError(err.message);
    }
  }

  const newButton = <Button icon={Plus} loading={creating} onClick={createCourse}>New course</Button>;
  
  return <AdminLayout>
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="m-0 text-3xl leading-tight font-bold">Courses</h1>
          {stats && <p className="m-0 text-muted-foreground">
            {stats.students.total} students · {stats.students.activeLast7Days} active this week · {stats.courses.published} published, {stats.courses.draft} {stats.courses.draft === 1 ? "draft" : "drafts"}
          </p>}
        </div>
        {newButton}
      </div>

      {error && courses.length > 0 && <p className="m-0 flex items-center gap-2 text-destructive" role="alert"><AlertCircle size={16} aria-hidden="true" />{error}
        <button type="button" aria-label="Dismiss error" onClick={() => setError("")} className="ml-auto grid size-8 cursor-pointer place-items-center rounded-pill border-0 bg-transparent hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><X size={16} aria-hidden="true" /></button></p>}
      {loading && <Loading />}
      {error && !loading && courses.length === 0 && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && courses.length === 0 && <EmptyState icon={BookOpen} title="No courses yet" description="Create the first course to start adding units and lessons." action={newButton} />}

      {!loading && courses.length > 0 && <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {categories.length > 0
            ? <div className={chipRow} role="group" aria-label="Filter by category" style={{ margin: 0 }}>
              <button type="button" className={chip} aria-pressed={!category} onClick={() => setCategory("")}>All</button>
              {categories.map((name) => <button type="button" className={chip} key={name} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}
              {hasGeneral && <button type="button" className={chip} aria-pressed={category === "__general"} onClick={() => setCategory("__general")}>General</button>}
            </div>
            : <span />}
          {courses.length > 4 && <div className="relative w-full sm:w-64">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input type="search" aria-label="Search courses" placeholder="Search by code or title" value={query} onChange={(event) => setQuery(event.target.value)}
              className="min-h-11 w-full rounded-pill border border-input bg-card pr-4 pl-10 font-sans text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
          </div>}
        </div>
        {visible.length === 0
          ? <p className="m-0 text-muted-foreground">No course matches{query ? ` "${query}"` : " this filter"}.</p>
          : <ul className="m-0 grid list-none p-0">
            {visible.map((course) => {
              const id = course._id || course.id;
              return <li key={id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border py-2 last:border-b-0">
                <Link to={`/admin/courses/${id}`} className="grid min-w-0 flex-[1_1_14rem] gap-0.5 rounded-md p-2 text-foreground no-underline hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
                  <span className="truncate font-semibold">{course.title}</span>
                  <span className="text-sm text-muted-foreground">{[course.code, categoryOf(course)].filter(Boolean).join(" · ")}</span>
                </Link>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {course.isPublished ? "Published" : "Publish"}
                  <Switch label={course.isPublished ? "Published" : "Publish"} value={Boolean(course.isPublished)} onChange={(value) => publish(course, value)} />
                </span>
                <DropdownMenu trigger={<Button variant="tertiary" size="sm" aria-label={`Options for ${course.title}`}><MoreHorizontal size={18} aria-hidden="true" /></Button>}
                  items={[{ label: "Delete course", icon: Trash2, danger: true, onSelect: () => setDeleteTarget(course) }]} />
              </li>;
            })}
          </ul>}
      </>}
    </div>

    <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete course?"
      actions={<><Button variant="tertiary" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" onClick={deleteCourse}>Delete course</Button></>}>
      <p className="m-0">The course will disappear for students. Its content is kept, and you can restore the course later from the Trash.</p>
    </Dialog>
  </AdminLayout>;
}
