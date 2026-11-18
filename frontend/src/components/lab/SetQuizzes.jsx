import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ListChecks, MoreHorizontal, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { Loading } from "../../pages/learn/Courses";
import { Button, Dialog, DropdownMenu, EmptyState } from "../ui";
import GenerateMore from "./GenerateMore";

// The Quizzes tab. "New quiz" makes "Untitled quiz" at once with its name open for typing; the name saves when you leave it.
// A quiz is edited on its own page and played in the normal test screen.
export default function SetQuizzes({ setId }) {
  const [quizzes, setQuizzes] = useState(null);
  const [error, setError] = useState("");
  const [naming, setNaming] = useState(null);   // { id, title }
  const [removing, setRemoving] = useState(null);
  const [generating, setGenerating] = useState(false);

  async function load() {
    try { setQuizzes((await api.getSetQuizzes(setId)).data); } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, [setId]);

  async function create() {
    try {
      const { data } = await api.createSetQuiz(setId, "Untitled quiz");
      await load();
      setNaming({ id: data.id, title: data.title || "Untitled quiz" });
    } catch (err) { setError(err.message); }
  }

  async function commitName() {
    const current = naming;
    if (!current) return;
    setNaming(null);
    const title = current.title.trim();
    if (!title || title === quizzes.find((quiz) => quiz.id === current.id)?.title) return;
    try { await api.renameSetQuiz(current.id, title); await load(); } catch (err) { setError(err.message); }
  }

  async function remove() {
    const target = removing;
    setRemoving(null);
    try { await api.deleteSetQuiz(target.id); await load(); } catch (err) { setError(err.message); }
  }

  if (!quizzes) return error ? <p className="m-0 text-muted-foreground" role="alert">{error}</p> : <Loading />;
  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 text-sm text-muted-foreground">{quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"}. Take a quiz untimed or timed.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={Sparkles} onClick={() => setGenerating(true)}>Generate more</Button>
        <Button icon={Plus} onClick={create}>New quiz</Button>
      </div>
    </div>
    {error && <p className="m-0 text-muted-foreground" role="alert">{error}</p>}
    {quizzes.length === 0
      ? <EmptyState icon={ListChecks} title="No quizzes yet" description="Make a quiz and add questions, or let the AI draft some." />
      : <ul className="m-0 grid list-none p-0">
        {quizzes.map((quiz) => <li key={quiz.id} className="flex items-center gap-2 border-b border-border py-2 last:border-b-0">
          {naming?.id === quiz.id
            ? <input aria-label="Quiz name" autoFocus maxLength={80} value={naming.title}
              className="min-h-11 w-full min-w-0 flex-1 rounded-md border border-input bg-card px-3 font-sans text-base font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              onChange={(event) => setNaming({ ...naming, title: event.target.value })} onBlur={commitName}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitName(); } if (event.key === "Escape") { event.stopPropagation(); setNaming(null); } }} />
            : <>
              <Link to={`/lab/quizzes/${quiz.id}`} className="grid min-w-0 flex-1 gap-0.5 rounded-md p-2 text-foreground no-underline hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
                <span className="truncate font-semibold">{quiz.title}</span>
                <span className="text-sm text-muted-foreground">{quiz.questionCount} {quiz.questionCount === 1 ? "question" : "questions"}</span>
              </Link>
              {quiz.questionCount > 0 && <Button as={Link} to={`/tests/${quiz.id}`} size="sm" variant="secondary">Take quiz</Button>}
              <DropdownMenu
                trigger={<Button variant="tertiary" size="sm" aria-label={`Options for ${quiz.title}`}><MoreHorizontal size={18} aria-hidden="true" /></Button>}
                items={[
                  { label: "Rename", icon: Pencil, onSelect: () => setNaming({ id: quiz.id, title: quiz.title }) },
                  { separator: true },
                  { label: "Delete quiz", icon: Trash2, danger: true, onSelect: () => setRemoving(quiz) }
                ]} />
            </>}
        </li>)}
      </ul>}

    <Dialog open={Boolean(removing)} onClose={() => setRemoving(null)} title="Delete this quiz?"
      actions={<><Button variant="tertiary" onClick={() => setRemoving(null)}>Cancel</Button><Button variant="danger" onClick={remove}>Delete</Button></>}>
      <p className="m-0">Its questions are deleted too.</p>
    </Dialog>
    <GenerateMore isOpen={generating} onOpenChange={setGenerating} setId={setId} kind="questions" onSaved={load} />
  </div>;
}
