import { api } from "./client";

// Start loading what a link leads to when the student's finger or pointer gets near it, so the next screen
// opens with its data (and code) already on the way. api.* is cached, so repeating this costs nothing.
// Errors are ignored: this is only a head start, the screen asks again and shows its own error.
export function prefetchLesson(id) {
  api.getLessonHub(id).catch(() => {});
  import("../pages/Lesson").catch(() => {});
}

export function prefetchCourse(id) {
  api.getCourse(id).catch(() => {});
  import("../pages/CourseOutline").catch(() => {});
}

// Spread onto a link: <Link {...nearToPrefetch(() => prefetchLesson(id))} />
export function nearToPrefetch(run) {
  return { onMouseEnter: run, onTouchStart: run, onFocus: run };
}
