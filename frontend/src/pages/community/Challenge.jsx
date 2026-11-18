import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import RichText from "../../components/shared/RichText";
import ResponsiveImage from "../../components/shared/ResponsiveImage";
import ShareButton from "../../components/shared/ShareButton";
import { ChoiceInput, QuestionInput } from "../../components/learn/QuestionInputs";
import { Button } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";
import { t } from "../../i18n";

const fill = (key, values) => Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), t(key));

// A friend challenge: up to 10 questions, one at a time, with no feedback until the end. The score is worked out
// on the server. The page also shows the friendly comparison once both players have played.
export default function Challenge() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: "", data: null, status: 0 });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [chosen, setChosen] = useState(null);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState("");

  function load() {
    setState((s) => ({ ...s, loading: true, error: "" }));
    api.getChallenge(id)
      .then(({ data }) => setState({ loading: false, error: "", data, status: 200 }))
      .catch((error) => setState({ loading: false, error: error.message, data: null, status: error.status || 0 }));
  }
  useEffect(load, [id]);

  if (state.loading && !state.data) return <div className="content"><Loading /></div>;
  if (state.error) {
    // 404, 409 and 410 are normal situations with a clear message, not failures to retry.
    const calm = [404, 409, 410].includes(state.status);
    return <div className="content mx-auto grid max-w-2xl gap-4">
      {calm ? <><h1 className="m-0 text-3xl leading-tight font-bold">{t("challenges.title")}</h1><p className="m-0" role="status">{state.error}</p><Button as={Link} variant="secondary" to="/challenges">{t("challenges.all")}</Button></> : <ErrorState message={state.error} onRetry={load} />}
    </div>;
  }

  const { data } = state;
  const link = `${window.location.origin}/s/c/${data.id}`;

  if (data.played || data.result) {
    const done = Boolean(data.comparison);
    return <div className="content mx-auto grid max-w-2xl gap-4">
      <h1 className="m-0 text-3xl leading-tight font-bold">{data.title}</h1>
      <p className="m-0 text-muted-foreground">{fill("challenges.from", { name: data.from })}</p>
      <p className="m-0 text-lg">{fill("challenges.yourScore", { correct: data.result.correct, total: data.result.total })}</p>
      {done ? <section className="grid gap-2 rounded-lg border border-border bg-card p-5" aria-labelledby="cmp-heading">
        <h2 id="cmp-heading" className="m-0 text-xl font-semibold">{t("challenges.comparison")}</h2>
        <p className="m-0">{fill("challenges.you", { correct: data.comparison.you.correct, total: data.comparison.you.total })}</p>
        <p className="m-0">{fill("challenges.them", { name: data.comparison.them.name, correct: data.comparison.them.correct, total: data.comparison.them.total })}</p>
        <p className="m-0" role="status"><strong>{t(`challenges.${data.comparison.outcome}`)}</strong></p>
      </section>
        : <section className="grid gap-2 rounded-lg border border-border bg-card p-5">
          <p className="m-0" role="status">{data.role === "creator" ? t("challenges.waitingFriend") : t("challenges.waitingCreator")}</p>
          {data.role === "creator" && !data.expired && <ShareButton url={link} title={data.title} text={fill("challenges.shareText", { name: data.from })} />}
        </section>}
      <Button as={Link} variant="secondary" to="/challenges">{t("challenges.all")}</Button>
    </div>;
  }

  const questions = data.questions;
  const question = questions[index];
  const last = index === questions.length - 1;

  async function next() {
    const updated = { ...answers, [question._id]: chosen ?? "" };
    setAnswers(updated);
    setChosen(null);
    if (!last) { setIndex(index + 1); return; }
    setSending(true);
    setProblem("");
    try {
      await api.submitChallenge(id, questions.map((item) => ({ questionId: item._id, answer: updated[item._id] ?? "" })));
      load();
    } catch (error) {
      setProblem(error.message);
    } finally {
      setSending(false);
    }
  }

  return <div className="content mx-auto grid max-w-2xl gap-4">
    <h1 className="m-0 text-3xl leading-tight font-bold">{data.title}</h1>
    <p className="m-0 text-muted-foreground">{fill("challenges.from", { name: data.from })} · {fill("challenges.progress", { number: index + 1, total: questions.length })}</p>
    <div className="text-xl leading-snug font-semibold sm:text-2xl"><RichText>{question.text}</RichText></div>
    {question.image?.url && <ResponsiveImage className="max-h-72 rounded-lg" image={question.image} sizes="(max-width: 600px) 100vw, 600px" />}
    {question.type === "mcq" || question.type === "true_false"
      ? <ChoiceInput key={question._id} question={question} onAnswer={setChosen} />
      : <QuestionInput key={question._id} question={question} onAnswer={setChosen} onEnter={next} />}
    <p className="m-0 text-sm text-muted-foreground">{t("challenges.noFeedback")}</p>
    <p className="m-0 text-destructive" role="alert">{problem}</p>
    <div><Button onClick={next} disabled={sending}>{last ? t("challenges.finish") : t("challenges.next")}</Button></div>
  </div>;
}
