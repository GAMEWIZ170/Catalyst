// The course outline already loaded the whole course. A lesson opened from it reads that copy
// at once (for its place in the course and the next lesson) and refreshes it in the background.
let cached = null;

export function rememberCourse(course) {
  cached = course;
}

export function recallCourse(id) {
  return cached && String(cached._id) === String(id) ? cached : null;
}
