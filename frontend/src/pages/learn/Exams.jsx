import { useEffect, useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { List, ListItem } from "@astryxdesign/core/List";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TimeInput } from "@astryxdesign/core/TimeInput";
import { api } from "../../api/client";
import AstryxTheme from "../../components/astryx/AstryxTheme";
import { ErrorState, Loading } from "./Courses";

const TYPES = [
  { value: "mid_semester", label: "Mid-semester" },
  { value: "end_semester", label: "End of semester" },
  { value: "quiz", label: "Quiz" }
];
const typeLabel = (value) => TYPES.find((item) => item.value === value)?.label || value;
const when = (days) => (days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`);
const show = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const inDays = (n) => { const date = new Date(); date.setDate(date.getDate() + n); return iso(date); };
const QUICK = [{ label: "Tomorrow", days: 1 }, { label: "In a week", days: 7 }, { label: "In a month", days: 30 }];
const blank = () => ({ course: "", type: "end_semester", date: undefined, time: "09:00" });

// The student's own exams. The list comes first; "Add exam" opens a small dialog with a date picker and quick chips.
// The nearest exam shows on Home with the days left, and Today's plan counts down to it.
export default function Exams() {
  const [exams, setExams] = useState(null);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(null);       // null = closed
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState("");
  const [problem, setProblem] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setError("");
    try {
      const [mine, list] = await Promise.all([api.getMyExams(), api.getCourses()]);
      setExams(mine.data);
      setCourses(list.data || []);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function add() {
    setSaving(true);
    setProblem("");
    try {
      // The date and time are in the student's own time, so the browser turns them into one exact moment.
      await api.addMyExam({ course: form.course, type: form.type, startsAt: new Date(`${form.date}T${form.time || "09:00"}`).toISOString() });
      setForm(null);
      await load();
    } catch (err) {
      setProblem(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const target = removing;
    setRemoving(null);
    try { await api.deleteMyExam(target.id); await load(); } catch (err) { setError(err.message); }
  }

  if (error && !exams) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!exams) return <Loading />;
  const row = (exam, past) => <ListItem key={exam.id} label={`${exam.course.code} · ${typeLabel(exam.type)}`}
    description={`${show(exam.startsAt)}${past ? "" : `, ${when(exam.daysLeft)}`}`}
    endContent={<MoreMenu label={`Options for ${exam.course.code} ${typeLabel(exam.type)}`} alignment="end" items={[{ label: "Delete exam", icon: <Trash2 size={18} aria-hidden="true" />, variant: "destructive", onClick: () => setRemoving(exam) }]} />} />;
  const ready = form && form.course && form.date;
  const close = (open) => { if (!open) setForm(null); };

  return <AstryxTheme>
    <div className="content student-page exams-astryx">
      <VStack gap={5}>
        <HStack justify="between" align="center" wrap="wrap" gap={3}>
          <Heading level={1}>My exams</Heading>
          <Button label="Add exam" variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={() => { setProblem(""); setForm(blank()); }} />
        </HStack>
        {error && <Banner status="error" title={error} container="section" isDismissable onDismiss={() => setError("")} />}
        <VStack gap={2}>
          <Heading level={2}>Upcoming</Heading>
          {exams.upcoming.length === 0
            ? <EmptyState isCompact icon={<CalendarDays size={28} aria-hidden="true" />} title="No exams yet" description="Add one to see a countdown on Home." actions={<Button label="Add exam" variant="primary" onClick={() => { setProblem(""); setForm(blank()); }} />} />
            : <List hasDividers>{exams.upcoming.map((exam) => row(exam, false))}</List>}
        </VStack>
        {exams.past.length > 0 && <VStack gap={2}>
          <Heading level={2}>Past exams</Heading>
          <List hasDividers>{exams.past.map((exam) => row(exam, true))}</List>
        </VStack>}
      </VStack>

      <Dialog isOpen={Boolean(form)} onOpenChange={close} purpose="form" width={460}>
        <DialogHeader title="Add an exam" onOpenChange={close} />
        {form && <VStack gap={4} padding={4}>
          {problem && <Banner status="error" title={problem} container="section" />}
          <Selector label="Course" value={form.course} onChange={(course) => setForm({ ...form, course })} hasSearch placeholder="Choose a course"
            options={courses.map((course) => ({ value: course._id, label: `${course.code}: ${course.title}` }))} />
          <SegmentedControl label="Type" value={form.type} onChange={(type) => setForm({ ...form, type })} layout="fill">
            {TYPES.map((item) => <SegmentedControlItem key={item.value} value={item.value} label={item.label} />)}
          </SegmentedControl>
          <HStack gap={2} wrap="wrap">{QUICK.map((item) => <Button key={item.label} label={item.label} size="sm" variant={form.date === inDays(item.days) ? "primary" : "secondary"} onClick={() => setForm({ ...form, date: inDays(item.days) })} />)}</HStack>
          <HStack gap={3} wrap="wrap" align="end">
            <DateInput label="Date" value={form.date} min={iso(new Date())} onChange={(date) => setForm({ ...form, date })} width={200} />
            <TimeInput label="Time" value={form.time} onChange={(time) => setForm({ ...form, time })} width={140} />
          </HStack>
          <HStack gap={2} justify="end">
            <Button label="Cancel" variant="ghost" onClick={() => setForm(null)} />
            <Button label="Add exam" variant="primary" isDisabled={!ready} isLoading={saving} onClick={add} />
          </HStack>
        </VStack>}
      </Dialog>

      <Dialog isOpen={Boolean(removing)} onOpenChange={(open) => { if (!open) setRemoving(null); }} width={400}>
        <DialogHeader title="Delete this exam?" onOpenChange={(open) => { if (!open) setRemoving(null); }} />
        <VStack gap={4} padding={4}>
          <Text>It leaves your countdown and plan.</Text>
          <HStack gap={2} justify="end"><Button label="Cancel" variant="ghost" onClick={() => setRemoving(null)} /><Button label="Delete" variant="destructive" onClick={remove} /></HStack>
        </VStack>
      </Dialog>
    </div>
  </AstryxTheme>;
}
