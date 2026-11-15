import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, KeyRound, Mail, Trash2 } from "lucide-react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import SettingRow from "./astryx/SettingRow";

const icon = (Icon) => <Icon size={18} aria-hidden="true" />;

// Account tools on the Settings page: email, password, download my data, delete account. Each opens a small dialog;
// nothing is open on the page. Delete is in a ⋯ menu and asks for the password and the word DELETE.
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
  const close = (isOpen) => { if (!isOpen && !busy) setDialog(null); };

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

  const actions = (cancel, label, onClick, disabled, variant = "primary") => <HStack gap={2} justify="end">
    <Button label="Cancel" variant="ghost" onClick={() => setDialog(null)} />
    <Button label={label} variant={variant} isDisabled={disabled} isLoading={busy} onClick={onClick} />
  </HStack>;

  return <VStack gap={0}>
    {message && <Banner status="info" title={message} container="section" isDismissable onDismiss={() => setMessage("")} />}
    <SettingRow label="Email" help={user?.email}><Button label="Change" variant="secondary" icon={icon(Mail)} onClick={() => open("email")} /></SettingRow>
    <SettingRow label="Password" help="Changing it logs you out on your other devices."><Button label="Change" variant="secondary" icon={icon(KeyRound)} onClick={() => open("password")} /></SettingRow>
    <SettingRow label="Download my data" help="A JSON file with your profile, progress, notes and saved items."><Button label="Download" variant="secondary" icon={icon(Download)} onClick={downloadData} /></SettingRow>
    <SettingRow label="Delete my account" help="Permanent. Nobody can restore it.">
      <MoreMenu label="Account danger options" alignment="end" items={[{ label: "Delete my account…", icon: icon(Trash2), variant: "destructive", onClick: () => open("delete") }]} />
    </SettingRow>

    <Dialog isOpen={dialog === "email"} onOpenChange={close} purpose="form" width={440}>
      <DialogHeader title="Change email" subtitle="We send a link to the new address. The change happens when you open it." onOpenChange={close} />
      <VStack gap={3} padding={4}>
        {problem && <Banner status="error" title={problem} container="section" />}
        <TextInput label="New email" type="email" value={mail.email} onChange={(email) => setMail({ ...mail, email })} autoComplete="email" hasAutoFocus />
        <TextInput label="Current password" type="password" value={mail.password} onChange={(password) => setMail({ ...mail, password })} autoComplete="current-password" />
        {actions(null, "Send link", changeEmail, !mail.email || !mail.password)}
      </VStack>
    </Dialog>

    <Dialog isOpen={dialog === "password"} onOpenChange={close} purpose="form" width={440}>
      <DialogHeader title="Change password" onOpenChange={close} />
      <VStack gap={3} padding={4}>
        {problem && <Banner status="error" title={problem} container="section" />}
        <TextInput label="Current password" type="password" value={pw.current} onChange={(current) => setPw({ ...pw, current })} autoComplete="current-password" hasAutoFocus />
        <TextInput label="New password" type="password" description="At least 8 characters." value={pw.next} onChange={(next) => setPw({ ...pw, next })} autoComplete="new-password" />
        <TextInput label="Repeat new password" type="password" value={pw.repeat} onChange={(repeat) => setPw({ ...pw, repeat })} autoComplete="new-password" />
        {actions(null, "Change password", changePassword, !pw.current || !pw.next || !pw.repeat)}
      </VStack>
    </Dialog>

    <Dialog isOpen={dialog === "delete"} onOpenChange={close} purpose="form" width={440}>
      <DialogHeader title="Delete your account?" subtitle="This cannot be undone. Enter your password and type DELETE." onOpenChange={close} />
      <VStack gap={3} padding={4}>
        {problem && <Banner status="error" title={problem} container="section" />}
        <TextInput label="Password" type="password" value={del.password} onChange={(password) => setDel({ ...del, password })} autoComplete="current-password" hasAutoFocus />
        <TextInput label="Type DELETE" value={del.confirm} onChange={(confirm) => setDel({ ...del, confirm })} autoComplete="off" />
        {actions(null, "Delete forever", confirmDelete, del.confirm !== "DELETE" || !del.password, "destructive")}
      </VStack>
    </Dialog>
  </VStack>;
}
