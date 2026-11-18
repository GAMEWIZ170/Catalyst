import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Download, Info, KeyRound, Mail, Trash2, X } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Button, Dialog, DropdownMenu, SettingRow, TextField } from "../ui";

// Account tools on the Settings page: email, password, download my data, delete account. Each opens a small dialog;
// nothing is open on the page. Delete is in a "..." menu and asks for the password and the word DELETE.
export default function AccountSection() {
  const { user, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(null);   // "email", "password" or "delete"
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [mail, setMail] = useState({ email: "", password: "" });
  const [pw, setPw] = useState({ current: "", next: "", repeat: "" });
  const [del, setDel] = useState({ password: "", confirm: "" });

  function open(name) { setDialog(name); setProblem(""); setMail({ email: "", password: "" }); setPw({ current: "", next: "", repeat: "" }); setDel({ password: "", confirm: "" }); }
  const close = () => { if (!busy) setDialog(null); };

  async function submit(action, done) {
    setBusy(true);
    setProblem("");
    try {
      const result = await action();
      done?.(result);
      return true;
    } catch (err) {
      setProblem(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const changeEmail = () => submit(() => api.requestEmailChange(mail), ({ message: text }) => { setMessage(text); setDialog(null); });
  const changePassword = () => {
    if (pw.next.length < 8) return setProblem("Use at least 8 characters for the new password.");
    if (pw.next !== pw.repeat) return setProblem("The two new passwords do not match.");
    return submit(() => api.changePassword({ currentPassword: pw.current, newPassword: pw.next }), ({ message: text }) => { setMessage(text); setDialog(null); });
  };
  const confirmDelete = () => submit(() => deleteAccount(del), () => navigate("/login", { replace: true }));

  async function downloadData() {
    setMessage("");
    try {
      const data = await api.exportMyData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "catalyst-my-data.json";
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Your file was downloaded.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  const actions = (label, onClick, disabled, variant = "primary") => <>
    <Button variant="tertiary" onClick={() => setDialog(null)}>Cancel</Button>
    <Button variant={variant} disabled={disabled} loading={busy} onClick={onClick}>{label}</Button>
  </>;
  const errorLine = problem && <p className="m-0 flex items-center gap-2 text-destructive" role="alert"><AlertCircle size={16} aria-hidden="true" />{problem}</p>;

  return <div className="grid">
    {message && <p className="m-0 flex items-start gap-2 rounded-lg bg-info/15 p-3" role="status">
      <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1">{message}</span>
      <button type="button" aria-label="Dismiss message" onClick={() => setMessage("")} className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-pill border-0 bg-transparent hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><X size={16} aria-hidden="true" /></button>
    </p>}
    <SettingRow label="Email" help={user?.email}><Button variant="secondary" icon={Mail} onClick={() => open("email")}>Change</Button></SettingRow>
    <SettingRow label="Password" help="Changing it logs you out on your other devices."><Button variant="secondary" icon={KeyRound} onClick={() => open("password")}>Change</Button></SettingRow>
    <SettingRow label="Download my data" help="A JSON file with your profile, progress, notes and saved items."><Button variant="secondary" icon={Download} onClick={downloadData}>Download</Button></SettingRow>
    <SettingRow label="Delete my account" help="Permanent. Nobody can restore it.">
      <DropdownMenu trigger={<Button variant="tertiary" aria-label="Account danger options"><Trash2 size={18} aria-hidden="true" /></Button>}
        items={[{ label: "Delete my account…", icon: Trash2, danger: true, onSelect: () => open("delete") }]} />
    </SettingRow>

    <Dialog open={dialog === "email"} onClose={close} title="Change email" actions={actions("Send link", changeEmail, !mail.email || !mail.password)}>
      <div className="grid gap-3">
        <p className="m-0 text-muted-foreground">We send a link to the new address. The change happens when you open it.</p>
        {errorLine}
        <TextField label="New email" type="email" value={mail.email} onChange={(event) => setMail({ ...mail, email: event.target.value })} autoComplete="email" autoFocus />
        <TextField label="Current password" type="password" value={mail.password} onChange={(event) => setMail({ ...mail, password: event.target.value })} autoComplete="current-password" />
      </div>
    </Dialog>

    <Dialog open={dialog === "password"} onClose={close} title="Change password" actions={actions("Change password", changePassword, !pw.current || !pw.next || !pw.repeat)}>
      <div className="grid gap-3">
        {errorLine}
        <TextField label="Current password" type="password" value={pw.current} onChange={(event) => setPw({ ...pw, current: event.target.value })} autoComplete="current-password" autoFocus />
        <TextField label="New password" type="password" hint="At least 8 characters." value={pw.next} onChange={(event) => setPw({ ...pw, next: event.target.value })} autoComplete="new-password" />
        <TextField label="Repeat new password" type="password" value={pw.repeat} onChange={(event) => setPw({ ...pw, repeat: event.target.value })} autoComplete="new-password" />
      </div>
    </Dialog>

    <Dialog open={dialog === "delete"} onClose={close} title="Delete your account?" actions={actions("Delete forever", confirmDelete, del.confirm !== "DELETE" || !del.password, "danger")}>
      <div className="grid gap-3">
        <p className="m-0 text-muted-foreground">This cannot be undone. Enter your password and type DELETE.</p>
        {errorLine}
        <TextField label="Password" type="password" value={del.password} onChange={(event) => setDel({ ...del, password: event.target.value })} autoComplete="current-password" autoFocus />
        <TextField label="Type DELETE" value={del.confirm} onChange={(event) => setDel({ ...del, confirm: event.target.value })} autoComplete="off" />
      </div>
    </Dialog>
  </div>;
}
