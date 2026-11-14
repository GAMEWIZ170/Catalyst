import { useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../api/client";
import AdminLayout from "../components/admin/AdminLayout";
import StatusMessage from "../components/admin/StatusMessage";
import { Badge, Button } from "../components/ui";
import { TYPE_LABELS } from "../components/admin/QuestionTypeFields";

const MAX_BYTES = 1024 * 1024;

const COLUMN_HELP = [
  ["type", "mcq, true_false, multi_select, numeric, fill_blank, matching, ordering or balancing"],
  ["text", "The question. Formulas work like in the editor, for example $x^2$ or $\\ce{H2O}$"],
  ["option1 to option6", "Answer choices for mcq and multi_select, filled from option1 up"],
  ["correct", "mcq: the option number or letter (2 or B). multi_select: several, such as 1,3. true_false: true or false. numeric: the number"],
  ["answers", "fill_blank: every accepted answer, separated by |"],
  ["pairs", "matching: left=right|left=right"],
  ["items", "ordering: the items in the correct order, separated by |"],
  ["equation", "balancing: 2 H2 + O2 -> 2 H2O (lowest whole numbers)"],
  ["tolerance, tolerance_kind, unit", "numeric only: how far off is allowed, absolute or percent, and the unit the student must give"],
  ["explanation, hint, worked_solution", "Optional. worked_solution steps are separated by |"],
  ["topic, source, year", "Optional tags for practising by topic"]
];

export default function AdminQuestionImport() {
  const { id } = useParams();
  const location = useLocation();
  const back = location.state?.from || `/admin/tests/${id}`;
  const input = useRef(null);
  const [file, setFile] = useState(null);       // { name, text }
  const [report, setReport] = useState(null);   // the dry-run answer for the file currently chosen
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState("");

  async function download() {
    setError("");
    try {
      const blob = await api.downloadQuestionTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "catalyst-question-template.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  async function choose(event) {
    const chosen = event.target.files?.[0];
    setReport(null);
    setDone("");
    setError("");
    if (!chosen) return setFile(null);
    if (chosen.size > MAX_BYTES) { setFile(null); return setError("This file is over 1 MB. Split it into smaller files."); }
    setFile({ name: chosen.name, text: await chosen.text() });
  }

  // The same call, without saving. It reports every problem row so they can all be fixed at once.
  async function check() {
    setBusy("check");
    setError("");
    setDone("");
    try {
      setReport((await api.importQuestions(id, file.text, true)).data);
    } catch (err) {
      setReport(null);
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function run() {
    setBusy("import");
    setError("");
    try {
      const response = await api.importQuestions(id, file.text, false);
      setDone(response.message);
      setReport(null);
      setFile(null);
      if (input.current) input.current.value = "";
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  const errorByLine = new Map((report?.errors || []).map((item) => [item.line, item.message]));
  const ready = report && report.errors.length === 0;

  return <AdminLayout nav={false}>
    <p><Link className="back-link" to={back}>Back to the test</Link></p>
    <div className="admin-heading">
      <div>
        <h1>Import questions from a CSV file</h1>
        <p className="muted">Questions are added at the end of this test. Nothing is saved until you check the file and press Import. If any row has a problem, nothing is imported.</p>
      </div>
    </div>
    <section className="admin-editor-section import-step">
      <h2>1. Get the template</h2>
      <p>It has one example row for each question type. Fill it in with a spreadsheet program and save it as CSV (UTF-8). Pictures cannot be imported this way: add them in the editor afterwards.</p>
      <div><Button variant="secondary" onClick={download}>Download the template</Button></div>
      <details className="import-help">
        <summary>What goes in each column</summary>
        <dl>{COLUMN_HELP.map(([name, text]) => <div key={name}><dt><code>{name}</code></dt><dd>{text}</dd></div>)}</dl>
        <p className="muted">At most 200 questions per file.</p>
      </details>
    </section>
    <section className="admin-editor-section import-step">
      <h2>2. Choose your file and check it</h2>
      <label className="ui-label" htmlFor="csv-file">CSV file</label>
      <input className="ui-control" id="csv-file" ref={input} type="file" accept=".csv,text/csv" onChange={choose} />
      <div><Button disabled={!file} loading={busy === "check"} onClick={check}>Check the file</Button></div>
    </section>
    <StatusMessage message={error || done} error={Boolean(error)} />
    {done && <p><Link to={back}>See the questions in the test</Link></p>}
    {report && <section className="admin-editor-section import-step" aria-live="polite">
      <h2>3. Result</h2>
      <p>
        <strong>{report.total}</strong> {report.total === 1 ? "row" : "rows"} read: <strong>{report.valid}</strong> good
        {report.errors.length > 0 ? <>, <strong>{report.errors.length}</strong> with a problem.</> : "."}
      </p>
      <div className="table-scroll" tabIndex="0" role="region" aria-label="Rows in the file">
        <table className="analytics-table">
          <caption className="sr-only">Every row in the file and whether it can be imported</caption>
          <thead><tr><th scope="col">Row</th><th scope="col">Type</th><th scope="col">Question</th><th scope="col">Result</th></tr></thead>
          <tbody>
            {report.rows.map((row) => <tr key={row.line}>
              <th scope="row">{row.line}</th>
              <td>{TYPE_LABELS[row.type] || row.type || "?"}</td>
              <td>{row.text}</td>
              <td>{errorByLine.has(row.line) ? <><Badge tone="error">Problem</Badge> {errorByLine.get(row.line)}</> : <Badge tone="success">Good</Badge>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {ready
        ? <div><Button loading={busy === "import"} onClick={run}>Import {report.valid} {report.valid === 1 ? "question" : "questions"}</Button></div>
        : <p className="muted">Fix the rows marked Problem in your file, choose it again and check it again.</p>}
    </section>}
  </AdminLayout>;
}
