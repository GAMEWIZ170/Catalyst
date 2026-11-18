import { useEffect, useState } from "react";
import { AlertCircle, Plus, X } from "lucide-react";
import { Button, EditableTitle, SaveState, SettingRow, useAutosave } from "../ui";

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

  return <div className="grid">
    <div className="flex items-center justify-between gap-3"><span className="font-semibold">Course details</span><SaveState status={status} /></div>
    <SettingRow label="Title"><EditableTitle label="Title" value={course.title} placeholder="Untitled course" onSave={(title) => save({ title })} /></SettingRow>
    <SettingRow label="Code" help="Unique. Students see it on the course card."><EditableTitle label="Code" value={course.code} placeholder="Add a code" onSave={(code) => save({ code })} /></SettingRow>
    <SettingRow label="Category" help="Courses with the same category are grouped. Empty means General.">
      <div className="grid justify-items-end gap-1">
        <EditableTitle label="Category" value={category} placeholder="Add a category" allowEmpty onSave={(value) => save({ category: value })} />
        {suggestions.length > 0 && <div className="flex flex-wrap justify-end gap-1">{suggestions.map((name) => <Button key={name} size="sm" variant="secondary" onClick={() => save({ category: name })}>{name}</Button>)}</div>}
      </div>
    </SettingRow>
    <div className="grid gap-1 py-3">
      <span className="font-semibold">Description</span>
      <textarea aria-label="Description" rows={2} maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="One or two lines students see on the course card"
        onBlur={() => { if (description.trim() && description.trim() !== course.description) save({ description: description.trim() }); }}
        className="w-full resize-y rounded-lg border border-input bg-card p-3 font-sans text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
    </div>
    <div className="grid gap-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">Authors</span>
        {authors.length < 10 && <Button size="sm" variant="secondary" icon={Plus} onClick={() => { setAuthors([...authors, { displayName: "", bio: "" }]); setFresh(authors.length); }}>Add author</Button>}
      </div>
      {authors.length === 0 && <span className="text-sm text-muted-foreground">No authors yet.</span>}
      {authors.map((author, index) => <div key={index} className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <EditableTitle label={`Author ${index + 1} name`} value={author.displayName} placeholder="Author name" startEditing={fresh === index} onSave={(displayName) => edit(index, { displayName })} />
          <EditableTitle label={`Author ${index + 1} bio`} value={author.bio} placeholder="Add a short bio" allowEmpty onSave={(bio) => edit(index, { bio })} />
        </div>
        <Button variant="tertiary" size="sm" aria-label={`Remove author ${index + 1}`} title="Remove author" onClick={() => saveAuthors(authors.filter((_, at) => at !== index))}><X size={16} aria-hidden="true" /></Button>
      </div>)}
    </div>
    {status && !["Saving…", "Saved"].includes(status) && <p className="m-0 flex items-center gap-2 text-destructive" role="alert"><AlertCircle size={16} aria-hidden="true" />{status}</p>}
  </div>;
}
