import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { api } from "./api/client";
import { useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import { Privacy, Terms } from "./pages/Legal";
import Courses from "./pages/Courses";
// The course outline and the lesson are the main student path, so they ship in the first bundle: a separate
// file would cost one more round trip on a slow connection, more than the few KB it saves.
import CourseOutline from "./pages/CourseOutline";
import Lesson from "./pages/Lesson";
const Exam = lazy(() => import("./pages/Exam"));
const Topics = lazy(() => import("./pages/Topics"));
const Review = lazy(() => import("./pages/Review"));
const Test = lazy(() => import("./pages/Test"));
const Flashcards = lazy(() => import("./pages/Flashcards"));
const Progress = lazy(() => import("./pages/Progress"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Search = lazy(() => import("./pages/Search"));
const Saved = lazy(() => import("./pages/Saved"));
const AdminCourses = lazy(() => import("./pages/AdminCourses"));
const AdminCourseEditor = lazy(() => import("./pages/AdminCourseEditor"));
const AdminTestEditor = lazy(() => import("./pages/AdminTestEditor"));
const AdminLessonEditor = lazy(() => import("./pages/AdminLessonEditor"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminTrash = lazy(() => import("./pages/AdminTrash"));
const Settings = lazy(() => import("./pages/Settings"));
import AdminLayout from "./components/admin/AdminLayout";
import { Skeleton, SkeletonGroup } from "./components/ui";

// Component gallery. Exists only in the dev server, never in the production build.
const DevComponents = import.meta.env.DEV ? lazy(() => import("./pages/DevComponents")) : null;

// Shell stays on screen while a page chunk downloads.
function PageFallback() {
  return <SkeletonGroup label="Loading page"><Skeleton variant="title" /><Skeleton variant="block" /></SkeletonGroup>;
}

// Start a page's data requests while its code is still downloading, instead of after it.
// The api cache hands the same request to the page when it mounts, so nothing is fetched twice.
const warmers = {
  courses: () => { api.getHome().catch(() => {}); },
  course: ({ id }) => { api.getCourse(id).catch(() => {}); },
  lesson: ({ id }) => { api.getLessonHub(id).catch(() => {}); },
  progress: () => { api.getProgressOverview().catch(() => {}); },
  test: ({ id }) => { api.getTest(id).catch(() => {}); },
  flashcards: ({ id }) => { api.getLessonFlashcards(id, "").catch(() => {}); }
};

function ProtectedPage({ children, warm }) {
  const { user } = useAuth();
  const params = useParams();
  if (user && warm) warmers[warm](params);
  return <ProtectedRoute><AppShell><Suspense fallback={<PageFallback />}>{children}</Suspense></AppShell></ProtectedRoute>;
}

function AdminPage({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <AppShell><AdminLayout nav={false}><div className="access-denied"><h1>You do not have access to this page</h1><p>Only administrators can manage Catalyst content.</p><Link className="button button-primary" to="/courses">Back to courses</Link></div></AdminLayout></AppShell>;
  return <AppShell><Suspense fallback={<PageFallback />}>{children}</Suspense></AppShell>;
}

export default function App() {
  const { user } = useAuth();
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/courses" replace /> : <Login />} />
    <Route path="/register" element={user ? <Navigate to="/courses" replace /> : <Register />} />
    <Route path="/forgot-password" element={user ? <Navigate to="/courses" replace /> : <ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/confirm-email" element={<VerifyEmail change />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/courses" element={<ProtectedPage warm="courses"><Courses /></ProtectedPage>} />
    <Route path="/courses/:id" element={<ProtectedPage warm="course"><CourseOutline /></ProtectedPage>} />
    <Route path="/lessons/:id" element={<ProtectedPage warm="lesson"><Lesson /></ProtectedPage>} />
    <Route path="/tests/:id" element={<ProtectedPage warm="test"><Test /></ProtectedPage>} />
    <Route path="/tests/:id/exam" element={<ProtectedPage><Exam /></ProtectedPage>} />
    <Route path="/topics" element={<ProtectedPage><Topics /></ProtectedPage>} />
    <Route path="/practice/topic" element={<ProtectedPage><Test /></ProtectedPage>} />
    <Route path="/review" element={<ProtectedPage><Review /></ProtectedPage>} />
    <Route path="/practice/mistakes" element={<ProtectedPage><Test /></ProtectedPage>} />
    <Route path="/lessons/:id/flashcards" element={<ProtectedPage warm="flashcards"><Flashcards /></ProtectedPage>} />
    <Route path="/welcome" element={<ProtectedPage><Onboarding /></ProtectedPage>} />
    <Route path="/search" element={<ProtectedPage><Search /></ProtectedPage>} />
    <Route path="/saved" element={<ProtectedPage><Saved /></ProtectedPage>} />
    <Route path="/progress" element={<ProtectedPage warm="progress"><Progress /></ProtectedPage>} />
    <Route path="/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
    <Route path="/admin/courses/:id" element={<AdminPage><AdminCourseEditor /></AdminPage>} />
    <Route path="/admin/tests/:id" element={<AdminPage><AdminTestEditor /></AdminPage>} />
    <Route path="/admin/lessons/:id" element={<AdminPage><AdminLessonEditor /></AdminPage>} />
    <Route path="/admin/users" element={<AdminPage><AdminUsers /></AdminPage>} />
    <Route path="/admin/trash" element={<AdminPage><AdminTrash /></AdminPage>} />
    <Route path="/admin/*" element={<AdminPage><AdminCourses /></AdminPage>} />
    {DevComponents && <Route path="/dev/components" element={<Suspense fallback={null}><DevComponents /></Suspense>} />}
    <Route path="*" element={<Navigate to={user ? "/courses" : "/login"} replace />} />
  </Routes>;
}
