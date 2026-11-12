import { useState } from "react";
import { BookOpen, Check, Layers, Plus, Trash2 } from "lucide-react";
import {
  Badge, Button, Card, CardBody, CardFooter, CardHeader, Checkbox, Dialog, EmptyState, Progress, Radio, RadioGroup,
  SelectField, Skeleton, SkeletonGroup, Tabs, TextArea, TextField, useToast
} from "../components/ui";

const PALETTES = ["lagoon", "indigo", "ember", "orchid", "graphite"];

function Section({ title, children }) {
  return <section className="dev-section"><h2>{title}</h2>{children}</section>;
}

// Hidden page, only built in development: every shared component in every state. Not linked from the app.
export default function DevComponents() {
  const { toast } = useToast();
  const [palette, setPalette] = useState(document.documentElement.dataset.palette || "lagoon");
  const [theme, setTheme] = useState(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  const [tab, setTab] = useState("one");
  const [open, setOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const [choice, setChoice] = useState("a");

  function changePalette(value) {
    setPalette(value);
    document.documentElement.dataset.palette = value;
  }
  function changeTheme(value) {
    setTheme(value);
    document.documentElement.dataset.theme = value;
  }

  return (
    <main className="dev-page">
      <header className="dev-bar">
        <h1>Components</h1>
        <SelectField label="Palette" value={palette} onChange={(event) => changePalette(event.target.value)}>
          {PALETTES.map((name) => <option key={name} value={name}>{name}</option>)}
        </SelectField>
        <SelectField label="Mode" value={theme} onChange={(event) => changeTheme(event.target.value)}>
          <option value="light">light</option>
          <option value="dark">dark</option>
        </SelectField>
      </header>

      <Section title="Buttons">
        <div className="button-row">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="danger" icon={Trash2}>Delete lesson</Button>
        </div>
        <div className="button-row">
          <Button icon={Plus}>With icon</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>Disabled</Button>
        </div>
        <div className="button-row button-row--stack">
          <Button icon={BookOpen}>Start the Protons, neutrons and electrons lesson</Button>
          <Button variant="secondary">Back to course</Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="dev-grid">
          <TextField label="Email" type="email" placeholder="you@example.com" hint="We never share your email." />
          <TextField label="Course code" defaultValue="CHEM113" />
          <TextField label="Password" type="password" error="Use at least 8 characters." defaultValue="short" />
          <TextField label="Locked field" disabled defaultValue="Cannot edit" />
          <SelectField label="Unit"><option>Atomic structure</option><option>Stoichiometry</option></SelectField>
          <TextArea label="Explanation" hint="Formulas go between dollar signs." />
        </div>
        <div className="dev-grid">
          <div>
            <Checkbox label="Remind me to study" hint="One message a day, at most." checked={agree} onChange={(event) => setAgree(event.target.checked)} />
            <Checkbox label="Disabled option" disabled />
          </div>
          <RadioGroup legend="Question type">
            <Radio name="qt" label="Multiple choice" checked={choice === "a"} onChange={() => setChoice("a")} />
            <Radio name="qt" label="True or false" checked={choice === "b"} onChange={() => setChoice("b")} />
          </RadioGroup>
        </div>
      </Section>

      <Section title="Card">
        <div className="dev-grid">
          <Card>
            <CardHeader><h3>General Chemistry I</h3></CardHeader>
            <CardBody><p>Atoms, bonding, stoichiometry and the periodic table.</p><Progress value={40} label="Course progress" showLabel /></CardBody>
            <CardFooter><Button>Continue</Button><Button variant="tertiary">Outline</Button></CardFooter>
          </Card>
          <Card>
            <CardBody><p>A card with only a body.</p></CardBody>
          </Card>
        </div>
      </Section>

      <Section title="Badges">
        <div className="dev-row">
          <Badge>Not started</Badge>
          <Badge tone="accent" icon={Layers}>Up next</Badge>
          <Badge tone="success" icon={Check}>Passed</Badge>
          <Badge tone="warning">Review</Badge>
          <Badge tone="error">Failed</Badge>
          <Badge tone="info">New</Badge>
        </div>
        <Card><CardBody><Badge tone="accent">Inside a card, still inline</Badge></CardBody></Card>
      </Section>

      <Section title="Tabs">
        <Tabs
          label="Example tabs"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "one", label: "Explanation", panel: <p>First panel.</p> },
            { id: "two", label: "Flashcards", panel: <p>Second panel.</p> },
            { id: "three", label: "Materials", panel: <p>Third panel.</p> }
          ]}
        />
      </Section>

      <Section title="Progress">
        <Progress value={0} label="Not started" showLabel />
        <Progress value={65} label="In progress" showLabel />
        <Progress value={100} label="Complete" showLabel />
      </Section>

      <Section title="Dialog and toast">
        <div className="button-row">
          <Button variant="secondary" onClick={() => setOpen(true)}>Open dialog</Button>
          <Button variant="secondary" onClick={() => toast({ tone: "success", message: "Lesson saved." })}>Success toast</Button>
          <Button variant="secondary" onClick={() => toast({ tone: "error", message: "Could not save. Check your connection and try again." })}>Error toast</Button>
          <Button variant="secondary" onClick={() => toast({ tone: "warning", message: "You have unsaved changes." })}>Warning toast</Button>
          <Button variant="secondary" onClick={() => toast({ tone: "info", message: "A new unit is available." })}>Info toast</Button>
        </div>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title="Leave without saving?"
          actions={<><Button variant="secondary" onClick={() => setOpen(false)}>Keep editing</Button><Button variant="danger" onClick={() => setOpen(false)}>Leave</Button></>}
        >
          <p>Your changes to this lesson will be lost.</p>
        </Dialog>
      </Section>

      <Section title="Empty state">
        <Card><EmptyState icon={BookOpen} title="No flashcards yet" description="Add a card to start building this deck." action={<Button icon={Plus}>Add flashcard</Button>} /></Card>
      </Section>

      <Section title="Skeleton">
        <Card>
          <SkeletonGroup label="Loading lesson">
            <Skeleton variant="title" />
            <Skeleton />
            <Skeleton />
            <Skeleton width="55%" />
            <Skeleton variant="block" />
          </SkeletonGroup>
        </Card>
      </Section>
    </main>
  );
}
