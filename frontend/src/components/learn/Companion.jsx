import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Flag, Mic, MicOff } from "lucide-react";
import ChatText from "./ChatText";
import { api } from "../../api/client";
import { Button, SelectField, TextArea, useToast } from "../ui";
import { cn } from "@/lib/utils";

const NOTE = "AI can make mistakes. Check with your lesson.";
const CATEGORIES = [["wrong_answer", "It is wrong"], ["unclear", "It is unclear"], ["other", "Something else"]];

// The study companion: a tutor that reads only this lesson or study set. It asks what you tried and gives one hint at a time,
// shows where each answer came from, and never gives the final answer to a test item. Nothing is kept on the server:
// the last few turns are sent with each message. It is not placed on test or exam screens, and the server refuses it
// while a timed quiz or exam is running.
export default function Companion({ kind, id, initialTurns = [], onTurns }) {
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [turns, setTurns] = useState(initialTurns);          // { role, content, sources?, flagged? }
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [flagging, setFlagging] = useState(null);  // index of the answer being flagged
  const [category, setCategory] = useState("wrong_answer");
  const [flagNote, setFlagNote] = useState("");
  const logRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    api.getAiStatus().then(({ data }) => setStatus(data)).catch(() => {});
  }, []);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [turns, busy]);
  useEffect(() => { if (turns.length) onTurns?.(turns); }, [turns]);
  const onScroll = (event) => { const el = event.currentTarget; setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80); };

  async function send(event, preset) {
    event?.preventDefault();
    const question = (preset ?? text).trim();
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

  // Dictation uses the browser's own speech recognition (free, nothing is sent to our server). Hidden where the browser has none.
  const Recognition = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const [listening, setListening] = useState(false);
  const recogRef = useRef(null);
  useEffect(() => () => recogRef.current?.abort(), []);
  function toggleMic() {
    if (listening) { recogRef.current?.stop(); return; }
    const recog = new Recognition();
    recog.lang = document.documentElement.lang || "en-US";
    recog.interimResults = false;
    recog.onresult = (event) => { const heard = Array.from(event.results).map((r) => r[0].transcript).join(" "); setText((current) => (current ? current + " " : "") + heard); };
    recog.onerror = () => toast({ tone: "warning", message: "The microphone is not available. Check the browser permission." });
    recog.onend = () => setListening(false);
    recogRef.current = recog;
    setListening(true);
    recog.start();
  }

  const resting = Boolean(status?.resting);
  const noneLeft = status && status.messagesLeft === 0;
  const onKey = (event) => { if (event.key === "Enter" && !event.shiftKey) send(event); };

  return <section className="flex h-full min-h-0 flex-col gap-3" aria-label="Study companion">
    <div className="relative min-h-0 flex-1">
    <div className="h-full overflow-y-auto pr-1" onScroll={onScroll} role="log" aria-live="polite" aria-label="Conversation" ref={logRef} tabIndex={0}>
      <div className="grid gap-4">
        {turns.length === 0 && <div className="grid justify-items-center gap-3 py-4 text-center">
          <h3 className="m-0 font-display text-xl font-semibold">How can I help?</h3>
          <p className="m-0 text-sm text-muted-foreground">{kind === "general" ? "Open a lesson or set to chat about it with the text in view." : `I use this ${kind === "lesson" ? "lesson" : "set"} when it helps.`} I give hints, not final answers, on graded questions.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {(kind === "general" ? ["Explain a topic simply", "Help me make a study plan"] : [`What is this ${kind === "lesson" ? "lesson" : "set"} about?`, "Quiz me with one question", "Create a study plan for me"]).map((label) => <button key={label} type="button" disabled={busy || resting || noneLeft} onClick={() => send(null, label)} className="rounded-pill border border-border px-3 py-1.5 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">{label}</button>)}
          </div>
        </div>}
        {turns.map((turn, index) => turn.role === "user"
          ? <p key={index} className="m-0 ml-8 justify-self-end rounded-2xl bg-muted px-4 py-2.5 whitespace-pre-wrap"><span className="sr-only">You: </span>{turn.content}</p>
          : <div key={index} className="grid gap-2">
            <div><span className="sr-only">Tutor: </span><ChatText text={turn.content} /></div>
            {turn.sources?.length > 0 && <p className="m-0 flex flex-wrap gap-1.5 text-sm">{turn.sources.map((source) => <Link key={source.n} to={source.link} className="rounded-pill border border-border px-2.5 py-0.5 hover:bg-muted">{source.label}{source.cited ? ` [${source.n}]` : ""}</Link>)}</p>}
            <p className="m-0 text-xs text-muted-foreground">{NOTE}</p>
            {turn.flagged
              ? <span className="text-sm text-muted-foreground">Flagged. Thank you.</span>
              : <div><Button variant="tertiary" size="sm" icon={Flag} onClick={() => setFlagging(index)}>Flag this answer</Button></div>}
            {flagging === index && <form className="grid gap-2 rounded-xl border border-border p-3" onSubmit={sendFlag}>
              <SelectField label="What is wrong with this answer?" value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </SelectField>
              <TextArea label="Tell us more (optional)" rows={2} maxLength={500} value={flagNote} onChange={(event) => setFlagNote(event.target.value)} />
              <div className="flex gap-2"><Button type="submit">Send flag</Button><Button variant="secondary" onClick={() => setFlagging(null)}>Cancel</Button></div>
            </form>}
          </div>)}
        {busy && <p className="m-0 text-muted-foreground" role="status">Thinking…</p>}
      </div>
    </div>
    {!atBottom && <button type="button" onClick={() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" })} className="absolute bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-pill border border-border bg-card px-3 py-1.5 text-sm font-semibold shadow-md hover:bg-muted"><ArrowDown size={14} aria-hidden="true" />Jump to latest</button>}
    </div>
    <p className="m-0 text-sm text-destructive empty:hidden" role="alert">{problem}</p>
    {resting ? <p className="m-0" role="status"><strong>AI is resting until tomorrow.</strong> Try again then.</p>
      : noneLeft ? <p className="m-0" role="status"><strong>You have used today's messages.</strong> They come back tomorrow.</p>
      : <form className="grid gap-1 rounded-2xl border border-input bg-background p-2 focus-within:border-ring" onSubmit={send}>
        <textarea aria-label="Your question" placeholder="Ask your AI tutor anything..." rows={2} maxLength={1000} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={onKey}
          className="max-h-40 min-h-12 w-full resize-none bg-transparent px-2 py-1 outline-none placeholder:text-muted-foreground" />
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs text-muted-foreground">{status && !resting ? `${status.messagesLeft} of ${status.limits.messages} left today` : "Free beta"}</span>
          <div className="flex items-center gap-1">
          {Recognition && <button type="button" onClick={toggleMic} aria-pressed={listening} aria-label={listening ? "Stop dictation" : "Dictate your question"} className={cn("grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring", listening && "bg-primary/15 text-foreground")}>{listening ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}</button>}
          <button type="submit" aria-label="Send" disabled={busy || !text.trim()} className={cn("grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", (busy || !text.trim()) && "opacity-40")}><ArrowUp size={18} aria-hidden="true" /></button>
          </div>
        </div>
      </form>}
  </section>;
}
