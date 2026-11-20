import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { nearToPrefetch, prefetchCourse } from "../../api/prefetch";
import CourseByline from "../../components/learn/CourseByline";
import { Badge, Card, EmptyState, Illustration } from "../../components/ui";
import { ErrorState, Loading } from "./Courses";

// Every published course, with a filter by category. The chosen category lives in the address (?category=chemistry).
export default function CourseCatalog() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getCategories().then(({ data }) => setCategories(data || [])).catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    setError("");
    api.getCourses(category).then(({ data }) => setCourses(data || [])).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }
  useEffect(load, [category]);

  const choose = (slug) => setParams(slug ? { category: slug } : {}, { replace: true });

  return <div className="mx-auto max-w-4xl student-page catalog-page">
    <h1>Courses</h1>
    {categories.length > 1 && <div className="my-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
      <button type="button" className="min-h-11 cursor-pointer rounded-pill border border-input bg-card px-4 font-sans text-sm text-foreground aria-pressed:border-primary aria-pressed:bg-primary/15 aria-pressed:font-semibold aria-pressed:text-brand-ink" aria-pressed={!category} onClick={() => choose("")}>All</button>
      {categories.map((item) => <button type="button" className="min-h-11 cursor-pointer rounded-pill border border-input bg-card px-4 font-sans text-sm text-foreground aria-pressed:border-primary aria-pressed:bg-primary/15 aria-pressed:font-semibold aria-pressed:text-brand-ink" key={item.slug} aria-pressed={category === item.slug} onClick={() => choose(item.slug)}>{item.name}</button>)}
    </div>}
    {loading && <Loading />}
    {error && <ErrorState message={error} onRetry={load} />}
    {!loading && !error && !courses.length && <EmptyState illustration={<Illustration name="empty" />} title="No courses here yet" description="Check back soon." />}
    {!loading && !error && courses.length > 0 && <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4">
      {courses.map((course) => <Card as={Link} className="min-w-0 text-inherit no-underline transition-[border-color,transform] duration-150 hover:border-primary motion-safe:[@media(hover:hover)]:hover:-translate-y-px [overflow-wrap:anywhere]" to={`/courses/${course._id}`} key={course._id} {...nearToPrefetch(() => prefetchCourse(course._id))}>
        <span className="text-sm text-muted-foreground">{course.code}{course.isFree && <span className="rounded-pill bg-muted px-2 py-1 text-sm text-muted-foreground"> Free</span>}</span>
        <strong className="text-lg leading-tight font-semibold [overflow-wrap:anywhere]">{course.title}</strong>
        <CourseByline course={course} />
        {course.description && <span className="text-muted-foreground [overflow-wrap:anywhere]">{course.description}</span>}
        {course.category && <Badge>{course.category.name}</Badge>}
      </Card>)}
    </div>}
  </div>;
}
