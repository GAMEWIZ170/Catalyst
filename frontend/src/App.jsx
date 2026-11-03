import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Courses from "./pages/Courses";
import CourseOutline from "./pages/CourseOutline";
import Lesson from "./pages/Lesson";
import Test from "./pages/Test";
import Flashcards from "./pages/Flashcards";
import Progress from "./pages/Progress";
import AdminCourses from "./pages/AdminCourses";
import AdminCourseEditor from "./pages/AdminCourseEditor";
import AdminTestEditor from "./pages/AdminTestEditor";
import AdminLessonEditor from "./pages/AdminLessonEditor";
import Settings from "./pages/Settings";
import AdminLayout from "./components/admin/AdminLayout";

function ProtectedPage({ children }) {
  return <ProtectedRoute><AppShell>{children}</AppShell></ProtectedRoute>;
}

function AdminPage({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <AppShell><AdminLayout><div className="access-denied"><h1>You do not have access to this page</h1><p>Only administrators can manage Catalyst content.</p><Link className="button button-primary" to="/courses">Back to courses</Link></div></AdminLayout></AppShell>;
  return <AppShell>{children}</AppShell>;
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
    <Route path="/admin/*" element={<AdminPage><AdminCourses /></AdminPage>} />
    <Route path="*" element={<Navigate to={user ? "/courses" : "/login"} replace />} />
  </Routes>;
}
