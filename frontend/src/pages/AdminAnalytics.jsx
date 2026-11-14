import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { api } from "../api/client";
import AdminLayout from "../components/admin/AdminLayout";
import StatusMessage from "../components/admin/StatusMessage";
import { Button, EmptyState, SelectField } from "../components/ui";
import { TYPE_LABELS } from "../components/admin/QuestionTypeFields";
import { Loading } from "./Courses";

const shorten = (text, max = 110) => (text.length > max ? `${text.slice(0, max)}...` : text);

export default function AdminAnalytics() {
  const [minAttempts, setMinAttempts] = useState("5");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      setData((await api.getQuestionAnalytics({ minAttempts })).data);
    } catch (err) {
      setError(err.message);
    }
  }
  // A slow answer for an older filter must not replace the newer one, so each run can be cancelled.
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api.getQuestionAnalytics({ minAttempts })
      .then((response) => { if (live) setData(response.data); })
      .catch((err) => { if (live) setError(err.message); });
    return () => { live = false; };
  }, [minAttempts]);

  return <AdminLayout>
    <div className="admin-heading">
      <div>
        <h1>Question analytics</h1>
        <p className="muted">Questions students get wrong most often, lowest percent correct first. Counting started when this page was added, and includes practice runs and mock exams. Numbers are anonymous.</p>
      </div>
    </div>
    <div className="analytics-filter">
      <SelectField label="Only questions answered at least" value={minAttempts} onChange={(event) => setMinAttempts(event.target.value)}>
        {["1", "5", "10", "20", "50"].map((value) => <option key={value} value={value}>{value} {value === "1" ? "time" : "times"}</option>)}
      </SelectField>
    </div>
    <StatusMessage message={error} error />
    {!data && !error && <Loading />}
    {error && !data && <Button variant="secondary" onClick={load}>Retry</Button>}
    {data && data.rows.length === 0 && <EmptyState icon={BarChart3} title="Nothing to show yet" description="Questions appear here once students have answered them enough times. Try a lower number above." />}
    {data && data.rows.length > 0 && <div className="table-scroll" tabIndex="0" role="region" aria-label="Questions by percent correct">
      <table className="analytics-table">
        <caption className="sr-only">Questions sorted by lowest percent correct</caption>
        <thead><tr><th scope="col">Question</th><th scope="col">Test</th><th scope="col">Answered</th><th scope="col">Correct</th><th scope="col">Most common wrong answer</th></tr></thead>
        <tbody>
          {data.rows.map((row) => <tr key={row.questionId}>
            <th scope="row">
              <Link to={`/admin/tests/${row.testId}`}>{shorten(row.text)}</Link>
              <span className="muted"> {TYPE_LABELS[row.type] || row.type}{row.topic ? ` · ${row.topic}` : ""}</span>
            </th>
            <td>{row.testTitle}</td>
            <td>{row.attempts}</td>
            <td><strong>{row.percentCorrect}%</strong></td>
            <td>{row.topWrong ? `${shorten(row.topWrong.label, 60)} (${row.topWrong.count})` : "Not recorded for this type"}</td>
          </tr>)}
        </tbody>
      </table>
    </div>}
  </AdminLayout>;
}
