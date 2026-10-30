import { useState } from "react";
import { api } from "../api/client";

export default function QuestionCard({ question, index, onAnswered }) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const choices = question.type === "true_false" ? ["true", "false"] : question.options || [];

  async function submitAnswer(event) {
    event.preventDefault();
    if (question.type !== "flashcard" && !answer) return;
    setSubmitting(true);
    try {
      const response = await api.answerQuestion(
        question._id,
        question.type === "flashcard" ? undefined : answer
      );
      setResult(response.data);
      onAnswered(question._id, question.type === "flashcard" ? "" : answer);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="question-card">
      <div className="question-number">Question {String(index + 1).padStart(2, "0")}</div>
      <h3>{question.text}</h3>
      <form onSubmit={submitAnswer}>
        {question.type === "flashcard" ? (
          <p className="muted">Flip this flashcard when you are ready to reveal the back.</p>
        ) : (
          <div className="choice-list">
            {choices.map((choice) => (
              <label className={`choice ${answer === choice ? "selected" : ""}`} key={choice}>
                <input type="radio" name={question._id} value={choice}
                  checked={answer === choice} onChange={(event) => setAnswer(event.target.value)} />
                <span>{choice}</span>
              </label>
            ))}
          </div>
        )}
        <button className="button button-secondary" disabled={submitting || (question.type !== "flashcard" && !answer)}>
          {submitting ? "Checking..." : question.type === "flashcard" ? "Reveal answer" : "Check answer"}
        </button>
      </form>
      {result && !result.error && (
        <div className={`answer-result ${result.isCorrect === true ? "correct" : result.isCorrect === false ? "incorrect" : ""}`}>
          {result.isCorrect === true && <strong>Correct. </strong>}
          {result.isCorrect === false && <strong>Not quite. </strong>}
          <span>{result.correctAnswer}</span>
          {result.explanation && <p>{result.explanation}</p>}
        </div>
      )}
      {result?.error && <p className="form-error">{result.error}</p>}
    </article>
  );
}
