import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, ListChecks, Pencil, Plus, ToggleLeft, Trash2, X } from "lucide-react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { IconButton } from "@astryxdesign/core/IconButton";
import { List, ListItem } from "@astryxdesign/core/List";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import AstryxTheme from "../components/astryx/AstryxTheme";
import ClickToEdit from "../components/astryx/ClickToEdit";
import { ErrorState, Loading } from "./Courses";

const icon = (Icon) => <Icon size={18} aria-hidden="true" />;
const blank = (type) => ({ id: null, type, text: "", options: ["", ""], correct: 0, truth: "true", explanation: "" });

// One quiz of a study set. A question is added by choosing its type from two cards, then filling it in a dialog.
// The right answer is chosen by tapping it. Built with Astryx.
export default function LabQuiz() {
  const { testId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);       // null = closed; { type: null } = choosing a type
  const [problem, setProblem] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);

  function load() {
    api.getSetQuiz(testId).then(({ data }) => setQuiz(data)).catch((err) => setError(err.status === 404 ? "This quiz was not found" : err.message));
  }
  useEffect(load, [testId]);

  function edit(question) {
    setProblem("");
    setForm({
      id: question._id, type: question.type, text: question.text,
      options: question.type === "mcq" ? question.options.map((option) => option.text) : ["", ""],
      correct: question.correctIndex ?? 0, truth: question.correctAnswer || "true", explanation: question.explanation || ""
    });
  }

  async function save() {
    setSaving(true);
    setProblem("");
    const base = { text: form.text.trim(), explanation: form.explanation.trim() };
    const body = form.type === "mcq"
      ? { ...base, options: form.options.map((text) => ({ text: text.trim() })), correctIndex: form.correct }
      : { ...base, correctAnswer: form.truth };
    try {
      if (form.id) await api.updateSetQuestion(form.id, body);
      else await api.createSetQuestion({ ...body, test: testId, type: form.type, order: quiz.questions.length + 1 });
      setForm(null);
      load();
    } catch (err) {
      setProblem(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const target = removing;
    setRemoving(null);
    try { await api.deleteSetQuestion(target._id); load(); } catch (err) { setError(err.message); }
  }

  async function rename(title) {
    try { await api.renameSetQuiz(testId, title); load(); } catch (err) { setError(err.message); }
  }

  if (error && !quiz) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!quiz) return <Loading />;
  const set = (patch) => setForm({ ...form, ...patch });
  const mcq = form?.type === "mcq";
  const valid = form?.type && form.text.trim() && (!mcq || (form.options.length >= 2 && form.options.every((option) => option.trim())));
  const close = (open) => { if (!open) setForm(null); };

  return <AstryxTheme>
    <div className="content student-page lab-quiz">
      <VStack gap={4}>
        <div><Button label="Back to my set" variant="ghost" size="sm" icon={icon(ArrowLeft)} href={`/lab/${quiz.set}?tab=quizzes`} /></div>
        <HStack gap={3} justify="between" align="center" wrap="wrap">
          <ClickToEdit heading label="Quiz name" value={quiz.title} placeholder="Untitled quiz" onSave={rename} />
          <HStack gap={2}>
            {quiz.questions.length > 0 && <Button label="Take quiz" variant="primary" href={`/tests/${testId}`} />}
            <Button label="Add question" variant="secondary" icon={icon(Plus)} onClick={() => { setProblem(""); setForm({ type: null }); }} />
          </HStack>
        </HStack>
        {error && <Banner status="error" title={error} container="section" />}
        {quiz.questions.length === 0
          ? <EmptyState isCompact icon={<ListChecks size={28} aria-hidden="true" />} title="No questions yet" description="Add your first question." />
          : <List hasDividers>
            {quiz.questions.map((question) => <ListItem key={question._id} label={question.text} onClick={() => edit(question)}
              description={question.type === "mcq" ? `Multiple choice, ${question.options.length} options` : "True or false"}
              endContent={<MoreMenu label="Question options" alignment="end" items={[
                { label: "Edit", icon: icon(Pencil), onClick: () => edit(question) },
                { type: "divider" },
                { label: "Delete question", icon: icon(Trash2), variant: "destructive", onClick: () => setRemoving(question) }
              ]} />} />)}
          </List>}
      </VStack>

      <Dialog isOpen={Boolean(form)} onOpenChange={close} purpose="form" width={560}>
        <DialogHeader title={!form?.type ? "Choose a question type" : form.id ? "Change the question" : "New question"} onOpenChange={close} />
        {form && !form.type && <HStack gap={3} padding={4} wrap="wrap">
          <ClickableCard label="Multiple choice" onClick={() => setForm(blank("mcq"))}><VStack gap={1} align="center"><ListChecks size={28} aria-hidden="true" /><Text weight="semibold">Multiple choice</Text><Text type="supporting" color="secondary">Pick the right answer</Text></VStack></ClickableCard>
          <ClickableCard label="True or false" onClick={() => setForm(blank("true_false"))}><VStack gap={1} align="center"><ToggleLeft size={28} aria-hidden="true" /><Text weight="semibold">True or false</Text><Text type="supporting" color="secondary">A statement</Text></VStack></ClickableCard>
        </HStack>}
        {form?.type && <VStack gap={4} padding={4}>
          {problem && <Banner status="error" title={problem} container="section" />}
          <TextArea label="Question" isLabelHidden placeholder="Question (formulas work: $x^2$ or $\ce{H2O}$)" rows={3} maxLength={1500} value={form.text} onChange={(text) => set({ text })} hasAutoFocus />
          {mcq && <VStack gap={2}>
            <Text type="supporting" color="secondary">Tap the circle next to the right answer.</Text>
            {form.options.map((option, index) => <HStack key={index} gap={2} align="center">
              <IconButton label={form.correct === index ? `Option ${index + 1} is the correct answer` : `Mark option ${index + 1} as the correct answer`} tooltip="Correct answer" variant={form.correct === index ? "primary" : "secondary"} size="sm" icon={icon(form.correct === index ? CheckCircle2 : Circle)} onClick={() => set({ correct: index })} />
              <div style={{ flex: 1 }}><TextInput label={`Option ${index + 1}`} isLabelHidden placeholder={`Option ${index + 1}`} maxLength={300} value={option} onChange={(value) => set({ options: form.options.map((item, i) => (i === index ? value : item)) })} /></div>
              {form.options.length > 2 && <IconButton label={`Remove option ${index + 1}`} variant="ghost" size="sm" icon={icon(X)} onClick={() => set({ options: form.options.filter((_, i) => i !== index), correct: form.correct === index ? 0 : form.correct > index ? form.correct - 1 : form.correct })} />}
            </HStack>)}
            {form.options.length < 6 && <div><Button label="Add option" variant="ghost" size="sm" icon={icon(Plus)} onClick={() => set({ options: [...form.options, ""] })} /></div>}
          </VStack>}
          {!mcq && <SegmentedControl label="The answer is" value={form.truth} onChange={(truth) => set({ truth })}>
            <SegmentedControlItem value="true" label="True" />
            <SegmentedControlItem value="false" label="False" />
          </SegmentedControl>}
          <TextArea label="Explanation" isLabelHidden placeholder="Explanation shown after answering (optional)" rows={2} maxLength={4000} value={form.explanation} onChange={(explanation) => set({ explanation })} />
          <HStack gap={2} justify="end">
            <Button label="Cancel" variant="ghost" onClick={() => setForm(null)} />
            <Button label={form.id ? "Save question" : "Add question"} variant="primary" isDisabled={!valid} isLoading={saving} onClick={save} />
          </HStack>
        </VStack>}
      </Dialog>

      <Dialog isOpen={Boolean(removing)} onOpenChange={(open) => { if (!open) setRemoving(null); }} width={400}>
        <DialogHeader title="Delete this question?" onOpenChange={(open) => { if (!open) setRemoving(null); }} />
        <VStack gap={4} padding={4}>
          <Text>This cannot be undone.</Text>
          <HStack gap={2} justify="end"><Button label="Cancel" variant="ghost" onClick={() => setRemoving(null)} /><Button label="Delete" variant="destructive" onClick={remove} /></HStack>
        </VStack>
      </Dialog>
    </div>
  </AstryxTheme>;
}
