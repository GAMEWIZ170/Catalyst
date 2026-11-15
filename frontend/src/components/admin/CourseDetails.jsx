import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import AstryxTheme from "../astryx/AstryxTheme";
import ClickToEdit from "../astryx/ClickToEdit";
import SettingRow, { SaveState, useAutosave } from "../astryx/SettingRow";

// A course's details as rows that save by themselves (no Save button). Click a value to change it.
// The category is typed once; the categories other courses use are offered as chips to click.
export default function CourseDetails({ course, categoryNames, onSave }) {
  const { status, run } = useAutosave();
  const [description, setDescription] = useState(course.description || "");
  const [authors, setAuthors] = useState(() => (course.authors || []).map((author) => ({ displayName: author.displayName || "", bio: author.bio || "" })));
  const [fresh, setFresh] = useState(null);   // index of an author row just added, opened for typing
  useEffect(() => { setDescription(course.description || ""); }, [course.description]);

  const save = (patch) => run(() => onSave(patch));
  const category = typeof course.category === "string" ? course.category : "";
  const saveAuthors = (next) => {
    setAuthors(next);
    return save({ authors: next.filter((author) => author.displayName.trim().length >= 2).map((author) => ({ displayName: author.displayName.trim(), bio: author.bio.trim() })) });
  };
  const edit = (index, patch) => saveAuthors(authors.map((author, at) => (at === index ? { ...author, ...patch } : author)));
  const suggestions = categoryNames.filter((name) => name !== category);

  return <AstryxTheme>
    <VStack gap={0}>
      <HStack justify="between" align="center"><Text weight="semibold">Course details</Text><SaveState status={status} /></HStack>
      <SettingRow label="Title"><ClickToEdit label="Title" value={course.title} placeholder="Untitled course" onSave={(title) => save({ title })} /></SettingRow>
      <SettingRow label="Code" help="Unique. Students see it on the course card."><ClickToEdit label="Code" value={course.code} placeholder="Add a code" onSave={(code) => save({ code })} /></SettingRow>
      <SettingRow label="Category" help="Courses with the same category are grouped. Empty means General.">
        <VStack gap={1} align="end">
          <ClickToEdit label="Category" value={category} placeholder="Add a category" allowEmpty onSave={(value) => save({ category: value })} />
          {suggestions.length > 0 && <HStack gap={1} wrap="wrap" justify="end">{suggestions.map((name) => <Button key={name} label={name} size="sm" variant="secondary" onClick={() => save({ category: name })} />)}</HStack>}
        </VStack>
      </SettingRow>
      <VStack gap={1} paddingBlock={3}>
        <Text weight="semibold">Description</Text>
        <div onBlur={() => { if (description.trim() && description.trim() !== course.description) save({ description: description.trim() }); }}>
          <TextArea label="Description" isLabelHidden rows={2} maxLength={200} value={description} onChange={setDescription} placeholder="One or two lines students see on the course card" />
        </div>
      </VStack>
      <VStack gap={2} paddingBlock={3}>
        <HStack justify="between" align="center">
          <Text weight="semibold">Authors</Text>
          {authors.length < 10 && <Button label="Add author" size="sm" variant="secondary" icon={<Plus size={16} aria-hidden="true" />} onClick={() => { setAuthors([...authors, { displayName: "", bio: "" }]); setFresh(authors.length); }} />}
        </HStack>
        {authors.length === 0 && <Text type="supporting" color="secondary">No authors yet.</Text>}
        {authors.map((author, index) => <HStack key={index} gap={2} align="center" justify="between">
          <HStack gap={2} wrap="wrap" align="center">
            <ClickToEdit label={`Author ${index + 1} name`} value={author.displayName} placeholder="Author name" startEditing={fresh === index} onSave={(displayName) => edit(index, { displayName })} />
            <ClickToEdit label={`Author ${index + 1} bio`} value={author.bio} placeholder="Add a short bio" allowEmpty onSave={(bio) => edit(index, { bio })} />
          </HStack>
          <IconButton label={`Remove author ${index + 1}`} tooltip="Remove author" variant="ghost" size="sm" icon={<X size={16} aria-hidden="true" />} onClick={() => saveAuthors(authors.filter((_, at) => at !== index))} />
        </HStack>)}
      </VStack>
      {status && !["Saving…", "Saved"].includes(status) && <Banner status="error" title={status} container="section" />}
    </VStack>
  </AstryxTheme>;
}
