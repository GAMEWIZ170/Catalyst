import { useState } from "react";
import { api } from "../../api/client";
import ShareButton from "../shared/ShareButton";
import { Button, Checkbox, SelectField } from "../ui";

const STATUS_TEXT = {
  pending: "Waiting for a quick check. You will get a message when it is approved.",
  approved: "On the community shelf. Other students can find, save and copy it.",
  rejected: "Not approved this time. You can improve it and send it again.",
  removed: "An admin removed this set from the community. It stays in your Study Lab."
};

// Who can see a study set: only you, anyone with the link, or the community shelf (after a quick approval).
// Your source material (PDFs and pasted text) is never shared, whatever you choose.
export default function SetSharing({ set, onChange }) {
  const [visibility, setVisibility] = useState(set.communityStatus === "pending" || set.communityStatus === "approved" ? "community" : set.visibility);
  const [declared, setDeclared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setProblem("");
    setMessage("");
    try {
      const response = await api.setSetVisibility(set.id, { visibility, ...(visibility === "community" ? { declaration: declared } : {}) });
      setMessage(response.message || "Saved");
      onChange({ visibility: response.data.visibility, communityStatus: response.data.communityStatus });
    } catch (error) {
      setProblem(error.message);
    } finally {
      setBusy(false);
    }
  }

  const shared = set.visibility !== "private";
  return <section className="set-sharing" aria-labelledby="sharing-heading">
    <h2 id="sharing-heading">Sharing</h2>
    <form className="set-sharing-form" onSubmit={save}>
      <SelectField label="Who can see this set" value={visibility} onChange={(event) => setVisibility(event.target.value)} hint="Your uploaded material is never shared.">
        <option value="private">Only me</option>
        <option value="link">Anyone with the link</option>
        <option value="community">The community shelf (needs approval)</option>
      </SelectField>
      {visibility === "community" && set.communityStatus !== "approved" && set.communityStatus !== "pending" && set.communityStatus !== "removed" &&
        <Checkbox label="This set is my own work, or I have the right to share it." checked={declared} onChange={(event) => setDeclared(event.target.checked)} />}
      <Button type="submit" variant="secondary" disabled={busy || visibility === (set.communityStatus === "pending" || set.communityStatus === "approved" ? "community" : set.visibility) && !message}>{busy ? "Saving…" : "Save sharing"}</Button>
    </form>
    {STATUS_TEXT[set.communityStatus] && <p role="status">{STATUS_TEXT[set.communityStatus]}{set.communityStatus === "rejected" && set.reviewNote ? ` Note from the reviewer: ${set.reviewNote}` : ""}</p>}
    <p className="settings-status" role="alert">{problem}</p>
    <p className="muted" role="status">{message}</p>
    {set.communityStatus === "approved" && <p className="muted">{set.studied} studied · {set.saved} saved · {set.copied} copied</p>}
    {shared && <ShareButton url={`${window.location.origin}/s/s/${set.id}`} title={set.title} text={`${set.title}: a study set on Catalyst.`} />}
  </section>;
}
