import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { List, ListItem } from "@astryxdesign/core/List";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { api } from "../api/client";
import AdminLayout from "../components/admin/AdminLayout";
import AstryxTheme from "../components/astryx/AstryxTheme";
import { ErrorState, Loading } from "./Courses";
import "../styles/admin-polish.css";

const getCourses = (payload) => (Array.isArray(payload) ? payload : payload.data || []);
const categoryOf = (course) => (typeof course.category === "string" ? course.category.trim() : "");

// The course list. "New course" makes a course at once ("Untitled course") and opens it, where its title is ready to change.
// Filter by category with the chips, or search by code or title. Publishing is a switch; Delete is in each row's ⋯ menu.
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

  const newButton = <Button label="New course" variant="primary" icon={<Plus size={18} aria-hidden="true" />} isLoading={creating} onClick={createCourse} />;
  return <AdminLayout>
    <AstryxTheme>
      <div className="admin-astryx">
        <VStack gap={4}>
          <HStack justify="between" align="center" wrap="wrap" gap={3}>
            <VStack gap={1}>
              <Heading level={1}>Courses</Heading>
              {stats && <Text color="secondary">
                {stats.students.total} students · {stats.students.activeLast7Days} active this week · {stats.courses.published} published, {stats.courses.draft} {stats.courses.draft === 1 ? "draft" : "drafts"}
              </Text>}
            </VStack>
            {newButton}
          </HStack>

          {error && courses.length > 0 && <Banner status="error" title={error} container="section" isDismissable onDismiss={() => setError("")} />}
          {loading && <Loading />}
          {error && !loading && courses.length === 0 && <ErrorState message={error} onRetry={load} />}
          {!loading && !error && courses.length === 0 && <EmptyState icon={<BookOpen size={32} aria-hidden="true" />} title="No courses yet" description="Create the first course to start adding units and lessons." actions={newButton} />}

          {!loading && courses.length > 0 && <>
            <HStack gap={3} wrap="wrap" align="center" justify="between">
              {categories.length > 0
                ? <div className="chip-row" role="group" aria-label="Filter by category" style={{ margin: 0 }}>
                  <button type="button" className="chip" aria-pressed={!category} onClick={() => setCategory("")}>All</button>
                  {categories.map((name) => <button type="button" className="chip" key={name} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}
                  {hasGeneral && <button type="button" className="chip" aria-pressed={category === "__general"} onClick={() => setCategory("__general")}>General</button>}
                </div>
                : <span />}
              {courses.length > 4 && <TextInput type="search" label="Search courses" isLabelHidden placeholder="Search by code or title" size="sm" width={240} value={query} onChange={setQuery} hasClear />}
            </HStack>
            {visible.length === 0
              ? <Text color="secondary">No course matches{query ? ` "${query}"` : " this filter"}.</Text>
              : <List hasDividers>
                {visible.map((course) => {
                  const id = course._id || course.id;
                  return <ListItem key={id} label={course.title} description={[course.code, categoryOf(course)].filter(Boolean).join(" · ")} href={`/admin/courses/${id}`}
                    endContent={<HStack gap={2} align="center">
                      <Switch label={course.isPublished ? "Published" : "Publish"} value={Boolean(course.isPublished)} onChange={(value) => publish(course, value)} labelPosition="start" />
                      <MoreMenu label={`Options for ${course.title}`} alignment="end" items={[{ label: "Delete course", icon: <Trash2 size={18} aria-hidden="true" />, variant: "destructive", onClick: () => setDeleteTarget(course) }]} />
                    </HStack>} />;
                })}
              </List>}
          </>}
        </VStack>

        <Dialog isOpen={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} width={440}>
          <DialogHeader title="Delete course?" onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} />
          <VStack gap={4} padding={4}>
            <Text>The course will disappear for students. Its content is kept, and you can restore the course later from the Trash.</Text>
            <HStack gap={2} justify="end"><Button label="Cancel" variant="ghost" onClick={() => setDeleteTarget(null)} /><Button label="Delete course" variant="destructive" onClick={deleteCourse} /></HStack>
          </VStack>
        </Dialog>
      </div>
    </AstryxTheme>
  </AdminLayout>;
}
