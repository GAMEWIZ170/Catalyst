import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button, Dialog, TextField } from "./ui";

// Account tools on the Settings page: change password, download my data, delete account.
export default function AccountSection() {
  const { deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState({ current: "", next: "", repeat: "" });
  const [pwStatus, setPwStatus] = useState({ text: "", failed: false });
  const [pwBusy, setPwBusy] = useState(false);
  const [dataStatus, setDataStatus] = useState({ text: "", failed: false });
  const [dataBusy, setDataBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [del, setDel] = useState({ password: "", confirm: "" });
  const [delError, setDelError] = useState("");
  const [delBusy, setDelBusy] = useState(false);

  async function changePassword(event) {
    event.preventDefault();
    setPwStatus({ text: "", failed: false });
    if (pw.next.length < 8) return setPwStatus({ text: "Use at least 8 characters for the new password.", failed: true });
    if (pw.next !== pw.repeat) return setPwStatus({ text: "The two new passwords do not match.", failed: true });
    setPwBusy(true);
    try {
      const { message } = await api.changePassword({ currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "", repeat: "" });
      setPwStatus({ text: message, failed: false });
    } catch (err) {
      setPwStatus({ text: err.message, failed: true });
    } finally {
      setPwBusy(false);
    }
  }

  async function downloadData() {
    setDataStatus({ text: "", failed: false });
    setDataBusy(true);
    try {
      const data = await api.exportMyData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "catalyst-my-data.json";
      link.click();
      URL.revokeObjectURL(url);
      setDataStatus({ text: "Your file was downloaded.", failed: false });
    } catch (err) {
      setDataStatus({ text: err.message, failed: true });
    } finally {
      setDataBusy(false);
    }
  }

  function closeDelete() {
    if (delBusy) return;
    setDeleteOpen(false);
    setDel({ password: "", confirm: "" });
    setDelError("");
  }

  async function confirmDelete(event) {
    event.preventDefault();
    setDelError("");
    setDelBusy(true);
    try {
      await deleteAccount(del);
      navigate("/login", { replace: true });
    } catch (err) {
      setDelError(err.message);
      setDelBusy(false);
    }
  }

  return <>
    <section className="settings-section" aria-labelledby="password-heading">
      <h2 id="password-heading">Change password</h2>
      <form className="auth-form" onSubmit={changePassword}>
        <TextField label="Current password" type="password" required autoComplete="current-password" value={pw.current}
          onChange={(e) => setPw({ ...pw, current: e.target.value })} />
        <TextField label="New password" type="password" required minLength="8" maxLength="72" autoComplete="new-password" hint="At least 8 characters." value={pw.next}
          onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        <TextField label="Repeat new password" type="password" required minLength="8" maxLength="72" autoComplete="new-password" value={pw.repeat}
          onChange={(e) => setPw({ ...pw, repeat: e.target.value })} />
        <Button type="submit" loading={pwBusy}>Change password</Button>
      </form>
      <p className={pwStatus.failed ? "form-error" : "settings-status"} role={pwStatus.failed ? "alert" : undefined} aria-live="polite">{pwStatus.text}</p>
      <p className="muted settings-help">Changing your password logs you out on your other devices.</p>
    </section>
    <section className="settings-section" aria-labelledby="data-heading">
      <h2 id="data-heading">Download my data</h2>
      <p className="muted settings-help">Get a JSON file with your profile, progress, test scores, mistakes, notes and saved items.</p>
      <Button variant="secondary" onClick={downloadData} loading={dataBusy}>Download my data</Button>
      <p className={dataStatus.failed ? "form-error" : "settings-status"} role={dataStatus.failed ? "alert" : undefined} aria-live="polite">{dataStatus.text}</p>
    </section>
    <section className="settings-section" aria-labelledby="delete-heading">
      <h2 id="delete-heading">Delete my account</h2>
      <p className="muted settings-help">This is permanent. Your name, email, notes, saved items and exam answers are removed, and nobody can restore the account.</p>
      <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete my account</Button>
    </section>
    <Dialog open={deleteOpen} onClose={closeDelete} title="Delete your account?">
      <form className="auth-form" onSubmit={confirmDelete}>
        <p>This cannot be undone. Enter your password and type DELETE to confirm.</p>
        <TextField label="Password" type="password" required autoComplete="current-password" value={del.password}
          onChange={(e) => setDel({ ...del, password: e.target.value })} />
        <TextField label="Type DELETE" type="text" required autoComplete="off" value={del.confirm}
          onChange={(e) => setDel({ ...del, confirm: e.target.value })} />
        {delError && <p className="form-error" role="alert">{delError}</p>}
        <div className="dialog-actions">
          <Button variant="secondary" type="button" onClick={closeDelete}>Cancel</Button>
          <Button variant="danger" type="submit" loading={delBusy} disabled={del.confirm !== "DELETE" || !del.password}>Delete forever</Button>
        </div>
      </form>
    </Dialog>
  </>;
}
