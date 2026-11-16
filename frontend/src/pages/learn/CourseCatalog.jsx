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

  return <div className="content student-page catalog-page">
    <h1>Courses</h1>
    {categories.length > 1 && <div className="chip-row" role="group" aria-label="Filter by category">
      <button type="button" className="chip" aria-pressed={!category} onClick={() => choose("")}>All</button>
      {categories.map((item) => <button type="button" className="chip" key={item.slug} aria-pressed={category === item.slug} onClick={() => choose(item.slug)}>{item.name}</button>)}
    </div>}
    {loading && <Loading />}
    {error && <ErrorState message={error} onRetry={load} />}
    {!loading && !error && !courses.length && <EmptyState illustration={<Illustration name="empty" />} title="No courses here yet" description="Check back soon." />}
    {!loading && !error && courses.length > 0 && <div className="home-courses">
      {courses.map((course) => <Card as={Link} className="home-course" to={`/courses/${course._id}`} key={course._id} {...nearToPrefetch(() => prefetchCourse(course._id))}>
        <span className="home-course-code">{course.code}{course.isFree && <span className="count-chip"> Free</span>}</span>
        <strong className="home-course-title">{course.title}</strong>
        <CourseByline course={course} />
        {course.description && <span className="muted home-course-desc">{course.description}</span>}
        {course.category && <Badge>{course.category.name}</Badge>}
      </Card>)}
    </div>}
  </div>;
}
