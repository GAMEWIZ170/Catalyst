import { useEffect, useState } from "react";
import { ListChecks, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { List, ListItem } from "@astryxdesign/core/List";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { api } from "../../api/client";
import { Loading } from "../../pages/learn/Courses";
import GenerateMore from "./GenerateMore";

const icon = (Icon) => <Icon size={18} aria-hidden="true" />;

// The Quizzes tab. "New quiz" makes "Untitled quiz" at once with its name open for typing; the name saves when you leave it.
// A quiz is edited on its own page and played in the normal test screen.
export default function SetQuizzes({ setId }) {
  const [quizzes, setQuizzes] = useState(null);
  const [error, setError] = useState("");
  const [naming, setNaming] = useState(null);   // { id, title }
  const [removing, setRemoving] = useState(null);
  const [generating, setGenerating] = useState(false);

  async function load() {
    try { setQuizzes((await api.getSetQuizzes(setId)).data); } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, [setId]);

  async function create() {
    try {
      const { data } = await api.createSetQuiz(setId, "Untitled quiz");
      await load();
      setNaming({ id: data.id, title: data.title || "Untitled quiz" });
    } catch (err) { setError(err.message); }
  }

  async function commitName() {
    const current = naming;
    setNaming(null);
    const title = current.title.trim();
    if (!title || title === quizzes.find((quiz) => quiz.id === current.id)?.title) return;
    try { await api.renameSetQuiz(current.id, title); await load(); } catch (err) { setError(err.message); }
  }

  async function remove() {
    const target = removing;
    setRemoving(null);
    try { await api.deleteSetQuiz(target.id); await load(); } catch (err) { setError(err.message); }
  }

  if (!quizzes) return error ? <Text color="secondary" role="alert">{error}</Text> : <Loading />;
  return <VStack gap={4}>
    <HStack gap={2} justify="between" align="center" wrap="wrap">
      <Text type="supporting" color="secondary">{quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"}. Take a quiz untimed or timed.</Text>
      <HStack gap={2} wrap="wrap">
        <Button label="Generate more" variant="secondary" icon={icon(Sparkles)} onClick={() => setGenerating(true)} />
        <Button label="New quiz" variant="primary" icon={icon(Plus)} onClick={create} />
      </HStack>
    </HStack>
    {error && <Text color="secondary" role="alert">{error}</Text>}
    {quizzes.length === 0
      ? <EmptyState isCompact icon={<ListChecks size={28} aria-hidden="true" />} title="No quizzes yet" description="Make a quiz and add questions, or let the AI draft some." />
      : <List hasDividers>
        {quizzes.map((quiz) => naming?.id === quiz.id
          ? <ListItem key={quiz.id} label={<div onBlur={commitName}><TextInput label="Quiz name" isLabelHidden value={naming.title} maxLength={80} hasAutoFocus onEnter={commitName}
            onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setNaming(null); } }} onChange={(title) => setNaming({ ...naming, title })} /></div>} />
          : <ListItem key={quiz.id} label={quiz.title} description={`${quiz.questionCount} ${quiz.questionCount === 1 ? "question" : "questions"}`} href={`/lab/quizzes/${quiz.id}`}
            endContent={<HStack gap={1} align="center">
              {quiz.questionCount > 0 && <Button label="Take quiz" size="sm" variant="secondary" href={`/tests/${quiz.id}`} />}
              <MoreMenu label={`Options for ${quiz.title}`} alignment="end" items={[
                { label: "Rename", icon: icon(Pencil), onClick: () => setNaming({ id: quiz.id, title: quiz.title }) },
                { type: "divider" },
                { label: "Delete quiz", icon: icon(Trash2), variant: "destructive", onClick: () => setRemoving(quiz) }
              ]} />
            </HStack>} />)}
      </List>}

    <Dialog isOpen={Boolean(removing)} onOpenChange={(open) => { if (!open) setRemoving(null); }} width={400}>
      <DialogHeader title="Delete this quiz?" onOpenChange={(open) => { if (!open) setRemoving(null); }} />
      <VStack gap={4} padding={4}>
        <Text>Its questions are deleted too.</Text>
        <HStack gap={2} justify="end"><Button label="Cancel" variant="ghost" onClick={() => setRemoving(null)} /><Button label="Delete" variant="destructive" onClick={remove} /></HStack>
      </VStack>
    </Dialog>
    <GenerateMore isOpen={generating} onOpenChange={setGenerating} setId={setId} kind="questions" onSaved={load} />
  </VStack>;
}
