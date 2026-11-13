import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Courses from "./pages/Courses";
import CourseOutline from "./pages/CourseOutline";
import Lesson from "./pages/Lesson";
const Test = lazy(() => import("./pages/Test"));
const Flashcards = lazy(() => import("./pages/Flashcards"));
const Progress = lazy(() => import("./pages/Progress"));
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

function ProtectedPage({ children }) {
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
    <Route path="/courses" element={<ProtectedPage><Courses /></ProtectedPage>} />
    <Route path="/courses/:id" element={<ProtectedPage><CourseOutline /></ProtectedPage>} />
    <Route path="/lessons/:id" element={<ProtectedPage><Lesson /></ProtectedPage>} />
    <Route path="/tests/:id" element={<ProtectedPage><Test /></ProtectedPage>} />
    <Route path="/lessons/:id/flashcards" element={<ProtectedPage><Flashcards /></ProtectedPage>} />
    <Route path="/progress" element={<ProtectedPage><Progress /></ProtectedPage>} />
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
