import { useState } from "react";
import { CheckCircle2, Sparkles, XCircle } from "lucide-react";
import Donut from "../progress/Donut";
import Companion from "./Companion";
import WorkedSolution from "./WorkedSolution";
import RichText from "../shared/RichText";
import { Correct, answerText } from "./QuestionInputs";
import { Button, Dialog } from "../ui";
import { cn } from "@/lib/utils";

// The end of a quiz: a right/wrong donut, then every question with the student's answer, the right answer and the
// explanation. Each card has a small "Ask AI" box in its top-right corner that opens the tutor on that question.
// items: [{ id, number, question, answer, isCorrect, correct, explanation, workedSolution, marking, needsSelfMark?, selfMarked? }]
// onSelfMark(item, gotIt): for a timed exam's short answer the AI could not mark at hand-in. The student compares their
// answer with the model answer and marks it; the score updates.
export default function QuizSummary({ items, canAsk = true, onSelfMark }) {
  const [asking, setAsking] = useState(null); // the item the tutor is open for
  const [marking, setMarking] = useState(null); // id of the item being self-marked
  const [markProblem, setMarkProblem] = useState("");
  async function mark(item, gotIt) {
    setMarking(item.id);
    setMarkProblem("");
    try { await onSelfMark(item, gotIt); } catch (error) { setMarkProblem(error.message); }
    setMarking(null);
  }
  const right = items.filter((item) => item.isCorrect).length;
  const wrong = items.length - right;

  return <div className="grid w-full gap-5 text-left">
    <Donut
      unit={["question", "questions"]}
      title="Your answers"
      note={wrong ? `${wrong} to look at again below.` : "Every answer was right."}
      slices={[
        { key: "right", label: "Right", count: right, fill: "fill-rate-good", dot: "bg-rate-good" },
        { key: "wrong", label: "Wrong", count: wrong, fill: "fill-rate-again", dot: "bg-rate-again", pull: true }
      ]}
    />

    <section className="grid gap-3" aria-labelledby="review-title">
      <h2 id="review-title" className="m-0 text-xl font-semibold">Review answers</h2>
      <ol className="m-0 grid list-none gap-3 p-0">
        {items.map((item) => {
          const yours = answerText(item.question, item.answer);
          return <li key={item.id} className={cn("relative grid gap-3 rounded-xl border bg-card p-4 sm:p-5", item.isCorrect ? "border-border" : "border-rate-again/40")}>
            <div className="flex items-center gap-2 pr-24">
              {item.isCorrect
                ? <CheckCircle2 size={18} className="shrink-0 text-rate-good" aria-hidden="true" />
                : <XCircle size={18} className="shrink-0 text-rate-again" aria-hidden="true" />}
              <h3 className="m-0 text-sm font-semibold text-muted-foreground">Question {item.number} · {item.needsSelfMark ? "Needs your mark" : item.isCorrect ? "Right" : "Wrong"}{item.selfMarked ? " (your mark)" : ""}</h3>
            </div>
            {canAsk && <button type="button" onClick={() => setAsking(item)} aria-label={`Ask AI about question ${item.number}`}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <Sparkles size={14} className="text-brand-ink" aria-hidden="true" />Ask AI
            </button>}
            <div className="text-lg leading-snug font-semibold"><RichText>{item.question.text}</RichText></div>
            <dl className="m-0 grid gap-2 text-sm">
              {yours && <div className={cn("rounded-md p-3", item.isCorrect ? "bg-rate-good/10" : "bg-rate-again/10")}>
                <dt className="font-semibold">Your answer</dt>
                <dd className="m-0 whitespace-pre-wrap">{item.question.type === "mcq" ? <RichText>{yours}</RichText> : yours}</dd>
              </div>}
              {!item.isCorrect && item.correct != null && <div className="rounded-md bg-muted p-3">
                <dt className="font-semibold">{item.needsSelfMark ? "Model answer" : "Correct answer"}</dt>
                <dd className="m-0"><Correct question={item.question} correct={item.correct} /></dd>
              </div>}
            </dl>
            {item.marking?.feedback && <p className="m-0 text-sm"><strong>Marking:</strong> {item.marking.feedback}</p>}
            {item.needsSelfMark && onSelfMark && <div className="grid gap-2 rounded-md border border-border p-3">
              <p className="m-0 text-sm">The AI could not mark this answer. Compare yours with the model answer and mark it. Your score updates.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" loading={marking === item.id} onClick={() => mark(item, true)}>I got it</Button>
                <Button size="sm" variant="secondary" disabled={marking === item.id} onClick={() => mark(item, false)}>I missed it</Button>
              </div>
              {markProblem && marking === null && <p className="m-0 text-sm text-destructive" role="alert">{markProblem}</p>}
            </div>}
            {item.explanation && <div className="text-sm"><RichText>{item.explanation}</RichText></div>}
            <WorkedSolution steps={item.workedSolution} />
          </li>;
        })}
      </ol>
    </section>

    <Dialog open={Boolean(asking)} onClose={() => setAsking(null)} title={asking ? `Ask AI about question ${asking.number}` : ""} className="max-w-xl">
      {asking && <div className="h-[min(65dvh,34rem)]">
        <Companion
          key={asking.id}
          kind="question"
          id={asking.id}
          intro="I can see this question, the right answer and its explanation."
          starters={[
            { label: "Explain the right answer", message: "Explain the right answer to this question step by step." },
            ...(!asking.isCorrect && answerText(asking.question, asking.answer)
              ? [{ label: "Why was mine wrong?", message: `My answer was: ${answerText(asking.question, asking.answer)}. Why is it wrong?` }]
              : []),
            { label: "Give me a similar question", message: "Give me one similar practice question, without the answer." }
          ]}
        />
      </div>}
    </Dialog>
  </div>;
}
