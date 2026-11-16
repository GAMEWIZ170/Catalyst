import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { api } from "../../api/client";
import AstryxTheme from "../../components/astryx/AstryxTheme";
import ClickToEdit from "../../components/astryx/ClickToEdit";
import { ErrorState, Loading } from "../learn/Courses";
import { appendToDoc, draftToNodes, notesToDraft } from "../../utils/draftToDoc";

const icon = (Icon) => <Icon size={18} aria-hidden="true" />;
let keyCounter = 0;
const withKey = (item) => ({ ...item, key: `d${keyCounter++}` });

// Review what the AI drafted: edit or delete each item, then save. Nothing is saved to the set until the student says so.
export default function LabReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [build, setBuild] = useState(null);
  const [set, setSet] = useState(null);
  const [courses, setCourses] = useState([]);
  const [cards, setCards] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  function load() {
    setError("");
    api.getSetBuild(id).then(({ data }) => {
      setBuild(data);
      if (data.status === "ready" && !loaded) {
        setCards((data.drafts?.cards || []).map(withKey));
        setQuestions((data.drafts?.questions || []).map(withKey));
        setNotes(data.drafts?.notes ? notesToDraft(data.drafts.notes) : "");
        setLoaded(true);
      }
      if (data.status === "none") navigate(`/lab/${id}`, { replace: true });
    }).catch((err) => setError(err.status === 404 ? "This set was not found" : err.message));
  }
  useEffect(load, [id]);
  useEffect(() => {
    api.getSet(id).then(({ data }) => setSet(data)).catch(() => {});
    api.getCourses().then(({ data }) => setCourses(data || [])).catch(() => {});
  }, [id]);

  // While the AI is still working, look again every few seconds.
  useEffect(() => {
    if (build?.status !== "processing") return undefined;
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, [build?.status]);

  async function patchSet(body) {
    try {
      const { data } = await api.updateSet(id, body);
      setSet(data);
      setBuild((current) => ({ ...current, title: data.title, topic: data.topic }));
    } catch (err) {
      setError(err.message);
    }
  }

  const change = (setter) => (index, patch) => setter((rows) => rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));
  const remove = (setter) => (index) => setter((rows) => rows.filter((_, at) => at !== index));

  async function save() {
    setBusy(true);
    setError("");
    try {
      const doneCards = cards.map((row) => ({ front: row.front.trim(), back: row.back.trim() })).filter((row) => row.front && row.back);
      const doneQuestions = questions.filter((row) => row.text.trim() && row.options.every((option) => option.trim()));
      const nodes = draftToNodes(notes);
      if (!doneCards.length && !doneQuestions.length && !nodes.length) throw new Error("There is nothing to save. Add something back, or choose Start empty.");
      if (doneCards.length) await api.addSetCards(id, doneCards);
      if (doneQuestions.length) {
        const quizId = (await api.createSetQuiz(id, "AI quiz")).data.id;
        for (const [at, row] of doneQuestions.entries()) {
          await api.createSetQuestion({ test: quizId, type: "mcq", order: at + 1, text: row.text.trim(), options: row.options.map((option) => ({ text: option.trim() })), correctIndex: row.correctIndex, explanation: (row.explanation || "").trim() });
        }
      }
      if (nodes.length) {
        const { data } = await api.getSetNotes(id);
        await api.saveSetNotes(id, appendToDoc(data.content, nodes));
      }
      await api.finishSetBuild(id);
      navigate(`/lab/${id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function startEmpty() {
    setBusy(true);
    try {
      await api.finishSetBuild(id);
      navigate(`/lab/${id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function retry() {
    try { await api.retrySetBuild(id); load(); } catch (err) { setError(err.message); }
  }

  if (error && !build) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!build) return <Loading />;

  const back = <div><Button label="Study Lab" variant="ghost" size="sm" icon={icon(ArrowLeft)} href="/lab" /></div>;

  if (build.status === "processing") {
    return <AstryxTheme><div className="content student-page lab-set"><VStack gap={4}>{back}
      <HStack gap={3} align="center"><Spinner label="" aria-label="Making your set" /><VStack gap={1}><Heading level={2}>Making your set…</Heading><Text color="secondary">The AI is reading your material. You can leave this page.</Text></VStack></HStack>
    </VStack></div></AstryxTheme>;
  }

  if (build.status === "issue") {
    return <AstryxTheme><div className="content student-page lab-set"><VStack gap={4}>{back}
      <Banner status="warning" title="The AI could not build this set" description={build.message} container="section" />
      <HStack gap={2}><Button label="Try again" variant="primary" onClick={retry} /><Button label="Start empty" variant="ghost" isLoading={busy} onClick={startEmpty} /></HStack>
    </VStack></div></AstryxTheme>;
  }

  const total = cards.length + questions.length + (notes.trim() ? 1 : 0);
  return <AstryxTheme>
    <div className="content student-page lab-set">
      <VStack gap={5}>
        {back}
        <VStack gap={1} align="start">
          <ClickToEdit heading label="Title" value={build.title} placeholder="Untitled set" onSave={(title) => patchSet({ title })} />
          <HStack gap={2} wrap="wrap" align="center">
            <ClickToEdit label="Topic" value={build.topic} placeholder="Add a topic" onSave={(topic) => patchSet({ topic })} />
            <Selector label="Course" isLabelHidden variant="ghost" size="sm" hasClear placeholder="Add a course" value={set?.course?.id || ""}
              onChange={(value) => patchSet({ course: value || null })} options={courses.map((course) => ({ value: course._id, label: `${course.code}: ${course.title}` }))} />
          </HStack>
        </VStack>
        {build.message && <Banner status="info" title={build.message} container="section" />}
        {error && <Banner status="error" title={error} container="section" />}
        <Text color="secondary">Check what the AI drafted. Change or delete anything, then save.</Text>

        {cards.length > 0 && <VStack gap={3}>
          <Heading level={2}>Flashcards ({cards.length})</Heading>
          {cards.map((row, index) => <HStack key={row.key} gap={2} align="start">
            <VStack gap={2} style={{ flex: 1 }}>
              <TextArea label={`Card ${index + 1} front`} isLabelHidden rows={2} value={row.front} onChange={(value) => change(setCards)(index, { front: value })} />
              <TextArea label={`Card ${index + 1} back`} isLabelHidden rows={2} value={row.back} onChange={(value) => change(setCards)(index, { back: value })} />
            </VStack>
            <IconButton label={`Delete card ${index + 1}`} variant="ghost" icon={icon(Trash2)} onClick={() => remove(setCards)(index)} />
          </HStack>)}
        </VStack>}

        {questions.length > 0 && <VStack gap={3}>
          <Heading level={2}>Quiz questions ({questions.length})</Heading>
          {questions.map((row, index) => <HStack key={row.key} gap={2} align="start">
            <VStack gap={2} style={{ flex: 1 }}>
              <TextArea label={`Question ${index + 1}`} isLabelHidden rows={2} value={row.text} onChange={(value) => change(setQuestions)(index, { text: value })} />
              {row.options.map((option, at) => <HStack key={at} gap={2} align="center">
                <IconButton label={row.correctIndex === at ? `Option ${at + 1} is the correct answer` : `Mark option ${at + 1} as the correct answer`} tooltip="Correct answer"
                  variant={row.correctIndex === at ? "primary" : "secondary"} size="sm" icon={icon(Check)} onClick={() => change(setQuestions)(index, { correctIndex: at })} />
                <div style={{ flex: 1 }}><TextInput label={`Option ${at + 1}`} isLabelHidden value={option} onChange={(value) => change(setQuestions)(index, { options: row.options.map((item, i) => (i === at ? value : item)) })} /></div>
              </HStack>)}
            </VStack>
            <IconButton label={`Delete question ${index + 1}`} variant="ghost" icon={icon(Trash2)} onClick={() => remove(setQuestions)(index)} />
          </HStack>)}
        </VStack>}

        {notes.trim() && <VStack gap={3}>
          <HStack justify="between" align="center"><Heading level={2}>Notes</Heading><Button label="Delete notes" variant="ghost" size="sm" icon={icon(Trash2)} onClick={() => setNotes("")} /></HStack>
          <TextArea label="Notes draft" isLabelHidden rows={12} value={notes} onChange={setNotes} />
        </VStack>}

        <HStack gap={2} wrap="wrap">
          <Button label="Save to my set" variant="primary" isDisabled={!total} isLoading={busy} onClick={save} />
          <Button label="Start empty" variant="ghost" isDisabled={busy} onClick={startEmpty} tooltip="Skip the drafts and open the empty set" />
        </HStack>
      </VStack>
    </div>
  </AstryxTheme>;
}
