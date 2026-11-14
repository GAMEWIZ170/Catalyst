import { cached, clearCache, forget } from "./cache";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

async function request(path, options = {}) {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "Something went wrong.");
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }
  return payload;
}

// Progress changed, so what was cached is out of date.
function changed(promise) {
  return promise.then((payload) => { clearCache(); return payload; });
}

export const api = {
  getMe: () => request("/auth/me"),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  forgotPassword: (body) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify(body) }),
  resetPassword: (body) => request("/auth/reset-password", { method: "POST", body: JSON.stringify(body) }),
  verifyEmail: (body) => request("/auth/verify-email", { method: "POST", body: JSON.stringify(body) }),
  resendVerification: () => request("/auth/resend-verification", { method: "POST" }),
  confirmEmailChange: (body) => request("/auth/confirm-email", { method: "POST", body: JSON.stringify(body) }),
  requestEmailChange: (body) => request("/auth/me/email", { method: "PUT", body: JSON.stringify(body) }),
  getNotifications: () => request("/notifications"),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () => request("/notifications/read-all", { method: "POST" }),
  changePassword: (body) => request("/auth/me/password", { method: "PUT", body: JSON.stringify(body) }),
  exportMyData: () => request("/auth/me/export"),
  deleteAccount: (body) => request("/auth/me", { method: "DELETE", body: JSON.stringify(body) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  getCourses: () => request("/courses"),
  // Student reads below are cached for a minute (see cache.js).
  getHome: () => cached("home", () => request("/home")),
  getCourse: (id) => cached(`course:${id}`, () => request(`/courses/${id}`)),
  getLesson: (id) => request(`/lessons/${id}`),
  getLessonHub: (id) => cached(`lesson:${id}`, () => request(`/lessons/${id}/hub`)),
  getLessonFlashcards: (id, filter) => cached(`flashcards:${id}:${filter || ""}`, () => request(`/lessons/${id}/flashcards${filter ? `?filter=${encodeURIComponent(filter)}` : ""}`), 5000),
  rateFlashcard: (id, confidence) => changed(request(`/flashcards/${id}/rate`, { method: "POST", body: JSON.stringify({ confidence }) })),
  getLessonMaterials: (id) => request(`/lessons/${id}/materials`),
  markLessonDone: (id) => changed(request(`/lessons/${id}/mark-done`, { method: "POST" })),
  // Cached only for a few seconds: enough for the page to reuse the request started on route match.
  getTest: (id) => cached(`test:${id}`, () => request(`/tests/${id}`), 5000),
  submitTest: (id, answers) => changed(request(`/tests/${id}/submit`, { method: "POST", body: JSON.stringify({ answers }) })),
  answerQuestion: (id, answer) =>
    request(`/questions/${id}/answer`, {
      method: "POST",
      body: JSON.stringify(answer === undefined ? {} : { answer })
    }),
  completeLesson: (id, answers) =>
    changed(request(`/lessons/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ answers })
    })),
  // Remembers where the student is, so Home can offer "Continue". Only Home's copy goes stale.
  savePosition: (body) => request("/progress/position", { method: "PUT", body: JSON.stringify(body) }).then((payload) => { forget("home"); return payload; }),
  updatePreferences: (body) => request("/auth/me/preferences", { method: "PUT", body: JSON.stringify(body) }),
  recordStudyTime: (seconds) => request("/progress/study-time", { method: "POST", body: JSON.stringify({ seconds }) }).then((payload) => { forget("home"); return payload; }),
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),
  getReviewDue: () => request("/review/due"),
  getReviewSession: () => request("/review/session"),
  startExam: (testId) => request(`/tests/${testId}/exam/start`, { method: "POST" }),
  saveExam: (attemptId, answers, flags) => request(`/exam-attempts/${attemptId}`, { method: "PUT", body: JSON.stringify({ answers, flags }) }),
  submitExam: (attemptId, answers, flags) => changed(request(`/exam-attempts/${attemptId}/submit`, { method: "POST", body: JSON.stringify({ answers, flags }) })),
  getPlan: () => request("/plan"),
  getTopics: () => request("/topics"),
  getTopicPractice: (query) => request(`/topics/practice?${new URLSearchParams(query)}`),
  getMistakes: () => request("/mistakes"),
  getMistakePractice: (query = {}) => request(`/mistakes/practice${Object.keys(query).length ? `?${new URLSearchParams(query)}` : ""}`),
  getBookmarks: () => request("/bookmarks"),
  saveBookmark: (kind, id) => request("/bookmarks", { method: "PUT", body: JSON.stringify({ kind, id }) }).then((payload) => { forget(`lesson:${id}`); return payload; }),
  removeBookmark: (kind, id) => request(`/bookmarks/${kind}/${id}`, { method: "DELETE" }).then((payload) => { forget(`lesson:${id}`); return payload; }),
  saveNote: (lessonId, text) => request(`/notes/${lessonId}`, { method: "PUT", body: JSON.stringify({ text }) }).then((payload) => { forget(`lesson:${lessonId}`); return payload; }),
  getProgress: () => request("/progress"),
  getStreak: () => cached("streak", () => request("/progress/streak")),
  getProgressOverview: () => cached("progress-overview", () => request("/progress/overview")),
  getAdminCourses: () => request("/admin/courses"),
  getAdminCourse: (id) => request(`/admin/courses/${id}`),
  createCourse: (body) => request("/admin/courses", { method: "POST", body: JSON.stringify(body) }),
  updateCourse: (id, body) => request(`/admin/courses/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCourse: (id) => request(`/admin/courses/${id}`, { method: "DELETE" }),
  createUnit: (body) => request("/admin/units", { method: "POST", body: JSON.stringify(body) }),
  updateUnit: (id, body) => request(`/admin/units/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteUnit: (id) => request(`/admin/units/${id}`, { method: "DELETE" }),
  reorderUnits: (body) => request("/admin/units/reorder", { method: "PUT", body: JSON.stringify(body) }),
  getAdminLesson: (id) => request(`/admin/lessons/${id}`),
  createLesson: (body) => request("/admin/lessons", { method: "POST", body: JSON.stringify(body) }),
  updateLesson: (id, body) => request(`/admin/lessons/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteLesson: (id) => request(`/admin/lessons/${id}`, { method: "DELETE" }),
  reorderLessons: (body) => request("/admin/lessons/reorder", { method: "PUT", body: JSON.stringify(body) }),
  createTest: (body) => request("/admin/tests", { method: "POST", body: JSON.stringify(body) }),
  getAdminTest: (id) => request(`/admin/tests/${id}`),
  updateTest: (id, body) => request(`/admin/tests/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteTest: (id) => request(`/admin/tests/${id}`, { method: "DELETE" }),
  reorderTests: (body) => request("/admin/tests/reorder", { method: "PUT", body: JSON.stringify(body) }),
  createQuestion: (body) => request("/admin/questions", { method: "POST", body: JSON.stringify(body) }),
  updateQuestion: (id, body) => request(`/admin/questions/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteQuestion: (id) => request(`/admin/questions/${id}`, { method: "DELETE" }),
  reorderQuestions: (body) => request("/admin/questions/reorder", { method: "PUT", body: JSON.stringify(body) }),
  createFlashcard: (body) => request("/admin/flashcards", { method: "POST", body: JSON.stringify(body) }),
  updateFlashcard: (id, body) => request(`/admin/flashcards/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteFlashcard: (id) => request(`/admin/flashcards/${id}`, { method: "DELETE" }),
  reorderFlashcards: (body) => request("/admin/flashcards/reorder", { method: "PUT", body: JSON.stringify(body) }),
  createMaterial: (body) => request("/admin/materials", { method: "POST", body: JSON.stringify(body) }),
  updateMaterial: (id, body) => request(`/admin/materials/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteMaterial: (id) => request(`/admin/materials/${id}`, { method: "DELETE" }),
  reorderMaterials: (body) => request("/admin/materials/reorder", { method: "PUT", body: JSON.stringify(body) }),
  uploadImage: (formData) => request("/admin/uploads", { method: "POST", body: formData }),
  uploadMaterial: (formData) => request("/admin/uploads/material", { method: "POST", body: formData }),
  updateAvatar: (body) => request("/auth/me/avatar", { method: "PUT", body: JSON.stringify(body) }),
  getUsers: (params = {}) => {
    const query = new URLSearchParams({ limit: "20", ...Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value != null)) });
    return request(`/admin/users?${query}`);
  },
  updateUser: (id, body) => request(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  getAdminStats: () => request("/admin/stats"),
  getTrash: () => request("/admin/trash"),
  restoreTrashItem: (type, id) => request(`/admin/trash/${type}/${id}/restore`, { method: "POST" })
};

// The message the server sends when a student's subscription has ended.
export const ACCESS_ENDED = "Your access has ended";
