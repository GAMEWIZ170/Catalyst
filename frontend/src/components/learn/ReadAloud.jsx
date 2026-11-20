import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { t } from "../../i18n";
import { Button } from "../ui";

const SPEEDS = [0.75, 1, 1.25, 1.5];
const CHUNK = 220;

// Formulas sound like nonsense when read letter by letter, so they are replaced by the word "formula".
export function readableText(source) {
  return String(source || "")
    .replace(/\$\$[\s\S]*?\$\$/g, " formula. ")
    .replace(/(?<!\\)\$[^$\n]+?(?<!\\)\$/g, " formula ")
    .replace(/\\\$/g, "$")
    .replace(/\s+/g, " ")
    .trim();
}

// Browsers stop long speech after about fifteen seconds, so the text is read in sentence-sized pieces.
function toChunks(text) {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && (current + sentence).length > CHUNK) {
      chunks.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// Reads text aloud with the browser's own voice (free, nothing is sent anywhere). Hidden where the browser has no voice.
export default function ReadAloud({ text }) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [state, setState] = useState("idle"); // idle | playing | paused
  const [speed, setSpeed] = useState(1);
  const run = useRef(0); // bumped on every stop, so a piece that ends late cannot start the next one
  const position = useRef(0);
  const chunks = useRef([]);
  const speedRef = useRef(1);

  function speakFrom(index) {
    const id = run.current;
    if (index >= chunks.current.length) {
      setState("idle");
      return;
    }
    position.current = index;
    const utterance = new SpeechSynthesisUtterance(chunks.current[index]);
    utterance.rate = speedRef.current;
    utterance.lang = document.documentElement.lang || "en";
    utterance.onend = () => { if (id === run.current) speakFrom(index + 1); };
    utterance.onerror = () => { if (id === run.current) setState("idle"); };
    window.speechSynthesis.speak(utterance);
  }

  function stop() {
    run.current += 1;
    if (supported) window.speechSynthesis.cancel();
    setState("idle");
  }

  function play() {
    if (state === "paused") {
      window.speechSynthesis.resume();
      setState("playing");
      return;
    }
    stop();
    chunks.current = toChunks(readableText(text));
    if (!chunks.current.length) return;
    setState("playing");
    speakFrom(0);
  }

  function pause() {
    window.speechSynthesis.pause();
    setState("paused");
  }

  function changeSpeed(value) {
    setSpeed(value);
    speedRef.current = value;
    // A new speed applies from the piece being read, which starts again.
    if (state === "playing") {
      run.current += 1;
      window.speechSynthesis.cancel();
      speakFrom(position.current);
    }
  }

  // Leaving the page or opening another lesson stops the voice.
  useEffect(() => stop, [text]);

  if (!supported || !readableText(text)) return null;
  return <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label={t("readAloud.label")}>
    {state === "playing"
      ? <Button variant="secondary" icon={Pause} onClick={pause}>{t("readAloud.pause")}</Button>
      : <Button variant="secondary" icon={Play} onClick={play}>{state === "paused" ? t("readAloud.resume") : t("readAloud.play")}</Button>}
    {state !== "idle" && <Button variant="secondary" icon={Square} onClick={stop}>{t("readAloud.stop")}</Button>}
    {state !== "idle" && <div className="inline-flex items-center gap-2 text-sm text-muted-foreground" role="group" aria-label={t("readAloud.speed")}>
      {SPEEDS.map((value) => <button className="min-h-11 min-w-11 cursor-pointer rounded-pill border border-input bg-card px-3 font-sans text-sm text-foreground aria-pressed:border-primary aria-pressed:bg-primary/15 aria-pressed:font-semibold" type="button" key={value} aria-pressed={speed === value} onClick={() => changeSpeed(value)}>{value}x</button>)}
    </div>}
    <span className="sr-only" role="status">{state === "playing" ? t("readAloud.reading") : state === "paused" ? t("readAloud.paused") : ""}</span>
  </div>;
}
