import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../api/client";
import RichText from "../components/RichText";
import { imageUrl } from "../utils/cloudinary";
import { ErrorState, Loading } from "./Courses";

export default function Lesson() {
  const { id } = useParams();
  const location = useLocation();
  const [lesson, setLesson] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [progress, setProgress] = useState([]);
  const [error, setError] = useState("");
  const [doneMessage, setDoneMessage] = useState("");

  function load() {
    setError("");
    Promise.all([api.getLesson(id), api.getProgress()]).then(([lessonResponse, progressResponse]) => {
      setLesson(lessonResponse.data);
      setProgress(progressResponse.data || []);
      if (lessonResponse.data.materialCount > 0) return api.getLessonMaterials(id);
      return { data: [] };
    }).then((materialsResponse) => setMaterials(materialsResponse.data || []))
      .catch((err) => setError(err.status === 404 ? "This lesson is not available" : err.message));
  }

  useEffect(load, [id]);

  async function markDone() {
    try {
      await api.markLessonDone(id);
      setDoneMessage("Completed");
      window.dispatchEvent(new Event("catalyst:refresh-streak"));
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!lesson) return <Loading />;
  const from = location.state?.from || "/courses";
  const completed = progress.some((item) => String(item.lesson) === String(id) && item.completed);
  const canMarkDone = lesson.tests.length === 0 && lesson.flashcards.total === 0;
  return <div className="content lesson-hub">
    <Link className="back-link" to={from}>Back to course</Link>
    <article className="reading-column">
      <h1>{lesson.title}</h1>
      {completed && <span className="completion-badge">Completed</span>}
      <div className="lesson-explanation"><RichText>{lesson.explanation}</RichText></div>
      {lesson.explanationImage?.url && <img className="lesson-explanation-image" src={imageUrl(lesson.explanationImage.url, 800)} alt={lesson.explanationImage.alt} loading="lazy" />}
      {lesson.videoHost === "youtube" && lesson.videoId && <div className="video-frame"><iframe title={`${lesson.title} video`} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(lesson.videoId)}`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" /></div>}
    </article>
    {lesson.tests.length > 0 && <section className="lesson-section"><h2>Practice</h2><div className="student-test-list">{lesson.tests.map((test) => <Link className="student-test-row" to={`/tests/${test._id}`} state={{ from: `/lessons/${id}` }} key={test._id}><span><strong>{test.title}</strong><span className="muted">{test.questionCount} questions · {test.bestScore === null ? "Not taken yet" : `Best score: ${test.bestScore}%`}</span></span><span>Open</span></Link>)}</div></section>}
    {lesson.materialCount > 0 && <section className="lesson-section"><h2>Materials</h2><div className="material-list">{materials.map((material) => <div className="material-row" key={material._id}><span aria-hidden="true">{material.kind === "file" ? "PDF" : "Link"}</span><span><strong>{material.title}</strong><span className="muted">{material.description}{material.bytes ? ` · ${material.bytes} bytes` : ""}</span></span><a href={material.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${material.title}${material.kind === "file" ? " (PDF)" : ""}`}>Open</a></div>)}</div></section>}
    {canMarkDone && <section className="lesson-complete"><button className="button button-primary" type="button" onClick={markDone} disabled={completed}>{doneMessage || (completed ? "Completed" : "Mark as done")}</button><div aria-live="polite">{doneMessage}</div></section>}
  </div>;
}
