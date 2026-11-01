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
    throw error;
  }
  return payload;
}

export const api = {
  getMe: () => request("/auth/me"),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  getCourses: () => request("/courses"),
  getCourse: (id) => request(`/courses/${id}`),
  getLesson: (id) => request(`/lessons/${id}`),
  getLessonFlashcards: (id, filter) => request(`/lessons/${id}/flashcards${filter ? `?filter=${encodeURIComponent(filter)}` : ""}`),
  rateFlashcard: (id, confidence) => request(`/flashcards/${id}/rate`, { method: "POST", body: JSON.stringify({ confidence }) }),
  getLessonMaterials: (id) => request(`/lessons/${id}/materials`),
  markLessonDone: (id) => request(`/lessons/${id}/mark-done`, { method: "POST" }),
  getTest: (id) => request(`/tests/${id}`),
  submitTest: (id, answers) => request(`/tests/${id}/submit`, { method: "POST", body: JSON.stringify({ answers }) }),
  answerQuestion: (id, answer) =>
    request(`/questions/${id}/answer`, {
      method: "POST",
      body: JSON.stringify(answer === undefined ? {} : { answer })
    }),
  completeLesson: (id, answers) =>
    request(`/lessons/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ answers })
    }),
  getProgress: () => request("/progress"),
  getStreak: () => request("/progress/streak"),
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
  getUsers: (page = 1) => request(`/admin/users?page=${page}&limit=20`)
};
