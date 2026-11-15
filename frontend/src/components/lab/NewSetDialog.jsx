import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { api } from "../../api/client";

const EMPTY = { title: "", topic: "", description: "", course: "" };

// AI-first set creation: one question ("what are you studying?"), then the set opens with the AI panel ready.
// Topic, course and description are optional and stay folded away until asked for.
export default function NewSetDialog({ isOpen, onOpenChange }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  useEffect(() => {
    if (isOpen) { setForm(EMPTY); setError(""); setSaving(false); }
  }, [isOpen]);
  useEffect(() => {
    if (isOpen && !courses.length) api.getCourses().then(({ data }) => setCourses(data || [])).catch(() => {});
  }, [isOpen]);

  async function create(event) {
    event.preventDefault();
    if (!form.title.trim()) { setError("Tell us what you are studying first."); return; }
    setSaving(true);
    setError("");
    try {
      const { data } = await api.createSet({ title: form.title, topic: form.topic, description: form.description, course: form.course || null });
      navigate(`/lab/${data.id}?ai=1`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={480}>
    <DialogHeader title="New study set" subtitle="Name it, then the AI can draft notes, cards and quizzes from your material." onOpenChange={onOpenChange} />
    <form onSubmit={create}>
      <VStack gap={4} padding={4}>
        {error && <Banner status="error" title={error} container="section" />}
        <TextInput label="What are you studying?" value={form.title} onChange={(value) => set({ title: value })} placeholder="For example: Atomic structure" hasAutoFocus isRequired />
        <Collapsible defaultIsOpen={false} chevronPosition="start" trigger="Add details (optional)">
          <VStack gap={3} paddingBlockStart={3}>
            <TextInput label="Topic" value={form.topic} onChange={(value) => set({ topic: value })} isOptional />
            <Selector label="Course" value={form.course} onChange={(value) => set({ course: value })} isOptional hasClear placeholder="None"
              options={courses.map((course) => ({ value: course._id, label: `${course.code}: ${course.title}` }))} />
            <TextArea label="Description" value={form.description} onChange={(value) => set({ description: value })} rows={2} isOptional />
          </VStack>
        </Collapsible>
        <HStack gap={2} justify="end">
          <Button label="Cancel" variant="ghost" onClick={() => onOpenChange(false)} />
          <Button label="Create set" variant="primary" type="submit" isLoading={saving} />
        </HStack>
      </VStack>
    </form>
  </Dialog>;
}
