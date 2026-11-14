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
  getXp: () => request("/xp/me"),
  getFriends: () => request("/friends"),
  sendFriendRequest: (code) => request("/friends/requests", { method: "POST", body: JSON.stringify({ code }) }),
  acceptFriend: (id) => request(`/friends/requests/${id}/accept`, { method: "POST" }),
  removeFriend: (id) => request(`/friends/${id}`, { method: "DELETE" }),
  updateFriendSettings: (body) => request("/friends/settings", { method: "PUT", body: JSON.stringify(body) }),
  getAchievements: () => request("/achievements"),
  markAchievementsSeen: () => request("/achievements/seen", { method: "POST" }),
  markXpSeen: () => request("/xp/seen", { method: "POST" }),
  getNotifications: () => request("/notifications"),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () => request("/notifications/read-all", { method: "POST" }),
  changePassword: (body) => request("/auth/me/password", { method: "PUT", body: JSON.stringify(body) }),
  exportMyData: () => request("/auth/me/export"),
  deleteAccount: (body) => request("/auth/me", { method: "DELETE", body: JSON.stringify(body) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  getCourses: (category) => cached(`courses:${category || ""}`, () => request(`/courses${category ? `?category=${encodeURIComponent(category)}` : ""}`)),
  getCategories: () => cached("categories", () => request("/courses/categories")),
  sendEvent: (body) => request("/events", { method: "POST", body: JSON.stringify(body) }).catch(() => {}),
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
  startExam: (testId, timed) => request(`/tests/${testId}/exam/start`, { method: "POST", body: JSON.stringify(timed ? { timed: true } : {}) }),
  getSets: (q) => request(`/study-sets${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createSet: (body) => request("/study-sets", { method: "POST", body: JSON.stringify(body) }),
  getSet: (id) => request(`/study-sets/${id}`),
  updateSet: (id, body) => request(`/study-sets/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteSet: (id) => request(`/study-sets/${id}`, { method: "DELETE" }),
  getSetNotes: (id) => request(`/study-sets/${id}/notes`),
  saveSetNotes: (id, content) => request(`/study-sets/${id}/notes`, { method: "PUT", body: JSON.stringify({ content }) }),
  getSetCards: (id) => request(`/study-sets/${id}/cards`),
  addSetCard: (id, body) => request(`/study-sets/${id}/cards`, { method: "POST", body: JSON.stringify(body) }),
  addSetCards: (id, cards) => request(`/study-sets/${id}/cards/bulk`, { method: "POST", body: JSON.stringify({ cards }) }),
  updateSetCard: (cardId, body) => request(`/study-sets/cards/${cardId}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteSetCard: (cardId) => request(`/study-sets/cards/${cardId}`, { method: "DELETE" }),
  getSetMaterials: (id) => request(`/study-sets/${id}/materials`),
  addSetText: (id, body) => request(`/study-sets/${id}/materials/text`, { method: "POST", body: JSON.stringify(body) }),
  uploadSetPdf: (id, file) => { const form = new FormData(); form.append("file", file); return request(`/study-sets/${id}/materials/pdf`, { method: "POST", body: form }); },
  deleteSetMaterial: (materialId) => request(`/study-sets/materials/${materialId}`, { method: "DELETE" }),
  getSetStudy: (id, filter) => request(`/study-sets/${id}/study${filter ? `?filter=${encodeURIComponent(filter)}` : ""}`),
  getSetQuizzes: (id) => request(`/study-sets/${id}/quizzes`),
  createSetQuiz: (id, title) => request(`/study-sets/${id}/quizzes`, { method: "POST", body: JSON.stringify({ title }) }),
  getSetQuiz: (testId) => request(`/study-sets/quizzes/${testId}`),
  renameSetQuiz: (testId, title) => request(`/study-sets/quizzes/${testId}`, { method: "PUT", body: JSON.stringify({ title }) }),
  deleteSetQuiz: (testId) => request(`/study-sets/quizzes/${testId}`, { method: "DELETE" }),
  createSetQuestion: (body) => request("/study-sets/questions", { method: "POST", body: JSON.stringify(body) }),
  updateSetQuestion: (id, body) => request(`/study-sets/questions/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteSetQuestion: (id) => request(`/study-sets/questions/${id}`, { method: "DELETE" }),
  getMyExams: () => request("/my-exams"),
  addMyExam: (body) => request("/my-exams", { method: "POST", body: JSON.stringify(body) }).then((payload) => { forget("home"); return payload; }),
  deleteMyExam: (id) => request(`/my-exams/${id}`, { method: "DELETE" }),
  getHall: () => request("/hall"),
  hallHeartbeat: (goal) => request("/hall/heartbeat", { method: "POST", body: JSON.stringify({ goal }) }),
  hallLeave: () => request("/hall", { method: "DELETE" }),
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
  getDashboard: () => request("/admin/dashboard"),
  getAdminCategories: () => request("/admin/categories"),
  createCategory: (body) => request("/admin/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id, body) => request(`/admin/categories/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCategory: (id) => request(`/admin/categories/${id}`, { method: "DELETE" }),
  getAdminAuthors: () => request("/admin/authors"),
  createAuthor: (body) => request("/admin/authors", { method: "POST", body: JSON.stringify(body) }),
  updateAuthor: (id, body) => request(`/admin/authors/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteAuthor: (id) => request(`/admin/authors/${id}`, { method: "DELETE" }),
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
  restoreTrashItem: (type, id) => request(`/admin/trash/${type}/${id}/restore`, { method: "POST" }),
  // Preview as student: the same data a student gets, drafts included, nothing recorded.
  previewLesson: (id) => request(`/admin/preview/lessons/${id}`),
  previewTest: (id) => request(`/admin/preview/tests/${id}`),
  previewAnswer: (id, answer) => request(`/admin/preview/questions/${id}/answer`, { method: "POST", body: JSON.stringify({ answer }) }),
  createReport: (body) => request("/reports", { method: "POST", body: JSON.stringify(body) }),
  getReports: (params = {}) => request(`/admin/reports?${new URLSearchParams(params)}`),
  resolveReport: (id, body) => request(`/admin/reports/${id}/resolve`, { method: "PUT", body: JSON.stringify(body) }),
  getQuestionAnalytics: (params = {}) => request(`/admin/analytics/questions?${new URLSearchParams(params)}`),
  createUnitSummaryPdf: (unitId, body = {}) => request(`/admin/units/${unitId}/summary-pdf`, { method: "POST", body: JSON.stringify(body) }),
  getLessonVersions: (id) => request(`/admin/lessons/${id}/versions`),
  restoreLessonVersion: (id, versionId) => request(`/admin/lessons/${id}/versions/${versionId}/restore`, { method: "POST" }),
  // The CSV goes up as plain text. dryRun checks it and saves nothing.
  importQuestions: (testId, csv, dryRun) => request(`/admin/tests/${testId}/import?dryRun=${dryRun ? "1" : "0"}`, { method: "POST", headers: { "Content-Type": "text/csv" }, body: csv }),
  downloadQuestionTemplate: async () => {
    const response = await fetch(`${API_URL}/admin/questions/import-template`, { credentials: "include" });
    if (!response.ok) throw new Error("Could not download the template.");
    return response.blob();
  }
};

// The message the server sends when a student's subscription has ended.
export const ACCESS_ENDED = "Your access has ended";
