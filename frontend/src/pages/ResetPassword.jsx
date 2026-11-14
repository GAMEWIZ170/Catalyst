import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { AuthLayout } from "./Login";
import { Button, TextField } from "../components/ui";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.password.length < 8) return setError("Use at least 8 characters for your password.");
    if (form.password !== form.confirm) return setError("The two passwords do not match.");
    setBusy(true);
    try {
      await api.resetPassword({ token, password: form.password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!token) return <AuthLayout title="Reset link missing" subtitle="Open the link from your email, or ask for a new one.">
    <p className="auth-switch"><Link to="/forgot-password">Ask for a new link</Link></p>
  </AuthLayout>;

  if (done) return <AuthLayout title="Password changed" subtitle="You can log in with your new password now.">
    <Link className="button button-primary button-wide" to="/login">Log in</Link>
  </AuthLayout>;

  return <AuthLayout title="Choose a new password" subtitle="Use at least 8 characters.">
    <form className="auth-form" onSubmit={submit}>
      <TextField label="New password" type="password" required minLength="8" maxLength="72" autoComplete="new-password" value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <TextField label="Repeat new password" type="password" required minLength="8" maxLength="72" autoComplete="new-password" value={form.confirm}
        onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
      {error && <p className="form-error" role="alert">{error}{error.includes("expired") && <> <Link to="/forgot-password">Ask for a new link</Link></>}</p>}
      <Button type="submit" block loading={busy}>Change password</Button>
    </form>
  </AuthLayout>;
}
