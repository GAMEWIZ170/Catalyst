const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
  createCourse: (body) => request("/admin/courses", { method: "POST", body: JSON.stringify(body) }),
  updateCourse: (id, body) => request(`/admin/courses/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCourse: (id) => request(`/admin/courses/${id}`, { method: "DELETE" }),
  createUnit: (body) => request("/admin/units", { method: "POST", body: JSON.stringify(body) }),
  updateUnit: (id, body) => request(`/admin/units/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteUnit: (id) => request(`/admin/units/${id}`, { method: "DELETE" }),
  getAdminLesson: (id) => request(`/admin/lessons/${id}`),
  createLesson: (body) => request("/admin/lessons", { method: "POST", body: JSON.stringify(body) }),
  updateLesson: (id, body) => request(`/admin/lessons/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteLesson: (id) => request(`/admin/lessons/${id}`, { method: "DELETE" }),
  createQuestion: (body) => request("/admin/questions", { method: "POST", body: JSON.stringify(body) }),
  updateQuestion: (id, body) => request(`/admin/questions/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteQuestion: (id) => request(`/admin/questions/${id}`, { method: "DELETE" }),
  getUsers: (page = 1) => request(`/admin/users?page=${page}&limit=20`)
};
