// "By Ama Mensah, Kofi Boateng" under a course title. Shows nothing when a course has no authors.
export default function CourseByline({ course, className = "" }) {
  const names = (course?.authors || []).map((author) => author.displayName).filter(Boolean);
  if (!names.length) return null;
  return <span className={`course-byline muted ${className}`}>By {names.join(", ")}</span>;
}
