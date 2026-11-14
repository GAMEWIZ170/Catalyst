import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ListChecks } from "lucide-react";
import { api } from "../../api/client";
import ConfirmDialog from "../admin/ConfirmDialog";
import { Button, EmptyState, TextField } from "../ui";
import { Loading } from "../../pages/Courses";

// The Quizzes tab of a study set. A quiz is edited on its own page and played in the normal test screen.
export default function SetQuizzes({ setId }) {
  const [quizzes, setQuizzes] = useState(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);

  async function load() {
    try {
      setQuizzes((await api.getSetQuizzes(setId)).data);
    } catch (err) {
      setStatus(err.message);
    }
  }
  useEffect(() => { load(); }, [setId]);

  async function create(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      await api.createSetQuiz(setId, title.trim());
      setTitle("");
      await load();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const target = removing;
    setRemoving(null);
    try {
      await api.deleteSetQuiz(target.id);
      setStatus("Quiz deleted");
      await load();
    } catch (err) {
      setStatus(err.message);
    }
  }

  if (!quizzes) return status ? <p className="form-error" role="alert">{status}</p> : <Loading />;
  return <div className="set-quizzes">
    <p className="muted settings-help">Add past-style questions of your own, then take the quiz untimed or timed.</p>
    <form className="set-card-form" onSubmit={create}>
      <TextField label="New quiz name" required maxLength="80" value={title} onChange={(event) => setTitle(event.target.value)} />
      <Button type="submit" variant="secondary" loading={busy}>Add quiz</Button>
    </form>
    <p className="settings-status" role="status">{status}</p>
    {quizzes.length === 0
      ? <EmptyState icon={ListChecks} title="No quizzes yet" description="Make a quiz, then add questions to it." />
      : <ul className="set-card-list">{quizzes.map((quiz) => <li key={quiz.id}>
        <span className="set-card-text"><strong>{quiz.title}</strong><span className="muted">{quiz.questionCount} {quiz.questionCount === 1 ? "question" : "questions"}</span></span>
        <span className="catalog-actions">
          {quiz.questionCount > 0 && <Button as={Link} to={`/tests/${quiz.id}`} state={{ from: `/lab/${setId}?tab=quizzes` }}>Take quiz</Button>}
          <Button as={Link} variant="secondary" to={`/lab/quizzes/${quiz.id}`}>Edit questions</Button>
          <Button variant="secondary" type="button" onClick={() => setRemoving(quiz)} aria-label={`Delete quiz ${quiz.title}`}>Delete</Button>
        </span>
      </li>)}</ul>}
    <ConfirmDialog open={Boolean(removing)} title="Delete this quiz?" description="Its questions are deleted too." confirmLabel="Delete" onConfirm={remove} onCancel={() => setRemoving(null)} />
  </div>;
}
