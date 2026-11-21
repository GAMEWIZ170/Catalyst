import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { api } from "./api/client";
import { useAuth } from "./context/AuthContext";
import { Button } from "./components/ui";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";
import { Privacy, Terms } from "./pages/Legal";
import Courses from "./pages/learn/Courses"; // the Home screen (continue, plan, goal). The course list is CourseCatalog.
import CourseCatalog from "./pages/learn/CourseCatalog";
// The course outline and the lesson are the main student path, so they ship in the first bundle: a separate
// file would cost one more round trip on a slow connection, more than the few KB it saves.
import CourseOutline from "./pages/learn/CourseOutline";
import Lesson from "./pages/learn/Lesson";
const Exam = lazy(() => import("./pages/learn/Exam"));
const Topics = lazy(() => import("./pages/learn/Topics"));
const Review = lazy(() => import("./pages/learn/Review"));
const Test = lazy(() => import("./pages/learn/Test"));
const Flashcards = lazy(() => import("./pages/learn/Flashcards"));
const Progress = lazy(() => import("./pages/learn/Progress"));
const Onboarding = lazy(() => import("./pages/auth/Onboarding"));
const Search = lazy(() => import("./pages/learn/Search"));
const Saved = lazy(() => import("./pages/learn/Saved"));
const AdminCourses = lazy(() => import("./pages/admin/AdminCourses"));
const AdminCourseEditor = lazy(() => import("./pages/admin/AdminCourseEditor"));
const AdminTestEditor = lazy(() => import("./pages/admin/AdminTestEditor"));
const AdminLessonEditor = lazy(() => import("./pages/admin/AdminLessonEditor"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminTrash = lazy(() => import("./pages/admin/AdminTrash"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminQuestionImport = lazy(() => import("./pages/admin/AdminQuestionImport"));
const Settings = lazy(() => import("./pages/account/Settings"));
const Me = lazy(() => import("./pages/account/Me"));
const Lab = lazy(() => import("./pages/lab/Lab"));
const Exams = lazy(() => import("./pages/learn/Exams"));
const LabSet = lazy(() => import("./pages/lab/LabSet"));
const LabReview = lazy(() => import("./pages/lab/LabReview"));
const LabQuiz = lazy(() => import("./pages/lab/LabQuiz"));
const Friends = lazy(() => import("./pages/community/Friends"));
const Circles = lazy(() => import("./pages/community/Circles"));
const Challenges = lazy(() => import("./pages/community/Challenges"));
const Community = lazy(() => import("./pages/community/Community"));
const CommunitySet = lazy(() => import("./pages/community/CommunitySet"));
const CommunityBoards = lazy(() => import("./pages/community/CommunityBoards"));
const AdminCommunity = lazy(() => import("./pages/admin/AdminCommunity"));
const Challenge = lazy(() => import("./pages/community/Challenge"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
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
  course: ({ id }) => { api.getCourse(id).catch(() => {}); },
  lesson: ({ id }) => { api.getLessonHub(id).catch(() => {}); },
  progress: () => { api.getProgressSummary().catch(() => {}); },
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
  if (user.role !== "admin") return <AppShell><AdminLayout nav={false}><div className="rounded-xl border bg-card p-6 [&_p]:text-muted-foreground"><h1>You do not have access to this page</h1><p>Only administrators can manage Catalyst content.</p><Button as={Link} to="/home">Back to home</Button></div></AdminLayout></AppShell>;
  return <AppShell><Suspense fallback={<PageFallback />}>{children}</Suspense></AppShell>;
}

export default function App() {
  const { user } = useAuth();
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login />} />
    <Route path="/register" element={user ? <Navigate to="/home" replace /> : <Register />} />
    <Route path="/forgot-password" element={user ? <Navigate to="/home" replace /> : <ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/confirm-email" element={<VerifyEmail change />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/home" element={<ProtectedPage><Courses /></ProtectedPage>} />
    <Route path="/courses" element={<ProtectedPage><CourseCatalog /></ProtectedPage>} />
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
    <Route path="/me" element={<ProtectedPage><Me /></ProtectedPage>} />
    <Route path="/exams" element={<ProtectedPage><Exams /></ProtectedPage>} />
    <Route path="/friends" element={<ProtectedPage><Friends /></ProtectedPage>} />
    <Route path="/circles" element={<ProtectedPage><Circles /></ProtectedPage>} />
    <Route path="/challenges" element={<ProtectedPage><Challenges /></ProtectedPage>} />
    <Route path="/community" element={<ProtectedPage><Community /></ProtectedPage>} />
    <Route path="/community/boards" element={<ProtectedPage><CommunityBoards /></ProtectedPage>} />
    <Route path="/community/:id" element={<ProtectedPage><CommunitySet /></ProtectedPage>} />
    <Route path="/challenge/:id" element={<ProtectedPage><Challenge /></ProtectedPage>} />
    <Route path="/lab" element={<ProtectedPage><Lab /></ProtectedPage>} />
    <Route path="/lab/quizzes/:testId" element={<ProtectedPage><LabQuiz /></ProtectedPage>} />
    <Route path="/lab/:id" element={<ProtectedPage><LabSet /></ProtectedPage>} />
    <Route path="/lab/:id/review" element={<ProtectedPage><LabReview /></ProtectedPage>} />
    <Route path="/lab/:setId/study" element={<ProtectedPage><Flashcards setMode /></ProtectedPage>} />
    <Route path="/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
    <Route path="/admin/courses/:id" element={<AdminPage><AdminCourseEditor /></AdminPage>} />
    <Route path="/admin/tests/:id" element={<AdminPage><AdminTestEditor /></AdminPage>} />
    <Route path="/admin/lessons/:id" element={<AdminPage><AdminLessonEditor /></AdminPage>} />
    <Route path="/admin/dashboard" element={<AdminPage><AdminDashboard /></AdminPage>} />
    <Route path="/admin/users" element={<AdminPage><AdminUsers /></AdminPage>} />
    <Route path="/admin/trash" element={<AdminPage><AdminTrash /></AdminPage>} />
    <Route path="/admin/reports" element={<AdminPage><AdminReports /></AdminPage>} />
    <Route path="/admin/community" element={<AdminPage><AdminCommunity /></AdminPage>} />
    <Route path="/admin/analytics" element={<AdminPage><AdminAnalytics /></AdminPage>} />
    <Route path="/admin/tests/:id/import" element={<AdminPage><AdminQuestionImport /></AdminPage>} />
    <Route path="/admin/preview/lessons/:id" element={<AdminPage><Lesson /></AdminPage>} />
    <Route path="/admin/preview/tests/:id" element={<AdminPage><Test /></AdminPage>} />
    <Route path="/admin/*" element={<AdminPage><AdminCourses /></AdminPage>} />
    {DevComponents && <Route path="/dev/components" element={<Suspense fallback={null}><DevComponents /></Suspense>} />}
    <Route path="*" element={<Navigate to={user ? "/home" : "/login"} replace />} />
  </Routes>;
}
