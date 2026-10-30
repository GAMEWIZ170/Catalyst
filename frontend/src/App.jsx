import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Courses from "./pages/Courses";
import CourseOutline from "./pages/CourseOutline";
import Lesson from "./pages/Lesson";
import Progress from "./pages/Progress";
import Admin from "./pages/Admin";

function ProtectedPage({ children }) {
  return <ProtectedRoute><AppShell>{children}</AppShell></ProtectedRoute>;
}

function AdminPage({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/courses" replace />;
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
    <Route path="/progress" element={<ProtectedPage><Progress /></ProtectedPage>} />
    <Route path="/admin/*" element={<AdminPage><Admin /></AdminPage>} />
    <Route path="*" element={<Navigate to={user ? "/courses" : "/login"} replace />} />
  </Routes>;
}
