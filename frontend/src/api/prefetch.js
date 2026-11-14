import { api } from "./client";
import { isLowData } from "../utils/lowData";

// Start loading what a link leads to when the student's finger or pointer gets near it, so the next screen
// opens with its data already on the way. api.* is cached, so repeating this costs nothing.
// Errors are ignored: this is only a head start, the screen asks again and shows its own error.
export function prefetchLesson(id) {
  api.getLessonHub(id).catch(() => {});
}

export function prefetchCourse(id) {
  api.getCourse(id).catch(() => {});
}

// Spread onto a link: <Link {...nearToPrefetch(() => prefetchLesson(id))} />
// In low-data mode nothing is loaded ahead: only what the student opens is downloaded.
export function nearToPrefetch(run) {
  if (isLowData()) return {};
  return { onMouseEnter: run, onTouchStart: run, onFocus: run };
}
