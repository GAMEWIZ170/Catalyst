import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Flag, MessageCircle, Send } from "lucide-react";
import { api } from "../api/client";
import { Button, SelectField, TextArea, useToast } from "./ui";

const NOTE = "AI can make mistakes. Check with your lesson.";
const CATEGORIES = [["wrong_answer", "It is wrong"], ["unclear", "It is unclear"], ["other", "Something else"]];

// The study companion: a tutor that reads only this lesson or study set. It asks what you tried and gives one hint at a time,
// shows where each answer came from, and never gives the final answer to a test item. Nothing is kept on the server:
// the last few turns are sent with each message. It is not placed on test or exam screens, and the server refuses it
// while a timed quiz or exam is running.
export default function Companion({ kind, id, defaultOpen = false }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(defaultOpen);
  const [status, setStatus] = useState(null);
  const [turns, setTurns] = useState([]);          // { role, content, sources?, flagged? }
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [flagging, setFlagging] = useState(null);  // index of the answer being flagged
  const [category, setCategory] = useState("wrong_answer");
  const [flagNote, setFlagNote] = useState("");
  const logRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    api.getAiStatus().then(({ data }) => setStatus(data)).catch(() => {});
  }, [open]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [turns, busy]);

  async function send(event) {
    event.preventDefault();
    const question = text.trim();
    if (!question || busy) return;
    const next = [...turns, { role: "user", content: question }];
    setTurns(next);
    setText("");
    setBusy(true);
    setProblem("");
    try {
      const { data } = await api.aiChat({ context: { kind, id }, messages: next.slice(-7).map((turn) => ({ role: turn.role, content: turn.content })) });
      setTurns([...next, { role: "assistant", content: data.reply, sources: data.sources }]);
      setStatus((current) => ({ ...(current || {}), messagesLeft: data.messagesLeft }));
    } catch (error) {
      setProblem(error.message);
      if (error.code === "resting" || error.code === "daily_limit") api.getAiStatus().then(({ data }) => setStatus(data)).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function sendFlag(event) {
    event.preventDefault();
    const answer = turns[flagging];
    const question = [...turns.slice(0, flagging)].reverse().find((turn) => turn.role === "user")?.content || "";
    try {
      await api.flagAiAnswer({ context: { kind, id }, question, answer: answer.content, category, note: flagNote.trim() });
      setTurns((current) => current.map((turn, index) => (index === flagging ? { ...turn, flagged: true } : turn)));
      toast({ tone: "success", message: "Thank you. We will check this answer." });
      setFlagging(null);
      setFlagNote("");
    } catch (error) {
      toast({ tone: "warning", message: error.message });
    }
  }

  const resting = Boolean(status?.resting);
  const noneLeft = status && status.messagesLeft === 0;
  if (!open) return <section className="companion companion--closed" aria-label="Study companion">
    <Button variant="secondary" icon={MessageCircle} onClick={() => setOpen(true)}>Ask the study companion</Button>
  </section>;

  return <section className="companion" aria-labelledby={`companion-${id}`}>
    <header className="companion-head">
      <h2 id={`companion-${id}`}>Study companion</h2>
      <Button variant="tertiary" onClick={() => setOpen(false)}>Close</Button>
    </header>
    <p className="muted">Free beta, fair-use limits apply.{status && !resting ? ` ${status.messagesLeft} of ${status.limits.messages} messages left today.` : ""} It reads only this {kind === "lesson" ? "lesson" : "set"}, asks what you tried, and gives hints, not final answers.</p>
    <div className="companion-log" role="log" aria-live="polite" aria-label="Conversation" ref={logRef} tabIndex={0}>
      {turns.length === 0 && <p className="muted">Ask about something you are stuck on, or paste a question you are working on and I will help you think it through.</p>}
      {turns.map((turn, index) => <div key={index} className={`companion-msg companion-msg--${turn.role}`}>
        <strong className="companion-who">{turn.role === "user" ? "You" : "Companion"}</strong>
        <p>{turn.content}</p>
        {turn.role === "assistant" && <>
          {turn.sources?.length > 0 && <p className="companion-sources">Based on: {turn.sources.map((source, at) => <span key={source.n}>{at > 0 ? " · " : ""}<Link to={source.link}>{source.label}</Link>{source.cited ? ` [${source.n}]` : ""}</span>)}</p>}
          <p className="muted companion-note">{NOTE}</p>
          {turn.flagged
            ? <span className="muted">Flagged. Thank you.</span>
            : <Button variant="tertiary" icon={Flag} onClick={() => setFlagging(index)}>Flag this answer</Button>}
          {flagging === index && <form className="companion-flag" onSubmit={sendFlag}>
            <SelectField label="What is wrong with this answer?" value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </SelectField>
            <TextArea label="Tell us more (optional)" rows={2} maxLength={500} value={flagNote} onChange={(event) => setFlagNote(event.target.value)} />
            <div className="button-row"><Button type="submit">Send flag</Button><Button variant="secondary" onClick={() => setFlagging(null)}>Cancel</Button></div>
          </form>}
        </>}
      </div>)}
      {busy && <p className="muted" role="status">Thinking…</p>}
    </div>
    <p className="settings-status" role="alert">{problem}</p>
    {resting ? <p role="status"><strong>AI is resting until tomorrow.</strong> Try again then.</p>
      : noneLeft ? <p role="status"><strong>You have used today's messages.</strong> They come back tomorrow.</p>
      : <form className="companion-form" onSubmit={send}>
        <TextArea label="Your question" rows={3} maxLength={1000} value={text} onChange={(event) => setText(event.target.value)} />
        <Button type="submit" icon={Send} disabled={busy || !text.trim()}>Send</Button>
      </form>}
  </section>;
}
