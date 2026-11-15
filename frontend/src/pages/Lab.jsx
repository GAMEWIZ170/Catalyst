import { useEffect, useState } from "react";
import { FlaskConical, Plus, Users } from "lucide-react";
import { Button } from "@astryxdesign/core/Button";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { api } from "../api/client";
import AstryxTheme from "../components/astryx/AstryxTheme";
import NewSetDialog from "../components/lab/NewSetDialog";
import { ErrorState, Loading } from "./Courses";
import { t } from "../i18n";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// The Study Lab: a student's own study sets. Each set holds notes, flashcards and quizzes on one topic.
// Built with Astryx (UI library trial, branch feature/astryx-trial).
export default function Lab() {
  const [sets, setSets] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  // A slower answer for an older search must not replace a newer one.
  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      api.getSets(query.trim()).then(({ data }) => { if (live) { setSets(data); setError(""); } }).catch((err) => { if (live) setError(err.message); });
    }, query ? 250 : 0);
    return () => { live = false; window.clearTimeout(timer); };
  }, [query]);

  return <AstryxTheme>
    <div className="content student-page lab-page">
      <VStack gap={5}>
        <HStack gap={3} justify="between" align="center" wrap="wrap">
          <VStack gap={1}>
            <Heading level={1}>{t("lab.title")}</Heading>
            <Text color="secondary">Your own notes, flashcards and quizzes. Only you can see them.</Text>
          </VStack>
          <HStack gap={2} wrap="wrap">
            <Button label="Community sets" variant="ghost" icon={<Users size={18} aria-hidden="true" />} href="/community" />
            <Button label="New set" variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={() => setCreating(true)} />
          </HStack>
        </HStack>
        <TextInput type="search" label="Search my sets" isLabelHidden placeholder="Search my sets" value={query} onChange={setQuery} hasClear />
        {error && !sets && <ErrorState message={error} onRetry={() => setQuery((q) => q + " ")} />}
        {!sets && !error && <Loading />}
        {sets && sets.length === 0 && (query
          ? <EmptyState icon={<FlaskConical size={32} aria-hidden="true" />} title="No sets match" description="Try a different word." />
          : <EmptyState icon={<FlaskConical size={32} aria-hidden="true" />} title="Make your first set" description="A set is a place for your notes, flashcards and quizzes on one topic."
              actions={<Button label="New set" variant="primary" onClick={() => setCreating(true)} />} />)}
        {sets && sets.length > 0 && <Grid columns={{ minWidth: 260 }} gap={4}>
          {sets.map((set) => <ClickableCard key={set.id} label={set.title} href={`/lab/${set.id}`}>
            <VStack gap={1}>
              <Text weight="semibold" display="block" maxLines={2}>{set.title}</Text>
              {(set.topic || set.course) && <Text type="supporting" color="secondary" display="block" maxLines={1}>{[set.course?.code, set.topic].filter(Boolean).join(" · ")}</Text>}
              {set.description && <Text type="supporting" color="secondary" display="block" maxLines={2}>{set.description}</Text>}
              <Text type="supporting" color="secondary" display="block">{plural(set.cardCount, "card")} · {plural(set.quizCount, "quiz")}</Text>
            </VStack>
          </ClickableCard>)}
        </Grid>}
      </VStack>
      <NewSetDialog isOpen={creating} onOpenChange={setCreating} />
    </div>
  </AstryxTheme>;
}
